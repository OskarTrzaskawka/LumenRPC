import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CircleAlert, ExternalLink, LoaderCircle, Clock3, Zap, CalendarDays, LayoutGrid } from "lucide-react";
import { platform } from "../lib/platform";
import { useStore } from "../lib/store";
import type { AppInfo } from "../lib/types";
import { LogoMark, OrbitHero } from "../components/art";
import { Button, TextInput } from "../components/ui";

const PORTAL = "https://discord.com/developers/applications";

const STEPS = [
  { title: "Open the Developer Portal", body: "Sign in and click “New Application”. Its name is what appears after “Playing”." },
  { title: "Copy the Application ID", body: "In General Information, copy the Application ID — that is your Client ID." },
  { title: "Add images (optional)", body: "Under Rich Presence → Art Assets, upload images. Lumen lists them automatically." },
];

export function Connect() {
  const status = useStore((s) => s.status);
  const savedId = useStore((s) => s.clientId);
  const recent = useStore((s) => s.recentClients);
  const [id, setId] = useState(savedId);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [lookup, setLookup] = useState<"idle" | "loading" | "found" | "missing">("idle");
  const [error, setError] = useState<string | null>(null);
  const valid = /^\d{17,20}$/.test(id.trim());

  useEffect(() => {
    setApp(null);
    if (!valid) return setLookup("idle");
    setLookup("loading");
    const t = setTimeout(async () => {
      const info = await platform.fetchApp(id.trim());
      setApp(info);
      setLookup(info ? "found" : "missing");
    }, 450);
    return () => clearTimeout(t);
  }, [id, valid]);

  const connect = async (clientId = id.trim(), info = app) => {
    setError(null);
    try {
      useStore.getState().setClientId(clientId, info ?? { id: clientId, name: `App ${clientId.slice(-4)}`, icon: null });
      await platform.connect(clientId);
    } catch (e) {
      setError(String(e));
    }
  };

  const busy = status.state === "connecting";
  const message = error ?? (status.state === "error" ? status.message : null);

  return (
    <div className="flex h-full min-h-0 flex-wrap overflow-y-auto">
      <aside className="relative flex min-w-[320px] flex-[1_1_420px] flex-col justify-between overflow-hidden border-r border-line bg-panel p-10">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-xl font-semibold tracking-tight">Lumen RPC</span>
        </div>
        <OrbitHero className="mx-auto my-8 w-full max-w-[360px]" />
        <div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-tight">Your Discord status,<br />exactly how you want it.</h1>
          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm text-subtle">
            <li className="flex items-center gap-2.5"><Clock3 size={16} className="text-accent" aria-hidden="true" />7 timer modes</li>
            <li className="flex items-center gap-2.5"><Zap size={16} className="text-accent" aria-hidden="true" />App-aware automations</li>
            <li className="flex items-center gap-2.5"><CalendarDays size={16} className="text-accent" aria-hidden="true" />Weekly schedule</li>
            <li className="flex items-center gap-2.5"><LayoutGrid size={16} className="text-accent" aria-hidden="true" />Ready-made templates</li>
          </ul>
          <p className="mt-8 text-xs text-muted">
            Made by{" "}
            <button onClick={() => void platform.openUrl("https://github.com/OskarTrzaskawka")} className="cursor-pointer font-medium text-subtle hover:text-accent hover:underline">
              Oskar Trzaskawka
            </button>
          </p>
        </div>
      </aside>

      <main className="flex min-w-[320px] flex-[1_1_520px] items-center justify-center p-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[460px]">
          <div className="text-[13px] font-semibold text-accent">Step 1 of 1</div>
          <h2 className="mt-2 font-display text-[28px] font-semibold tracking-tight">Connect your application</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Lumen RPC uses your own Discord application, so the name and images in your status are completely yours. Make sure the Discord desktop app is running.
          </p>

          <form
            className="mt-7 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) void connect();
            }}
          >
            <label htmlFor="client-id" className="text-[13px] text-subtle">Client ID (Application ID)</label>
            <TextInput
              id="client-id"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 1234567890123456789"
              value={id}
              onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
              className="h-12 font-mono text-[15px] tracking-wide"
            />

            <div className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-sm">
              {lookup === "idle" && <span className="text-muted">Paste a 17–20 digit ID to look up your application.</span>}
              {lookup === "loading" && (
                <span className="flex items-center gap-2 text-muted"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />Looking up application…</span>
              )}
              {lookup === "found" && app && (
                <>
                  {app.icon ? (
                    <img src={`https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=64`} alt="" className="h-9 w-9 rounded-lg" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 font-display font-semibold text-accent">{app.name.charAt(0)}</span>
                  )}
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{app.name}</span>
                    <span className="text-xs text-muted">Your status will read “Playing {app.name}”</span>
                  </span>
                </>
              )}
              {lookup === "missing" && <span className="text-warn">Couldn’t look this ID up — you can still try to connect.</span>}
            </div>

            {message && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2.5 text-sm text-bad">
                <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {message}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={!valid || busy} className="h-12 text-[15px]">
              {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? "Connecting…" : "Connect"}
              {!busy && <ArrowRight size={18} aria-hidden="true" />}
            </Button>
            {platform.isDemo && (
              <button type="button" onClick={() => setId("1234567890123456789")} className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-text hover:underline">
                Demo mode — fill in a sample ID
              </button>
            )}
          </form>

          {recent.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs text-muted">Recent applications</div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setId(r.id);
                      void connect(r.id, r);
                    }}
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm text-subtle hover:bg-raised hover:text-text"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ol className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-subtle">{i + 1}</span>
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
          <Button variant="ghost" className="mt-4 -ml-3" onClick={() => void platform.openUrl(PORTAL)}>
            Open Developer Portal <ExternalLink size={15} aria-hidden="true" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
