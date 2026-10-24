// ------------------------------------------------------------
// versus.js — matchreglerna för BlockStorm 1v1.
//
// Vet ingenting om Supabase, canvas eller DOM. Den får ett rutnät, en
// send-funktion och en klocka, vilket gör att två matcher kan kopplas
// ihop mot varandra i ett test utan nätverk alls.
//
// Ansvarar för: back-to-back-kedjan, hur en rensning blir en attack,
// kvittning mot inkommande skräp, och när skräpet faktiskt landar.
//
// Se docs/blockstorm-versus.md.
// ------------------------------------------------------------

import { attackFor, nextBackToBack, isPerfectClear } from "./attack.js";

// Hur länge inkommande skräp ligger i kön innan det reses. Fönstret är
// hela poängen: det är här en motattack hinner kvitta bort det.
export const GARBAGE_DELAY_MS = 500;

export class VersusMatch {
  constructor({ grid, send, now = () => Date.now(), garbageDelayMs = GARBAGE_DELAY_MS, randomHole } = {}) {
    this.grid = grid;
    this.send = send || function () {};
    this.now = now;
    this.garbageDelayMs = garbageDelayMs;
    // Hålkolumnen väljs av avsändaren och skickas med — den härleds inte
    // ur det delade seedet, se designnoteringen.
    this.randomHole = randomHole || (() => Math.floor(Math.random() * (grid ? grid.cols : 10)));

    this.backToBack = false;
    this.incoming = [];      // [{ lines, hole, readyAt }]
    this.sentLines = 0;      // statistik
    this.receivedLines = 0;
    this.finished = false;
    this.won = null;         // true/false när matchen är över
    this.drew = false;       // båda dog innan någons besked hann fram
  }

  // Summan som ligger och väntar, oavsett om den hunnit bli redo.
  get pendingLines() {
    return this.incoming.reduce((n, g) => n + g.lines, 0);
  }

  // ---- utgående -------------------------------------------------

  // Kopplas till game.onLock. Körs efter att rader rensats men innan
  // nästa pjäs spawnar.
  handleLock({ lines = 0, tSpin = null, combo = 0 } = {}) {
    if (this.finished) return { sent: 0, applied: 0 };

    const perfectClear = lines > 0 && this.grid ? isPerfectClear(this.grid.cells) : false;
    const attack = attackFor({ lines, tSpin, combo, backToBack: this.backToBack, perfectClear });
    this.backToBack = nextBackToBack(this.backToBack, lines, tSpin);

    // Kvitta först, skicka sedan bara överskottet. Utan det här begraver
    // två jämna spelare varandra istället för att byta slag.
    const leftover = this._cancel(attack);
    let sent = 0;
    if (leftover > 0) {
      sent = leftover;
      this.sentLines += leftover;
      this.send('attack', { lines: leftover, hole: this.randomHole() });
    }

    const applied = this._applyReadyGarbage();
    return { sent, applied };
  }

  // Dra av `amount` rader från kön, äldst först. Returnerar vad som blev
  // över att faktiskt skicka.
  _cancel(amount) {
    let left = amount;
    while (left > 0 && this.incoming.length > 0) {
      const head = this.incoming[0];
      if (head.lines > left) { head.lines -= left; left = 0; }
      else { left -= head.lines; this.incoming.shift(); }
    }
    return left;
  }

  // ---- inkommande -----------------------------------------------

  receiveAttack({ lines, hole }) {
    if (this.finished) return;
    const n = Math.max(0, lines | 0);
    if (n === 0) return;
    this.receivedLines += n;
    this.incoming.push({ lines: n, hole: hole | 0, readyAt: this.now() + this.garbageDelayMs });
  }

  // Res det skräp vars fönster gått ut. Anropas vid lock, dvs. aldrig
  // mitt under en pjäs.
  _applyReadyGarbage() {
    if (!this.grid) return 0;
    const t = this.now();
    let applied = 0;
    while (this.incoming.length > 0 && this.incoming[0].readyAt <= t) {
      const g = this.incoming.shift();
      const toppedOut = this.grid.addGarbage(g.lines, g.hole);
      applied += g.lines;
      if (toppedOut) { this.lose('garbage'); break; }
    }
    return applied;
  }

  // ---- slut -----------------------------------------------------

  lose(reason) {
    if (this.finished) return;
    this.finished = true;
    this.won = false;
    this.send('topout', { reason: reason || 'topout' });
  }

  // Motståndaren meddelade att de dog.
  //
  // Kommer beskedet efter att vi själva redan dött kan det bara betyda
  // att de dog ungefär samtidigt: en spelare som fått vårt topout har
  // redan avslutat sin match och skickar inget mer. Det är oavgjort —
  // utan det här trodde båda att de vann, eftersom varderas sista
  // meddelande skrev över det egna beskedet.
  opponentLost() {
    if (this.finished) {
      if (this.won === false) this.drew = true;
      return;
    }
    this.finished = true;
    this.won = true;
  }

  // Allt som kommer in från transporten går genom en lucka.
  receive(type, payload) {
    if (type === 'attack') this.receiveAttack(payload || {});
    else if (type === 'topout') this.opponentLost();
  }
}
