// Remote backend (GDD §6) — talks to the Type or Die Edge Functions on the
// GameVolt Supabase project. Entirely optional and lazy: if there's no
// logged-in GameVolt session (or supabase-js can't load), every call is a
// no-op and the game uses its local leaderboard. The validated board only
// lights up when a signed-in user plays inside GameVolt.

const SUPABASE_URL = "https://nwkjayseuhvvpkdgpivm.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2pheXNldWh2dnBrZGdwaXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzQxMzYsImV4cCI6MjA4Nzk1MDEzNn0.lGCRdYlgxWJlzM6_XpML3f8AKUJG3tLmzNRLTPR0TnU";

let clientPromise = null;
let sessionKnown = false;
let signedIn = false;

// Lazily load supabase-js and create a client (shares the GameVolt session
// via the same localStorage key, since it's the same project ref).
function getClient() {
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2")
      .then((m) => m.createClient(SUPABASE_URL, SUPABASE_ANON))
      .catch(() => null);
  }
  return clientPromise;
}

// Detect a logged-in session once (call at boot). Subsequent runs use the
// remote board only if this resolved true.
export async function initRemote() {
  const c = await getClient();
  if (!c) {
    sessionKnown = true;
    return false;
  }
  try {
    const { data } = await c.auth.getSession();
    signedIn = !!data?.session;
  } catch {
    signedIn = false;
  }
  sessionKnown = true;
  return signedIn;
}

// Synchronous: is server-validated scoring available right now?
export function remoteEnabled() {
  return sessionKnown && signedIn;
}

// Ask the server for a run (run_id + the seed to play). null on any failure.
export async function startRun(mode, daily) {
  if (!remoteEnabled()) return null;
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c.functions.invoke("tod-start-run", {
      body: { mode, daily: !!daily },
    });
    return error ? null : data; // { run_id, seed, mode, bucket }
  } catch {
    return null;
  }
}

// Submit the keystroke-log proof. Fire-and-forget; the server decides.
export async function submitRun(payload) {
  if (!remoteEnabled()) return;
  const c = await getClient();
  if (!c) return;
  try {
    await c.functions.invoke("tod-submit-run", { body: payload });
  } catch {
    /* offline — score stays unrecorded, no crash */
  }
}

// Read the validated leaderboard. null if unavailable (caller falls back).
export async function board(mode, bucket = "all", limit = 10) {
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c.rpc("get_tod_leaderboard", {
      p_mode: mode,
      p_bucket: bucket,
      p_limit: limit,
    });
    return error ? null : data; // [{ rank, username, avatar_url, score, wpm, accuracy }]
  } catch {
    return null;
  }
}
