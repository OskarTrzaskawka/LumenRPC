import { useRef, useState } from "react";
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Download,
  Gamepad2,
  Headphones,
  Hourglass,
  Image as ImageIcon,
  Link2,
  MousePointerClick,
  Plus,
  Radio,
  RefreshCw,
  Rocket,
  Timer,
  TimerOff,
  Trash2,
  Trophy,
  Tv,
  Type,
  Users,
  History,
  X,
} from "lucide-react";
import { TIME_MODES, VARIABLES, validate } from "../lib/activity";
import { sendNow } from "../lib/engine";
import { platform } from "../lib/platform";
import { useProfile, useStore } from "../lib/store";
import { PROFILE_COLORS, type Profile, type TimeMode } from "../lib/types";
import { ImagePicker } from "../components/ImagePicker";
import { Preview } from "../components/Preview";
import { Button, Card, Field, IconButton, Segmented, TextInput, Toggle, cx } from "../components/ui";

const TIME_ICONS: Record<TimeMode, React.ReactNode> = {
  none: <TimerOff size={18} aria-hidden="true" />,
  appStart: <Rocket size={18} aria-hidden="true" />,
  profileStart: <Timer size={18} aria-hidden="true" />,
  localTime: <Clock size={18} aria-hidden="true" />,
  customStart: <CalendarClock size={18} aria-hidden="true" />,
  countdown: <Hourglass size={18} aria-hidden="true" />,
  offset: <History size={18} aria-hidden="true" />,
};

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

type TextKey = "details" | "state" | "largeText" | "smallText";

export function Editor() {
  const editingId = useStore((s) => s.editingId);
  const profile = useProfile(editingId);
  if (!profile) return <div className="p-10 text-muted">Pick a profile on the left.</div>;
  return <EditorBody key={profile.id} profile={profile} />;
}

