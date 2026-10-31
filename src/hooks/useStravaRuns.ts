import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { ensureFresh, fetchAllActivities, type Session } from "../lib/strava";

export const getStravaRunsKey = (clientId: string) => ["strava", "activities", clientId] as const;

/** Refreshes the access token if needed (reporting the new session), then pages through activities */
export async function fetchStravaRuns(session: Session, onSession: (s: Session) => void) {
  const fresh = await ensureFresh(session);
  if (fresh !== session) onSession(fresh);
  return fetchAllActivities(fresh.accessToken);
}

/** Skipped until the visitor connects Strava */
export const getStravaRunsOptions = (session: Session | null, onSession: (s: Session) => void) =>
  queryOptions({
    queryKey: getStravaRunsKey(session?.clientId ?? ""),
    queryFn: session ? () => fetchStravaRuns(session, onSession) : skipToken,
    staleTime: 15 * 60_000, // Strava allows 100 requests / 15 min; a full load is up to 10
    retry: false,
  });

export const useStravaRuns = (session: Session | null, onSession: (s: Session) => void) =>
  useQuery(getStravaRunsOptions(session, onSession));
