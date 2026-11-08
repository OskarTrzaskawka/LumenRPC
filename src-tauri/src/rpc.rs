//! Minimal, dependency-free Discord IPC client.
//!
//! Discord listens on a named pipe (Windows) or a Unix socket (Linux/macOS)
//! called `discord-ipc-N`. Every frame is `op: u32 LE`, `len: u32 LE`, JSON.
//! All I/O happens on one worker thread; the UI talks to it through a channel.

use serde_json::{Value, json};
use std::io::{self, ErrorKind, Read, Write};
use std::sync::mpsc::{Receiver, RecvTimeoutError, Sender, channel};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const OP_HANDSHAKE: u32 = 0;
const OP_FRAME: u32 = 1;
const OP_CLOSE: u32 = 2;
const OP_PING: u32 = 3;
const OP_PONG: u32 = 4;

pub enum Cmd {
    Connect(String),
    Disconnect,
    SetActivity(Value),
    Clear,
}

#[derive(Clone)]
pub struct Rpc {
    tx: Sender<Cmd>,
    status: Arc<Mutex<Value>>,
}

impl Rpc {
    pub fn spawn(app: AppHandle) -> Self {
        let (tx, rx) = channel();
        let status = Arc::new(Mutex::new(json!({ "state": "disconnected" })));
        let shared = status.clone();
        std::thread::Builder::new()
            .name("discord-ipc".into())
            .spawn(move || Worker::new(app, shared).run(rx))
            .expect("failed to start IPC thread");
        Self { tx, status }
    }

    pub fn send(&self, cmd: Cmd) {
        let _ = self.tx.send(cmd);
    }

    pub fn status(&self) -> Value {
        self.status.lock().map(|s| s.clone()).unwrap_or(Value::Null)
    }
}

#[cfg(windows)]
type Conn = std::fs::File;
#[cfg(unix)]
type Conn = std::os::unix::net::UnixStream;

fn open_socket() -> io::Result<Conn> {
    #[cfg(windows)]
    {
        for i in 0..10 {
            let path = format!(r"\\.\pipe\discord-ipc-{i}");
            if let Ok(f) = std::fs::OpenOptions::new().read(true).write(true).open(&path) {
                return Ok(f);
            }
        }
    }
    #[cfg(unix)]
    {
        let mut bases: Vec<String> = ["XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"]
            .iter()
            .filter_map(|v| std::env::var(v).ok())
            .collect();
        bases.push("/tmp".into());
        // Plain install, Flatpak, Snap and Vesktop locations.
        let subs = [
            "",
            "app/com.discordapp.Discord/",
            "app/com.discordapp.DiscordCanary/",
            "app/dev.vencord.Vesktop/",
            ".flatpak/dev.vencord.Vesktop/xdg-run/",
            "snap.discord/",
            "snap.discord-canary/",
        ];
        for base in &bases {
            for sub in subs {
                for i in 0..10 {
                    let p = format!("{}/{}discord-ipc-{}", base.trim_end_matches('/'), sub, i);
                    if let Ok(s) = std::os::unix::net::UnixStream::connect(&p) {
                        return Ok(s);
                    }
                }
            }
        }
    }
    Err(io::Error::new(ErrorKind::NotFound, "Discord is not running"))
}

fn write_frame(c: &mut Conn, op: u32, payload: &Value) -> io::Result<()> {
    let data = serde_json::to_vec(payload)?;
    let mut buf = Vec::with_capacity(8 + data.len());
    buf.extend_from_slice(&op.to_le_bytes());
    buf.extend_from_slice(&(data.len() as u32).to_le_bytes());
    buf.extend_from_slice(&data);
    c.write_all(&buf)?;
    c.flush()
}

fn read_frame(c: &mut Conn) -> io::Result<(u32, Value)> {
    let mut head = [0u8; 8];
    c.read_exact(&mut head)?;
    let op = u32::from_le_bytes([head[0], head[1], head[2], head[3]]);
    let len = u32::from_le_bytes([head[4], head[5], head[6], head[7]]) as usize;
    if len > 1 << 20 {
        return Err(io::Error::new(ErrorKind::InvalidData, "frame too large"));
    }
    let mut body = vec![0u8; len];
    c.read_exact(&mut body)?;
    Ok((op, serde_json::from_slice(&body).unwrap_or(Value::Null)))
}

/// Returns Ok(true) when a frame is waiting, Ok(false) when idle, Err when the pipe is gone.
#[cfg(windows)]
fn pending(c: &mut Conn) -> io::Result<bool> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::Pipes::PeekNamedPipe;
    let mut avail: u32 = 0;
    let ok = unsafe {
        PeekNamedPipe(
            c.as_raw_handle() as _,
            std::ptr::null_mut(),
            0,
            std::ptr::null_mut(),
            &mut avail,
            std::ptr::null_mut(),
        )
    };
    if ok == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(avail > 0)
}

#[cfg(unix)]
fn pending(c: &mut Conn) -> io::Result<bool> {
    c.set_nonblocking(true)?;
    let mut b = [0u8; 1];
    let r = c.peek(&mut b);
    c.set_nonblocking(false)?;
    match r {
        Ok(0) => Err(io::Error::new(ErrorKind::UnexpectedEof, "connection closed")),
        Ok(_) => Ok(true),
        Err(e) if e.kind() == ErrorKind::WouldBlock => Ok(false),
        Err(e) => Err(e),
    }
}

