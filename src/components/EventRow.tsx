import { Check, ExternalLink, Plus } from "lucide-react";
import { formatKm, type ParkrunEvent } from "../lib/alphabet";

interface Props {
  event: ParkrunEvent;
  km?: number;
  runs: number;
  onLog: (slug: string) => void;
}

/** One parkrun event: distance, how often you have run it, log a run, link out to its page */
export function EventRow({ event, km, runs, onLog }: Props) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white p-2 pl-3 ring-1 ring-slate-200">
      <div className="min-w-0 flex-1">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-slate-900 underline decoration-slate-300 hover:decoration-violet-700"
        >
          {event.name}
          <ExternalLink size={12} aria-hidden="true" />
          <span className="sr-only">(opens parkrun event page in a new tab)</span>
        </a>
        <p className="truncate text-sm text-slate-600">
          {[km !== undefined && formatKm(km), event.location, event.country === "INT" && "overseas"]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {runs > 0 && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
          <Check size={14} aria-hidden="true" />
          {runs}×
        </span>
      )}
      <button
        type="button"
        onClick={() => onLog(event.slug)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-violet-700 px-3 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
        aria-label={`Log a run at ${event.name}`}
      >
        <Plus size={14} aria-hidden="true" />
        Ran it
      </button>
    </li>
  );
}
