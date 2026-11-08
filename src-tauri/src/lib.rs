mod rpc;
mod system;

use rpc::{Cmd, Rpc};
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};

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

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
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
        .setup(|app| {
            app.manage(Rpc::spawn(app.handle().clone()));

            let show = MenuItem::with_id(app, "show", "Show Lumen RPC", true, None::<&str>)?;
            let palette = MenuItem::with_id(app, "palette", "Quick switch", true, None::<&str>)?;
            let clear = MenuItem::with_id(app, "clear", "Clear status", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &palette, &clear, &sep, &quit])?;

            let mut tray = TrayIconBuilder::with_id("lumen")
                .tooltip("Lumen RPC")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "show" => show_main(app),
                    "palette" => {
                        show_main(app);
                        let _ = app.emit("open-palette", ());
                    }
                    "clear" => {
                        let _ = app.emit("tray-clear", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show_main(tray.app_handle());
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
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let to_tray = window.state::<CloseToTray>().0.load(Ordering::Relaxed);
                if to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            rpc_connect,
            rpc_disconnect,
            rpc_set_activity,
            rpc_clear,
            rpc_status,
            load_state,
            save_state,
            write_text_file,
            read_text_file,
            list_processes,
            idle_seconds,
            set_close_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lumen RPC");
}
