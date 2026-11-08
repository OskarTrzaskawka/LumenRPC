import { ArrowRight, ChevronDown, ChevronUp, Cpu, Moon, Plus, Trash2 } from "lucide-react";
import { ruleMatches } from "../lib/engine";
import { useStore } from "../lib/store";
import { uid, type Rule } from "../lib/types";
import { EmptyIllustration } from "../components/art";
import { Button, Card, IconButton, PageHeader, Select, TextInput, Toggle, cx } from "../components/ui";

export function Automations() {
  const rules = useStore((s) => s.rules);
  const profiles = useStore((s) => s.profiles);
  const processes = useStore((s) => s.processes);
  const idle = useStore((s) => s.idle);
  const enabled = useStore((s) => s.settings.automationsEnabled);
  const effective = useStore((s) => s.effective);
  const { setRules, setSettings } = useStore.getState();
  const idleSupported = idle !== null;

  const update = (id: string, patch: Partial<Rule>) => setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = (patch: Partial<Rule> = {}) =>
    setRules([...rules, { id: uid(), enabled: true, trigger: "process", process: "", idleMinutes: 10, profileId: profiles[0]?.id ?? "", ...patch }]);
  const move = (i: number, d: number) => {
    const next = [...rules];
    const [r] = next.splice(i, 1);
    next.splice(i + d, 0, r);
    setRules(next);
  };
  const firstMatch = enabled ? rules.find((r) => ruleMatches(r, processes, idle)) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 p-7">
        <PageHeader
          title="Automations"
          description="Let Lumen switch your status on its own — when an app or game is running, or when you step away."
          actions={
            <Button variant="primary" onClick={() => add()}>
              <Plus size={16} aria-hidden="true" /> New rule
            </Button>
          }
        />
        <Card>
          <Toggle
            checked={enabled}
            onChange={(v) => setSettings({ automationsEnabled: v })}
            label="Automations enabled"
            description={
              effective.source === "automation" ? "An automation is choosing your status right now." : "Rules are checked from top to bottom every 5 seconds."
            }
          />
        </Card>

        {rules.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-12 text-center">
            <EmptyIllustration kind="rules" />
            <div className="font-medium">No rules yet</div>
            <p className="max-w-sm text-sm text-muted">Example: when code.exe is running, show your Coding profile.</p>
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {rules.map((r, i) => {
            const active = firstMatch?.id === r.id;
            return (
              <li key={r.id} className={cx("flex flex-wrap items-start gap-4 rounded-2xl border bg-card p-4 transition-colors", active ? "border-ok/50" : "border-line")}>
                <div className={cx("flex min-w-0 flex-1 flex-col gap-2.5", !r.enabled && "opacity-50")}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-14 rounded-md bg-raised py-1 text-center text-[11px] font-bold tracking-[0.06em] text-muted">WHEN</span>
                  <Select aria-label="Trigger" value={r.trigger} onChange={(e) => update(r.id, { trigger: e.target.value as Rule["trigger"] })}>
                    <option value="process">this app is running</option>
                    <option value="idle" disabled={!idleSupported && r.trigger !== "idle"}>
                      I’m idle for{!idleSupported ? " (Windows only)" : ""}
                    </option>
                  </Select>
                  {r.trigger === "process" ? (
                    <div className="w-52">
                      <TextInput
                        aria-label="Process name"
                        list="lumen-processes"
                        placeholder="e.g. code.exe"
                        value={r.process}
                        onChange={(e) => update(r.id, { process: e.target.value })}
                        className="font-mono text-[13px]"
                      />
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      <div className="w-20">
                        <TextInput
                          aria-label="Idle minutes"
                          type="number"
                          min={1}
                          value={r.idleMinutes}
                          onChange={(e) => update(r.id, { idleMinutes: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      <span className="text-sm text-muted">min</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-14 rounded-md bg-accent/15 py-1 text-center text-[11px] font-bold tracking-[0.06em] text-accent">SHOW</span>
                  <Select aria-label="Profile" value={r.profileId} onChange={(e) => update(r.id, { profileId: e.target.value })} className="min-w-44">
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  {active && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-ok">
                      <ArrowRight size={14} aria-hidden="true" /> Matching now
                    </span>
                  )}
                </div>
                </div>
                  <div className="flex items-center gap-1">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ChevronUp size={16} />
                    </IconButton>
                    <IconButton label="Move down" disabled={i === rules.length - 1} onClick={() => move(i, 1)}>
                      <ChevronDown size={16} />
                    </IconButton>
                    <label className="relative mx-1 inline-flex h-9 cursor-pointer items-center" title={r.enabled ? "Rule on" : "Rule off"}>
                      <input type="checkbox" aria-label="Rule enabled" className="peer sr-only" checked={r.enabled} onChange={(e) => update(r.id, { enabled: e.target.checked })} />
                      <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
                      <span className="absolute left-0.5 top-[10px] h-4 w-4 rounded-full bg-text transition-transform peer-checked:translate-x-4" />
                    </label>
                    <IconButton label="Delete rule" onClick={() => setRules(rules.filter((x) => x.id !== r.id))} className="hover:text-bad">
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
              </li>
            );
          })}
        </ol>
        <datalist id="lumen-processes">
          {processes.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <aside className="flex min-w-[300px] flex-[1_1_320px] flex-col gap-4 border-l border-line bg-panel/60 p-6 xl:max-w-[360px]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          <Cpu size={14} aria-hidden="true" /> Running apps
        </div>
        <p className="text-xs text-muted">Click one to create a rule for it.</p>
        <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
          {processes
            .filter((p) => !/^(svchost|system|registry|smss|csrss|wininit|services|lsass|conhost|dwm|fontdrvhost|runtimebroker)/.test(p))
            .slice(0, 80)
            .map((p) => {
              const used = rules.some((r) => r.trigger === "process" && r.process.toLowerCase() === p);
              return (
                <button
                  key={p}
                  onClick={() => !used && add({ process: p })}
                  className={cx(
                    "flex h-9 cursor-pointer items-center justify-between rounded-lg px-3 text-left font-mono text-[13px]",
                    used ? "bg-ok/10 text-ok" : "text-subtle hover:bg-raised",
                  )}
                >
                  <span className="truncate">{p}</span>
                  <span className="font-sans text-xs">{used ? "has rule" : "+ rule"}</span>
                </button>
              );
            })}
          {processes.length === 0 && <span className="text-sm text-muted">Scanning…</span>}
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-3 text-[13px] text-subtle">
          <Moon size={15} className="text-accent" aria-hidden="true" />
          {idleSupported ? `Idle for ${Math.floor((idle ?? 0) / 60)} min` : "Idle detection is available on Windows."}
        </div>
      </aside>
    </div>
  );
}
