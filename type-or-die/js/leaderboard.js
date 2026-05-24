// Local leaderboard (frontend-only milestone). Persists to localStorage.
//
// This is deliberately a stand-in. Per GDD §6 the real leaderboard is
// server-authoritative behind RLS and an Edge Function validator — a client
// can never write a trusted score. Everything here is non-authoritative and
// will be swapped for a Supabase call without the UI noticing.
//
// Entries are keyed by `mode` + `bucket` so both modes share one store:
//   speedtest → bucket is the duration ("15" / "30" / "60")
//   zombie    → bucket is "classic"

const KEY = "tod_leaderboard_v2";
const MAX_PER_BUCKET = 10;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked — non-critical */
  }
}

// entry: { name, mode, bucket, ...stats }
export function addScore(entry) {
  const list = load();
  const row = { ...entry, date: new Date().toISOString() };
  list.push(row);
  save(list);
  return row;
}

// Top scores for a mode + bucket, ranked by `sortKeys` (descending, in order
// — later keys break ties).
export function topScores(mode, bucket, sortKeys = ["score"]) {
  return load()
    .filter((r) => r.mode === mode && r.bucket === bucket)
    .sort((a, b) => {
      for (const k of sortKeys) {
        const d = (b[k] ?? 0) - (a[k] ?? 0);
        if (d !== 0) return d;
      }
      return 0;
    })
    .slice(0, MAX_PER_BUCKET);
}
