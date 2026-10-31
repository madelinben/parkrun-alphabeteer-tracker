import { Award, Check, Compass, Minus, Plane } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  type LatLng,
  LETTERS,
  type LetterStatus,
  nearest,
  type ParkrunEvent,
  plan,
} from "../lib/alphabet";
import { EventRow } from "./EventRow";
import { ghost } from "./ui";

const STYLE = {
  done: "bg-emerald-700 text-white ring-emerald-700",
  near: "bg-white text-slate-900 ring-slate-300",
  abroad: "bg-amber-50 text-amber-900 ring-amber-400",
  none: "bg-slate-100 text-slate-500 ring-slate-200",
} satisfies Record<LetterStatus, string>;

const LABEL = {
  done: "done",
  near: "to do",
  abroad: "only overseas",
  none: "no event exists",
} satisfies Record<LetterStatus, string>;

interface Props {
  events: ParkrunEvent[];
  statuses: Record<string, LetterStatus>;
  runsBySlug: Map<string, number>;
  from: LatLng;
  done: Set<string>;
  /** Resolves where "nearest" is measured from, asking the browser if needed */
  origin: () => Promise<LatLng>;
  onLog: (slug: string) => void;
  /** Opens the sticker maker with a badge: one letter, or the whole alphabet when null */
  onBadge?: (letter: string | null) => void;
}

export function Alphabet({
  events,
  statuses,
  runsBySlug,
  from,
  done,
  origin,
  onLog,
  onBadge,
}: Props) {
  const [letter, setLetter] = useState("A");
  const [finding, setFinding] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const possible = LETTERS.filter((l) => statuses[l] !== "none").length;
  const complete = done.size >= possible;

  async function findNearest() {
    setFinding(true);
    const next = plan(events, done, await origin())[0];
    // flushSync so focus lands on the heading after it shows the new letter
    flushSync(() => {
      setFinding(false);
      if (next) setLetter(next.letter);
    });
    heading.current?.focus();
  }
  const mine = events.filter((e) => e.letter === letter && runsBySlug.has(e.slug));

  return (
    <section aria-labelledby="alpha-h" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="alpha-h" className="text-xl font-extrabold">
          Alphabet
        </h2>
        <p className="text-lg font-black tabular-nums text-violet-800">
          {done.size} / {possible}
          <span className="sr-only"> letters done</span>
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width]"
          style={{ width: `${(done.size / possible) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={findNearest}
          disabled={complete || finding}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
        >
          <Compass size={16} aria-hidden="true" />
          {complete ? "Every letter done" : finding ? "Finding…" : "Nearest new letter"}
        </button>
        {onBadge && (
          <button type="button" onClick={() => onBadge(null)} className={ghost}>
            <Award size={16} aria-hidden="true" />
            Alphabet badge
          </button>
        )}
      </div>
      <ul className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
        {LETTERS.map((l) => {
          const s = statuses[l] ?? "none";
          return (
            <li key={l}>
              <button
                type="button"
                onClick={() => setLetter(l)}
                aria-pressed={letter === l}
                aria-label={`${l}, ${LABEL[s]}`}
                className={`relative grid aspect-square w-full place-items-center rounded-xl text-lg font-black ring-1 transition active:scale-95 aria-pressed:outline-3 aria-pressed:outline-offset-2 aria-pressed:outline-violet-700 ${STYLE[s]}`}
              >
                {l}
                <span className="absolute right-1 top-1" aria-hidden="true">
                  {s === "done" && <Check size={11} />}
                  {s === "abroad" && <Plane size={11} />}
                  {s === "none" && <Minus size={11} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Check size={12} aria-hidden="true" /> done
        </span>
        <span className="inline-flex items-center gap-1">
          <Plane size={12} aria-hidden="true" /> only overseas
        </span>
        <span className="inline-flex items-center gap-1">
          <Minus size={12} aria-hidden="true" /> no event yet
        </span>
      </p>

      <section aria-labelledby="letter-h" aria-live="polite" className="flex flex-col gap-2">
        <h3
          id="letter-h"
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-4 font-extrabold focus-visible:outline-2 focus-visible:outline-violet-700"
        >
          {letter}: {LABEL[statuses[letter] ?? "none"]}
        </h3>
        {onBadge && statuses[letter] === "done" && (
          <button type="button" onClick={() => onBadge(letter)} className={`${ghost} self-start`}>
            <Award size={16} aria-hidden="true" />
            {letter} letter badge
          </button>
        )}
        {mine.length > 0 && (
          <ul className="flex flex-col gap-2">
            {mine.map((e) => (
              <EventRow key={e.slug} event={e} runs={runsBySlug.get(e.slug) ?? 0} onLog={onLog} />
            ))}
          </ul>
        )}
        {statuses[letter] === "none" ? (
          <p className="text-sm text-slate-600">
            No parkrun starts with {letter} anywhere yet, so it doesn't count towards the alphabet.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">Nearest {letter} events</p>
            <ul className="flex flex-col gap-2">
              {nearest(events, from, letter).map((e) => (
                <EventRow
                  key={e.slug}
                  event={e}
                  km={e.km}
                  runs={runsBySlug.get(e.slug) ?? 0}
                  onLog={onLog}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}
