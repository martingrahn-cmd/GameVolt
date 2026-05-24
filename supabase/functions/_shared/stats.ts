// WPM / accuracy — a port of the client's js/stats.js, kept identical so the
// server's recomputed Speed Test score equals what the client showed
// (Monkeytype-aligned).

export interface HistEntry {
  target: string;
  typed: string;
}

export interface Stats {
  wpm: number;
  raw: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  cleanWords: number;
}

export function scoreHistory(history: HistEntry[], elapsedMs: number): Stats {
  let correctChars = 0;
  let incorrectChars = 0;
  let cleanWords = 0;

  for (const { target, typed } of history) {
    let wordClean = typed.length === target.length;
    const span = Math.max(target.length, typed.length);
    for (let i = 0; i < span; i++) {
      if (typed[i] === undefined || target[i] === undefined) {
        incorrectChars++;
        wordClean = false;
      } else if (typed[i] === target[i]) {
        correctChars++;
      } else {
        incorrectChars++;
        wordClean = false;
      }
    }
    if (wordClean) {
      cleanWords++;
      correctChars++; // the word-separating space
    }
  }

  const minutes = elapsedMs / 60000;
  const typed = correctChars + incorrectChars;
  return {
    wpm: minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0,
    raw: minutes > 0 ? Math.round(typed / 5 / minutes) : 0,
    accuracy: typed > 0 ? Math.round((correctChars / typed) * 100) : 100,
    correctChars,
    incorrectChars,
    cleanWords,
  };
}
