export interface ParkrunEvent {
  name: string;
  slug: string;
  letter: string;
  lat: number;
  lng: number;
  location: string;
  country: string;
  url: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Visit {
  id: string;
  slug: string;
  /** yyyy-mm-dd */
  date: string;
}

export interface AlphabeteerData {
  version: 1;
  visits: Visit[];
  /** Where "nearest" is measured from; null until the visitor sets it */
  home: LatLng | null;
}

/** done: run one. near: one in the UK or Ireland. abroad: only overseas. none: no event exists (X) */
export type LetterStatus = "done" | "near" | "abroad" | "none";

export const EMPTY: AlphabeteerData = { version: 1, visits: [], home: null };
export const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
/** Central England: a neutral start before the visitor shares a location or logs a run */
export const FALLBACK: LatLng = { lat: 52.5, lng: -1.5 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function letterStatuses(events: readonly ParkrunEvent[], done: ReadonlySet<string>): Record<string, LetterStatus> {
  const out: Record<string, LetterStatus> = {};
  for (const letter of LETTERS) {
    const list = events.filter((e) => e.letter === letter);
    out[letter] = done.has(letter)
      ? "done"
      : list.some((e) => e.country !== "INT")
        ? "near"
        : list.length
          ? "abroad"
          : "none";
  }
  return out;
}

/** Letters completed by the visits that match a known event */
export function doneLetters(events: readonly ParkrunEvent[], visits: readonly Visit[]): Set<string> {
  const bySlug = new Map(events.map((e) => [e.slug, e.letter]));
  return new Set(visits.flatMap((v) => bySlug.get(v.slug) ?? []));
}

export function nearest(events: readonly ParkrunEvent[], from: LatLng, letter?: string, limit = 5) {
  return events
    .filter((e) => !letter || e.letter === letter)
    .map((e) => ({ ...e, km: distanceKm(from, e) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** The closest event for every letter still to do, closest first: a road trip plan */
export function plan(events: readonly ParkrunEvent[], done: ReadonlySet<string>, from: LatLng) {
  return LETTERS.filter((l) => !done.has(l)).flatMap((l) => nearest(events, from, l, 1)).sort((a, b) => a.km - b.km);
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en-GB")} km`;
}

export function parseAlphabeteer(raw: unknown): AlphabeteerData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const d = raw as Partial<AlphabeteerData>;
  return d.version === 1 && Array.isArray(d.visits) ? { version: 1, visits: d.visits, home: d.home ?? null } : null;
}
