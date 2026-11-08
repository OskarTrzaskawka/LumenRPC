import { create } from "zustand";
import {
  defaultPersisted,
  defaultSettings,
  newProfile,
  uid,
  type AppInfo,
  type Asset,
  type Page,
  type Persisted,
  type Profile,
  type RpcStatus,
  type Rule,
  type ScheduleBlock,
  type Settings,
} from "./types";
import { platform } from "./platform";

export type Source = "manual" | "override" | "automation" | "schedule";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error" | "info";
}

interface Runtime {
  loaded: boolean;
  status: RpcStatus;
  app: AppInfo | null;
  assets: Asset[];
  page: Page;
  editingId: string | null;
  paletteOpen: boolean;
  paused: boolean;
  overrideUntil: number;
  appStart: number;
  profileStart: number;
  effective: { profileId: string | null; source: Source };
  lastResult: { ok: boolean; message?: string; at: number } | null;
  processes: string[];
  idle: number | null;
  toasts: Toast[];
}

interface Actions {
  hydrate(p: Persisted): void;
  setStatus(s: RpcStatus): void;
  setPage(p: Page): void;
  edit(id: string): void;
  updateProfile(id: string, patch: Partial<Profile>): void;
  addProfile(p?: Partial<Profile>): string;
  duplicateProfile(id: string): void;
  deleteProfile(id: string): void;
  activate(id: string): void;
  setPaused(v: boolean): void;
  setRules(r: Rule[]): void;
  setSchedule(b: ScheduleBlock[]): void;
  setSettings(s: Partial<Settings>): void;
  setClientId(id: string, app?: AppInfo | null): void;
  toast(text: string, tone?: Toast["tone"]): void;
  set(partial: Partial<Runtime & Persisted>): void;
}

export type Store = Persisted & Runtime & Actions;

let toastSeq = 0;

export const useStore = create<Store>()((set, get) => ({
  ...defaultPersisted(),
  loaded: false,
  status: { state: "disconnected" },
  app: null,
  assets: [],
  page: "editor",
  editingId: null,
  paletteOpen: false,
  paused: false,
  overrideUntil: 0,
  appStart: Date.now(),
  profileStart: Date.now(),
  effective: { profileId: null, source: "manual" },
  lastResult: null,
  processes: [],
  idle: null,
  toasts: [],

  hydrate(p) {
    const base = defaultPersisted();
    const profiles = p.profiles?.length ? p.profiles.map((x) => newProfile({ ...x, id: x.id })) : base.profiles;
    set({
      ...base,
      ...p,
      profiles,
      settings: { ...defaultSettings, ...p.settings },
      editingId: p.activeProfileId ?? profiles[0]?.id ?? null,
      loaded: true,
    });
  },
  setStatus: (status) => set({ status }),
  setPage: (page) => set({ page }),
  edit: (id) => set({ editingId: id, page: "editor" }),
  updateProfile: (id, patch) => set({ profiles: get().profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
  addProfile(patch) {
    const p = newProfile(patch);
    set({ profiles: [...get().profiles, p], editingId: p.id, page: "editor" });
    return p.id;
  },
  duplicateProfile(id) {
    const src = get().profiles.find((p) => p.id === id);
    if (!src) return;
    const copy = { ...structuredClone(src), id: uid(), name: `${src.name} (copy)` };
    set({ profiles: [...get().profiles, copy], editingId: copy.id });
  },
  deleteProfile(id) {
    const s = get();
    if (s.profiles.length <= 1) return s.toast("Keep at least one profile", "error");
    const profiles = s.profiles.filter((p) => p.id !== id);
    set({
      profiles,
      editingId: s.editingId === id ? profiles[0].id : s.editingId,
      activeProfileId: s.activeProfileId === id ? profiles[0].id : s.activeProfileId,
      rules: s.rules.filter((r) => r.profileId !== id),
      schedule: s.schedule.filter((b) => b.profileId !== id),
    });
  },
  activate(id) {
    const s = get();
    set({
      activeProfileId: id,
      paused: false,
      overrideUntil: Date.now() + s.settings.overrideMinutes * 60_000,
    });
  },
  setPaused: (paused) => set({ paused }),
  setRules: (rules) => set({ rules }),
  setSchedule: (schedule) => set({ schedule }),
  setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
  setClientId(id, app) {
    const s = get();
    const recent = app
      ? [{ id, name: app.name, icon: app.icon }, ...s.recentClients.filter((r) => r.id !== id)].slice(0, 5)
      : s.recentClients;
    set({ clientId: id, recentClients: recent });
  },
  toast(text, tone = "info") {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3500);
  },
  set: (partial) => set(partial),
}));

export function persistedSlice(s: Store): Persisted {
  return {
    version: 1,
    clientId: s.clientId,
    recentClients: s.recentClients,
    profiles: s.profiles,
    activeProfileId: s.activeProfileId,
    rules: s.rules,
    schedule: s.schedule,
    settings: s.settings,
  };
}

/** Load saved state and keep saving it (debounced) on every change. */
export async function initPersistence() {
  try {
    const raw = await platform.loadState();
    useStore.getState().hydrate(raw ? (JSON.parse(raw) as Persisted) : defaultPersisted());
  } catch {
    useStore.getState().hydrate(defaultPersisted());
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = JSON.stringify(persistedSlice(useStore.getState()));
  useStore.subscribe((s) => {
    const next = JSON.stringify(persistedSlice(s));
    if (next === last) return;
    last = next;
    clearTimeout(timer);
    timer = setTimeout(() => void platform.saveState(next), 400);
  });
}

export const useProfile = (id: string | null) => useStore((s) => s.profiles.find((p) => p.id === id) ?? null);
