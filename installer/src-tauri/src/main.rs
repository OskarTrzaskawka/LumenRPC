//! Lumen RPC Lite Setup: a small web installer that downloads the latest
//! Lumen RPC release from GitHub and installs it for the current user.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::{Emitter, Window};

const REPO: &str = "OskarTrzaskawka/LumenRPC";
const UA: &str = "LumenRPC-Lite-Setup";

#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Deserialize)]
struct GhRelease {
    tag_name: String,
    assets: Vec<GhAsset>,
}

#[derive(Serialize, Clone)]
struct ReleaseInfo {
    version: String,
    asset: String,
    url: String,
    size: u64,
    target: String,
}

#[derive(Serialize, Clone)]
struct Progress {
    stage: &'static str,
    done: u64,
    total: u64,
}

fn pick_asset(assets: &[GhAsset]) -> Option<&GhAsset> {
    let full = assets.iter().filter(|a| !a.name.contains("Lite"));
    let found: Vec<&GhAsset> = full.collect();
    if cfg!(target_os = "windows") {
        found.into_iter().find(|a| a.name.ends_with("-setup.exe"))
    } else if cfg!(target_os = "macos") {
        let arch = if cfg!(target_arch = "aarch64") { "aarch64" } else { "x64" };
        found.into_iter().find(|a| a.name.ends_with(".dmg") && a.name.contains(arch))
    } else {
        found.into_iter().find(|a| a.name.ends_with(".AppImage") && a.name.contains("amd64"))
    }
}

fn target_label() -> String {
    if cfg!(target_os = "windows") {
        std::env::var("LOCALAPPDATA").map(|p| format!("{p}\\Lumen RPC")).unwrap_or_else(|_| "Lumen RPC".into())
    } else if cfg!(target_os = "macos") {
        "/Applications/Lumen RPC.app".into()
    } else {
        "~/.local/share/lumen-rpc".into()
    }
}

