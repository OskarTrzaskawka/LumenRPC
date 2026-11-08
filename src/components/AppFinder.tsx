import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Gamepad2, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { appIcon, loadGames, searchCatalog, type CatalogApp, type CatalogCategory } from "../lib/appCatalog";
import { KNOWN_APPS } from "../lib/knownApps";
import { cx } from "./ui";

const TABS: ("All" | CatalogCategory)[] = ["All", "Game", "Music", "Video", "Social", "Developer", "Creative", "Learning", "Other"];
const TAB_LABEL: Record<string, string> = { All: "All", Game: "Games", Music: "Music", Video: "Video", Social: "Social", Developer: "Developer", Creative: "Creative", Learning: "Learning", Other: "Other" };

function AppTile({ app, selected, onPick }: { app: CatalogApp; selected: boolean; onPick: () => void }) {
  const [broken, setBroken] = useState(false);
  const src = appIcon(app, 64);
  return (
    <button
      onClick={onPick}
      className={cx(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
        selected ? "border-accent bg-accent/10" : "border-line bg-card hover:bg-raised",
      )}
    >
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-lg" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised font-display text-sm font-semibold text-subtle">
          {app.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{app.name}</span>
        <span className="block truncate text-xs text-muted">{app.category === "Game" ? "Game" : app.category}</span>
      </span>
      {selected && <Check size={16} className="shrink-0 text-accent" aria-hidden="true" />}
    </button>
  );
}

/** Pick any game Discord detects or a popular app (YouTube, Twitch, VS Code…) and use its Application ID. */
export function AppFinder({ open, current, onClose, onPick }: { open: boolean; current?: string; onClose: () => void; onPick: (app: CatalogApp) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [games, setGames] = useState<CatalogApp[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = (force = false) => {
    setState("loading");
    loadGames(force).then(
      (g) => {
        setGames(g);
        setState("ready");
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      },
    );
  };

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    if (state === "idle") load();
  }, [open]);

  const results = useMemo(() => {
    const pool = tab === "All" ? [...KNOWN_APPS, ...games] : tab === "Game" ? games : KNOWN_APPS.filter((a) => a.category === tab);
    return searchCatalog(pool, q, 90);
  }, [q, tab, games]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[8vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a game or app"
            initial={{ y: -10, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -6, scale: 0.98 }}
            className="flex max-h-[80vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line p-5 pb-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Choose a game or app</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Your status will say “Playing …” with this name and icon. Uses the app’s real Discord Application ID.
                </p>
              </div>
              <button aria-label="Close" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text">
                <X size={18} />
              </button>
            </header>

            <div className="flex flex-col gap-3 px-5 pt-4">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 focus-within:border-accent">
                <Search size={16} className="text-muted" aria-hidden="true" />
                <span className="sr-only">Search games and apps</span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search 25,000+ games and popular apps…"
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
                />
                {state === "loading" && <LoaderCircle size={16} className="animate-spin text-muted" aria-label="Loading games" />}
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
                {TABS.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cx(
                      "h-8 shrink-0 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors",
                      tab === t ? "border-accent bg-accent text-bg" : "border-line text-subtle hover:bg-raised",
                    )}
                  >
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
              {state === "error" && (tab === "Game" || tab === "All") && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-[13px] text-warn">
                  {error}
                  <button onClick={() => load(true)} className="flex cursor-pointer items-center gap-1.5 font-medium hover:underline">
                    <RefreshCw size={14} aria-hidden="true" /> Retry
                  </button>
                </div>
              )}
              {results.length === 0 && state !== "loading" ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted">
                  <Gamepad2 size={28} aria-hidden="true" />
                  Nothing found for “{q}”. You can still paste any Application ID by hand.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((a) => (
                    <AppTile key={`${a.category}-${a.id}`} app={a} selected={a.id === current} onPick={() => onPick(a)} />
                  ))}
                </div>
              )}
            </div>
            <footer className="border-t border-line px-5 py-3 text-xs text-muted">
              You can’t upload images to someone else’s app — use image links (https://…) for pictures instead.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
