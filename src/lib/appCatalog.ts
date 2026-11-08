import { platform } from "./platform";
import { DEMO_GAMES } from "./knownApps";

export type CatalogCategory = "Game" | "Music" | "Video" | "Social" | "Developer" | "Creative" | "Learning" | "Other";

export interface CatalogApp {
  id: string;
  name: string;
  icon: string | null;
  category: CatalogCategory;
  aliases?: string;
}

const CACHE = "detectable-games";
const MAX_AGE = 7 * 24 * 3600; // refresh the game list weekly


type Slim = [id: string, name: string, icon: string, aliases: string];

let games: Promise<CatalogApp[]> | null = null;

const fromSlim = (rows: Slim[]): CatalogApp[] =>
  rows.map(([id, name, icon, aliases]) => ({ id, name, icon: icon || null, category: "Game", aliases }));

/** Every game Discord can detect (~25k), cached on disk for a week. */
export function loadGames(force = false): Promise<CatalogApp[]> {
  if (games && !force) return games;
  games = (async () => {
    if (platform.isDemo) return DEMO_GAMES;
    const cached = await platform.readCache(CACHE).catch(() => null);
    if (cached && !force && cached[1] < MAX_AGE) {
      try {
        return fromSlim(JSON.parse(cached[0]) as Slim[]);
      } catch {
        /* corrupt cache: fetch again */
      }
    }
    try {
      const list = await platform.fetchDetectable();
      const slim: Slim[] = list.map((a) => [a.id, a.name, a.icon_hash ?? "", (a.aliases ?? []).join("|")]);
      void platform.writeCache(CACHE, JSON.stringify(slim));
      return fromSlim(slim);
    } catch {
      // Offline: fall back to an older cache if there is one.
      if (cached) return fromSlim(JSON.parse(cached[0]) as Slim[]);
      throw new Error("Couldn’t download Discord’s game list. Check your internet connection.");
    }
  })();
  games.catch(() => (games = null));
  return games;
}

export const appIcon = (a: Pick<CatalogApp, "id" | "icon">, size = 64) =>
  a.icon ? `https://cdn.discordapp.com/app-icons/${a.id}/${a.icon}.png?size=${size}` : null;

/** Ranks exact and prefix matches first so “Minecraft” beats “Minecraft Dungeons”. */
export function searchCatalog(list: CatalogApp[], query: string, limit = 60): CatalogApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);
  if (/^\d{17,20}$/.test(q)) return list.filter((a) => a.id === q);
  const scored: [number, CatalogApp][] = [];
  for (const a of list) {
    const n = a.name.toLowerCase();
    const al = a.aliases?.toLowerCase() ?? "";
    let s = -1;
    if (n === q) s = 0;
    else if (n.startsWith(q)) s = 1;
    else if (n.includes(` ${q}`)) s = 2;
    else if (n.includes(q)) s = 3;
    else if (al.includes(q)) s = 4;
    if (s >= 0) scored.push([s * 1000 + Math.min(n.length, 999), a]);
  }
  scored.sort((x, y) => x[0] - y[0]);
  return scored.slice(0, limit).map((x) => x[1]);
}
