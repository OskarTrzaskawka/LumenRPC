import type { Profile } from "./types";

export interface Template {
  key: string;
  category: string;
  name: string;
  description: string;
  profile: Partial<Profile>;
}

const t = (mode: Profile["time"]["mode"]) => ({ mode, start: "", end: "", offsetMinutes: 60 });

export const CATEGORIES = ["All", "Coding", "Gaming", "Music", "Study", "Streaming", "Chill"];

export const TEMPLATES: Template[] = [
  {
    key: "night-coding",
    category: "Coding",
    name: "Late-night coding",
    description: "Project details with your local time",
    profile: { name: "Late-night coding", color: "#8B7CFF", details: "Writing code", state: "It's {time} here", time: t("profileStart") },
  },
  {
    key: "code-review",
    category: "Coding",
    name: "Code review",
    description: "With a button to your repository",
    profile: {
      name: "Code review",
      color: "#60A5FA",
      details: "Reviewing pull requests",
      state: "Do not disturb",
      buttons: [{ label: "Repository", url: "https://github.com" }],
      time: t("profileStart"),
    },
  },
  {
    key: "ranked",
    category: "Gaming",
    name: "Ranked grind",
    description: "Party 1/5 with a match timer",
    profile: { name: "Ranked", color: "#FF8A4C", activityType: 5, details: "Ranked match", state: "Looking for a squad", party: { enabled: true, size: 1, max: 5 }, time: t("profileStart") },
  },
  {
    key: "coop",
    category: "Gaming",
    name: "Co-op night",
    description: "Server invite in a button",
    profile: {
      name: "Co-op",
      color: "#A3E635",
      details: "Playing with friends",
      state: "Come join!",
      party: { enabled: true, size: 3, max: 4 },
      buttons: [{ label: "Join the server", url: "https://discord.gg/" }],
      time: t("appStart"),
    },
  },
  {
    key: "vinyl",
    category: "Music",
    name: "Spinning a record",
    description: "“Listening to” with a countdown",
    profile: { name: "Record", color: "#F472B6", activityType: 2, details: "Favourite album", state: "Side A", time: t("countdown") },
  },
  {
    key: "study",
    category: "Study",
    name: "Lo-fi & study",
    description: "Shows your current local time",
    profile: { name: "Study", color: "#4FD1C5", details: "Studying", state: "{day} · {date}", time: t("localTime") },
  },
  {
    key: "exam",
    category: "Study",
    name: "Exam countdown",
    description: "Counts down to a date you choose",
    profile: { name: "Exam", color: "#FBBF24", details: "Exam in", state: "Wish me luck", time: t("countdown") },
  },
  {
    key: "live",
    category: "Streaming",
    name: "Live now",
    description: "“Watching” with a link to your stream",
    profile: {
      name: "Stream",
      color: "#F87171",
      activityType: 3,
      details: "Streaming live",
      state: "Come say hi in chat",
      buttons: [{ label: "Watch", url: "https://" }],
      time: t("profileStart"),
    },
  },
  {
    key: "chill",
    category: "Chill",
    name: "Do not disturb",
    description: "Short and timer-free",
    profile: { name: "Resting", color: "#94A3B8", details: "Taking a break", state: "Will reply later", time: t("none") },
  },
  {
    key: "since",
    category: "Chill",
    name: "On the go since morning",
    description: "Timer as if it started hours ago",
    profile: { name: "On the go", color: "#FB923C", details: "Out and about", state: "Busy all day", time: { mode: "offset", start: "", end: "", offsetMinutes: 180 } },
  },
];
