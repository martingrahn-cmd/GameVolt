// Server-side validation helpers (GDD §6.3–§6.6). The submission carries the
// keystroke log — the proof — never a trusted score.

import { scoreHistory, type Stats } from "./stats.ts";
import { isDictionaryWord } from "./words.ts";

export interface Keystroke {
  t: number; // ms since the first keystroke
  k: string; // a character, or "Backspace"
}

const WPM_HARD_CAP = 250; // sustained beyond this is non-human (GDD §6.4)
// Human inter-keystroke timing is noisy (CV typically 0.3+). This only
// catches the *naive* near-constant-interval bot (CV ≈ 0); the jitter bot
// is out of scope here (GDD §6.4 / §6.6). Kept low to avoid shadowing
// genuinely metronomic humans — and it only flags to 'pending' anyway.
const IKI_MIN_CV = 0.1;

// Replay the log against the seed-derived ground truth (Speed Test). The
// words are fully known from the seed, so this score is authoritative.
export function replaySpeedTest(
  log: Keystroke[],
  words: string[],
  durationMs: number,
): { stats: Stats; spanMs: number } {
  let input = "";
  const history = [];
  let spanMs = 0;
  for (const e of log) {
    spanMs = e.t;
    if (e.k === "Backspace") {
      input = input.slice(0, -1);
    } else if (e.k === " ") {
      if (input.length) {
        history.push({ target: words[history.length] ?? "", typed: input });
        input = "";
      }
    } else if (e.k.length === 1) {
      input += e.k;
    }
  }
  if (input.length) {
    history.push({ target: words[history.length] ?? "", typed: input });
  }
  return { stats: scoreHistory(history, durationMs), spanMs };
}

// Bot-detection signals on the keystroke log itself (GDD §6.4).
export function botFlags(log: Keystroke[], wpm: number): string[] {
  const flags: string[] = [];
  if (wpm > WPM_HARD_CAP) flags.push("wpm_cap");

  const gaps: number[] = [];
  for (let i = 1; i < log.length; i++) {
    const d = log[i].t - log[i - 1].t;
    if (d > 0) gaps.push(d);
  }
  if (gaps.length >= 12) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance =
      gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv < IKI_MIN_CV) flags.push("too_regular"); // unnaturally even timing
  }
  return flags;
}

// Letter keystrokes in the log — used to sanity-check that a zombie run's
// claimed kills were actually typed (GDD §6 heuristic for the zombie mode).
export function letterCount(log: Keystroke[]): number {
  let n = 0;
  for (const e of log) if (e.k.length === 1 && /[a-z]/i.test(e.k)) n++;
  return n;
}

export function allDictionaryWords(words: string[]): boolean {
  return words.every((w) => isDictionaryWord(w));
}
