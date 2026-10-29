import { type LatLng, type ParkrunEvent, plan } from "../lib/alphabet";
import { EventRow } from "./EventRow";

interface Props {
  events: ParkrunEvent[];
  done: Set<string>;
  runsBySlug: Map<string, number>;
  from: LatLng;
  onLog: (slug: string) => void;
}

export function Plan({ events, done, runsBySlug, from, onLog }: Props) {
  const next = plan(events, done, from);
  return (
    <section aria-labelledby="plan-h" className="flex flex-col gap-3">
      <h2 id="plan-h" className="text-xl font-extrabold">
        Next letters
      </h2>
      <p className="text-sm text-slate-700">
        The closest event for every letter you still need, nearest first.
      </p>
      {next.length === 0 ? (
        <p className="rounded-2xl bg-emerald-50 p-6 text-center font-bold text-emerald-900">
          Alphabet complete. Legend.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {next.map((e) => (
            <li key={e.slug} className="flex items-center gap-2">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-lg font-black text-violet-900"
                aria-hidden="true"
              >
                {e.letter}
              </span>
              <ul className="flex-1">
                <EventRow event={e} km={e.km} runs={runsBySlug.get(e.slug) ?? 0} onLog={onLog} />
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
