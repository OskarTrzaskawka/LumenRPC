export type ActivityType = 0 | 2 | 3 | 5; // Playing, Listening, Watching, Competing
export type StatusDisplay = 0 | 1 | 2; // app name, state, details
export type TimeMode = "none" | "appStart" | "profileStart" | "localTime" | "customStart" | "countdown" | "offset";

export interface PresenceButton {
  label: string;
  url: string;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  activityType: ActivityType;
  statusDisplay: StatusDisplay;
  details: string;
  detailsUrl: string;
  state: string;
  stateUrl: string;
  largeImage: string;
  largeText: string;
  smallImage: string;
  smallText: string;
  party: { enabled: boolean; size: number; max: number };
  buttons: PresenceButton[];
  time: { mode: TimeMode; start: string; end: string; offsetMinutes: number };
}

export interface Rule {
  id: string;
  enabled: boolean;
  trigger: "process" | "idle";
  process: string;
  idleMinutes: number;
  profileId: string;
}

export interface ScheduleBlock {
  id: string;
  day: number; // 0 = Monday … 6 = Sunday
  start: string; // "HH:MM"
  end: string;
  profileId: string;
}

export interface Settings {
  closeToTray: boolean;
  autoConnect: boolean;
  liveUpdate: boolean;
  overrideMinutes: number;
  automationsEnabled: boolean;
  scheduleEnabled: boolean;
  accent: string;
  shortcut: string;
}

export interface RecentClient {
  id: string;
  name: string;
  icon: string | null;
}

export interface Persisted {
  version: 1;
  clientId: string;
  recentClients: RecentClient[];
  profiles: Profile[];
  activeProfileId: string | null;
  rules: Rule[];
  schedule: ScheduleBlock[];
  settings: Settings;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface RpcStatus {
  state: ConnectionState;
  user?: DiscordUser;
  message?: string;
}

export interface AppInfo {
  id: string;
  name: string;
  icon: string | null;
}

export interface Asset {
  id: string;
  name: string;
}

export type Page = "editor" | "automations" | "schedule" | "gallery" | "settings";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const PROFILE_COLORS = ["#8B7CFF", "#4FD1C5", "#FF8A4C", "#F472B6", "#A3E635", "#60A5FA", "#FBBF24", "#94A3B8"];

export function newProfile(patch: Partial<Profile> = {}): Profile {
  return {
    id: uid(),
    name: "New profile",
    color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)],
    activityType: 0,
    statusDisplay: 0,
    details: "",
    detailsUrl: "",
    state: "",
    stateUrl: "",
    largeImage: "",
    largeText: "",
    smallImage: "",
    smallText: "",
    party: { enabled: false, size: 1, max: 4 },
    buttons: [],
    time: { mode: "profileStart", start: "", end: "", offsetMinutes: 60 },
    ...patch,
  };
}

export const defaultSettings: Settings = {
  closeToTray: true,
  autoConnect: true,
  liveUpdate: true,
  overrideMinutes: 60,
  automationsEnabled: true,
  scheduleEnabled: false,
  accent: "#8B7CFF",
  shortcut: "CommandOrControl+Shift+Space",
};

export function defaultPersisted(): Persisted {
  const coding = newProfile({
    name: "Coding",
    color: "#8B7CFF",
    details: "Working on a project",
    state: "Local time {time}",
    largeText: "Lumen RPC",
    buttons: [{ label: "My GitHub", url: "https://github.com" }],
  });
  const gaming = newProfile({
    name: "Gaming",
    color: "#FF8A4C",
    activityType: 0,
    details: "In a ranked match",
    state: "In a squad",
    party: { enabled: true, size: 2, max: 5 },
    time: { mode: "appStart", start: "", end: "", offsetMinutes: 60 },
  });
  const afk = newProfile({
    name: "AFK",
    color: "#94A3B8",
    details: "Be right back",
    state: "Away from keyboard",
    time: { mode: "profileStart", start: "", end: "", offsetMinutes: 60 },
  });
  return {
    version: 1,
    clientId: "",
    recentClients: [],
    profiles: [coding, gaming, afk],
    activeProfileId: coding.id,
    rules: [{ id: uid(), enabled: false, trigger: "idle", process: "", idleMinutes: 10, profileId: afk.id }],
    schedule: [],
    settings: defaultSettings,
  };
}
