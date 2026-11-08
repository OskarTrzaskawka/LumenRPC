//! OS helpers used by automations: running processes and user idle time.

use std::collections::BTreeSet;

/// Reads the process list straight from the kernel (Toolhelp snapshot) — far cheaper than spawning `tasklist`.
#[cfg(windows)]
pub fn processes() -> Vec<String> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
    };
    let mut set = BTreeSet::new();
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap == INVALID_HANDLE_VALUE {
            return vec![];
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snap, &mut entry) != 0 {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_lowercase();
                if !name.is_empty() {
                    set.insert(name);
                }
                if Process32NextW(snap, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snap);
    }
    set.into_iter().collect()
}

#[cfg(target_os = "macos")]
pub fn processes() -> Vec<String> {
    let Ok(out) = std::process::Command::new("ps").args(["-axco", "comm="]).output() else { return vec![] };
    let set: BTreeSet<String> = String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(|l| l.trim().to_lowercase())
        .filter(|l| !l.is_empty())
        .collect();
    set.into_iter().collect()
}

#[cfg(all(unix, not(target_os = "macos")))]
pub fn processes() -> Vec<String> {
    let mut set = BTreeSet::new();
    if let Ok(dir) = std::fs::read_dir("/proc") {
        for e in dir.flatten() {
            let name = e.file_name();
            if !name.to_string_lossy().chars().all(|c| c.is_ascii_digit()) {
                continue;
            }
            if let Ok(comm) = std::fs::read_to_string(e.path().join("comm")) {
                let c = comm.trim().to_lowercase();
                if !c.is_empty() {
                    set.insert(c);
                }
            }
        }
    }
    set.into_iter().collect()
}

#[cfg(windows)]
pub fn idle_seconds() -> Option<u64> {
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO { cbSize: size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    unsafe {
        if GetLastInputInfo(&mut info) == 0 {
            return None;
        }
        Some((GetTickCount().wrapping_sub(info.dwTime) / 1000) as u64)
    }
}

/// Idle time is not portable on Linux (X11 vs Wayland); automations hide the idle trigger there.
#[cfg(unix)]
pub fn idle_seconds() -> Option<u64> {
    None
}
