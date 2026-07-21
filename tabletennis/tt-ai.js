/* Table Tennis AI — easy / medium / hard. Pure and deterministic given an
   injected rng. The AI is a virtual player: it moves a speed-limited paddle
   toward a predicted intercept after a human-like reaction delay, and picks
   shot placement (with unforced errors) when it connects.

   decide(s, pid, level, rng, mem) -> { x, z, aim, serve? }
   - mem is a plain object the caller owns; the AI keeps its paddle position,
     reaction timers and shot plan in it between ticks.
   - The returned {x, z} is the commanded paddle position for this tick,
     aim is the shot to play if contact happens this tick. When it's the
     AI's serve, `serve` carries the serve aim once it decides to go. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./tt-core.js'));
  else root.TTAi = factory(root.TTCore);
})(typeof self !== 'undefined' ? self : this, function (TTCore) {
  'use strict';

  var K = TTCore.constants;

  var LEVELS = {
    easy:   { speed: 1.7, react: 20, err: 0.30, outP: 0.10, tMin: 0.58, depth: 0.55, serveWait: 70, leaveP: 0.5 },
    medium: { speed: 2.0, react: 16, err: 0.26, outP: 0.085, tMin: 0.58, depth: 0.62, serveWait: 55, leaveP: 0.8 },
    hard:   { speed: 4.3, react: 3,  err: 0.07, outP: 0.012, tMin: 0.42, depth: 0.92, serveWait: 40, leaveP: 0.98 }
  };

  // Integrate a copy of the ball to the AI's paddle plane (with table
  // bounces) and return the intercept point, or null if it never arrives.
  // willBounce: the ball touches the AI's own half on the way — a ball that
  // arrives WITHOUT bouncing is sailing long (out), and a good player steps
  // aside and lets it go instead of volleying the point away.
  function predictIntercept(s, pid) {
    var b = s.ball;
    var x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
    var plane = K.PADDLE_Y[pid];
    var willBounce = false;
    for (var i = 0; i < 300; i++) {
      var py = y;
      vz -= K.G * K.DT;
      x += vx * K.DT; y += vy * K.DT; z += vz * K.DT;
      if (z <= 0 && vz < 0 && Math.abs(x) <= K.TABLE_W / 2 && y >= 0 && y <= K.TABLE_L) {
        z = 0; vz = -vz * 0.93;
        if ((pid === 1) === (y < K.NET_Y)) willBounce = true;
      }
      if (z <= K.FLOOR_Z) return null;
      if ((py - plane) * (y - plane) <= 0 && ((pid === 2 && vy > 0) || (pid === 1 && vy < 0))) {
        return { x: x, z: Math.max(0.05, z), ticks: i, willBounce: willBounce };
      }
    }
    return null;
  }

  function decide(s, pid, level, rng, mem) {
    var L = LEVELS[level] || LEVELS.medium;
    var opp = TTCore.other(pid);
    if (mem.x === undefined) { mem.x = s.paddles[pid].x; mem.z = s.paddles[pid].z; }

    var targetX = 0, targetZ = 0.25;
    var out = { x: mem.x, z: mem.z };

    if (s.phase === 'serve' && s.server === pid) {
      mem.serveT = (mem.serveT || 0) + 1;
      if (mem.serveT >= L.serveWait) {
        mem.serveT = 0;
        var fwd = pid === 1 ? 1 : -1;
        out.serve = {
          tx: (rng() - 0.5) * K.TABLE_W * 0.7,
          ty: K.NET_Y + fwd * (0.45 + rng() * 0.85),
          pace: Math.min(1, (0.64 - L.tMin) * 2 + rng() * 0.3)
        };
      }
    } else if (s.phase !== 'serve') {
      mem.serveT = 0;
    }

    var incoming = s.phase === 'rally' && s.lastHitBy === opp;
    if (incoming) {
      if (mem.sawHitTick === undefined || mem.lastHitBy !== opp) {
        mem.sawHitTick = s.tick;             // reaction clock starts at the opponent's hit
        mem.plan = null;
        mem.intercept = null;
        mem.leaveRoll = rng();               // judgement: will I spot a long ball this time?
        mem.trackErr = (rng() - 0.5) * 2 * L.err * 0.8; // imperfect footwork, rolled per ball
      }
      var reacted = s.tick - mem.sawHitTick >= L.react;
      if (reacted) {
        if (!mem.intercept || s.tick % 10 === 0) mem.intercept = predictIntercept(s, pid);
        var inPlay = s.bounced || (mem.intercept && mem.intercept.willBounce);
        if (mem.intercept && !inPlay && mem.leaveRoll < L.leaveP) {
          // ball is sailing long — step aside and let it go out
          targetX = mem.intercept.x + (mem.intercept.x >= 0 ? -0.65 : 0.65);
          targetZ = 0.25;
          mem.plan = null;
        } else if (mem.intercept) {
          targetX = mem.intercept.x + (mem.trackErr || 0);
          targetZ = mem.intercept.z;
        }
        if (!mem.plan && (inPlay || mem.leaveRoll >= L.leaveP)) {
          // choose shot placement once per incoming ball
          var fwd2 = pid === 1 ? 1 : -1;
          var oppX = s.paddles[opp].x;
          var placeAway = (rng() < 0.35 + (level === 'hard' ? 0.4 : 0)) ? (oppX > 0 ? -1 : 1) : (rng() < 0.5 ? -1 : 1);
          var tx = placeAway * (0.15 + rng() * 0.45) + (rng() - 0.5) * 2 * L.err;
          var ty = K.NET_Y + fwd2 * (0.25 + L.depth * (0.5 + rng() * 0.5)) + (rng() - 0.5) * 2 * L.err;
          if (rng() < L.outP) ty = K.NET_Y + fwd2 * (K.TABLE_L / 2 + 0.25 + rng() * 0.4); // unforced error: long
          mem.plan = { tx: tx, ty: ty, t: L.tMin + rng() * 0.16 };
        }
      }
    } else {
      mem.sawHitTick = undefined;
      mem.plan = null;
      mem.intercept = null;
    }
    mem.lastHitBy = s.lastHitBy;

    // speed-limited glide toward the target
    var maxStep = L.speed * K.DT;
    mem.x += Math.max(-maxStep, Math.min(maxStep, targetX - mem.x));
    mem.z += Math.max(-maxStep, Math.min(maxStep, targetZ - mem.z));
    out.x = mem.x;
    out.z = mem.z;
    out.aim = mem.plan || undefined;
    return out;
  }

  return { decide: decide, LEVELS: LEVELS };
});
