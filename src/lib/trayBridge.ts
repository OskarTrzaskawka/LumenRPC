import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { ACTIVITY_LABEL, assetUrl, fillVars, timestamps } from "./activity";
import { isTauri } from "./platform";
import { useStore, type Source, type Store } from "./store";
import type { ConnectionState, Page } from "./types";

/** Everything the tray panel shows. The main window owns the state; the panel only renders this. */
export interface TraySnapshot {
  status: ConnectionState;
  user: { name: string; avatar: string | null } | null;
  app: { name: string; icon: string | null } | null;
  profiles: { id: string; name: string; color: string; details: string }[];
  liveId: string | null;
  source: Source;
  paused: boolean;
  live: { name: string; color: string; verb: string; details: string; state: string; start?: number; end?: number; image: string | null } | null;
  automations: boolean;
  schedule: boolean;
  accent: string;
}

export type TrayAction =
  | { type: "activate"; id: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "automations"; value: boolean }
  | { type: "schedule"; value: boolean }
  | { type: "open"; page?: Page }
  | { type: "palette" }
  | { type: "quit" };

export function buildSnapshot(s: Store): TraySnapshot {
  const p = s.profiles.find((x) => x.id === s.effective.profileId) ?? null;
  const u = s.status.user;
  const now = new Date();
  const appIcon = s.app?.icon ? `https://cdn.discordapp.com/app-icons/${s.app.id}/${s.app.icon}.png?size=128` : null;
  return {
    status: s.status.state,
    user: u ? { name: u.global_name || u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null } : null,
    app: s.app ? { name: s.app.name, icon: appIcon } : null,
    profiles: s.profiles.map((x) => ({ id: x.id, name: x.name, color: x.color, details: x.details })),
    liveId: s.paused ? null : s.effective.profileId,
    source: s.effective.source,
    paused: s.paused,
    live: p
      ? {
          name: p.name,
          color: p.color,
          verb: ACTIVITY_LABEL[p.activityType],
          details: fillVars(p.details, p, now),
          state: fillVars(p.state, p, now),
          ...timestamps(p, { now: Date.now(), appStart: s.appStart, profileStart: s.profileStart }),
          image: assetUrl(p.largeImage, s.app?.id, s.assets) ?? appIcon,
        }
      : null,
    automations: s.settings.automationsEnabled,
    schedule: s.settings.scheduleEnabled,
    accent: s.settings.accent,
  };
}

function tooltip(snap: TraySnapshot) {
  if (snap.status !== "connected") return "Lumen RPC — waiting for Discord";
  if (snap.paused || !snap.live) return "Lumen RPC — status cleared";
  return `Lumen RPC — ${snap.live.name}${snap.live.details ? `: ${snap.live.details}` : ""}`.slice(0, 120);
}

function handle(a: TrayAction) {
  const s = useStore.getState();
  switch (a.type) {
    case "activate":
      s.activate(a.id);
      break;
    case "pause":
      s.setPaused(true);
      break;
    case "resume":
      s.setPaused(false);
      break;
    case "automations":
      s.setSettings({ automationsEnabled: a.value });
      break;
    case "schedule":
      s.setSettings({ scheduleEnabled: a.value });
      break;
    case "open":
      if (a.page) s.setPage(a.page);
      void invoke("show_main_window");
      break;
    case "palette":
      void invoke("show_main_window");
      useStore.setState({ paletteOpen: true });
      break;
    case "quit":
      void invoke("quit_app");
      break;
  }
}

/** Runs in the main window: keeps the tray panel and the tray tooltip in sync. */
export function useTrayBridge() {
  useEffect(() => {
    if (!isTauri) return;
    let last = "";
    let lastTip = "";
    const push = (force = false) => {
      const snap = buildSnapshot(useStore.getState());
      const key = JSON.stringify(snap);
      if (!force && key === last) return;
      last = key;
      void emit("tray-state", snap);
      const tip = tooltip(snap);
      if (tip !== lastTip) {
        lastTip = tip;
        void invoke("set_tray_tooltip", { text: tip });
      }
    };
    const unsub = useStore.subscribe(() => push());
    const offs = [
      listen("tray-request-state", () => push(true)),
      listen("tray-opened", () => push(true)),
      listen<TrayAction>("tray-action", (e) => handle(e.payload)),
    ];
    // {time}/{date} variables change on their own.
    const t = setInterval(() => push(), 30_000);
    push(true);
    return () => {
      unsub();
      clearInterval(t);
      offs.forEach((p) => void p.then((un) => un()));
    };
  }, []);
}
