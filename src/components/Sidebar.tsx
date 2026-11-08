import { CalendarDays, LayoutGrid, Pencil, Plus, Settings, Zap, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "../lib/store";
import type { Page } from "../lib/types";
import { LogoMark } from "./art";
import { ProfileBadge, cx } from "./ui";

const NAV: { page: Page; label: string; icon: ReactNode }[] = [
  { page: "editor", label: "Studio", icon: <Pencil size={17} aria-hidden="true" /> },
  { page: "automations", label: "Automations", icon: <Zap size={17} aria-hidden="true" /> },
  { page: "schedule", label: "Schedule", icon: <CalendarDays size={17} aria-hidden="true" /> },
  { page: "gallery", label: "Templates", icon: <LayoutGrid size={17} aria-hidden="true" /> },
  { page: "settings", label: "Settings", icon: <Settings size={17} aria-hidden="true" /> },
];

const SOURCE_LABEL = { manual: "Live", override: "Live · manual", automation: "Live · automation", schedule: "Live · schedule" };

export function Sidebar() {
  const profiles = useStore((s) => s.profiles);
  const editingId = useStore((s) => s.editingId);
  const page = useStore((s) => s.page);
  const effective = useStore((s) => s.effective);
  const paused = useStore((s) => s.paused);
  const status = useStore((s) => s.status);
  const { edit, addProfile, setPage, set } = useStore.getState();
  const user = status.user;
  const avatar = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null;

  return (
    <nav aria-label="Main" className="flex w-[264px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <LogoMark size={26} />
        <span className="font-display text-[17px] font-semibold tracking-tight">Lumen RPC</span>
      </div>

      <div className="px-3">
        <button
          onClick={() => set({ paletteOpen: true })}
          className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-card px-3 text-sm text-muted transition-colors hover:text-text"
        >
          <Search size={15} aria-hidden="true" />
          Quick switch
          <kbd className="ml-auto rounded-md bg-raised px-1.5 py-0.5 font-sans text-[11px] text-subtle">Ctrl K</kbd>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between px-5 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Profiles</span>
        <button aria-label="New profile" onClick={() => addProfile()} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {profiles.map((p) => {
          const live = effective.profileId === p.id && !paused && status.state === "connected";
          const selected = editingId === p.id && page === "editor";
          return (
            <button
              key={p.id}
              onClick={() => edit(p.id)}
              className={cx(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                selected ? "bg-raised" : "hover:bg-card",
              )}
            >
              <ProfileBadge name={p.name} color={p.color} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className={cx("truncate text-xs", live ? "text-ok" : "text-muted")}>
                  {live ? SOURCE_LABEL[effective.source] : p.details || "No details"}
                </span>
              </span>
              {live && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-0.5 border-t border-line px-3 py-3">
        {NAV.map((n) => (
          <button
            key={n.page}
            onClick={() => setPage(n.page)}
            aria-current={page === n.page ? "page" : undefined}
            className={cx(
              "flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors",
              page === n.page ? "bg-accent/15 text-text" : "text-subtle hover:bg-card hover:text-text",
            )}
          >
            <span className={page === n.page ? "text-accent" : ""}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt="" className="h-9 w-9 rounded-full" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-sm font-semibold text-subtle">
              {(user?.global_name || user?.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className={cx(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-panel",
              status.state === "connected" ? "bg-ok" : status.state === "connecting" ? "bg-warn" : "bg-bad",
            )}
          />
        </div>
        <div className="min-w-0 text-sm leading-tight">
          <div className="truncate font-medium">{user?.global_name || user?.username || "Not connected"}</div>
          <div className="truncate text-xs text-muted">
            {status.state === "connected" ? "Connected to Discord" : status.state === "connecting" ? "Waiting for Discord…" : "Offline"}
          </div>
        </div>
      </div>
    </nav>
  );
}
