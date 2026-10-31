// Strava straight from the browser with the visitor's OWN Strava API app (no server, no shared rate limit).
// ponytail: copy of the @get-out-there/strava client, trimmed to runs. Storage keys are the shared contract,
// so connecting in either tool connects both. Extract a shared package if a third tool needs Strava.
const OAUTH = "https://www.strava.com/oauth";
const API = "https://www.strava.com/api/v3";
const SESSION_KEY = "gotc:strava-session";
const PENDING_KEY = "gotc:strava-pending";

export type Credentials = { clientId: string; clientSecret: string };
export type Session = Credentials & {
  accessToken: string;
  refreshToken: string;
  /** epoch seconds */
  expiresAt: number;
  athleteName: string;
};
type Pending = Credentials & { state: string };

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date_local: string;
  start_latlng?: [number, number] | [];
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { firstname?: string; lastname?: string };
};

const MAX_PAGES = 10; // 2000 activities
const PER_PAGE = 200;

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: Session | Pending) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadSession = () => read<Session>(localStorage, SESSION_KEY);
export const saveSession = (s: Session) => write(localStorage, SESSION_KEY, s);

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** One-shot: credentials entered before the redirect, read back when Strava returns with ?code */
export function takePending(): Pending | null {
  const p = read<Pending>(sessionStorage, PENDING_KEY);
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  return p;
}

/** Saves the credentials and sends the visitor to Strava's consent screen */
export function connect(creds: Credentials, redirectUri: string) {
  const state = crypto.randomUUID();
  write(sessionStorage, PENDING_KEY, { ...creds, state });
  const u = new URL(`${OAUTH}/authorize`);
  u.searchParams.set("client_id", creds.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "read,activity:read_all");
  u.searchParams.set("state", state);
  window.location.assign(u.toString());
}

async function token(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok)
    throw new Error(
      res.status === 401
        ? "Strava rejected the Client ID / Secret"
        : `Strava token error (${res.status})`
    );
  return (await res.json()) as TokenResponse;
}

const tokens = (t: TokenResponse) => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token,
  expiresAt: t.expires_at,
});

export async function exchangeCode(creds: Credentials, code: string): Promise<Session> {
  const t = await token({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    grant_type: "authorization_code",
  });
  const name = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ");
  return { ...creds, ...tokens(t), athleteName: name || "Athlete" };
}

/** The session unchanged while the access token is valid, otherwise a refreshed one */
export async function ensureFresh(s: Session, nowSec = Date.now() / 1000): Promise<Session> {
  if (s.expiresAt - 60 > nowSec) return s;
  const t = await token({
    client_id: s.clientId,
    client_secret: s.clientSecret,
    refresh_token: s.refreshToken,
    grant_type: "refresh_token",
  });
  return { ...s, ...tokens(t) };
}

export async function fetchAllActivities(accessToken: string): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API}/athlete/activities?per_page=${PER_PAGE}&page=${page}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 429) throw new Error("Strava rate limit reached. Try again in 15 minutes.");
    if (!res.ok) throw new Error(`Strava API error (${res.status})`);
    const batch = (await res.json()) as StravaActivity[];
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}
