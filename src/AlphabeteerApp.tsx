import { CalendarCheck, LocateFixed, Route, SpellCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alphabet } from "./components/Alphabet";
import { DataBackup } from "./components/DataBackup";
import { Plan } from "./components/Plan";
import { Runs } from "./components/Runs";
import { ghost } from "./components/ui";
import parkruns from "./data/parkruns.json";
import {
  type AlphabeteerData,
  doneLetters,
  EMPTY,
  FALLBACK,
  letterStatuses,
  type ParkrunEvent,
  parseAlphabeteer,
} from "./lib/alphabet";
import { type BeforeExport, load, save } from "./lib/storage";

const KEY = "parkrun-alphabeteer";
const EVENTS: ParkrunEvent[] = parkruns.events;
type Tab = "alphabet" | "runs" | "plan";

const TABS = [
  { id: "alphabet", label: "Alphabet", Icon: SpellCheck },
  { id: "plan", label: "Plan", Icon: Route },
  { id: "runs", label: "My runs", Icon: CalendarCheck },
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export function AlphabeteerApp({ beforeExport }: { beforeExport?: BeforeExport }) {
  const [tab, setTab] = useState<Tab>("alphabet");
  const [data, setData] = useState<AlphabeteerData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("");

  // Load after mount: localStorage is unavailable during SSR and would cause a hydration mismatch.
  useEffect(() => {
    setData(parseAlphabeteer(load<unknown>(KEY, null)) ?? EMPTY);
    setReady(true);
  }, []);

  const update = (next: AlphabeteerData) => {
    setData(next);
    save(KEY, next);
  };

  const bySlug = useMemo(() => new Map(EVENTS.map((e) => [e.slug, e])), []);
  const done = doneLetters(EVENTS, data.visits);
  const statuses = letterStatuses(EVENTS, done);
  const runsBySlug = new Map<string, number>();
  for (const v of data.visits) runsBySlug.set(v.slug, (runsBySlug.get(v.slug) ?? 0) + 1);
  const latest = [...data.visits].sort((a, b) => b.date.localeCompare(a.date))[0];
  const from = data.home ?? (latest && bySlug.get(latest.slug)) ?? FALLBACK;
  const fromLabel = data.home ? "your location" : latest ? `${bySlug.get(latest.slug)?.name ?? "your last run"}` : "central England";

  function log(slug: string) {
    update({ ...data, visits: [...data.visits, { id: crypto.randomUUID(), slug, date: date || today() }] });
    setStatus(`Logged ${bySlug.get(slug)?.name ?? slug} parkrun.`);
  }

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => update({ ...data, home: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      () => setStatus("Location unavailable. Distances are from your last run instead.")
    );
  }

  if (!ready) return <div className="h-full animate-pulse bg-slate-100" />;

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4">
          {tab !== "runs" && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
              <span>Distances from {fromLabel}</span>
              <button type="button" onClick={locate} className={ghost}>
                <LocateFixed size={16} aria-hidden="true" />
                Use my location
              </button>
            </div>
          )}
          <p role="status" className="text-sm font-semibold text-emerald-800 empty:hidden">
            {status}
          </p>
          {tab === "alphabet" && <Alphabet events={EVENTS} statuses={statuses} runsBySlug={runsBySlug} from={from} onLog={log} />}
          {tab === "plan" && <Plan events={EVENTS} done={done} runsBySlug={runsBySlug} from={from} onLog={log} />}
          {tab === "runs" && (
            <>
              <Runs
                events={EVENTS}
                visits={data.visits}
                runsBySlug={runsBySlug}
                date={date}
                onDate={setDate}
                onLog={log}
                onRemove={(id) => update({ ...data, visits: data.visits.filter((v) => v.id !== id) })}
              />
              <DataBackup filename="parkrun-alphabeteer.json" data={data} parse={parseAlphabeteer} onRestore={update} beforeExport={beforeExport} />
            </>
          )}
          <p className="text-xs text-slate-600">
            Not affiliated with parkrun. Event list from parkrun's public events feed ({parkruns.updatedAt}); results and
            event details live on parkrun's own pages.
          </p>
        </div>
      </div>
      <nav aria-label="Alphabeteer" className="grid grid-cols-3 gap-1 border-t border-slate-200 bg-white p-1.5">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition active:scale-[0.97] ${
              tab === id ? "bg-violet-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
