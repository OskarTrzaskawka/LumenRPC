import { useState } from "react";
import { Download, Plus, Search, Upload } from "lucide-react";
import { ACTIVITY_LABEL } from "../lib/activity";
import { platform } from "../lib/platform";
import { useStore } from "../lib/store";
import { CATEGORIES, TEMPLATES } from "../lib/templates";
import { newProfile, uid, type Profile } from "../lib/types";
import { EmptyIllustration } from "../components/art";
import { Button, PageHeader, cx } from "../components/ui";

export function Gallery() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const profiles = useStore((s) => s.profiles);
  const { addProfile, toast, set } = useStore.getState();
  const list = TEMPLATES.filter(
    (t) => (cat === "All" || t.category === cat) && `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const importFile = async () => {
    const raw = await platform.importFile();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { profiles?: Partial<Profile>[] };
      // Fresh ids so imported profiles never collide with existing ones.
      const incoming = (data.profiles ?? []).map((p) => newProfile({ ...p, id: uid() }));
      if (!incoming.length) throw new Error();
      set({ profiles: [...useStore.getState().profiles, ...incoming] });
      toast(`Imported ${incoming.length} profile${incoming.length > 1 ? "s" : ""}`, "ok");
    } catch {
      toast("That file isn’t a Lumen RPC export", "error");
    }
  };

  const exportAll = async () => {
    const ok = await platform.exportFile("lumen-profiles.json", JSON.stringify({ lumen: 1, profiles: profiles.map(({ id: _id, ...p }) => p) }, null, 2));
    if (ok) toast("All profiles exported", "ok");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-7">
      <PageHeader
        title="Templates"
        description="Start from a ready-made status. Adding one creates a new profile you can tweak."
        actions={
          <>
            <Button onClick={() => void importFile()}>
              <Upload size={16} aria-hidden="true" /> Import
            </Button>
            <Button onClick={() => void exportAll()}>
              <Download size={16} aria-hidden="true" /> Export all
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={cx(
                "h-9 cursor-pointer rounded-full border px-4 text-[13px] font-medium transition-colors",
                cat === c ? "border-accent bg-accent text-bg" : "border-line text-subtle hover:bg-raised",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="ml-auto flex h-10 w-72 items-center gap-2 rounded-full border border-line bg-panel px-4">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <span className="sr-only">Search templates</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
        </label>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-sm text-muted">
          <EmptyIllustration kind="search" />
          No templates match.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((t) => {
            const color = t.profile.color ?? "#8B7CFF";
            return (
              <article key={t.key} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-[#34374d]">
                <div className="relative flex h-[118px] items-end gap-3 p-4" style={{ background: `color-mix(in oklab, ${color} 26%, #151620)` }}>
                  <div className="h-16 w-16 rounded-xl" style={{ background: color }} />
                  <div className="flex min-w-0 flex-col gap-1 pb-1 text-[12px] leading-tight">
                    <span className="font-bold uppercase tracking-[0.06em] text-text/70">{ACTIVITY_LABEL[t.profile.activityType ?? 0]}</span>
                    <span className="truncate font-semibold text-text">{t.profile.details}</span>
                    <span className="truncate text-text/75">{t.profile.state}</span>
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-text/85">{t.category}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold">{t.name}</h3>
                    <p className="truncate text-xs text-muted">{t.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    aria-label={`Add template ${t.name}`}
                    className="h-11 w-11 shrink-0 px-0 group-hover:border-accent group-hover:text-accent"
                    onClick={() => {
                      addProfile(structuredClone(t.profile));
                      toast(`Added “${t.name}”`, "ok");
                    }}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
