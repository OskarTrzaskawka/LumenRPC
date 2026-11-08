import { useEffect, useRef } from "react";
import { buildActivity, usesClockVars } from "./activity";
import { platform } from "./platform";
import { useStore, type Source } from "./store";
import type { Rule, ScheduleBlock } from "./types";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function blockActive(b: ScheduleBlock, d = new Date()) {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const now = d.getHours() * 60 + d.getMinutes();
  const s = toMin(b.start);
  const e = toMin(b.end) || 24 * 60;
  return b.day === day && now >= s && now < e;
}

export function ruleMatches(r: Rule, processes: string[], idle: number | null) {
  if (!r.enabled) return false;
  if (r.trigger === "idle") return idle !== null && idle >= r.idleMinutes * 60;
  const name = r.process.trim().toLowerCase();
  if (!name) return false;
  return processes.some((p) => p === name || p === `${name}.exe` || p.replace(/\.exe$/, "") === name);
}

/** Decides which profile should be live and pushes it to Discord. */
export function useEngine() {
  const lastSent = useRef<string>("");
  const lastSentAt = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 1. Poll the system for automations.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const s = useStore.getState();
      const needs = s.settings.automationsEnabled && s.rules.some((r) => r.enabled);
      if (!needs && s.page !== "automations") return;
      const [processes, idle] = await Promise.all([platform.processes(), platform.idleSeconds()]);
      if (alive) useStore.setState({ processes, idle });
    };
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // 2. Resolve the effective profile every second (cheap, pure).
  useEffect(() => {
    const resolve = () => {
      const s = useStore.getState();
      const now = Date.now();
      let profileId = s.activeProfileId;
      let source: Source = "manual";
      if (s.overrideUntil > now) source = "override";
      else {
        const rule = s.settings.automationsEnabled
          ? s.rules.find((r) => ruleMatches(r, s.processes, s.idle) && s.profiles.some((p) => p.id === r.profileId))
          : undefined;
        const block = !rule && s.settings.scheduleEnabled ? s.schedule.find((b) => blockActive(b)) : undefined;
        if (rule) [profileId, source] = [rule.profileId, "automation"];
        else if (block) [profileId, source] = [block.profileId, "schedule"];
      }
      if (profileId !== s.effective.profileId || source !== s.effective.source) {
        useStore.setState({
          effective: { profileId, source },
          ...(profileId !== s.effective.profileId ? { profileStart: now } : {}),
        });
      }
    };
    resolve();
    const t = setInterval(resolve, 1000);
    return () => clearInterval(t);
  }, []);

  // 3. Send to Discord when the payload changes (respecting Discord's rate limit).
  useEffect(() => {
    const push = () => {
      const s = useStore.getState();
      if (s.status.state !== "connected") {
        lastSent.current = "";
        return;
      }
      const p = s.profiles.find((x) => x.id === s.effective.profileId);
      if (s.paused || !p) {
        if (lastSent.current !== "clear") {
          lastSent.current = "clear";
          void platform.clear();
        }
        return;
      }
      const activity = buildActivity(p, { now: Date.now(), appStart: s.appStart, profileStart: s.profileStart });
      const key = JSON.stringify(activity);
      if (key === lastSent.current) return;
      const wait = Math.max(0, lastSentAt.current + 4000 - Date.now());
      clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        lastSent.current = key;
        lastSentAt.current = Date.now();
        void platform.setActivity(activity);
      }, Math.max(wait, 600));
    };

    let prev = useStore.getState();
    const unsub = useStore.subscribe((s) => {
      const editingLive = s.settings.liveUpdate || prev.effective.profileId !== s.effective.profileId;
      const changed =
        s.status.state !== prev.status.state ||
        s.paused !== prev.paused ||
        s.effective.profileId !== prev.effective.profileId ||
        s.profileStart !== prev.profileStart ||
        (editingLive && s.profiles !== prev.profiles);
      prev = s;
      if (changed) push();
    });
    // Clock variables / local-time mode need a periodic refresh.
    const t = setInterval(() => {
      const s = useStore.getState();
      const p = s.profiles.find((x) => x.id === s.effective.profileId);
      if (p && (usesClockVars(p) || p.time.mode === "localTime" || p.time.mode === "countdown")) push();
    }, 15_000);
    push();
    return () => {
      unsub();
      clearInterval(t);
      clearTimeout(pending.current);
    };
  }, []);
}

/** Force-send the effective profile now (used by the "Ustaw status" button when live update is off). */
export function sendNow() {
  const s = useStore.getState();
  const p = s.profiles.find((x) => x.id === s.effective.profileId);
  if (!p || s.status.state !== "connected") return;
  void platform.setActivity(buildActivity(p, { now: Date.now(), appStart: s.appStart, profileStart: s.profileStart }));
}
