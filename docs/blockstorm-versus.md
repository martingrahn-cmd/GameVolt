# BlockStorm Versus — design note

Online 1v1 for BlockStorm, in the shape of modern guideline versus (Tetr.io,
Puyo Puyo Tetris) rather than Tetrinet's special blocks. Nothing here is built
yet; this is the plan, with the parts that were checked against the code marked
as such.

**Why versus and not Tetrinet.** Tetrinet's charm is six players lobbing
specials — add line, nuke, switch field — at each other. That is a separate
powerup system built from nothing, and it fits badly with a game that already
has SRS kicks, lock delay with 15 resets, hold and T-spin detection. Versus
reuses what BlockStorm already computes: the attack table below is a second
reading of numbers the lock routine has in hand. Tetrinet-style specials can be
a second mode later if the party feel is wanted.

**Why it is easier than Spinburn.** Spinburn has to agree on where a ball is,
continuously. Two Tetris boards never share state: each player simulates their
own, and only "I cleared, take N lines" crosses the wire. Latency stops being a
correctness problem and becomes a fairness detail measured in hundreds of
milliseconds. The transport is the one Gridburn already uses — Supabase
broadcast channels, one per 4-character room code, in `nc-net.js`.

---

## 1. The shared bag

Both players must get the same pieces, or the match is not a match.

Gameplay randomness lives in exactly one place: the Fisher-Yates shuffle in
`PieceBag.fillBag()`, `blockstorm/src/js/piece.js`. Everything else calling
`Math.random` is background particles in the renderer. So the whole determinism
problem is that one call plus a way to seed it.

Add to `piece.js`:

```js
// ---- Seeded RNG (multiplayer) ------------------------------------
// Math.random cannot be shared; a seeded stream can. mulberry32 is four
// lines, keeps no state beyond one integer, and is plenty for shuffling
// seven pieces. No seed => Math.random, so single-player is untouched.
let bagRandom = Math.random;
export function setPieceBagSeed(seed) {
  if (!seed) { bagRandom = Math.random; return; }
  let a = seed >>> 0;
  bagRandom = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Then two edits:

```js
// fillBag(), was Math.random()
const j = Math.floor(bagRandom() * (i + 1));

// resetPieceBag(), now takes the seed
export function resetPieceBag(seed) {
  setPieceBagSeed(seed);
  pieceBag.reset();
}
```

`resetPieceBag()` is called from `Game.restart()` (`game.js`), which is where the
room's seed gets passed in. Existing single-player callers pass nothing and get
`Math.random` exactly as before.

**Checked.** A patched copy was run under node: seed 12345 produced
`ZOTLSIJIJSLOTZZSLIOJTSZLJTOI` twice, a different seed produced a different
sequence, every 7-piece group still contained all seven pieces with no
duplicates, and two unseeded runs differed.

The host generates the seed (`(Math.random() * 2 ** 32) >>> 0`) and sends it in
the `accept` handshake. A rematch needs a fresh seed, or both players replay the
same game.

---

## 2. The attack table

All of these are already in scope at the end of `lockPieceAndHandleLines()`
(`game.js`): `tSpin` is `'full' | 'mini' | null`, `res.count` is lines cleared,
`this.combo` has just been incremented. Only back-to-back and perfect clear are
new state.

| Clear | Attack |
|---|---|
| Single | 0 |
| Double | 1 |
| Triple | 2 |
| Tetris | 4 |
| T-spin mini, no lines | 0 |
| T-spin mini single | 1 |
| T-spin single | 2 |
| T-spin double | 4 |
| T-spin triple | 6 |
| Perfect clear | 10 (instead of the above) |

Back-to-back: +1 when this clear and the previous scoring clear were both
"difficult" (Tetris or any full T-spin). Any non-difficult clear breaks the
chain. A clear that drops no lines does not break it.

Combo, added on top. `this.combo` is 1 on the first clear of a run:

| combo | 1 | 2–3 | 4–5 | 6–7 | 8+ |
|---|---|---|---|---|---|
| bonus | 0 | +1 | +2 | +3 | +4 |

```js
const COMBO_BONUS = [0, 0, 1, 1, 2, 2, 3, 3, 4];
function attackFor(lines, tSpin, combo, backToBack, perfectClear) {
  if (perfectClear) return 10;
  let a;
  if (tSpin === 'full')      a = [0, 2, 4, 6][lines] ?? 0;
  else if (tSpin === 'mini') a = lines >= 1 ? 1 : 0;
  else                       a = [0, 0, 1, 2, 4][lines] ?? 0;
  if (a === 0 && !lines) return 0;
  if (backToBack) a += 1;
  a += COMBO_BONUS[Math.min(combo, 8)];
  return a;
}
```

Perfect clear is the one new detection: after `clearFullLines()`, the board is
empty if every cell in `grid.cells` is `null`. Cheap enough to check only when
`res.count > 0`.

The numbers are the usual guideline shape, and they are a starting point, not a
result. Two things are only knowable from play: whether singles should send 0
(punishing, standard) and whether the combo table is too generous on a 10-wide
board at BlockStorm's gravity. Expect to tune after the first few matches.

---

## 3. Garbage

**Cancellation before sending.** Attacks meet in the middle: subtract incoming
from outgoing, send only the remainder. Without this, two good players bury each
other instead of trading.

```js
const net = attack - incomingQueue.consume(attack); // consume returns how much it ate
if (net > 0) Net.attack({ lines: net, hole: holeColumn() });
```

**A delay before it rises.** Garbage sits in a queue for about 0.5 s before it
is inserted, which is the window a player has to cancel it with their own clear.
Insert at the next lock rather than mid-piece, so the board never moves under a
piece being placed.

**Holes are chosen by the sender.** The sending client picks the hole column and
puts it in the message. That is worth doing deliberately: the alternative,
deriving holes from the shared seed, means both clients must consume that stream
in the same order, which turns a desync in one player's garbage into a desync in
the other player's pieces. Sending the column costs one number and removes the
whole class of bug.

Keep the same column for consecutive garbage from one attack, and reroll per
attack — a changing column every row is near-unclearable.

`Grid` needs one method:

```js
addGarbage(lines, hole) {
  // shift everything up; return true if anything is pushed above row 0 (top out)
}
```

---

## 4. What crosses the wire

| Message | When | Payload |
|---|---|---|
| `seed` | host accepts a guest | `{ seed }` |
| `attack` | a clear that survives cancellation | `{ lines, hole }` |
| `board` | each lock | compact board for the opponent's mini-view |
| `topout` | board overflows | `{}` — the other player wins |
| `rematch` | both agree | new seed follows |

`board` is the only message with any size to it, and 200 cells of "filled or
not" compress to a short string. Gridburn's lockstep already pushes about 14
messages a second through the same channel; this is far less.

Nothing here is authoritative. Either client could lie about its board. That is
the right trade for a hobby portal between two people who shared a room code —
but it does mean versus results should not feed the global leaderboards, which
are currently open for anyone to read and would become the obvious thing to
forge. A separate win/loss count on the profile is the safer home.

---

## 5. Scope

In for a first version: 1v1, room code and invite link as the other multiplayer
games have, the table above, cancellation, an opponent mini-board, first to top
out loses, rematch.

Out: more than two players and target selection, teams, Tetrinet specials,
ranked play, spectating, reconnect after a dropped connection.

The last one deserves a decision rather than a shrug. Broadcast channels have no
persistence, so a player whose tab sleeps mid-match comes back to nothing. The
honest first version treats a drop as a forfeit and says so in the UI.
