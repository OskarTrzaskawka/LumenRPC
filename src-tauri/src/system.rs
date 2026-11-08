//! OS helpers used by automations: running processes and user idle time.

use std::collections::BTreeSet;

#[cfg(windows)]
pub fn processes() -> Vec<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let out = std::process::Command::new("tasklist")
        .args(["/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let Ok(out) = out else { return vec![] };
    let text = String::from_utf8_lossy(&out.stdout);
    let set: BTreeSet<String> = text
        .lines()
        .filter_map(|l| l.split("\",\"").next())
        .map(|n| n.trim_matches('"').to_lowercase())
        .filter(|n| !n.is_empty())
        .collect();
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
