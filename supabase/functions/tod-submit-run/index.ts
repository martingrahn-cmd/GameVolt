// tod-submit-run — receives { run_id, keystroke_log, ... } and the server
// decides the score (GDD §6.3 step 3–4). The client's number is never
// trusted. Verdict buckets (GDD §6.5): accepted / pending (shadow) /
// rejected (silently dropped — we always return a generic ok so a cheater
// can't tune around the thresholds).

import { CORS, json, serviceClient, getUser } from "../_shared/supa.ts";
import { generateWords } from "../_shared/words.ts";
import {
  replaySpeedTest,
  botFlags,
  bigramFlags,
  letterCount,
  allDictionaryWords,
  type Keystroke,
} from "../_shared/validate.ts";

const WORD_BUFFER = 500;
const DURATION_MS: Record<string, number> = {
  "speedtest-15": 15000,
  "speedtest-30": 30000,
  "speedtest-60": 60000,
};
const RUN_WINDOW_MS = 1000 * 60 * 15; // a run must come back within 15 minutes
const MAX_COMBO_MULT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const user = await getUser(req);
  if (!user) return json({ error: "auth required" }, 401);

  const body = await req.json().catch(() => null);
  if (!body?.run_id || !Array.isArray(body.keystroke_log)) {
    return json({ error: "bad submission" }, 400);
  }
  const log: Keystroke[] = body.keystroke_log;

  const svc = serviceClient();

  // Run integrity (GDD §6.3): must exist, belong to this user, be open, and
  // be within the time window. Close it immediately — one-shot.
  const { data: run } = await svc
    .from("tod_runs")
    .select("*")
    .eq("run_id", body.run_id)
    .single();
  if (!run || run.user_id !== user.id || run.status !== "open") {
    return json({ ok: true }); // generic; never leak why
  }
  await svc.from("tod_runs").update({ status: "closed" }).eq("run_id", run.run_id);

  const ageMs = Date.now() - new Date(run.issued_at).getTime();
  const spanMs = log.length ? log[log.length - 1].t : 0;
  // Elapsed derived from the log must fit inside real server-measured time
  // (kills clock dilation, GDD §6.3).
  const timeOk = ageMs <= RUN_WINDOW_MS && spanMs <= ageMs + 2000;

  let score = 0;
  let wpm: number | null = null;
  let accuracy: number | null = null;
  let state = "accepted";

  if (run.mode.startsWith("speedtest-")) {
    // Authoritative: the words are fully known from the seed.
    const words = generateWords(Number(run.seed), WORD_BUFFER);
    const { stats } = replaySpeedTest(log, words, DURATION_MS[run.mode]);
    wpm = stats.wpm;
    accuracy = stats.accuracy;
    score = stats.wpm;
    const flags = botFlags(log, stats.wpm).concat(bigramFlags(log));
    if (!timeOk || flags.includes("wpm_cap")) state = "rejected";
    else if (flags.includes("too_regular") || flags.includes("no_structure")) {
      state = "pending";
    }
  } else {
    // Zombie — heuristic (GDD §6.6). Spawn order is timing-dependent so we
    // can't fully re-derive it; instead we require a real, human, consistent
    // keystroke log behind the claimed kills, and clamp the score to a
    // generous ceiling for those kills.
    const kills: string[] = Array.isArray(body.kills) ? body.kills : [];
    const claimed = Math.max(0, Math.floor(Number(body.score) || 0));
    const bosses = Math.max(0, Math.floor(Number(body.bosses) || 0));
    const wave = Math.max(1, Math.floor(Number(body.wave) || 1));
    const ceiling =
      kills.reduce((s, w) => s + w.length * 10 * MAX_COMBO_MULT, 0) +
      bosses * 250 * wave * MAX_COMBO_MULT;
    const typedNeeded = kills.reduce((s, w) => s + w.length, 0);
    const typedEnough = letterCount(log) >= Math.floor(typedNeeded * 0.9);
    const zWpm = spanMs > 0
      ? Math.round((letterCount(log) / 5) / (spanMs / 60000))
      : 0;
    const flags = botFlags(log, zWpm).concat(bigramFlags(log));
    score = Math.min(claimed, ceiling);
    if (
      !timeOk ||
      !allDictionaryWords(kills) ||
      !typedEnough ||
      flags.includes("wpm_cap")
    ) {
      state = "rejected";
    } else if (flags.includes("too_regular") || flags.includes("no_structure")) {
      state = "pending";
    }
  }

  if (state === "rejected") return json({ ok: true }); // dropped, no signal

  await svc.from("tod_leaderboard").insert({
    user_id: user.id,
    run_id: run.run_id,
    mode: run.mode,
    bucket: run.bucket,
    score,
    wpm,
    accuracy,
    state,
  });
  return json({ ok: true });
});