struct Worker {
    app: AppHandle,
    status: Arc<Mutex<Value>>,
    client_id: Option<String>,
    conn: Option<Conn>,
    activity: Option<Value>,
    nonce: u64,
    last_error: Option<String>,
}

impl Worker {
    fn new(app: AppHandle, status: Arc<Mutex<Value>>) -> Self {
        Self { app, status, client_id: None, conn: None, activity: None, nonce: 0, last_error: None }
    }

    fn publish(&self, value: Value) {
        if let Ok(mut s) = self.status.lock() {
            *s = value.clone();
        }
        let _ = self.app.emit("rpc-status", value);
    }

    fn run(mut self, rx: Receiver<Cmd>) {
        loop {
            match rx.recv_timeout(Duration::from_secs(3)) {
                Ok(cmd) => self.handle(cmd),
                Err(RecvTimeoutError::Timeout) => self.tick(),
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    fn handle(&mut self, cmd: Cmd) {
        match cmd {
            Cmd::Connect(id) => {
                self.conn = None;
                self.client_id = Some(id);
                self.connect();
            }
            Cmd::Disconnect => {
                if let Some(c) = self.conn.as_mut() {
                    let _ = write_frame(c, OP_CLOSE, &json!({}));
                }
                self.conn = None;
                self.client_id = None;
                self.activity = None;
                self.publish(json!({ "state": "disconnected" }));
            }
            Cmd::SetActivity(a) => {
                self.activity = Some(a);
                self.push_activity();
            }
            Cmd::Clear => {
                self.activity = None;
                self.push_activity();
            }
        }
    }

    /// Periodic health check and auto-reconnect.
    fn tick(&mut self) {
        if let Some(c) = self.conn.as_mut() {
            let mut lost = false;
            loop {
                match pending(c) {
                    Ok(true) => match read_frame(c) {
                        Ok((OP_PING, p)) => {
                            let _ = write_frame(c, OP_PONG, &p);
                        }
                        Ok((OP_CLOSE, _)) | Err(_) => {
                            lost = true;
                            break;
                        }
                        Ok(_) => {}
                    },
                    Ok(false) => break,
                    Err(_) => {
                        lost = true;
                        break;
                    }
                }
            }
            if lost {
                self.conn = None;
                self.publish(json!({ "state": "connecting", "message": "Lost connection to Discord — retrying…" }));
            }
        } else if self.client_id.is_some() {
            self.connect();
        }
    }

    fn connect(&mut self) {
        let Some(id) = self.client_id.clone() else { return };
        self.publish(json!({ "state": "connecting" }));
        let mut conn = match open_socket() {
            Ok(c) => c,
            Err(e) => {
                self.publish(json!({ "state": "connecting", "message": e.to_string() }));
                return;
            }
        };
        let result = write_frame(&mut conn, OP_HANDSHAKE, &json!({ "v": 1, "client_id": id }))
            .and_then(|_| read_frame(&mut conn));
        match result {
            Ok((OP_FRAME, v)) if v["evt"] == "READY" => {
                self.conn = Some(conn);
                self.last_error = None;
                self.publish(json!({ "state": "connected", "user": v["data"]["user"] }));
                if self.activity.is_some() {
                    self.push_activity();
                }
            }
            Ok((_, v)) => {
                // Discord answers an unknown/invalid Client ID with a CLOSE frame.
                let msg = v["message"].as_str().unwrap_or("Discord rejected the connection").to_string();
                self.client_id = None;
                self.publish(json!({ "state": "error", "message": format!("{msg} — check your Client ID") }));
            }
            Err(e) => {
                self.publish(json!({ "state": "connecting", "message": e.to_string() }));
            }
        }
    }

    fn push_activity(&mut self) {
        let Some(c) = self.conn.as_mut() else { return };
        self.nonce += 1;
        let nonce = self.nonce.to_string();
        let mut args = json!({ "pid": std::process::id() });
        if let Some(a) = &self.activity {
            args["activity"] = a.clone();
        }
        let payload = json!({ "cmd": "SET_ACTIVITY", "args": args, "nonce": nonce });
        if write_frame(c, OP_FRAME, &payload).is_err() {
            self.conn = None;
            self.publish(json!({ "state": "connecting", "message": "Lost connection to Discord — retrying…" }));
            return;
        }
        // Wait for the matching reply so errors (e.g. a bad button URL) reach the UI.
        loop {
            match read_frame(c) {
                Ok((OP_PING, p)) => {
                    let _ = write_frame(c, OP_PONG, &p);
                }
                Ok((OP_FRAME, v)) if v["nonce"] == nonce.as_str() => {
                    if v["evt"] == "ERROR" {
                        let msg = v["data"]["message"].as_str().unwrap_or("Unknown error").to_string();
                        self.last_error = Some(msg.clone());
                        let _ = self.app.emit("rpc-activity", json!({ "ok": false, "message": msg }));
                    } else {
                        self.last_error = None;
                        let _ = self.app.emit("rpc-activity", json!({ "ok": true }));
                    }
                    break;
                }
                Ok((OP_FRAME, _)) => continue,
                Ok(_) | Err(_) => {
                    self.conn = None;
                    self.publish(json!({ "state": "connecting", "message": "Lost connection to Discord — retrying…" }));
                    break;
                }
            }
        }
    }
}
