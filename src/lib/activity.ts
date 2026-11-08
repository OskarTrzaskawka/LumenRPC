import type { Asset, Profile, TimeMode } from "./types";

export interface TimeCtx {
  now: number;
  appStart: number;
  profileStart: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const VARIABLES = [
  { token: "{time}", label: "time", hint: "your current time, e.g. 14:05" },
  { token: "{date}", label: "date", hint: "today's date" },
  { token: "{day}", label: "weekday", hint: "day of the week" },
  { token: "{profile}", label: "profile", hint: "this profile's name" },
];

export function fillVars(text: string, p: Profile, now = new Date()): string {
  return text
    .replaceAll("{time}", `${pad(now.getHours())}:${pad(now.getMinutes())}`)
    .replaceAll("{date}", now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))
    .replaceAll("{day}", now.toLocaleDateString("en-US", { weekday: "long" }))
    .replaceAll("{profile}", p.name);
}

export const usesClockVars = (p: Profile) =>
  [p.details, p.state, p.largeText, p.smallText].some((t) => /\{(time|date|day)\}/.test(t));

export const TIME_MODES: { id: TimeMode; title: string; desc: string }[] = [
  { id: "none", title: "No timer", desc: "Status without a clock" },
  { id: "appStart", title: "Since app start", desc: "Counts from when Lumen RPC started" },
  { id: "profileStart", title: "Since status set", desc: "Counts from when this status went live" },
  { id: "localTime", title: "My local time", desc: "The timer shows your current clock" },
  { id: "customStart", title: "Custom start", desc: "Counts up from a date you pick" },
  { id: "countdown", title: "Countdown", desc: "Time left until a date you pick" },
  { id: "offset", title: "Started ago…", desc: "As if you started X minutes ago" },
];

export function timestamps(p: Profile, ctx: TimeCtx): { start?: number; end?: number } {
  const t = p.time;
  switch (t.mode) {
    case "appStart":
      return { start: ctx.appStart };
    case "profileStart":
      return { start: ctx.profileStart };
    case "localTime": {
      // Elapsed time since local midnight == the user's current clock.
      const d = new Date(ctx.now);
      d.setHours(0, 0, 0, 0);
      return { start: d.getTime() };
    }
    case "customStart": {
      const s = Date.parse(t.start);
      return Number.isFinite(s) ? { start: s } : {};
    }
    case "countdown": {
      const e = Date.parse(t.end);
      return Number.isFinite(e) && e > ctx.now ? { end: e } : {};
    }
    case "offset":
      return { start: ctx.profileStart - Math.max(0, t.offsetMinutes) * 60_000 };
    default:
      return {};
  }
}

export const isUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s.trim());
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export function imageRef(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  return isUrl(v) ? v : v.toLowerCase();
}

/** Builds the SET_ACTIVITY payload Discord expects. */
export function buildActivity(p: Profile, ctx: TimeCtx) {
  const now = new Date(ctx.now);
  const a: Record<string, unknown> = { type: p.activityType, status_display_type: p.statusDisplay, instance: false };
  const details = fillVars(p.details, p, now).trim();
  const state = fillVars(p.state, p, now).trim();
  if (details.length >= 2) {
    a.details = clip(details, 128);
    if (isUrl(p.detailsUrl)) a.details_url = p.detailsUrl.trim();
  }
  if (state.length >= 2) {
    a.state = clip(state, 128);
    if (isUrl(p.stateUrl)) a.state_url = p.stateUrl.trim();
  }
  const ts = timestamps(p, ctx);
  if (ts.start || ts.end) {
    a.timestamps = {
      ...(ts.start ? { start: Math.floor(ts.start / 1000) } : {}),
      ...(ts.end ? { end: Math.floor(ts.end / 1000) } : {}),
    };
  }
  const assets: Record<string, string> = {};
  const large = imageRef(p.largeImage);
  const small = imageRef(p.smallImage);
  if (large) {
    assets.large_image = large;
    const lt = fillVars(p.largeText, p, now).trim();
    if (lt.length >= 2) assets.large_text = clip(lt, 128);
  }
  if (small) {
    assets.small_image = small;
    const st = fillVars(p.smallText, p, now).trim();
    if (st.length >= 2) assets.small_text = clip(st, 128);
  }
  if (Object.keys(assets).length) a.assets = assets;
  if (p.party.enabled && p.party.max > 0) {
    a.party = { id: `lumen-${p.id}`, size: [Math.min(p.party.size, p.party.max), p.party.max] };
  }
  const buttons = p.buttons.filter((b) => b.label.trim() && isUrl(b.url)).slice(0, 2);
  if (buttons.length) a.buttons = buttons.map((b) => ({ label: clip(b.label.trim(), 32), url: b.url.trim() }));
  return a;
}

export function validate(p: Profile): string[] {
  const w: string[] = [];
  if (p.details.trim().length === 1) w.push("Details must be at least 2 characters.");
  if (p.state.trim().length === 1) w.push("State must be at least 2 characters.");
  if (!p.details.trim() && !p.state.trim() && !p.largeImage.trim())
    w.push("This status is empty — add details, a state or an image.");
  p.buttons.forEach((b, i) => {
    if (b.label.trim() && !isUrl(b.url)) w.push(`Button ${i + 1}: the link must start with https://`);
    if (b.label.length > 32) w.push(`Button ${i + 1}: labels can be at most 32 characters.`);
  });
  if (p.party.enabled && p.party.size > p.party.max) w.push("Party: current size is larger than the maximum.");
  if (p.time.mode === "customStart" && !Number.isFinite(Date.parse(p.time.start))) w.push("Timer: pick a start date.");
  if (p.time.mode === "countdown") {
    const e = Date.parse(p.time.end);
    if (!Number.isFinite(e)) w.push("Timer: pick the date to count down to.");
    else if (e < Date.now()) w.push("Timer: the countdown date has already passed.");
  }
  if (p.buttons.some((b) => b.label.trim()))
    w.push("Tip: Discord may hide your own buttons from you — other people see them.");
  return w;
}

export function assetUrl(value: string, appId: string | undefined, assets: Asset[]): string | null {
  const v = value.trim();
  if (!v) return null;
  if (isUrl(v)) return v;
  const a = assets.find((x) => x.name.toLowerCase() === v.toLowerCase());
  if (a && appId && /^\d+$/.test(a.id)) return `https://cdn.discordapp.com/app-assets/${appId}/${a.id}.png`;
  return null;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export const ACTIVITY_LABEL: Record<number, string> = { 0: "Playing", 2: "Listening to", 3: "Watching", 5: "Competing in" };
