// GameVolt Portal Progress Tracker
// Manages the gv_portal localStorage key for session/progress tracking.
// Designed for future cloud sync via Supabase.

(function() {
  'use strict';

  var KEY = 'gv_portal';
  var VER = 1;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data.v === VER) return data;
      }
    } catch (e) {}
    return { v: VER, games: {} };
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function ensure(data, id) {
    if (!data.games[id]) {
      data.games[id] = {
        firstPlayed: new Date().toISOString(),
        lastPlayed: new Date().toISOString(),
        sessions: 0,
        totalPlayTimeMs: 0,
        lastSessionMs: 0,
        highScores: {},
        lastEvent: null
      };
    }
    return data.games[id];
  }

  function startSession(gameId) {
    var data = load();
    var g = ensure(data, gameId);
    g.sessions++;
    g.lastPlayed = new Date().toISOString();
    save(data);
    return Date.now();
  }

  function endSession(gameId, startTime) {
    if (!startTime) return;
    var elapsed = Date.now() - startTime;
    if (elapsed < 1000) return; // ignore sub-second sessions
    var data = load();
    var g = ensure(data, gameId);
    g.totalPlayTimeMs += elapsed;
    g.lastSessionMs = elapsed;
    g.lastPlayed = new Date().toISOString();
    save(data);
  }

  function recordHighScore(gameId, score, mode) {
    mode = mode || 'default';
    score = Number(score);
    if (!score || score <= 0) return;
    var data = load();
    var g = ensure(data, gameId);
    var current = g.highScores[mode] || 0;
    if (score > current) {
      g.highScores[mode] = score;
      save(data);
    }
  }

  function recordEvent(gameId, eventName) {
    var data = load();
    var g = ensure(data, gameId);
    g.lastEvent = eventName;
    g.lastPlayed = new Date().toISOString();
    save(data);
  }

  function getRecentlyPlayed(limit) {
    limit = limit || 4;
    var data = load();
    return Object.entries(data.games)
      .filter(function(e) { return e[1].sessions > 0; })
      .sort(function(a, b) { return new Date(b[1].lastPlayed) - new Date(a[1].lastPlayed); })
      .slice(0, limit)
      .map(function(e) { return Object.assign({ id: e[0] }, e[1]); });
  }

  function getGameData(gameId) {
    var data = load();
    return data.games[gameId] || null;
  }

  function formatTimeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }

  function formatPlayTime(ms) {
    var totalMin = Math.floor(ms / 60000);
    if (totalMin < 1) return '< 1 min';
    if (totalMin < 60) return totalMin + ' min';
    var hours = Math.floor(totalMin / 60);
    var mins = totalMin % 60;
    return hours + 'h ' + mins + 'm';
  }

  window.GVTracker = {
    load: load,
    save: save,
    startSession: startSession,
    endSession: endSession,
    recordHighScore: recordHighScore,
    recordEvent: recordEvent,
    getRecentlyPlayed: getRecentlyPlayed,
    getGameData: getGameData,
    formatTimeAgo: formatTimeAgo,
    formatPlayTime: formatPlayTime
  };
})();
