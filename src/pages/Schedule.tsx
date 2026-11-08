import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { blockActive } from "../lib/engine";
import { useStore } from "../lib/store";
import { uid, type ScheduleBlock } from "../lib/types";
import { useNow } from "../components/Preview";
import { EmptyIllustration } from "../components/art";
import { Button, Card, Field, IconButton, PageHeader, Select, TextInput, Toggle } from "../components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function Schedule() {
  const schedule = useStore((s) => s.schedule);
  const profiles = useStore((s) => s.profiles);
  const enabled = useStore((s) => s.settings.scheduleEnabled);
  const { setSchedule, setSettings } = useStore.getState();
  const now = new Date(useNow(30_000));
  const today = (now.getDay() + 6) % 7;
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;

  const [draft, setDraft] = useState<Omit<ScheduleBlock, "id">>({ day: today, start: "18:00", end: "22:00", profileId: profiles[0]?.id ?? "" });
  const [selected, setSelected] = useState<string | null>(null);
  const profileOf = (id: string) => profiles.find((p) => p.id === id);
  const sel = schedule.find((b) => b.id === selected);

  const addBlock = (days: number[]) => {
    if (toMin(draft.end || "24:00") <= toMin(draft.start) && draft.end !== "00:00") return useStore.getState().toast("End time must be after start", "error");
    setSchedule([...schedule, ...days.map((day) => ({ ...draft, day, id: uid() }))]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-7">
      <PageHeader title="Schedule" description="Plan your week. When no automation matches, the block for the current time sets your status." />
      <Card>
        <Toggle checked={enabled} onChange={(v) => setSettings({ scheduleEnabled: v })} label="Schedule enabled" description="Manual switches still win for the override period set in Settings." />
      </Card>

      <section aria-label="Week timeline" className="rounded-2xl border border-line bg-card p-5">
        <div className="ml-14 flex justify-between pb-2 text-[11px] tabular-nums text-muted">
          {HOURS.map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {DAYS.map((d, di) => (
            <div key={d} className="flex items-center gap-3">
              <span className={`w-11 text-sm font-medium ${di === today ? "text-accent" : "text-subtle"}`}>{d}</span>
              <div className="relative h-11 flex-1 rounded-lg bg-panel">
                {HOURS.slice(1, -1).map((h) => (
                  <span key={h} className="absolute bottom-0 top-0 w-px bg-line/60" style={{ left: `${(h / 24) * 100}%` }} />
                ))}
                {schedule
                  .filter((b) => b.day === di)
                  .map((b) => {
                    const p = profileOf(b.profileId);
                    const s = toMin(b.start);
                    const e = toMin(b.end) || 1440;
                    const live = enabled && blockActive(b, now);
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b.id)}
                        title={`${p?.name ?? "?"} · ${b.start}–${b.end}`}
                        className="absolute bottom-0.5 top-0.5 flex cursor-pointer items-center overflow-hidden whitespace-nowrap rounded-md px-2 text-xs font-semibold text-bg"
                        style={{
                          left: `${(s / 1440) * 100}%`,
                          width: `calc(${((e - s) / 1440) * 100}% - 2px)`,
                          background: p?.color ?? "#94a3b8",
                          outline: selected === b.id ? "2px solid #eceef5" : live ? "2px solid #3dd68c" : "none",
                          outlineOffset: 1,
                        }}
                      >
                        {p?.name}
                      </button>
                    );
                  })}
                {di === today && <span className="absolute -bottom-1 -top-1 w-0.5 rounded bg-text" style={{ left: `${nowPct}%` }} aria-label="Now" />}
              </div>
            </div>
          ))}
        </div>
        {schedule.length === 0 && (
          <div className="mt-5 flex items-center gap-4 text-sm text-muted">
            <EmptyIllustration kind="schedule" />
            Add your first block below — for example gaming every evening.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Add block">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Day">
              <Select value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <TextInput type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </Field>
            <Field label="To">
              <TextInput type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </Field>
            <Field label="Profile">
              <Select value={draft.profileId} onChange={(e) => setDraft({ ...draft, profileId: e.target.value })}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => addBlock([draft.day])}>
              <Plus size={16} aria-hidden="true" /> Add to {DAYS[draft.day]}
            </Button>
            <Button onClick={() => addBlock([0, 1, 2, 3, 4])}>Every weekday</Button>
            <Button onClick={() => addBlock([5, 6])}>Weekend</Button>
            <Button onClick={() => addBlock([0, 1, 2, 3, 4, 5, 6])}>Every day</Button>
          </div>
        </Card>

        <Card title="Selected block">
          {sel ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="From">
                <TextInput type="time" value={sel.start} onChange={(e) => setSchedule(schedule.map((b) => (b.id === sel.id ? { ...b, start: e.target.value } : b)))} />
              </Field>
              <Field label="To">
                <TextInput type="time" value={sel.end} onChange={(e) => setSchedule(schedule.map((b) => (b.id === sel.id ? { ...b, end: e.target.value } : b)))} />
              </Field>
              <Field label="Profile">
                <Select value={sel.profileId} onChange={(e) => setSchedule(schedule.map((b) => (b.id === sel.id ? { ...b, profileId: e.target.value } : b)))}>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <IconButton
                label="Delete block"
                className="h-10 w-10 hover:text-bad"
                onClick={() => {
                  setSchedule(schedule.filter((b) => b.id !== sel.id));
                  setSelected(null);
                }}
              >
                <Trash2 size={17} />
              </IconButton>
            </div>
          ) : (
            <p className="text-sm text-muted">Click a block on the timeline to edit or delete it.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
