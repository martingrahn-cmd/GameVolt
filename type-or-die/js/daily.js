// Daily Challenge helpers (GDD §3.3). The day's seed is derived from the
// UTC date, so every player gets the same challenge on the same day —
// no server needed for the seed itself, only for the shared leaderboard.

import { seedFromString } from "./prng.js";

// "YYYY-MM-DD" for the current UTC day.
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayKey() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

// A distinct deterministic seed per mode so the two daily runs differ.
export function dailySeed(mode) {
  return seedFromString(todayKey() + ":" + mode);
}
