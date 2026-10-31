import type { StravaActivity } from "./strava";

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
  /** Strava activity title when the visit was matched from Strava (never stored, re-synced) */
  activity?: string;
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
/** London: the last resort when there is no saved, host (Cloudflare) or browser location */
export const FALLBACK: LatLng = { lat: 51.5072, lng: -0.1276 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function letterStatuses(
  events: readonly ParkrunEvent[],
  done: ReadonlySet<string>
): Record<string, LetterStatus> {
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
export function doneLetters(
  events: readonly ParkrunEvent[],
  visits: readonly Visit[]
): Set<string> {
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
  return LETTERS.filter((l) => !done.has(l))
    .flatMap((l) => nearest(events, from, l, 1))
    .sort((a, b) => a.km - b.km);
}

/** Browser geolocation as a promise; null when unsupported, denied or timed out */
export function currentPosition(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

/** Max distance from a Strava start point to count as that parkrun */
export const MATCH_KM = 1.5;
const PARKRUN_TITLE = /parkrun/i;
const ON_FOOT = new Set(["Run", "TrailRun", "Walk", "Wheelchair"]);

/** Saturday 08:30–10:00 local, or Christmas / New Year's Day morning: when parkruns start */
export function isParkrunSlot(startLocal: string): boolean {
  const day = new Date(`${startLocal.slice(0, 10)}T00:00:00Z`).getUTCDay();
  const minutes = Number(startLocal.slice(11, 13)) * 60 + Number(startLocal.slice(14, 16));
  const special = /-(12-25|01-01)$/.test(startLocal.slice(0, 10));
  return (day === 6 || special) && minutes >= 510 && minutes <= 600;
}

/**
 * Strava runs that were parkruns: on foot, starting within MATCH_KM of an event, and either titled
 * "parkrun" or started in a parkrun slot. A title naming the event wins over distance.
 */
export function matchStravaRuns(
  activities: readonly StravaActivity[],
  events: readonly ParkrunEvent[]
): Visit[] {
  return activities.flatMap((a) => {
    if (!ON_FOOT.has(a.sport_type ?? a.type) || a.start_latlng?.length !== 2) return [];
    const titled = PARKRUN_TITLE.test(a.name);
    const name = a.name.toLowerCase();
    const [lat, lng] = a.start_latlng;
    const event =
      (titled && events.find((e) => name.includes(e.name.toLowerCase()))) ||
      ((titled || isParkrunSlot(a.start_date_local)) &&
        nearest(events, { lat, lng }, undefined, 1).find((e) => e.km <= MATCH_KM));
    return event
      ? [
          {
            id: `strava-${a.id}`,
            slug: event.slug,
            date: a.start_date_local.slice(0, 10),
            activity: a.name,
          },
        ]
      : [];
  });
}

/** Grid cell colours for badges: green done, red still possible, grey no event exists */
export type CellStatus = "done" | "todo" | "none";
export interface LetterCell {
  letter: string;
  status: CellStatus;
  /** First event that completed the letter */
  event?: string;
  date?: string;
}

/** Every letter with the visit that first completed it (earliest date) */
export function letterCells(
  events: readonly ParkrunEvent[],
  visits: readonly Visit[],
  statuses: Record<string, LetterStatus>
): LetterCell[] {
  const bySlug = new Map(events.map((e) => [e.slug, e]));
  const first = new Map<string, { event: string; date: string }>();
  for (const v of [...visits].sort((a, b) => a.date.localeCompare(b.date))) {
    const e = bySlug.get(v.slug);
    if (e && !first.has(e.letter)) first.set(e.letter, { event: e.name, date: v.date });
  }
  return LETTERS.map((letter) => {
    const s = statuses[letter] ?? "none";
    return {
      letter,
      status: s === "done" ? "done" : s === "none" ? "none" : "todo",
      ...first.get(letter),
    };
  });
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en-GB")} km`;
}

export function parseAlphabeteer(raw: unknown): AlphabeteerData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const d = raw as Partial<AlphabeteerData>;
  return d.version === 1 && Array.isArray(d.visits)
    ? { version: 1, visits: d.visits, home: d.home ?? null }
    : null;
}
