import { ExternalLink, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { connect, type Session } from "../lib/strava";
import { card, field, ghost } from "./ui";

interface Props {
  session: Session | null;
  matched: number;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onDisconnect: () => void;
}

/** Connect the visitor's own Strava API app so parkruns are ticked off automatically */
export function StravaConnect({
  session,
  matched,
  loading,
  error,
  onRefresh,
  onDisconnect,
}: Props) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  if (session)
    return (
      <section aria-labelledby="strava-h" className={`${card} flex flex-col gap-2`}>
        <h3 id="strava-h" className="font-extrabold">
          Strava: {session.athleteName}
        </h3>
        <p role="status" className="text-sm text-slate-700">
          {loading
            ? "Checking your Strava runs…"
            : `${matched} parkrun${matched === 1 ? "" : "s"} found on Strava and ticked off.`}
        </p>
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} disabled={loading} className={ghost}>
            <RefreshCw size={16} aria-hidden="true" />
            Check again
          </button>
          <button type="button" onClick={onDisconnect} className={ghost}>
            <Unplug size={16} aria-hidden="true" />
            Disconnect
          </button>
        </div>
      </section>
    );

  const redirect = `${location.origin}${location.pathname}`;
  return (
    <section aria-labelledby="strava-h" className={`${card} flex flex-col gap-3`}>
      <h3 id="strava-h" className="font-extrabold">
        Tick off parkruns from Strava
      </h3>
      <p className="text-sm text-slate-700">
        Runs that start at a parkrun on a Saturday morning (or have “parkrun” in the title) are
        ticked off automatically. Strava is called straight from your browser with your own free
        Strava API app, so your keys and activities never reach our servers.
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-slate-700">
        <li>
          Create an API app at{" "}
          <a
            className="inline-flex items-center gap-1 font-semibold text-violet-800 underline"
            href="https://www.strava.com/settings/api"
            target="_blank"
            rel="noopener noreferrer"
          >
            strava.com/settings/api
            <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
        <li>
          Set <strong>Authorization Callback Domain</strong> to{" "}
          <code className="rounded bg-slate-100 px-1">{location.hostname}</code>
        </li>
        <li>Paste the Client ID and Client Secret, then connect.</li>
      </ol>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          connect({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }, redirect);
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Client ID
          <input
            className={field}
            inputMode="numeric"
            autoComplete="off"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Client Secret
          <input
            className={field}
            type="password"
            autoComplete="off"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-orange-700 px-4 text-sm font-extrabold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
        >
          Connect with Strava
        </button>
      </form>
    </section>
  );
}
