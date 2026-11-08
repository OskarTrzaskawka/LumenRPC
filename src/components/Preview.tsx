import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { ACTIVITY_LABEL, assetUrl, fillVars, formatDuration, isUrl, timestamps } from "../lib/activity";
import { useStore } from "../lib/store";
import type { Profile } from "../lib/types";

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Don't re-render clocks while the window is hidden in the tray.
    const tick = () => !document.hidden && setNow(Date.now());
    const t = setInterval(tick, interval);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [interval]);
  return now;
}

function Art({ src, size, round, color }: { src: string | null; size: number; round?: boolean; color: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const radius = round ? size / 2 : size * 0.16;
  if (src && !broken)
    return <img src={src} alt="" onError={() => setBroken(true)} className="object-cover" style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, background: `color-mix(in oklab, ${color} 28%, #1c1d2a)`, color }}
    >
      <ImageIcon size={size * 0.38} strokeWidth={1.8} aria-hidden="true" />
    </div>
  );
}

/** A Discord-style profile card that updates as you type. */
export function Preview({ profile, live }: { profile: Profile; live: boolean }) {
  const now = useNow();
  const app = useStore((s) => s.app);
  const assets = useStore((s) => s.assets);
  const user = useStore((s) => s.status.user);
  const appStart = useStore((s) => s.appStart);
  const profileStart = useStore((s) => s.profileStart);
  const start = live ? profileStart : now - 1000 * 60 * 42;

  const d = new Date(now);
  const details = fillVars(profile.details, profile, d).trim();
  const state = fillVars(profile.state, profile, d).trim();
  const ts = timestamps(profile, { now, appStart, profileStart: start });
  const large = assetUrl(profile.largeImage, app?.id, assets);
  const small = assetUrl(profile.smallImage, app?.id, assets);
  const appName = app?.name ?? "Your application";
  const name = user?.global_name || user?.username || "you";
  const avatar = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null;
  const party = profile.party.enabled && profile.party.max > 0 ? ` (${Math.min(profile.party.size, profile.party.max)} of ${profile.party.max})` : "";
  const buttons = profile.buttons.filter((b) => b.label.trim());
  const listLine = [appName, state || appName, details || appName][profile.statusDisplay];

  let timer: string | null = null;
  let progress: number | null = null;
  if (ts.end) timer = `${formatDuration(ts.end - now)} left`;
  else if (ts.start) timer = `${formatDuration(now - ts.start)} elapsed`;
  if (ts.start && ts.end) progress = Math.min(1, (now - ts.start) / (ts.end - ts.start));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-[#111219]">
        <div className="h-[84px]" style={{ background: `color-mix(in oklab, ${profile.color} 55%, #111219)` }} />
        <div className="-mt-9 px-4 pb-4">
          <div className="relative w-fit">
            {avatar ? (
              <img src={avatar} alt="" className="h-[72px] w-[72px] rounded-full border-[5px] border-[#111219] object-cover" />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] border-[#111219] bg-raised font-display text-2xl font-semibold text-subtle">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#111219] bg-ok" />
          </div>
          <div className="mt-2 font-display text-lg font-semibold">{name}</div>
          {user?.username && <div className="text-xs text-muted">@{user.username}</div>}

          <div className="mt-4 rounded-xl bg-[#191a24] p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">
              {ACTIVITY_LABEL[profile.activityType]} {profile.activityType === 2 || profile.activityType === 3 ? "" : appName}
            </div>
            <div className="mt-2.5 flex gap-3">
              <div className="relative shrink-0">
                {profile.largeImage.trim() ? (
                  <Art src={large} size={76} color={profile.color} />
                ) : (
                  <Art src={app?.icon ? `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=160` : null} size={76} color={profile.color} />
                )}
                {profile.smallImage.trim() && (
                  <div className="absolute -bottom-1.5 -right-1.5 rounded-full border-[3px] border-[#191a24]">
                    <Art src={small} size={24} round color={profile.color} />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-0.5 text-[13px] leading-snug">
                <span className="truncate font-semibold">{appName}</span>
                {details.length >= 2 && (
                  <span className={`truncate text-subtle ${isUrl(profile.detailsUrl) ? "underline decoration-muted/50" : ""}`}>{details}</span>
                )}
                {state.length >= 2 && (
                  <span className={`truncate text-subtle ${isUrl(profile.stateUrl) ? "underline decoration-muted/50" : ""}`}>
                    {state}
                    {party}
                  </span>
                )}
                {timer && progress === null && <span className="tabular-nums text-subtle">{timer}</span>}
              </div>
            </div>
            {progress !== null && (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-text" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            {buttons.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {buttons.map((b, i) => (
                  <div key={i} className="flex h-8 items-center justify-center truncate rounded-md bg-[#2a2c3b] px-3 text-[13px] font-medium">
                    {b.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-[#111219] px-3 py-2.5">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-xs font-semibold text-subtle">{name.charAt(0).toUpperCase()}</div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111219] bg-ok" />
        </div>
        <div className="min-w-0 text-[13px] leading-tight">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-xs text-muted">
            {ACTIVITY_LABEL[profile.activityType]} <span className="font-semibold text-subtle">{listLine}</span>
          </div>
        </div>
        <span className="ml-auto text-[11px] text-muted">Member list</span>
      </div>
    </div>
  );
}
