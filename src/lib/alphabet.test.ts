import assert from "node:assert/strict";
import { test } from "node:test";
import {
  doneLetters,
  isParkrunSlot,
  letterCells,
  letterStatuses,
  matchStravaRuns,
  nearest,
  type ParkrunEvent,
  plan,
} from "./alphabet.ts";
import type { StravaActivity } from "./strava.ts";

const ev = (name: string, lat: number, lng: number, country = "UK"): ParkrunEvent => ({
  name,
  slug: name.toLowerCase(),
  letter: name[0] ?? "",
  lat,
  lng,
  location: "",
  country,
  url: "",
});

const events = [
  ev("Chester", 53.19, -2.9),
  ev("Crewe", 53.1, -2.44),
  ev("Aberdeen", 57.15, -2.1),
  ev("Zuiderpark", 52.06, 4.28, "INT"),
];

test("letter statuses: done, near, abroad-only and missing", () => {
  const s = letterStatuses(
    events,
    doneLetters(events, [{ id: "1", slug: "chester", date: "2026-10-24" }])
  );
  assert.equal(s.C, "done");
  assert.equal(s.A, "near");
  assert.equal(s.Z, "abroad");
  assert.equal(s.X, "none");
});

test("nearest and plan order by distance from home", () => {
  const home = { lat: 53.19, lng: -2.89 };
  assert.deepEqual(
    nearest(events, home, "C").map((e) => e.name),
    ["Chester", "Crewe"]
  );
  assert.deepEqual(
    plan(events, new Set(["C"]), home).map((e) => e.letter),
    ["A", "Z"]
  );
});

const run = (
  id: number,
  name: string,
  start: string,
  latlng: [number, number]
): StravaActivity => ({
  id,
  name,
  type: "Run",
  sport_type: "Run",
  start_date_local: start,
  start_latlng: latlng,
});

test("parkrun slot: Saturday 9am and Christmas morning only", () => {
  assert.equal(isParkrunSlot("2026-10-24T09:01:00Z"), true);
  assert.equal(isParkrunSlot("2026-10-25T09:01:00Z"), false);
  assert.equal(isParkrunSlot("2026-10-24T12:00:00Z"), false);
  assert.equal(isParkrunSlot("2025-12-25T09:00:00Z"), true);
});

test("strava runs match by slot + distance or by titled event name", () => {
  const visits = matchStravaRuns(
    [
      run(1, "Morning Run", "2026-10-24T09:00:00Z", [53.1901, -2.9001]),
      run(2, "Aberdeen parkrun", "2026-10-25T18:00:00Z", [51.5, -0.12]),
      run(3, "Morning Run", "2026-10-26T09:00:00Z", [53.19, -2.9]),
      run(4, "Saturday jog", "2026-10-31T09:00:00Z", [51.5, -0.12]),
    ],
    events
  );
  assert.deepEqual(
    visits.map((v) => [v.id, v.slug, v.date]),
    [
      ["strava-1", "chester", "2026-10-24"],
      ["strava-2", "aberdeen", "2026-10-25"],
    ]
  );
});

test("letter cells keep the earliest visit per letter", () => {
  const visits = [
    { id: "2", slug: "crewe", date: "2026-10-31" },
    { id: "1", slug: "chester", date: "2026-10-24" },
  ];
  const cells = letterCells(events, visits, letterStatuses(events, doneLetters(events, visits)));
  assert.deepEqual(
    cells.find((c) => c.letter === "C"),
    {
      letter: "C",
      status: "done",
      event: "Chester",
      date: "2026-10-24",
    }
  );
  assert.equal(cells.find((c) => c.letter === "Z")?.status, "todo");
  assert.equal(cells.find((c) => c.letter === "X")?.status, "none");
});
