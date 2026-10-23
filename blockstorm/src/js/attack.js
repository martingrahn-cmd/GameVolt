// ------------------------------------------------------------
// attack.js — hur en radrensning blir skräprader hos motståndaren.
//
// Rena funktioner, ingen state och inga beroenden. Ingenting importerar
// den här filen ännu: enspelarläget rör den aldrig, och versus-sidan tar
// över den när den finns. Se docs/blockstorm-versus.md.
//
// Allt den behöver finns redan i slutet av lockPieceAndHandleLines():
// `tSpin` ('full' | 'mini' | null), `res.count` och `this.combo`. Bara
// back-to-back och perfect clear är ny state, och båda hanteras här.
// ------------------------------------------------------------

// combo är 1 vid första rensningen i en serie, därav nollan först.
const COMBO_BONUS = [0, 0, 1, 1, 2, 2, 3, 3, 4];

const BASE = [0, 0, 1, 2, 4];        // single, double, triple, tetris
const BASE_TSPIN = [0, 2, 4, 6];     // t-spin utan rader, single, double, triple

export const PERFECT_CLEAR_ATTACK = 10;

// "Svår" rensning i gällande mening: tetris eller en riktig T-spin som
// faktiskt tog rader. Det är dessa som håller back-to-back-kedjan vid liv.
export function isDifficultClear(lines, tSpin) {
  if (lines <= 0) return false;
  return lines === 4 || tSpin === 'full';
}

// Kedjan bryts bara av en rensning som inte är svår. En placering som
// inte tog några rader lämnar den orörd.
export function nextBackToBack(current, lines, tSpin) {
  if (lines <= 0) return current;
  return isDifficultClear(lines, tSpin);
}

// Antal skräprader att skicka. Mottagaren kvittar mot sin egen kö innan
// något faktiskt går iväg — se docs/blockstorm-versus.md.
export function attackFor({ lines = 0, tSpin = null, combo = 0, backToBack = false, perfectClear = false } = {}) {
  // Fler än fyra rader går inte att rensa med en pjäs. Ett sådant värde är
  // ett fel någon annanstans, och ska inte belönas med combo-bonus heller.
  if (lines <= 0 || lines > 4) return 0;
  if (perfectClear) return PERFECT_CLEAR_ATTACK;

  let a;
  if (tSpin === 'full')      a = BASE_TSPIN[lines] ?? 0;
  else if (tSpin === 'mini') a = lines >= 1 ? 1 : 0;
  else                       a = BASE[lines] ?? 0;

  if (backToBack && isDifficultClear(lines, tSpin)) a += 1;
  a += COMBO_BONUS[Math.min(Math.max(combo, 0), COMBO_BONUS.length - 1)];

  return a;
}

// Brädet är tomt efter rensningen. Billig nog att bara köra när rader föll.
export function isPerfectClear(cells) {
  for (const row of cells) {
    for (const cell of row) if (cell !== null) return false;
  }
  return true;
}
