/* Table Tennis (working title) — deterministic physics & rules core.
   Pure: no DOM, no Date.now, no Math.random. Runs in browser and Node.
   Real 3D simulation (x lateral, y along table, z height above table
   surface) rendered in 2.5D by the shell.

   The rally is "the ball is a contract": every hit re-launches the ball
   toward an explicit target point via a ballistic solve, so shots always
   feel intentional — misses come from not reaching the ball (or risky low
   pickups clipping the net), never from unreadable physics. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TTCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TABLE_L = 2.74;        // m, along y: 0 = player 1 end
  var TABLE_W = 1.525;       // m, along x, centered on 0
  var NET_Y = TABLE_L / 2;
  var NET_H = 0.1525;
  var FLOOR_Z = -0.76;       // floor relative to table surface
  var G = 9.8;
  var BOUNCE = 0.93;         // table restitution (vertical)
  var DT = 1 / 60;
  var PADDLE_Y = { 1: -0.22, 2: 2.96 };
  var REACH = 0.44;          // paddle hitbox half-extent (arcade-generous)
  var WIN_SCORE = 11;

  function other(p) { return p === 1 ? 2 : 1; }

  function createGame(firstServer) {
    return {
      tick: 0,
      phase: 'serve',              // serve | rally | point | over
      server: firstServer || 1,
      firstServer: firstServer || 1,
      scores: { 1: 0, 2: 0 },
      pointTo: 0,
      winner: 0,
      lastHitBy: 0,
      bounced: false,              // ball has bounced on the receiver's side since last hit
      serveBounce: false,          // one legal own-side bounce (the serve)
      ball: { x: 0, y: PADDLE_Y[firstServer || 1], z: 0.27, vx: 0, vy: 0, vz: 0 },
      paddles: { 1: { x: 0, z: 0.25 }, 2: { x: 0, z: 0.25 } }
    };
  }

  // Ballistic solve: launch the ball from its current position so it lands
  // on (tx, ty) on the table surface after T seconds. Low contact points
  // with flat targets naturally risk clipping the net — that's the skill.
  function launchAt(s, pid, tx, ty, T) {
    var b = s.ball;
    T = Math.max(0.34, Math.min(0.95, T));
    tx = Math.max(-TABLE_W / 2 - 0.55, Math.min(TABLE_W / 2 + 0.55, tx));
    // never let a shot target the hitter's own half (out past the far end is
    // allowed — that's how unforced errors happen)
    if (pid === 1) ty = Math.max(NET_Y + 0.18, Math.min(TABLE_L + 0.7, ty));
    else ty = Math.min(NET_Y - 0.18, Math.max(-0.7, ty));
    b.vx = (tx - b.x) / T;
    b.vy = (ty - b.y) / T;
    b.vz = (0.5 * G * T * T - b.z) / T;
    s.lastHitBy = pid;
    s.bounced = false;
    s.serveBounce = false;
  }

  function award(s, to, ev) {
    if (s.phase !== 'rally') return;
    s.pointTo = to;
    s.scores[to]++;
    ev.push({ type: 'point', to: to });
    var a = s.scores[to], b = s.scores[other(to)];
    if (a >= WIN_SCORE && a - b >= 2) {
      s.phase = 'over';
      s.winner = to;
      ev.push({ type: 'over', winner: to });
    } else {
      s.phase = 'point';
    }
  }

  // Serve (only valid in 'serve' phase). aim: {tx, ty} — the final landing
  // point on the opponent's side. Like real table tennis, the ball first
  // bounces on the server's OWN half, then carries over the net: we pick an
  // own-side bounce point ~42% of the way and solve the first flight time so
  // the post-bounce flight lands exactly at (tx, ty).
  function serve(s, aim) {
    if (s.phase !== 'serve') return false;
    var sp = s.paddles[s.server];
    var b = s.ball;
    b.x = sp.x;
    b.y = PADDLE_Y[s.server];
    b.z = Math.max(0.12, sp.z) + 0.02;
    aim = aim || {};
    var fwd = s.server === 1 ? 1 : -1;
    var tx = typeof aim.tx === 'number' ? aim.tx : 0;
    var ty = typeof aim.ty === 'number' ? aim.ty : NET_Y + fwd * 0.85;
    tx = Math.max(-TABLE_W / 2 - 0.4, Math.min(TABLE_W / 2 + 0.4, tx));
    // Depth floor: neither side can move in depth, so a serve dropped just
    // past the net double-bounces before the receiver's paddle plane and is
    // physically untakeable — a free point, not a risk shot. Minimum depth
    // guarantees the post-bounce carry reaches the receiver.
    if (s.server === 1) ty = Math.max(NET_Y + 0.55, Math.min(TABLE_L + 0.6, ty));
    else ty = Math.min(NET_Y - 0.55, Math.max(-0.6, ty));
    // pace 0..1: harder serves bounce earlier on the own half and drive
    // flatter/faster out of the bounce (smaller first-flight share)
    var pace = typeof aim.pace === 'number' ? Math.max(0, Math.min(1, aim.pace)) : 0;
    var frac = 0.42 - 0.12 * pace;
    // lift: striking the toss mid-air (above paddle height) — capped so
    // early strikes don't turn into balloon serves
    if (typeof aim.lift === 'number') b.z += Math.max(0, Math.min(0.4, aim.lift));
    // Strike height floor/cap: a paddle resting low produces an arc too flat
    // to clear the net (the "every serve nets" bug) — the toss strike always
    // happens at a sane height regardless of where the finger rests.
    b.z = Math.max(0.30, Math.min(0.55, b.z));
    var y0 = b.y, z0 = b.z;
    var y1 = y0 + (ty - y0) * frac;
    if (s.server === 1) y1 = Math.max(0.28, Math.min(NET_Y - 0.18, y1));
    else y1 = Math.min(TABLE_L - 0.28, Math.max(NET_Y + 0.18, y1));
    var D = y1 - y0;
    // post-bounce flight covers (ty - y1); solve the first flight time T1:
    // ty - y1 = D * 2*BOUNCE * (z0/(G*T1^2) + 0.5)
    var k = (ty - y1) / (2 * BOUNCE * D) - 0.5;
    // Solve, then VERIFY net clearance: if the post-bounce arc would clip
    // the tape, strike a little higher and re-solve. Deliberately short
    // serves (ty hugging the net) can still fault — that's the risk shot.
    var T1, vzp;
    for (var tries = 0; tries < 4; tries++) {
      T1 = k > 0.02 ? Math.sqrt(z0 / (G * k)) : 0.30;
      T1 = Math.max(0.16, Math.min(0.6, T1));
      vzp = BOUNCE * (z0 / T1 + 0.5 * G * T1); // vertical speed after the bounce
      var tn = (NET_Y - y1) / (D / T1);        // time from own-side bounce to the net plane
      var clearance = vzp * tn - 0.5 * G * tn * tn;
      if (clearance >= NET_H + 0.05 || z0 >= 0.58) break;
      z0 += 0.08;
    }
    b.z = z0;
    var t2 = 2 * vzp / G;                      // post-bounce flight time
    b.vx = (tx - b.x) / (T1 + t2);
    b.vy = D / T1;
    b.vz = (0.5 * G * T1 * T1 - z0) / T1;
    s.lastHitBy = s.server;
    s.bounced = false;
    s.serveBounce = true;
    s.phase = 'rally';
    return true;
  }

  // Advance to the next rally after a point. Serve alternates every 2
  // points; at deuce (10-10 and beyond) every point.
  function nextRally(s) {
    if (s.phase !== 'point') return false;
    var total = s.scores[1] + s.scores[2];
    var pairIdx = (s.scores[1] >= 10 && s.scores[2] >= 10) ? total : Math.floor(total / 2);
    s.server = pairIdx % 2 === 0 ? s.firstServer : other(s.firstServer);
    s.phase = 'serve';
    s.pointTo = 0;
    s.lastHitBy = 0;
    s.bounced = false;
    var b = s.ball;
    b.vx = b.vy = b.vz = 0;
    return true;
  }

  // One fixed 1/60s step. inputs: { 1: {x, z, aim:{tx,ty,t}}, 2: {...} }
  // Paddle positions are commanded (the shell/AI own smoothing & speed
  // limits); aim is read at the moment of contact.
  function step(s, inputs) {
    s.tick++;
    var ev = [];
    for (var pid = 1; pid <= 2; pid++) {
      var inp = inputs && inputs[pid];
      if (inp) {
        var pad = s.paddles[pid];
        if (typeof inp.x === 'number') pad.x = Math.max(-1.5, Math.min(1.5, inp.x));
        if (typeof inp.z === 'number') pad.z = Math.max(-0.15, Math.min(0.95, inp.z));
      }
    }

    if (s.phase === 'serve') {
      // ball rests on the server's paddle
      var sp = s.paddles[s.server];
      s.ball.x = sp.x;
      s.ball.y = PADDLE_Y[s.server];
      s.ball.z = Math.max(0.12, sp.z) + 0.02;
      s.ball.vx = s.ball.vy = s.ball.vz = 0;
      return { events: ev };
    }
    if (s.phase !== 'rally' && s.phase !== 'point') return { events: ev };

    var b = s.ball;
    var px0 = b.x, py0 = b.y, pz0 = b.z;
    b.vz -= G * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.z += b.vz * DT;

    if (s.phase === 'rally') {
      // paddle contact: ball crosses the receiver's paddle plane within reach
      for (var p = 1; p <= 2; p++) {
        if (s.lastHitBy === p) continue;
        var plane = PADDLE_Y[p];
        var toward = p === 1 ? b.vy < 0 : b.vy > 0;
        if (!toward) continue;
        if ((py0 - plane) * (b.y - plane) > 0) continue; // didn't cross this tick
        var f = (plane - py0) / (b.y - py0 || 1e-9);
        var cx = px0 + (b.x - px0) * f;
        var cz = pz0 + (b.z - pz0) * f;
        var pad2 = s.paddles[p];
        if (Math.abs(cx - pad2.x) < REACH && Math.abs(cz - pad2.z) < REACH + 0.08) {
          b.x = cx; b.y = plane; b.z = Math.max(cz, -0.12);
          var inp2 = (inputs && inputs[p]) || {};
          var aim = inp2.aim || {};
          var fwd = p === 1 ? 1 : -1;
          // where the ball meets the blade deflects the shot — an off-center
          // contact angles the return (physical feel, and honest whiff-ish
          // shanks when you barely reach a wide ball)
          var off = (cx - pad2.x) * 0.9;
          launchAt(s, p,
            (typeof aim.tx === 'number' ? aim.tx : 0) + off,
            typeof aim.ty === 'number' ? aim.ty : NET_Y + fwd * 0.9,
            typeof aim.t === 'number' ? aim.t : 0.7);
          ev.push({ type: 'hit', by: p, x: b.x, z: b.z });
          return { events: ev };
        }
      }
      // net: crossing the net plane below tape height over the table
      if ((py0 - NET_Y) * (b.y - NET_Y) < 0 && b.z < NET_H && b.z > -0.06 &&
          Math.abs(b.x) < TABLE_W / 2 + 0.08) {
        b.y = NET_Y + (s.lastHitBy === 1 ? -0.012 : 0.012);
        b.vy = -b.vy * 0.12;
        b.vx *= 0.5;
        ev.push({ type: 'net' });
        award(s, other(s.lastHitBy), ev); // ball keeps falling for the visual
      }
    }

    // table bounce
    if (b.z <= 0 && b.vz < 0 && Math.abs(b.x) <= TABLE_W / 2 &&
        b.y >= 0 && b.y <= TABLE_L) {
      b.z = 0;
      if (s.phase === 'rally') {
        b.vz = -b.vz * BOUNCE;
        var side = b.y < NET_Y ? 1 : 2;
        ev.push({ type: 'bounce', side: side, x: b.x, y: b.y });
        if (s.lastHitBy && side === other(s.lastHitBy)) {
          if (s.bounced) award(s, s.lastHitBy, ev); // double bounce: receiver never got there
          else s.bounced = true;
        } else if (s.lastHitBy) {
          if (s.serveBounce) s.serveBounce = false; // the serve's own-side bounce is legal
          else award(s, other(s.lastHitBy), ev);    // otherwise own-side bounce = fault
        }
      } else {
        b.vz = -b.vz * 0.55; b.vx *= 0.85; b.vy *= 0.85; // cosmetic settle
      }
    }

    // after a point, don't let the dead ball wander off into the scenery
    if (s.phase === 'point' && (b.y < -1.2 || b.y > TABLE_L + 1.2 || Math.abs(b.x) > 2.5)) {
      b.vx = 0; b.vy = 0;
    }

    // floor
    if (b.z <= FLOOR_Z) {
      b.z = FLOOR_Z;
      b.vz = -b.vz * 0.4;
      b.vx *= 0.7; b.vy *= 0.7;
      if (s.phase === 'rally') {
        ev.push({ type: 'floor' });
        // bounced on the receiver's side first -> they missed; otherwise out
        award(s, s.bounced ? s.lastHitBy : other(s.lastHitBy), ev);
      }
    }

    return { events: ev };
  }

  return {
    createGame: createGame,
    step: step,
    serve: serve,
    nextRally: nextRally,
    other: other,
    constants: {
      TABLE_L: TABLE_L, TABLE_W: TABLE_W, NET_Y: NET_Y, NET_H: NET_H,
      FLOOR_Z: FLOOR_Z, PADDLE_Y: PADDLE_Y, DT: DT, REACH: REACH,
      WIN_SCORE: WIN_SCORE, G: G
    }
  };
});
