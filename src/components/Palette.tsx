import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, CirclePause, CirclePlay, LayoutGrid, Plus, Search, Settings, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { ProfileBadge, cx } from "./ui";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

/** Ctrl+K / global shortcut command palette for switching status in two keystrokes. */
export function Palette() {
  const open = useStore((s) => s.paletteOpen);
  const profiles = useStore((s) => s.profiles);
  const paused = useStore((s) => s.paused);
  const effective = useStore((s) => s.effective);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = () => useStore.setState({ paletteOpen: false });

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const s = useStore.getState();
    const all: Item[] = [
      ...profiles.map((p) => ({
        id: p.id,
        group: "Set status",
        label: p.name,
        hint: effective.profileId === p.id ? "live" : p.details,
        icon: <ProfileBadge name={p.name} color={p.color} size={28} />,
        run: () => {
          s.activate(p.id);
          s.toast(`Status set to “${p.name}”`, "ok");
        },
      })),
      {
        id: "pause",
        group: "Actions",
        label: paused ? "Resume status" : "Clear status",
        icon: paused ? <CirclePlay size={18} aria-hidden="true" /> : <CirclePause size={18} aria-hidden="true" />,
        run: () => s.setPaused(!paused),
      },
      { id: "new", group: "Actions", label: "New profile", icon: <Plus size={18} aria-hidden="true" />, run: () => s.addProfile() },
      { id: "go-auto", group: "Go to", label: "Automations", icon: <Zap size={18} aria-hidden="true" />, run: () => s.setPage("automations") },
      { id: "go-sched", group: "Go to", label: "Schedule", icon: <CalendarDays size={18} aria-hidden="true" />, run: () => s.setPage("schedule") },
      { id: "go-tpl", group: "Go to", label: "Templates", icon: <LayoutGrid size={18} aria-hidden="true" />, run: () => s.setPage("gallery") },
      { id: "go-set", group: "Go to", label: "Settings", icon: <Settings size={18} aria-hidden="true" />, run: () => s.setPage("settings") },
    ];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(needle)) : all;
  }, [profiles, paused, effective.profileId, q]);

  const runAt = (i: number) => {
    const it = items[i];
    if (!it) return;
    it.run();
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(idx);
    } else if (e.key === "Escape") close();
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-black/55 px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Quick switch"
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="flex h-fit max-h-[70vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/60"
            onKeyDown={onKey}
          >
            <div className="flex h-14 items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                aria-label="Search profiles and actions"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                placeholder="Switch status, run an action…"
                className="h-full flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
              />
              <kbd className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] text-subtle">Esc</kbd>
            </div>
            <div className="overflow-y-auto p-2">
              {items.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{q}”.</div>}
              {items.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                return (
                  <div key={it.id}>
                    {header && <div className="px-3 pb-1.5 pt-3 text-xs text-muted">{header}</div>}
                    <button
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => runAt(i)}
                      className={cx(
                        "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[15px]",
                        i === idx ? "bg-raised" : "",
                      )}
                    >
                      <span className="flex w-7 justify-center text-subtle">{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                      {it.hint && <span className={cx("ml-auto truncate pl-3 text-xs", it.hint === "live" ? "text-ok" : "text-muted")}>{it.hint}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex h-10 items-center justify-between border-t border-line px-4 text-xs text-muted">
              <span>Lumen RPC</span>
              <span className="flex gap-4">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
