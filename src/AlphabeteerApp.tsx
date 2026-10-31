import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarCheck, LocateFixed, Route, SpellCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alphabet } from "./components/Alphabet";
import { DataBackup } from "./components/DataBackup";
import { Plan } from "./components/Plan";
import { Runs } from "./components/Runs";
import { StravaConnect } from "./components/StravaConnect";
import { ghost } from "./components/ui";
import parkruns from "./data/parkruns.json";
import { useStravaRuns } from "./hooks/useStravaRuns";
import {
  type AlphabeteerData,
  currentPosition,
  doneLetters,
  EMPTY,
  FALLBACK,
  type LatLng,
  letterCells,
  letterStatuses,
  matchStravaRuns,
  type ParkrunEvent,
  parseAlphabeteer,
} from "./lib/alphabet";
import { sendBadge } from "./lib/badge";
import { type BeforeExport, load, save } from "./lib/storage";
import {
  clearSession,
  exchangeCode,
  loadSession,
  type Session,
  saveSession,
  takePending,
} from "./lib/strava";

const KEY = "parkrun-alphabeteer";
const EVENTS: ParkrunEvent[] = parkruns.events;
type Tab = "alphabet" | "runs" | "plan";

const TABS = [
  { id: "alphabet", label: "Alphabet", Icon: SpellCheck },
  { id: "plan", label: "Plan", Icon: Route },
  { id: "runs", label: "My runs", Icon: CalendarCheck },
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const queryClient = new QueryClient();

interface Props {
  beforeExport?: BeforeExport;
  /** Approximate visitor location from the host (e.g. Cloudflare), used when none is saved */
  geo?: LatLng | null;
  /** Called after a badge handoff is stored; the host opens the sticker maker. Hidden when absent. */
  onMakeBadge?: () => void;
}

export function AlphabeteerApp(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <Tracker {...props} />
    </QueryClientProvider>
  );
}

function Tracker({ beforeExport, geo, onMakeBadge }: Props) {
  const [tab, setTab] = useState<Tab>("alphabet");
  const [data, setData] = useState<AlphabeteerData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [stravaError, setStravaError] = useState("");

  // Load after mount: localStorage is unavailable during SSR and would cause a hydration mismatch.
  // Also finishes a Strava OAuth round trip (?code&state) once.
  useEffect(() => {
    setData(parseAlphabeteer(load<unknown>(KEY, null)) ?? EMPTY);
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setSession(loadSession());
      setReady(true);
      return;
    }
    history.replaceState(null, "", location.pathname + location.hash);
    setTab("runs");
    const pending = takePending();
    if (!pending || pending.state !== state) {
      setStravaError("Couldn't verify the Strava connection. Please try again.");
      setReady(true);
      return;
    }
    exchangeCode(pending, code)
      .then((s) => {
        saveSession(s);
        setSession(s);
      })
      .catch((e: Error) => setStravaError(e.message))
      .finally(() => setReady(true));
  }, []);

  const update = (next: AlphabeteerData) => {
    setData(next);
    save(KEY, next);
  };

  const onSession = (s: Session) => {
    saveSession(s);
    setSession(s);
  };
  const strava = useStravaRuns(session, onSession);

  const bySlug = useMemo(() => new Map(EVENTS.map((e) => [e.slug, e])), []);
  // Strava matches are derived, never stored: a manual log of the same run on the same day wins
  const logged = new Set(data.visits.map((v) => `${v.slug}|${v.date}`));
  const matched = useMemo(() => matchStravaRuns(strava.data ?? [], EVENTS), [strava.data]);
  const fromStrava = matched.filter((v) => !logged.has(`${v.slug}|${v.date}`));
  const visits = [...data.visits, ...fromStrava];
  const done = doneLetters(EVENTS, visits);
  const statuses = letterStatuses(EVENTS, done);
  const runsBySlug = new Map<string, number>();
  for (const v of visits) runsBySlug.set(v.slug, (runsBySlug.get(v.slug) ?? 0) + 1);

  function makeBadge(letter: string | null) {
    sendBadge({
      letter,
      done: done.size,
      possible: Object.values(statuses).filter((s) => s !== "none").length,
      cells: letterCells(EVENTS, visits, statuses),
    });
    onMakeBadge?.();
  }
  // Location hierarchy: saved > host (Cloudflare) > browser (on click only) > London
  const from = data.home ?? geo ?? FALLBACK;
  const fromLabel = data.home ? "your location" : geo ? "your area" : "London";

  function log(slug: string) {
    update({
      ...data,
      visits: [...data.visits, { id: crypto.randomUUID(), slug, date: date || today() }],
    });
    setStatus(`Logged ${bySlug.get(slug)?.name ?? slug} parkrun.`);
  }

  /** Asks the browser, saves the result as home; falls back to the current origin */
  async function locate(): Promise<LatLng> {
    const home = await currentPosition();
    if (!home) {
      setStatus(`Location unavailable. Distances are from ${fromLabel} instead.`);
      return from;
    }
    update({ ...data, home });
    return home;
  }

  // Only prompt for permission when nothing better than London is known
  const origin = () => (data.home || geo ? Promise.resolve(from) : locate());

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
          {tab === "alphabet" && (
            <Alphabet
              events={EVENTS}
              statuses={statuses}
              runsBySlug={runsBySlug}
              from={from}
              done={done}
              origin={origin}
              onLog={log}
              onBadge={onMakeBadge && makeBadge}
            />
          )}
          {tab === "plan" && (
            <Plan events={EVENTS} done={done} runsBySlug={runsBySlug} from={from} onLog={log} />
          )}
          {tab === "runs" && (
            <>
              <StravaConnect
                session={session}
                matched={fromStrava.length}
                loading={strava.isFetching}
                error={stravaError || (strava.error?.message ?? "")}
                onRefresh={() => strava.refetch()}
                onDisconnect={() => {
                  clearSession();
                  setSession(null);
                  queryClient.removeQueries({ queryKey: ["strava"] });
                }}
              />
              <Runs
                events={EVENTS}
                visits={visits}
                runsBySlug={runsBySlug}
                date={date}
                onDate={setDate}
                onLog={log}
                onRemove={(id) =>
                  update({ ...data, visits: data.visits.filter((v) => v.id !== id) })
                }
              />
              <DataBackup
                filename="parkrun-alphabeteer.json"
                data={data}
                parse={parseAlphabeteer}
                onRestore={update}
                beforeExport={beforeExport}
              />
            </>
          )}
          <p className="text-xs text-slate-600">
            Not affiliated with parkrun. Event list from parkrun's public events feed (
            {parkruns.updatedAt}); results and event details live on parkrun's own pages.
          </p>
        </div>
      </div>
      <nav
        aria-label="Alphabeteer"
        className="grid grid-cols-3 gap-1 border-t border-slate-200 bg-white p-1.5"
      >
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
