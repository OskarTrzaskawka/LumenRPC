import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppInfo, Asset, RpcStatus } from "./types";

/** Everything the UI needs from the host. The demo implementation lets the UI run in a plain browser. */
export interface Platform {
  isDemo: boolean;
  connect(clientId: string): Promise<void>;
  disconnect(): Promise<void>;
  setActivity(activity: unknown): Promise<void>;
  clear(): Promise<void>;
  status(): Promise<RpcStatus>;
  onStatus(cb: (s: RpcStatus) => void): () => void;
  onActivityResult(cb: (r: { ok: boolean; message?: string }) => void): () => void;
  onTrayClear(cb: () => void): () => void;
  onOpenPalette(cb: () => void): () => void;
  loadState(): Promise<string | null>;
  saveState(data: string): Promise<void>;
  processes(): Promise<string[]>;
  idleSeconds(): Promise<number | null>;
  fetchApp(id: string): Promise<AppInfo | null>;
  fetchAssets(id: string): Promise<Asset[]>;
  openUrl(url: string): Promise<void>;
  exportFile(name: string, contents: string): Promise<boolean>;
  importFile(): Promise<string | null>;
  setCloseToTray(v: boolean): Promise<void>;
  getAutostart(): Promise<boolean>;
  setAutostart(v: boolean): Promise<void>;
  registerShortcut(accelerator: string, cb: () => void): Promise<() => void>;
}

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function sub<T>(event: string, cb: (payload: T) => void): () => void {
  const p = listen<T>(event, (e) => cb(e.payload));
  return () => void p.then((un) => un());
}

async function discordGet<T>(path: string): Promise<T | null> {
  const { fetch } = await import("@tauri-apps/plugin-http");
  const res = await fetch(`https://discord.com/api/v10${path}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const tauriPlatform: Platform = {
  isDemo: false,
  connect: (clientId) => invoke("rpc_connect", { clientId }),
  disconnect: () => invoke("rpc_disconnect"),
  setActivity: (activity) => invoke("rpc_set_activity", { activity }),
  clear: () => invoke("rpc_clear"),
  status: () => invoke<RpcStatus>("rpc_status"),
  onStatus: (cb) => sub("rpc-status", cb),
  onActivityResult: (cb) => sub("rpc-activity", cb),
  onTrayClear: (cb) => sub("tray-clear", cb),
  onOpenPalette: (cb) => sub("open-palette", cb),
  loadState: () => invoke<string | null>("load_state"),
  saveState: (data) => invoke("save_state", { data }),
  processes: () => invoke<string[]>("list_processes"),
  idleSeconds: () => invoke<number | null>("idle_seconds"),
  async fetchApp(id) {
    try {
      const a = await discordGet<{ id: string; name: string; icon: string | null }>(`/applications/${id}/rpc`);
      return a ? { id: a.id, name: a.name, icon: a.icon } : null;
    } catch {
      return null;
    }
  },
  async fetchAssets(id) {
    try {
      const list = await discordGet<{ id: string; name: string }[]>(`/oauth2/applications/${id}/assets`);
      return (list ?? []).map((a) => ({ id: a.id, name: a.name }));
    } catch {
      return [];
    }
  },
  async openUrl(url) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  },
  async exportFile(name, contents) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: name, filters: [{ name: "Lumen RPC", extensions: ["json"] }] });
    if (!path) return false;
    await invoke("write_text_file", { path, contents });
    return true;
  },
  async importFile() {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "Lumen RPC", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return null;
    return invoke<string>("read_text_file", { path });
  },
  setCloseToTray: (value) => invoke("set_close_to_tray", { value }),
  async getAutostart() {
    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    return isEnabled();
  },
  async setAutostart(v) {
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    await (v ? enable() : disable());
  },
  async registerShortcut(accelerator, cb) {
    const gs = await import("@tauri-apps/plugin-global-shortcut");
    if (await gs.isRegistered(accelerator)) await gs.unregister(accelerator);
    await gs.register(accelerator, (e) => {
      if (e.state === "Pressed") cb();
    });
    return () => void gs.unregister(accelerator);
  },
};

/* ---------------- Demo (browser) ---------------- */

const listeners = new Set<(s: RpcStatus) => void>();
const resultListeners = new Set<(r: { ok: boolean; message?: string }) => void>();
let demoStatus: RpcStatus = { state: "disconnected" };
const setDemo = (s: RpcStatus) => {
  demoStatus = s;
  listeners.forEach((l) => l(s));
};

const demoPlatform: Platform = {
  isDemo: true,
  async connect(clientId) {
    if (!/^\d{17,20}$/.test(clientId.trim())) throw "Client ID must be 17–20 digits (the Application ID from the Developer Portal)";
    setDemo({ state: "connecting" });
    setTimeout(() => setDemo({ state: "connected", user: { id: "1", username: "lumen_demo", global_name: "You (demo)", avatar: null } }), 900);
  },
  async disconnect() {
    setDemo({ state: "disconnected" });
  },
  async setActivity() {
    setTimeout(() => resultListeners.forEach((l) => l({ ok: true })), 250);
  },
  async clear() {},
  status: async () => demoStatus,
  onStatus(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  onActivityResult(cb) {
    resultListeners.add(cb);
    return () => resultListeners.delete(cb);
  },
  onTrayClear: () => () => {},
  onOpenPalette: () => () => {},
  async loadState() {
    try {
      return localStorage.getItem("lumen-demo");
    } catch {
      return null;
    }
  },
  async saveState(data) {
    try {
      localStorage.setItem("lumen-demo", data);
    } catch {
      /* storage unavailable — demo keeps working */
    }
  },
  processes: async () => ["code.exe", "discord.exe", "spotify.exe", "obs64.exe", "explorer.exe", "steam.exe"],
  idleSeconds: async () => 0,
  fetchApp: async (id) => (/^\d{17,20}$/.test(id) ? { id, name: "My Application", icon: null } : null),
  fetchAssets: async () => [
    { id: "a1", name: "logo" },
    { id: "a2", name: "code" },
    { id: "a3", name: "game" },
    { id: "a4", name: "music" },
  ],
  async openUrl(url) {
    window.open(url, "_blank", "noopener");
  },
  async exportFile(name, contents) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return true;
  },
  importFile() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        f.text().then(resolve, () => resolve(null));
      };
      input.click();
    });
  },
  setCloseToTray: async () => {},
  getAutostart: async () => false,
  setAutostart: async () => {},
  registerShortcut: async () => () => {},
};

export const platform: Platform = isTauri ? tauriPlatform : demoPlatform;
