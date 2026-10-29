import assert from "node:assert/strict";
import { test } from "node:test";
import { doneLetters, letterStatuses, nearest, type ParkrunEvent, plan } from "./alphabet.ts";

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
