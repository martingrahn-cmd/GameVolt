// Node test for the Neon Cycles trophy logic. Run: node nc-achievements.test.js
var T = require('./nc-achievements.js');

var failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.log('  ❌ ' + msg); } }

// --- Structure follows the GameVolt standard ---
(function () {
  ok(T.LIST.length === 31, 'exactly 31 trophies (got ' + T.LIST.length + ')');
  var ids = {}, tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  T.LIST.forEach(function (a) {
    ok(!ids[a.id], 'duplicate id: ' + a.id);
    ids[a.id] = 1;
    tiers[a.tier]++;
    ok(a.name && a.desc && a.icon, a.id + ' has name/desc/icon');
  });
  ok(tiers.bronze === 15, '15 bronze (got ' + tiers.bronze + ')');
  ok(tiers.silver === 10, '10 silver (got ' + tiers.silver + ')');
  ok(tiers.gold === 5, '5 gold (got ' + tiers.gold + ')');
  ok(tiers.platinum === 1, '1 platinum (got ' + tiers.platinum + ')');
})();

// --- Event handling drives the right stats ---
(function () {
  var s = T.freshStats();
  T.onEvent(s, 'round', { mode: 'ai', winner: 1, ticks: 100, myDistance: 80, iCrashed: false, double: false });
  ok(s.ai_round_wins === 1 && s.ai_streak === 1 && s.quick_wins === 1, 'fast AI round win counts win+streak+quick');
  T.onEvent(s, 'round', { mode: 'ai', winner: 1, ticks: 700, myDistance: 300, iCrashed: false, double: false });
  ok(s.ai_best_streak === 2 && s.long_wins === 1, 'long win extends streak and counts endurance');
  T.onEvent(s, 'round', { mode: 'ai', winner: 2, ticks: 50, myDistance: 40, iCrashed: true, double: false });
  ok(s.ai_streak === 0 && s.crashes === 1, 'loss resets streak, counts crash');
  ok(s.ai_best_streak === 2, 'best streak survives the reset');
  T.onEvent(s, 'round', { mode: 'ai', winner: 0, ticks: 20, myDistance: 20, iCrashed: true, double: true });
  ok(s.doubles === 1, 'double crash counted');
  ok(s.distance === 440, 'distance accumulates (got ' + s.distance + ')');

  T.onEvent(s, 'match', { mode: 'ai', myWin: true, aiLevel: 'hard', flawless: true, comeback: false });
  ok(s.ai_wins_hard === 1 && s.hard_flawless === 1 && s.flawless === 1, 'hard flawless match win counts all three');
  T.onEvent(s, 'match', { mode: '2p' });
  ok(s.p2_matches === 1 && s.matches === 2, '2p match counts');
  T.onEvent(s, 'solo', { ticks: 900 });
  ok(s.solo_best === 900 && s.solo_runs === 1 && s.matches === 3, 'solo run counts best + run + match');
})();

// --- Evaluate unlocks the right trophies, once ---
(function () {
  var s = T.freshStats();
  T.onEvent(s, 'match', { mode: 'ai', myWin: true, aiLevel: 'easy' });
  var got = T.evaluate(s, []);
  ok(got.indexOf('first-ride') !== -1, 'first match unlocks first-ride');
  ok(got.indexOf('easy-rider') !== -1, 'easy win unlocks easy-rider');
  ok(got.indexOf('neon-legend') === -1, 'platinum not unlocked early');
  var again = T.evaluate(s, got);
  ok(again.length === 0, 'already-unlocked ids are not re-earned');
})();

// --- Platinum unlocks when the other 30 are done ---
(function () {
  var all30 = T.LIST.filter(function (a) { return a.id !== 'neon-legend'; }).map(function (a) { return a.id; });
  var got = T.evaluate(T.freshStats(), all30);
  ok(got.length === 1 && got[0] === 'neon-legend', 'neon-legend unlocks with all 30 others');
  var got29 = T.evaluate(T.freshStats(), all30.slice(0, 29));
  ok(got29.indexOf('neon-legend') === -1, 'neon-legend stays locked at 29');
})();

// --- Every conditional trophy is reachable with plausible maxed stats ---
(function () {
  var s = T.freshStats();
  for (var k in s) s[k] = 1000000;
  var got = T.evaluate(s, []);
  ok(got.length === 31, 'all 31 reachable with maxed stats (got ' + got.length + ')');
})();

if (failures === 0) console.log('✅ Gridburn trophies (31, 15/10/5/1) pass');
else { console.log('❌ ' + failures + ' trophy test(s) failed'); process.exit(1); }
