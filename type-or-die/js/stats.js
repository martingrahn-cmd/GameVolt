// WPM / accuracy computation (GDD §4). Pure functions — no DOM, no state —
// so both the Speed Test and (later) the zombie mode score the same way,
// and so the server-side validator can mirror this exact logic.
//
// Definitions (Monkeytype-aligned):
//   correctChars   — characters that match the target, plus one per fully
//                    clean word for the word-separating space.
//   incorrectChars — wrong, extra, or missing characters.
//   wpm  (net)     — (correctChars / 5) / minutes.
//   raw            — ((correctChars + incorrectChars) / 5) / minutes.
//   accuracy       — correctChars / (correctChars + incorrectChars).

// `history` is an array of { target, typed } — one entry per committed word.
// Pass the in-progress word too (as a final entry) for live stats.
export function scoreHistory(history, elapsedMs) {
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
      correctChars++; // credit the space after a perfectly typed word
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
