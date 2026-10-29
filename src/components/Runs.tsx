import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { ParkrunEvent, Visit } from "../lib/alphabet";
import { EventRow } from "./EventRow";
import { card, field } from "./ui";

interface Props {
  events: ParkrunEvent[];
  visits: Visit[];
  runsBySlug: Map<string, number>;
  date: string;
  onDate: (date: string) => void;
  onLog: (slug: string) => void;
  onRemove: (id: string) => void;
}

export function Runs({ events, visits, runsBySlug, date, onDate, onLog, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? events.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const bySlug = new Map(events.map((e) => [e.slug, e]));
  const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section aria-labelledby="runs-h" className="flex flex-col gap-4">
      <h2 id="runs-h" className="text-xl font-extrabold">
        My runs
      </h2>
      <div className="grid grid-cols-2 gap-2 text-center">
        <p className={card}>
          <span className="block text-2xl font-black tabular-nums text-violet-800">
            {visits.length}
          </span>
          <span className="text-sm text-slate-600">runs logged</span>
        </p>
        <p className={card}>
          <span className="block text-2xl font-black tabular-nums text-violet-800">
            {runsBySlug.size}
          </span>
          <span className="text-sm text-slate-600">different events</span>
        </p>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            Find a parkrun
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chester, Bushy, Zuiderpark…"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Run date
            <input
              type="date"
              value={date}
              onChange={(e) => onDate(e.target.value)}
              className={field}
            />
          </label>
        </div>
        {matches.length > 0 && (
          <ul aria-label="Matching parkruns" className="flex flex-col gap-2">
            {matches.map((e) => (
              <EventRow key={e.slug} event={e} runs={runsBySlug.get(e.slug) ?? 0} onLog={onLog} />
            ))}
          </ul>
        )}
        {q && matches.length === 0 && (
          <p className="text-sm text-slate-600">No parkrun matches “{query}”.</p>
        )}
      </div>

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-1">
          {sorted.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-xl bg-white py-1 pl-3 pr-1 ring-1 ring-slate-200"
            >
              <span className="w-24 text-sm tabular-nums text-slate-600">
                {new Date(v.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="flex-1 font-semibold">{bySlug.get(v.slug)?.name ?? v.slug}</span>
              <button
                type="button"
                onClick={() => onRemove(v.id)}
                aria-label={`Remove run at ${bySlug.get(v.slug)?.name ?? v.slug} on ${v.date}`}
                className="grid size-11 place-items-center rounded-xl text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
