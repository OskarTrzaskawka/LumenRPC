<p align="center">
  <img src="branding/png/banner.png" alt="Lumen RPC — your Discord status, exactly how you want it" width="100%">
</p>

<p align="center">
  <a href="https://github.com/OskarTrzaskawka/LumenRPC/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/OskarTrzaskawka/LumenRPC?style=for-the-badge&color=8B7CFF&label=release"></a>
  <a href="https://github.com/OskarTrzaskawka/LumenRPC/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/OskarTrzaskawka/LumenRPC/total?style=for-the-badge&color=4FD1C5"></a>
  <a href="https://github.com/OskarTrzaskawka/LumenRPC/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/OskarTrzaskawka/LumenRPC?style=for-the-badge&color=FBBF24"></a>
  <a href="https://github.com/OskarTrzaskawka/LumenRPC/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/OskarTrzaskawka/LumenRPC/ci.yml?style=for-the-badge&label=build"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/OskarTrzaskawka/LumenRPC?style=for-the-badge&color=94A3B8"></a>
</p>

<p align="center">
  <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D4?style=flat-square&logo=windows&logoColor=white">
  <img alt="macOS" src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri_2-24C8D8?style=flat-square&logo=tauri&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-B7410E?style=flat-square&logo=rust&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
</p>

<p align="center">
  <b>Lumen RPC</b> sets a fully custom Discord Rich Presence — with a live preview, seven timer modes,<br>
  automations that react to the apps you run, a weekly schedule and ready-made templates.
</p>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#features"><b>Features</b></a> ·
  <a href="#getting-a-client-id"><b>Client ID</b></a> ·
  <a href="#building-from-source"><b>Build</b></a>
</p>

---

## Download

Two installers for every system:

- **Full installer** – everything inside, installs offline.
- **Lite installer** – a small setup app that downloads and installs the newest version from this repository.

| | Full installer | Lite installer |
| --- | --- | --- |
| **Windows 10/11** | [`*_x64-setup.exe` / `.msi`](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest) | [`LumenRPC-Lite-Setup-windows-x64.exe`](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest/download/LumenRPC-Lite-Setup-windows-x64.exe) |
| **macOS 11+** | [`*_aarch64.dmg` (Apple Silicon) / `*_x64.dmg` (Intel)](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest) | [`LumenRPC-Lite-Setup-macos-universal.dmg`](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest/download/LumenRPC-Lite-Setup-macos-universal.dmg) |
| **Linux** | [`.AppImage` / `.deb` / `.rpm`](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest) | [`LumenRPC-Lite-Setup-linux-x86_64.AppImage`](https://github.com/OskarTrzaskawka/LumenRPC/releases/latest/download/LumenRPC-Lite-Setup-linux-x86_64.AppImage) |

> [!NOTE]
> The builds are not code-signed yet. On Windows click **More info → Run anyway**; on macOS right-click the app and choose **Open** the first time.

## Features

| | |
| --- | --- |
| **Bring your own app** | Paste the Application ID from the Discord Developer Portal; Lumen shows the app’s name, icon and your uploaded images. |
| **Studio editor** | Playing / Listening / Watching / Competing, what the member list shows, details and state with optional links, large and small images with hover text, party size and two buttons — with a live preview. |
| **7 timer modes** | No timer · since app start · since the status was set · **your local time** · custom start date · countdown · “started X minutes ago”. |
| **Variables** | `{time}`, `{date}`, `{day}` and `{profile}` refresh on their own. |
| **Automations** | “When `code.exe` is running → show *Coding*”, “idle for 10 minutes → show *AFK*”. |
| **Weekly schedule** | Plan statuses on a timeline; manual switches still win for a while. |
| **Templates** | Start from ready-made statuses, import and export profiles as JSON. |
| **Quick switch** | `Ctrl+K` inside the app, `Ctrl+Shift+Space` from anywhere. |
| **Runs quietly** | Tray icon, start with your computer, reconnects when Discord restarts. |

## Getting a Client ID

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. The name you choose appears after “Playing”.
2. Copy the **Application ID** from *General Information*.
3. Optional: upload images under **Rich Presence → Art Assets** — Lumen lists them automatically.
4. Paste the ID into Lumen RPC and click **Connect**. Keep the Discord desktop app running.

## Building from source

Requirements: Node.js 20+, Rust (stable, via [rustup](https://rustup.rs)) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run tauri dev        # run the app
npm run tauri build      # full installers → src-tauri/target/release/bundle
npm run build:demo       # browser demo with a simulated Discord connection
node scripts/render-branding.mjs   # re-render logo, banners and installer artwork

# lite installer
cd installer && node ../node_modules/@tauri-apps/cli/tauri.js build
```

Releases are built by GitHub Actions: push a tag such as `v0.1.0` and every installer for Windows, macOS and Linux is attached to a draft release.

<details>
<summary><b>Project layout</b></summary>

| Path | What it is |
| --- | --- |
| `src-tauri/src/rpc.rs` | Discord IPC client (named pipe / Unix socket, auto-reconnect) |
| `src-tauri/src/system.rs` | Running apps and idle time for automations |
| `src-tauri/src/lib.rs` | Tray, commands and plugins |
| `src/lib/activity.ts` | Presence payload, timer modes and validation |
| `src/lib/engine.ts` | Picks the live profile (manual / automation / schedule) and sends it |
| `src/pages/` | Connect, Studio, Automations, Schedule, Templates, Settings |
| `installer/` | Lite web installer |
| `branding/` | Logo, banners and installer artwork (SVG sources + rendered PNG) |

</details>

## Star history

<a href="https://star-history.com/#OskarTrzaskawka/LumenRPC&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=OskarTrzaskawka/LumenRPC&type=Date&theme=dark">
    <img alt="Star history chart" src="https://api.star-history.com/svg?repos=OskarTrzaskawka/LumenRPC&type=Date" width="600">
  </picture>
</a>

If Lumen RPC is useful to you, a ⭐ helps other people find it.

## License

[MIT](LICENSE)

---

<p align="center">
  <img src="branding/png/logo-256.png" alt="" width="48"><br>
  Made by <a href="https://github.com/OskarTrzaskawka"><b>Oskar Trzaskawka</b></a>
</p>