#[tauri::command]
async fn get_release() -> Result<ReleaseInfo, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let rel: GhRelease = ureq::get(&format!("https://api.github.com/repos/{REPO}/releases/latest"))
            .set("User-Agent", UA)
            .set("Accept", "application/vnd.github+json")
            .call()
            .map_err(|e| format!("Could not reach GitHub: {e}"))?
            .into_json()
            .map_err(|e| e.to_string())?;
        let asset = pick_asset(&rel.assets).ok_or("No installer for your system in the latest release")?;
        Ok(ReleaseInfo {
            version: rel.tag_name.trim_start_matches('v').to_string(),
            asset: asset.name.clone(),
            url: asset.browser_download_url.clone(),
            size: asset.size,
            target: target_label(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn download(window: &Window, url: &str, dest: &Path) -> Result<(), String> {
    let resp = ureq::get(url).set("User-Agent", UA).call().map_err(|e| format!("Download failed: {e}"))?;
    let total: u64 = resp.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(0);
    let mut reader = resp.into_reader();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; 64 * 1024];
    let mut done = 0u64;
    let mut last = Instant::now();
    loop {
        let n = reader.read(&mut buf).map_err(|e| format!("Download interrupted: {e}"))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        done += n as u64;
        if last.elapsed().as_millis() > 80 {
            last = Instant::now();
            let _ = window.emit("progress", Progress { stage: "download", done, total });
        }
    }
    let _ = window.emit("progress", Progress { stage: "download", done, total: total.max(done) });
    Ok(())
}

fn run(cmd: &mut std::process::Command) -> Result<(), String> {
    let status = cmd.status().map_err(|e| e.to_string())?;
    if status.success() { Ok(()) } else { Err(format!("{cmd:?} exited with {status}")) }
}

#[cfg(target_os = "windows")]
fn install_file(file: &Path, launch: bool) -> Result<(), String> {
    // Tauri's NSIS installer: /S = silent, per-user install, no admin prompt.
    run(std::process::Command::new(file).arg("/S"))?;
    if launch {
        let exe = PathBuf::from(std::env::var("LOCALAPPDATA").map_err(|e| e.to_string())?).join("Lumen RPC").join("LumenRPC.exe");
        std::process::Command::new(exe).spawn().map_err(|e| format!("Installed, but could not start it: {e}"))?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn install_file(file: &Path, launch: bool) -> Result<(), String> {
    use std::process::Command;
    let mount = std::env::temp_dir().join("lumen-rpc-dmg");
    let _ = std::fs::create_dir_all(&mount);
    run(Command::new("hdiutil").args(["attach", "-nobrowse", "-readonly", "-quiet", "-mountpoint"]).arg(&mount).arg(file))?;
    let result = (|| {
        let app = std::fs::read_dir(&mount)
            .map_err(|e| e.to_string())?
            .flatten()
            .map(|e| e.path())
            .find(|p| p.extension().is_some_and(|x| x == "app"))
            .ok_or("No app found in the disk image")?;
        let mut dest = PathBuf::from("/Applications/Lumen RPC.app");
        if run(Command::new("ditto").arg(&app).arg(&dest)).is_err() {
            let home = std::env::var("HOME").map_err(|e| e.to_string())?;
            let dir = PathBuf::from(home).join("Applications");
            let _ = std::fs::create_dir_all(&dir);
            dest = dir.join("Lumen RPC.app");
            run(Command::new("ditto").arg(&app).arg(&dest))?;
        }
        let _ = Command::new("xattr").args(["-dr", "com.apple.quarantine"]).arg(&dest).status();
        Ok::<PathBuf, String>(dest)
    })();
    let _ = Command::new("hdiutil").args(["detach", "-quiet"]).arg(&mount).status();
    let dest = result?;
    if launch {
        let _ = Command::new("open").arg(&dest).spawn();
    }
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn install_file(file: &Path, launch: bool) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let home = PathBuf::from(std::env::var("HOME").map_err(|e| e.to_string())?);
    let dir = home.join(".local/share/lumen-rpc");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let app = dir.join("LumenRPC.AppImage");
    std::fs::copy(file, &app).map_err(|e| e.to_string())?;
    std::fs::set_permissions(&app, std::fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;

    // Icon + menu entry so it shows up in the app launcher.
    let icon_dir = home.join(".local/share/icons/hicolor/256x256/apps");
    let _ = std::fs::create_dir_all(&icon_dir);
    let icon = icon_dir.join("lumen-rpc.png");
    if let Ok(resp) = ureq::get(&format!("https://raw.githubusercontent.com/{REPO}/main/branding/png/logo-256.png")).set("User-Agent", UA).call() {
        if let Ok(mut f) = std::fs::File::create(&icon) {
            let _ = std::io::copy(&mut resp.into_reader(), &mut f);
        }
    }
    let apps = home.join(".local/share/applications");
    let _ = std::fs::create_dir_all(&apps);
    let desktop = format!(
        "[Desktop Entry]\nType=Application\nName=Lumen RPC\nComment=Discord Rich Presence manager\nExec=\"{}\"\nIcon={}\nCategories=Utility;\nTerminal=false\n",
        app.display(),
        icon.display()
    );
    std::fs::write(apps.join("lumen-rpc.desktop"), desktop).map_err(|e| e.to_string())?;
    if launch {
        let _ = std::process::Command::new(&app).spawn();
    }
    Ok(())
}

#[tauri::command]
async fn install(window: Window, url: String, asset: String, launch: bool) -> Result<(), String> {
    if !url.starts_with(&format!("https://github.com/{REPO}/releases/download/")) {
        return Err("Refusing to download from an unexpected address".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let safe_name: String = asset.chars().map(|c| if c.is_ascii_alphanumeric() || ".-_".contains(c) { c } else { '_' }).collect();
        let file = std::env::temp_dir().join(safe_name);
        download(&window, &url, &file)?;
        let _ = window.emit("progress", Progress { stage: "install", done: 0, total: 0 });
        let result = install_file(&file, launch);
        let _ = std::fs::remove_file(&file);
        result
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_release, install])
        .run(tauri::generate_context!())
        .expect("error while running Lumen RPC Setup");
}
