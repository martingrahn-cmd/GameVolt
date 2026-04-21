#!/usr/bin/env node
/**
 * sync-aggregate-ratings.js
 *
 * Reads the Supabase `ratings` table, aggregates avg + count per game_id,
 * then rewrites the static aggregateRating JSON-LD block in each
 * games/<slug>/index.html so rich snippets reflect real data.
 *
 * Run manually from the repo root:
 *
 *   node scripts/sync-aggregate-ratings.js
 *
 * Tunables via env:
 *   MIN_COUNT (default 5) — skip games with fewer than N ratings so we
 *                           don't replace our seeded estimates with a
 *                           single "4" and call it done.
 *   MIN_COUNT=1 forces sync even with a single rating (useful for
 *   testing or once TapRush-class games gather a handful of reviews).
 *
 * Deps: none. Requires Node 18+ for global fetch.
 *
 * Exit codes:
 *   0 — run complete (updated + skipped summary printed)
 *   1 — network / auth failure fetching ratings
 *   2 — no ratings rows returned at all
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://nwkjayseuhvvpkdgpivm.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2pheXNldWh2dnBrZGdwaXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzQxMzYsImV4cCI6MjA4Nzk1MDEzNn0.lGCRdYlgxWJlzM6_XpML3f8AKUJG3tLmzNRLTPR0TnU';

const GAMES = [
  'snake', 'breakout', 'taprush', 'solitaire', 'connect4', 'blockstorm',
  'hoverdash', 'axeluga', 'gravitywell', 'sudoku', 'manga-match3',
  'golden-glyphs', 'one-stroke',
];

const REPO_ROOT = path.resolve(__dirname, '..');
const MIN_COUNT = Number(process.env.MIN_COUNT || 5);

async function fetchRatings() {
  const url = `${SUPABASE_URL}/rest/v1/ratings?select=game_id,rating`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Ratings fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function aggregate(rows) {
  const byGame = {};
  for (const r of rows) {
    if (!byGame[r.game_id]) byGame[r.game_id] = { sum: 0, count: 0 };
    byGame[r.game_id].sum += Number(r.rating) || 0;
    byGame[r.game_id].count++;
  }
  const out = {};
  for (const g of Object.keys(byGame)) {
    const { sum, count } = byGame[g];
    out[g] = { avg: count ? sum / count : 0, count };
  }
  return out;
}

/**
 * Replace the ratingValue + ratingCount fields inside an
 * aggregateRating block in one landing page. Returns true if the
 * file changed on disk.
 */
function updateGameFile(gameId, avg, count) {
  const filePath = path.join(REPO_ROOT, 'games', gameId, 'index.html');
  if (!fs.existsSync(filePath)) {
    console.warn(`  ! ${gameId}: ${filePath} not found — skipping`);
    return false;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Match the entire aggregateRating block (through the closing brace +
  // trailing comma) and rewrite ratingValue + ratingCount inside it.
  const blockRe =
    /"aggregateRating":\s*\{[\s\S]*?"ratingCount":\s*"(\d+)"[\s\S]*?\}/;
  const match = content.match(blockRe);
  if (!match) {
    console.warn(`  ! ${gameId}: no aggregateRating block matched — skipping`);
    return false;
  }

  const rewritten = match[0]
    .replace(/"ratingValue":\s*"[\d.]+"/, `"ratingValue": "${avg.toFixed(1)}"`)
    .replace(/"ratingCount":\s*"\d+"/, `"ratingCount": "${count}"`);

  if (rewritten === match[0]) {
    console.log(`  = ${gameId}: already up to date`);
    return false;
  }

  const next = content.replace(match[0], rewritten);
  fs.writeFileSync(filePath, next, 'utf8');
  console.log(`  ✓ ${gameId}: avg=${avg.toFixed(1)}, count=${count}`);
  return true;
}

(async function main() {
  console.log(
    `[sync-aggregate-ratings] min_count=${MIN_COUNT} (set env MIN_COUNT=1 to sync everything)`
  );
  console.log('[sync-aggregate-ratings] fetching ratings from Supabase…');

  let rows;
  try {
    rows = await fetchRatings();
  } catch (err) {
    console.error('Fetch failed:', err.message);
    process.exit(1);
  }

  console.log(`[sync-aggregate-ratings] got ${rows.length} rating rows`);
  if (rows.length === 0) {
    console.log('No ratings in the database yet — nothing to sync.');
    process.exit(2);
  }

  const agg = aggregate(rows);
  let updated = 0;
  let skippedNoData = 0;
  let skippedBelowMin = 0;

  for (const gameId of GAMES) {
    const a = agg[gameId];
    if (!a || a.count === 0) {
      console.log(`  - ${gameId}: no ratings yet — keeping seeded estimate`);
      skippedNoData++;
      continue;
    }
    if (a.count < MIN_COUNT) {
      console.log(
        `  - ${gameId}: ${a.count} rating(s), below MIN_COUNT=${MIN_COUNT} — keeping seeded estimate`
      );
      skippedBelowMin++;
      continue;
    }
    if (updateGameFile(gameId, a.avg, a.count)) updated++;
  }

  console.log(
    `\n[sync-aggregate-ratings] done. updated=${updated} skipped_no_data=${skippedNoData} skipped_below_min=${skippedBelowMin}`
  );
  console.log(
    'Commit any changes the script wrote to games/<slug>/index.html when you\'re happy with the numbers.'
  );
})();
