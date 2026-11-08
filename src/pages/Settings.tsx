import { useEffect, useState } from "react";
import { Keyboard, LogOut, Palette as PaletteIcon, Plug, SlidersHorizontal, Info } from "lucide-react";
import { platform } from "../lib/platform";
import { useStore } from "../lib/store";
import { Button, Card, Field, PageHeader, TextInput, Toggle, cx } from "../components/ui";

export const AUTHOR_URL = "https://github.com/OskarTrzaskawka";
export const REPO_URL = "https://github.com/OskarTrzaskawka/LumenRPC";
const ACCENTS =["#8B7CFF", "#4FD1C5", "#FF8A4C", "#F472B6", "#A3E635", "#60A5FA"];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const app = useStore((s) => s.app);
  const clientId = useStore((s) => s.clientId);
  const status = useStore((s) => s.status);
  const { setSettings } = useStore.getState();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    platform.getAutostart().then(setAutostart, () => {});
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-7">
      <PageHeader title="Settings" />
      <div className="grid max-w-[1100px] grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Connection" icon={<Plug size={15} aria-hidden="true" />}>
          <div className="flex items-center gap-3">
            {app?.icon ? (
              <img src={`https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=64`} alt="" className="h-11 w-11 rounded-xl" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/20 font-display text-lg font-semibold text-accent">{(app?.name ?? "?").charAt(0)}</span>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{app?.name ?? "Unknown application"}</div>
              <div className="truncate font-mono text-xs text-muted">{clientId}</div>
            </div>
            <span className={cx("ml-auto rounded-full px-2.5 py-1 text-xs", status.state === "connected" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn")}>
              {status.state === "connected" ? "Connected" : "Waiting for Discord"}
            </span>
          </div>
          <div className="mt-4">
            <Toggle checked={settings.autoConnect} onChange={(v) => setSettings({ autoConnect: v })} label="Connect automatically on launch" />
          </div>
          <Button variant="danger" className="mt-3" onClick={() => void platform.disconnect()}>
            <LogOut size={16} aria-hidden="true" /> Disconnect / change Client ID
          </Button>
        </Card>

        <Card title="Behaviour" icon={<SlidersHorizontal size={15} aria-hidden="true" />}>
          <div className="flex flex-col divide-y divide-line">
            <Toggle
              checked={autostart}
              onChange={async (v) => {
                await platform.setAutostart(v);
                setAutostart(v);
              }}
              label="Start with your computer"
              description="Starts hidden in the tray"
            />
            <Toggle checked={settings.closeToTray} onChange={(v) => setSettings({ closeToTray: v })} label="Closing the window keeps Lumen in the tray" />
            <Toggle checked={settings.liveUpdate} onChange={(v) => setSettings({ liveUpdate: v })} label="Live update" description="Edits to the live profile reach Discord as you type" />
            <div className="flex min-h-11 items-center justify-between gap-4 pt-2">
              <span className="flex flex-col">
                <span className="text-sm">Manual switch overrides for</span>
                <span className="text-xs text-muted">Automations and schedule pause after you pick a status yourself</span>
              </span>
              <span className="flex items-center gap-2">
                <TextInput
                  type="number"
                  min={0}
                  aria-label="Override minutes"
                  value={settings.overrideMinutes}
                  onChange={(e) => setSettings({ overrideMinutes: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20"
                />
                <span className="text-sm text-muted">min</span>
              </span>
            </div>
          </div>
        </Card>

        <Card title="Appearance" icon={<PaletteIcon size={15} aria-hidden="true" />}>
          <div className="text-sm text-subtle">Accent color</div>
          <div className="mt-3 flex gap-2.5" role="radiogroup" aria-label="Accent color">
            {ACCENTS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={settings.accent === c}
                aria-label={`Accent ${c}`}
                onClick={() => setSettings({ accent: c })}
                className={cx("h-10 w-10 cursor-pointer rounded-xl border-2 transition-transform hover:scale-105", settings.accent === c ? "border-text" : "border-transparent")}
                style={{ background: c }}
              />
            ))}
          </div>
        </Card>

        <Card title="Shortcuts" icon={<Keyboard size={15} aria-hidden="true" />}>
          <Field label="Global quick-switch shortcut" hint="Works from anywhere, even when Lumen is in the tray. Inside the app, Ctrl+K also works.">
            <TextInput value={settings.shortcut} onChange={(e) => setSettings({ shortcut: e.target.value })} className="font-mono text-[13px]" />
          </Field>
        </Card>

        <Card title="About" icon={<Info size={15} aria-hidden="true" />}>
          <p className="text-sm leading-relaxed text-subtle">
            Lumen RPC 0.1.0 — Tauri 2, Rust and React 19. Talks to the Discord desktop app over local IPC; nothing leaves your computer except Discord API lookups for your application’s
            name and images.
          </p>
          <p className="mt-3 text-sm text-subtle">
            Made by{" "}
            <button onClick={() => void platform.openUrl(AUTHOR_URL)} className="cursor-pointer font-medium text-accent hover:underline">
              Oskar Trzaskawka
            </button>
            {" · "}
            <button onClick={() => void platform.openUrl(REPO_URL)} className="cursor-pointer font-medium text-accent hover:underline">
              GitHub
            </button>
          </p>
          {platform.isDemo && <p className="mt-3 text-sm text-warn">You’re viewing the browser demo — the Discord connection is simulated.</p>}
        </Card>
      </div>
    </div>
  );
}
