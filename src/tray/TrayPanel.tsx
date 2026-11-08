import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppWindow, CalendarDays, CirclePause, CirclePlay, Command, ImageIcon, Power, Zap } from "lucide-react";
import { formatDuration } from "../lib/activity";
import { buildSnapshot, type TrayAction, type TraySnapshot } from "../lib/trayBridge";
import { isTauri } from "../lib/platform";
import { useStore } from "../lib/store";
import { defaultPersisted } from "../lib/types";
import { useNow } from "../components/Preview";
import { LogoMark } from "../components/art";
import { ProfileBadge, cx } from "../components/ui";

const send = (a: TrayAction) => void (isTauri && emit("tray-action", a));
const hide = () => void (isTauri && getCurrentWindow().hide());

function Switch({ on, onChange, label, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; icon: React.ReactNode }) {
  return (
    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-xl bg-card px-3 text-[13px] text-subtle hover:bg-raised">
      <span className={on ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-accent" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-text transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function FooterButton({ label, icon, onClick, danger }: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
        danger ? "text-muted hover:bg-bad/10 hover:text-bad" : "text-subtle hover:bg-raised hover:text-text",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** The panel that opens when you right-click the Lumen icon in the Windows tray. */
export function TrayPanel() {
  const [snap, setSnap] = useState<TraySnapshot | null>(null);
  const now = useNow();

  useEffect(() => {
    if (!isTauri) {
      // Browser preview of the panel with sample data.
      const s = useStore.getState();
      s.hydrate(defaultPersisted());
      useStore.setState({ status: { state: "connected", user: { id: "1", username: "lumen_demo", global_name: "You" } }, app: { id: "1", name: "Lumen RPC", icon: null } });
      setSnap(buildSnapshot({ ...useStore.getState(), effective: { profileId: s.profiles[0].id, source: "manual" } }));
      return;
    }
    const off = listen<TraySnapshot>("tray-state", (e) => setSnap(e.payload));
    void emit("tray-request-state");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => {
      void off.then((u) => u());
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (snap) document.documentElement.style.setProperty("--accent", snap.accent);
  }, [snap?.accent]);

  if (!snap) return null;
  const live = snap.live;
  const connected = snap.status === "connected";
  const isLive = connected && !snap.paused && !!live;
  let timer: string | null = null;
  if (isLive && live?.end) timer = `${formatDuration(live.end - now)} left`;
  else if (isLive && live?.start) timer = `${formatDuration(now - live.start)} elapsed`;

  return (
    <div className="h-full max-h-[560px] w-full max-w-[380px] p-2.5">
      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[20px] border border-line bg-panel p-3.5 shadow-[0_12px_40px_rgba(0,0,0,.55)]">
        <header className="flex items-center gap-2.5 px-1">
          <LogoMark size={22} />
          <span className="font-display text-[15px] font-semibold">Lumen RPC</span>
          <span
            className={cx(
              "ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isLive ? "bg-ok/15 text-ok" : connected ? "bg-raised text-subtle" : "bg-warn/15 text-warn",
            )}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", isLive ? "bg-ok" : connected ? "bg-muted" : "bg-warn")} />
            {isLive ? "Live" : connected ? "Paused" : "Offline"}
          </span>
        </header>

        <section className="flex items-center gap-3 rounded-2xl bg-card p-3" aria-label="Current status">
          {live?.image ? (
            <img src={live.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `color-mix(in oklab, ${live?.color ?? "#8b7cff"} 26%, #1c1d2a)`, color: live?.color ?? "#8b7cff" }}
            >
              <ImageIcon size={20} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            {!connected ? (
              <>
                <div className="text-sm font-semibold">Waiting for Discord</div>
                <div className="mt-1 text-xs text-muted">Open the Discord desktop app.</div>
              </>
            ) : !isLive ? (
              <>
                <div className="text-sm font-semibold">Status cleared</div>
                <div className="mt-1 text-xs text-muted">Pick a profile below to go live.</div>
              </>
            ) : (
              <>
                <div className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                  {live!.verb} {snap.app?.name}
                </div>
                <div className="mt-1 truncate text-sm font-semibold">{live!.details || live!.name}</div>
                {live!.state && <div className="truncate text-xs text-subtle">{live!.state}</div>}
                {timer && <div className="mt-0.5 text-xs tabular-nums text-muted">{timer}</div>}
              </>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Profiles</span>
          {snap.source !== "manual" && isLive && (
            <span className="text-[11px] text-muted">{snap.source === "automation" ? "Set by automation" : snap.source === "schedule" ? "Set by schedule" : "Manual override"}</span>
          )}
        </div>
        <div className="-mr-1 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1">
          {snap.profiles.map((p) => {
            const active = p.id === snap.liveId;
            return (
              <button
                key={p.id}
                onClick={() => send(active ? { type: "pause" } : { type: "activate", id: p.id })}
                title={active ? "Click to clear" : `Set “${p.name}”`}
                className={cx(
                  "flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 text-left transition-colors",
                  active ? "border-accent bg-accent/12" : "border-transparent bg-card hover:bg-raised",
                )}
              >
                <ProfileBadge name={p.name} color={p.color} size={30} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-medium">{p.name}</span>
                  <span className={cx("block truncate text-[11px]", active ? "text-ok" : "text-muted")}>{active ? "Live now" : p.details || "No details"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Switch on={snap.automations} onChange={(v) => send({ type: "automations", value: v })} label="Automations" icon={<Zap size={15} aria-hidden="true" />} />
          <Switch on={snap.schedule} onChange={(v) => send({ type: "schedule", value: v })} label="Schedule" icon={<CalendarDays size={15} aria-hidden="true" />} />
        </div>

        <footer className="-mx-1 flex gap-1 border-t border-line pt-2">
          {snap.paused ? (
            <FooterButton label="Resume" icon={<CirclePlay size={18} />} onClick={() => send({ type: "resume" })} />
          ) : (
            <FooterButton label="Clear" icon={<CirclePause size={18} />} onClick={() => send({ type: "pause" })} />
          )}
          <FooterButton
            label="Quick switch"
            icon={<Command size={18} />}
            onClick={() => {
              send({ type: "palette" });
              hide();
            }}
          />
          <FooterButton
            label="Open"
            icon={<AppWindow size={18} />}
            onClick={() => {
              send({ type: "open" });
              hide();
            }}
          />
          <FooterButton label="Quit" danger icon={<Power size={18} />} onClick={() => send({ type: "quit" })} />
        </footer>
      </div>
    </div>
  );
}
