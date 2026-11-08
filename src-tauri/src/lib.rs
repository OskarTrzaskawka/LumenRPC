mod rpc;
mod system;

use rpc::{Cmd, Rpc};
use serde_json::Value;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WindowEvent};

struct CloseToTray(AtomicBool);

#[tauri::command]
fn rpc_connect(rpc: State<Rpc>, client_id: String) -> Result<(), String> {
    let id = client_id.trim();
    if id.len() < 17 || id.len() > 20 || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("Client ID must be 17–20 digits (the Application ID from the Developer Portal)".into());
    }
    rpc.send(Cmd::Connect(id.to_string()));
    Ok(())
}

#[tauri::command]
fn rpc_disconnect(rpc: State<Rpc>) {
    rpc.send(Cmd::Disconnect);
}

#[tauri::command]
fn rpc_set_activity(rpc: State<Rpc>, activity: Value) {
    rpc.send(Cmd::SetActivity(activity));
}

#[tauri::command]
fn rpc_clear(rpc: State<Rpc>) {
    rpc.send(Cmd::Clear);
}

#[tauri::command]
fn rpc_status(rpc: State<Rpc>) -> Value {
    rpc.status()
}

fn state_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("lumen.json"))
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<String>, String> {
    let path = state_path(&app)?;
    match std::fs::read_to_string(path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_state(app: AppHandle, data: String) -> Result<(), String> {
    let path = state_path(&app)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, data).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

fn cache_path(app: &AppHandle, name: &str) -> Result<std::path::PathBuf, String> {
    if name.is_empty() || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("Invalid cache name".into());
    }
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{name}.json")))
}

/// Returns the cached text and its age in seconds, if present.
#[tauri::command]
fn read_cache(app: AppHandle, name: String) -> Result<Option<(String, u64)>, String> {
    let path = cache_path(&app, &name)?;
    let Ok(meta) = std::fs::metadata(&path) else { return Ok(None) };
    let age = meta.modified().ok().and_then(|m| m.elapsed().ok()).map(|d| d.as_secs()).unwrap_or(u64::MAX);
    Ok(std::fs::read_to_string(path).ok().map(|s| (s, age)))
}

#[tauri::command]
fn write_cache(app: AppHandle, name: String, data: String) -> Result<(), String> {
    std::fs::write(cache_path(&app, &name)?, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 2 * 1024 * 1024 {
        return Err("File is too large".into());
    }
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_processes() -> Vec<String> {
    system::processes()
}

#[tauri::command]
fn idle_seconds() -> Option<u64> {
    system::idle_seconds()
}

#[tauri::command]
fn set_close_to_tray(flag: State<CloseToTray>, value: bool) {
    flag.0.store(value, Ordering::Relaxed);
}

#[tauri::command]
fn set_tray_tooltip(app: AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id("lumen") {
        let _ = tray.set_tooltip(Some(text));
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// When the tray panel was last hidden by losing focus. Clicking the tray icon steals focus first,
/// so without this a click meant to close the panel would immediately reopen it.
struct PanelHiddenAt(Mutex<Instant>);

/// Shows the tray panel just above (or below) the cursor, kept inside the monitor.
fn toggle_tray_panel(app: &AppHandle, x: f64, y: f64) {
    let Some(w) = app.get_webview_window("tray") else { return };
    if w.is_visible().unwrap_or(false) {
        let _ = w.hide();
        return;
    }
    if app.state::<PanelHiddenAt>().0.lock().map(|t| t.elapsed() < Duration::from_millis(300)).unwrap_or(false) {
        return;
    }
    let size = w.outer_size().unwrap_or(PhysicalSize::new(380, 560));
    let (w_px, h_px) = (size.width as i32, size.height as i32);
    let (cx, cy) = (x as i32, y as i32);
    let mut px = cx - w_px + 16;
    let mut py = cy - h_px - 8;
    if let Ok(Some(m)) = app.monitor_from_point(x, y) {
        let (mx, my) = (m.position().x, m.position().y);
        let (mw, mh) = (m.size().width as i32, m.size().height as i32);
        px = px.clamp(mx + 8, mx + mw - w_px - 8);
        if py < my {
            py = cy + 8; // taskbar at the top
        }
        py = py.clamp(my + 8, my + mh - h_px - 8);
    }
    let _ = w.set_position(PhysicalPosition::new(px, py));
    let _ = w.show();
    let _ = w.set_focus();
    let _ = app.emit("tray-opened", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .manage(CloseToTray(AtomicBool::new(true)))
        .manage(PanelHiddenAt(Mutex::new(Instant::now() - Duration::from_secs(5))))
        .setup(|app| {
            app.manage(Rpc::spawn(app.handle().clone()));

            // Left click opens the app, right click opens the Lumen tray panel (a custom window, not a plain menu).
            let mut tray = TrayIconBuilder::with_id("lumen")
                .tooltip("Lumen RPC")
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button, button_state: MouseButtonState::Up, position, .. } = e {
                        match button {
                            MouseButton::Left => show_main(tray.app_handle()),
                            MouseButton::Right => toggle_tray_panel(tray.app_handle(), position.x, position.y),
                            _ => {}
                        }
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            if !std::env::args().any(|a| a == "--minimized") {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                let to_tray = window.label() != "main" || window.state::<CloseToTray>().0.load(Ordering::Relaxed);
                if to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
            WindowEvent::Focused(false) if window.label() == "tray" => {
                let _ = window.hide();
                if let Ok(mut t) = window.state::<PanelHiddenAt>().0.lock() {
                    *t = Instant::now();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            rpc_connect,
            rpc_disconnect,
            rpc_set_activity,
            rpc_clear,
            rpc_status,
            load_state,
            save_state,
            read_cache,
            write_cache,
            write_text_file,
            read_text_file,
            list_processes,
            idle_seconds,
            set_close_to_tray,
            set_tray_tooltip,
            show_main_window,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lumen RPC");
}
