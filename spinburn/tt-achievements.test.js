// Node test for the Spinburn trophy logic. Run: node tt-achievements.test.js
var T = require('./tt-achievements.js');

var failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.log('  ❌ ' + msg); } }

// --- Structure follows the GameVolt standard (15/10/5/1) ---
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

// --- 'start' events drive camp/online started ---
(function () {
  var s = T.freshStats();
  T.onEvent(s, 'start', { campaign: true });
  T.onEvent(s, 'start', { online: true });
  ok(s.camp_started === 1 && s.online_started === 1, 'start events count campaign + online opens');
})();

// --- 'point' events drive points/aces/rally/lead ---
(function () {
  var s = T.freshStats();
  T.onEvent(s, 'point', { mine: true, ace: true, rally: 1, lead: 1 });
  ok(s.points_seen === 1 && s.points === 1 && s.aces === 1, 'won ace point counts seen+won+ace');
  T.onEvent(s, 'point', { mine: false, ace: false, rally: 22, lead: -1 });
  ok(s.points === 1 && s.points_seen === 2 && s.best_rally === 22, 'lost point: seen++ but not won; rally tracks best');
  T.onEvent(s, 'point', { mine: true, rally: 3, lead: 5 });
  ok(s.big_lead === 1, 'a 5-point lead sets big_lead');
})();

// --- 'match' events: win flags, difficulty, campaign, streaks ---
(function () {
  var s = T.freshStats();
  // hard 11-0 love win
  T.onEvent(s, 'match', { myWin: true, mode: 'ai', aiLevel: 'hard', love: true, deuce: false, acesThisMatch: 6 });
  ok(s.wins === 1 && s.wins_hard === 1 && s.hard_love === 1 && s.love_games === 1, 'hard love win counts win+hard+hard_love+love');
  ok(s.aces_match_best === 6, 'aces-in-a-match best tracked');
  ok(s.best_streak === 1 && s.win_streak === 1, 'first win starts streak');
  // deuce comeback win on medium
  T.onEvent(s, 'match', { myWin: true, mode: 'ai', aiLevel: 'medium', deuce: true, comeback: true, comeback5: true });
  ok(s.wins_medium === 1 && s.deuce_wins === 1 && s.comebacks === 1 && s.comebacks5 === 1, 'deuce comeback medium win counts all');
  ok(s.best_streak === 2, 'streak extends to 2');
  // a loss resets the current streak but not the best
  T.onEvent(s, 'match', { myWin: false, mode: 'ai', aiLevel: 'hard' });
  ok(s.win_streak === 0 && s.best_streak === 2, 'loss resets current streak, best survives');
  // campaign KOs + champion
  T.onEvent(s, 'match', { myWin: true, mode: 'campaign', camp: 'q' });
  T.onEvent(s, 'match', { myWin: true, mode: 'campaign', camp: 's' });
  T.onEvent(s, 'match', { myWin: true, mode: 'campaign', camp: 'f', champion: true });
  ok(s.camp_q === 1 && s.camp_s === 1 && s.champion === 1, 'campaign quarter/semi/final KOs counted');
  // online
  T.onEvent(s, 'match', { myWin: true, mode: 'online', online: true, asKid: true });
  ok(s.online_matches === 1 && s.online_wins === 1 && s.as_kid === 1, 'online win + THE KID counted');
})();

// --- Evaluate unlocks the right trophies, once ---
(function () {
  var s = T.freshStats();
  T.onEvent(s, 'point', { mine: true, ace: true, rally: 8, lead: 5 });
  T.onEvent(s, 'match', { myWin: true, mode: 'ai', aiLevel: 'easy' });
  var got = T.evaluate(s, []);
  ok(got.indexOf('first_serve') !== -1, 'first point unlocks first_serve');
  ok(got.indexOf('first_win') !== -1, 'first win unlocks first_win');
  ok(got.indexOf('first_ace') !== -1, 'ace unlocks first_ace');
  ok(got.indexOf('rally_8') !== -1, 'rally of 8 unlocks rally_8');
  ok(got.indexOf('win_easy') !== -1, 'easy win unlocks win_easy');
  ok(got.indexOf('lead_5') !== -1, '5-point lead unlocks lead_5');
  ok(got.indexOf('master') === -1, 'platinum not unlocked early');
  var again = T.evaluate(s, got);
  ok(again.length === 0, 'already-unlocked ids are not re-earned');
})();

// --- Platinum unlocks when the other 30 are done ---
(function () {
  var all30 = T.LIST.filter(function (a) { return a.id !== 'master'; }).map(function (a) { return a.id; });
  var got = T.evaluate(T.freshStats(), all30);
  ok(got.length === 1 && got[0] === 'master', 'master unlocks with all 30 others');
  var got29 = T.evaluate(T.freshStats(), all30.slice(0, 29));
  ok(got29.indexOf('master') === -1, 'master stays locked at 29');
})();

// --- Every conditional trophy is reachable with plausible maxed stats ---
(function () {
  var s = T.freshStats();
  for (var k in s) s[k] = 1000000;
  var got = T.evaluate(s, []);
  ok(got.length === 31, 'all 31 reachable with maxed stats (got ' + got.length + ')');
})();

if (failures === 0) console.log('✅ Spinburn trophies (31, 15/10/5/1) pass');
else { console.log('❌ ' + failures + ' trophy test(s) failed'); process.exit(1); }