function EditorBody({ profile: p }: { profile: Profile }) {
  const effective = useStore((s) => s.effective);
  const paused = useStore((s) => s.paused);
  const lastResult = useStore((s) => s.lastResult);
  const liveUpdate = useStore((s) => s.settings.liveUpdate);
  const { updateProfile, activate, duplicateProfile, deleteProfile, toast, set } = useStore.getState();
  const up = (patch: Partial<Profile>) => updateProfile(p.id, patch);
  const [focus, setFocus] = useState<TextKey>("details");
  const fields = useRef<Partial<Record<TextKey, HTMLInputElement | null>>>({});
  const isLive = effective.profileId === p.id && !paused;
  const warnings = validate(p);

  const insertVar = (token: string) => {
    const el = fields.current[focus];
    const current = p[focus];
    const at = el?.selectionStart ?? current.length;
    up({ [focus]: current.slice(0, at) + token + current.slice(at) } as Partial<Profile>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const textField = (key: TextKey, label: string, placeholder: string) => (
    <Field label={label} counter={`${p[key].length}/128`}>
      <TextInput
        ref={(el) => {
          fields.current[key] = el;
        }}
        value={p[key]}
        maxLength={128}
        placeholder={placeholder}
        onFocus={() => setFocus(key)}
        onChange={(e) => up({ [key]: e.target.value } as Partial<Profile>)}
      />
    </Field>
  );

  const exportProfile = async () => {
    const { id: _id, ...rest } = p;
    const ok = await platform.exportFile(`${p.name.replace(/[^\w-]+/g, "-").toLowerCase() || "profile"}.lumen.json`, JSON.stringify({ lumen: 1, profiles: [rest] }, null, 2));
    if (ok) toast("Profile exported", "ok");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-muted">Profile</div>
            <input
              aria-label="Profile name"
              value={p.name}
              onChange={(e) => up({ name: e.target.value })}
              className="mt-0.5 w-full max-w-[420px] rounded-lg bg-transparent font-display text-[28px] font-semibold tracking-tight outline-none hover:bg-card focus:bg-card"
            />
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Profile color">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={p.color === c}
                  aria-label={`Color ${c}`}
                  onClick={() => up({ color: c })}
                  className={cx("h-6 w-6 cursor-pointer rounded-full border-2 transition-transform hover:scale-110", p.color === c ? "border-text" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Duplicate profile" onClick={() => duplicateProfile(p.id)}>
              <Copy size={17} />
            </IconButton>
            <IconButton label="Export profile" onClick={() => void exportProfile()}>
              <Download size={17} />
            </IconButton>
            <IconButton label="Delete profile" onClick={() => deleteProfile(p.id)} className="hover:text-bad">
              <Trash2 size={17} />
            </IconButton>
            {isLive ? (
              <Button variant="outline" onClick={() => (liveUpdate ? set({ paused: true }) : sendNow())} className="border-ok/40 text-ok">
                <Radio size={16} aria-hidden="true" />
                {liveUpdate ? "Live — click to clear" : "Push changes"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  activate(p.id);
                  toast(`Status set to “${p.name}”`, "ok");
                }}
              >
                <Radio size={16} aria-hidden="true" />
                Set as status
              </Button>
            )}
          </div>
        </div>

        {effective.source === "automation" || effective.source === "schedule" ? (
          !isLive && (
            <div className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-subtle">
              An {effective.source === "automation" ? "automation" : "schedule block"} is currently choosing your status. “Set as status” overrides it for a while.
            </div>
          )
        ) : null}

        <Card title="Activity" icon={<Gamepad2 size={15} aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="App name" hint="Optional — replaces the name from the Developer Portal" counter={`${p.appName.length}/128`}>
              <TextInput value={p.appName} maxLength={128} placeholder="Use the Developer Portal name" onChange={(e) => up({ appName: e.target.value })} />
            </Field>
            <Field label="Activity type">
              <Segmented
                label="Activity type"
                value={p.activityType}
                onChange={(v) => up({ activityType: v })}
                options={[
                  { value: 0, label: "Playing", icon: <Gamepad2 size={15} aria-hidden="true" /> },
                  { value: 2, label: "Listening", icon: <Headphones size={15} aria-hidden="true" /> },
                  { value: 3, label: "Watching", icon: <Tv size={15} aria-hidden="true" /> },
                  { value: 5, label: "Competing", icon: <Trophy size={15} aria-hidden="true" /> },
                ]}
              />
            </Field>
            <Field label="Member list shows">
              <Segmented
                label="Member list shows"
                value={p.statusDisplay}
                onChange={(v) => up({ statusDisplay: v })}
                options={[
                  { value: 0, label: "App name" },
                  { value: 2, label: "Details" },
                  { value: 1, label: "State" },
                ]}
              />
            </Field>
          </div>
        </Card>

        <Card title="Text" icon={<Type size={15} aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {textField("details", "Details (first line)", "What are you doing?")}
            <Field label="Details link" hint="Optional — makes the line clickable">
              <TextInput value={p.detailsUrl} placeholder="https://" onChange={(e) => up({ detailsUrl: e.target.value })} />
            </Field>
            {textField("state", "State (second line)", "e.g. In a match, Chapter 3…")}
            <Field label="State link" hint="Optional">
              <TextInput value={p.stateUrl} placeholder="https://" onChange={(e) => up({ stateUrl: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Insert variable:</span>
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                title={v.hint}
                onClick={() => insertVar(v.token)}
                className="h-8 cursor-pointer rounded-lg border border-line px-2.5 font-mono text-xs text-subtle hover:border-accent hover:text-text"
              >
                {v.token}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Timer" icon={<Timer size={15} aria-hidden="true" />}>
          <div role="radiogroup" aria-label="Timer mode" className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4">
            {TIME_MODES.map((m) => {
              const on = p.time.mode === m.id;
              return (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => up({ time: { ...p.time, mode: m.id } })}
                  className={cx(
                    "flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                    on ? "border-accent bg-accent/10" : "border-line hover:bg-raised",
                  )}
                >
                  <span className={on ? "text-accent" : "text-muted"}>{TIME_ICONS[m.id]}</span>
                  <span className="text-sm font-medium">{m.title}</span>
                  <span className="text-xs leading-snug text-muted">{m.desc}</span>
                </button>
              );
            })}
          </div>

          {p.time.mode === "customStart" && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Started at">
                <TextInput type="datetime-local" value={p.time.start} onChange={(e) => up({ time: { ...p.time, start: e.target.value } })} className="w-60" />
              </Field>
              <Button size="sm" variant="ghost" onClick={() => up({ time: { ...p.time, start: toLocalInput(new Date()) } })}>
                Now
              </Button>
            </div>
          )}
          {p.time.mode === "countdown" && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Count down to">
                <TextInput type="datetime-local" value={p.time.end} onChange={(e) => up({ time: { ...p.time, end: e.target.value } })} className="w-60" />
              </Field>
              {[
                ["+15 min", 15],
                ["+1 hour", 60],
                ["+3 hours", 180],
              ].map(([l, m]) => (
                <Button key={l} size="sm" variant="outline" onClick={() => up({ time: { ...p.time, end: toLocalInput(new Date(Date.now() + Number(m) * 60_000)) } })}>
                  {l}
                </Button>
              ))}
            </div>
          )}
          {p.time.mode === "offset" && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Started this many minutes ago">
                <TextInput
                  type="number"
                  min={0}
                  value={p.time.offsetMinutes}
                  onChange={(e) => up({ time: { ...p.time, offsetMinutes: Math.max(0, Number(e.target.value) || 0) } })}
                  className="w-40"
                />
              </Field>
              {[30, 60, 180, 600].map((m) => (
                <Button key={m} size="sm" variant="outline" onClick={() => up({ time: { ...p.time, offsetMinutes: m } })}>
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </Button>
              ))}
            </div>
          )}
          {p.time.mode === "localTime" && (
            <p className="mt-4 text-[13px] text-muted">The timer counts from midnight, so it always reads your current local time (24-hour clock).</p>
          )}
        </Card>

        <Card
          title="Images"
          icon={<ImageIcon size={15} aria-hidden="true" />}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const id = useStore.getState().clientId;
                const assets = await platform.fetchAssets(id);
                set({ assets });
                toast(assets.length ? `Found ${assets.length} assets` : "No uploaded assets found", assets.length ? "ok" : "info");
              }}
            >
              <RefreshCw size={14} aria-hidden="true" /> Refresh assets
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="text-[13px] text-subtle">Large image</span>
              <ImagePicker label="Large image" value={p.largeImage} onChange={(v) => up({ largeImage: v })} />
              {textField("largeText", "Hover text", "Shown when hovering the large image")}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[13px] text-subtle">Small image</span>
              <ImagePicker label="Small image" round value={p.smallImage} onChange={(v) => up({ smallImage: v })} />
              {textField("smallText", "Hover text", "Shown when hovering the small image")}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Party" icon={<Users size={15} aria-hidden="true" />}>
            <Toggle checked={p.party.enabled} onChange={(v) => up({ party: { ...p.party, enabled: v } })} label="Show party size" description="Appears as “(2 of 5)” after the state" />
            {p.party.enabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Current">
                  <TextInput type="number" min={1} value={p.party.size} onChange={(e) => up({ party: { ...p.party, size: Math.max(1, Number(e.target.value) || 1) } })} />
                </Field>
                <Field label="Maximum">
                  <TextInput type="number" min={1} value={p.party.max} onChange={(e) => up({ party: { ...p.party, max: Math.max(1, Number(e.target.value) || 1) } })} />
                </Field>
              </div>
            )}
          </Card>

          <Card
            title="Buttons"
            icon={<MousePointerClick size={15} aria-hidden="true" />}
            action={
              p.buttons.length < 2 && (
                <Button size="sm" variant="ghost" onClick={() => up({ buttons: [...p.buttons, { label: "", url: "https://" }] })}>
                  <Plus size={14} aria-hidden="true" /> Add
                </Button>
              )
            }
          >
            {p.buttons.length === 0 && <p className="text-sm text-muted">Up to two link buttons under your status.</p>}
            <div className="flex flex-col gap-3">
              {p.buttons.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-1 gap-2">
                    <TextInput
                      aria-label={`Button ${i + 1} label`}
                      placeholder="Label"
                      maxLength={32}
                      value={b.label}
                      onChange={(e) => up({ buttons: p.buttons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                    />
                    <div className="relative">
                      <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                      <TextInput
                        aria-label={`Button ${i + 1} link`}
                        placeholder="https://"
                        value={b.url}
                        className="pl-8"
                        onChange={(e) => up({ buttons: p.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                      />
                    </div>
                  </div>
                  <IconButton label={`Remove button ${i + 1}`} onClick={() => up({ buttons: p.buttons.filter((_, j) => j !== i) })}>
                    <X size={16} />
                  </IconButton>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <aside className="flex min-w-[320px] flex-[1_1_360px] flex-col gap-4 border-l border-line bg-panel/60 p-6 xl:max-w-[400px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Live preview</span>
          {isLive && <span className="flex items-center gap-1.5 text-xs text-ok"><span className="h-2 w-2 rounded-full bg-ok" />On your profile</span>}
        </div>
        <Preview profile={p} live={isLive} />
        {isLive && lastResult && (
          <div className={cx("flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px]", lastResult.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad")}>
            {lastResult.ok ? <CircleCheck size={16} className="mt-px shrink-0" aria-hidden="true" /> : <CircleAlert size={16} className="mt-px shrink-0" aria-hidden="true" />}
            {lastResult.ok ? "Discord accepted the update" : `Discord rejected the update: ${lastResult.message}`}
          </div>
        )}
        {warnings.length > 0 && (
          <ul className="flex flex-col gap-2">
            {warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[13px] text-subtle">
                <CircleAlert size={15} className="mt-px shrink-0 text-warn" aria-hidden="true" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
