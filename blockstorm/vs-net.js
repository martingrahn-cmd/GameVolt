// ============================================================
// vs-net.js — room-code transport for BlockStorm Versus.
//
// Same pattern as Gridburn's nc-net.js and Connect 4's c4-net.js: a thin
// wrapper over Supabase Realtime *broadcast* channels (ephemeral pub/sub,
// no tables, no RLS, the public anon key is fine). One channel per 4-char
// room code.
//
// Lighter than Gridburn's: that game runs lockstep and sends ~14 messages
// a second, while versus Tetris sends one board snapshot per lock and an
// attack only when someone clears. Nothing here is authoritative — see
// docs/blockstorm-versus.md on why versus results stay off the
// leaderboards.
//
// Handshake: host creates a room and generates the shared bag seed; guest
// joins and sends "join"; host replies "accept" carrying the seed; both
// start. The guest keeps knocking until accepted, because the host's tab
// may be suspended while they paste the invite link somewhere.
// ============================================================
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://nwkjayseuhvvpkdgpivm.supabase.co';
  // Public anon key (safe to ship; broadcast channels need no elevated access).
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2pheXNldWh2dnBrZGdwaXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzQxMzYsImV4cCI6MjA4Nzk1MDEzNn0.lGCRdYlgxWJlzM6_XpML3f8AKUJG3tLmzNRLTPR0TnU';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  // A tab that closes says 'bye'. A tab that crashes, sleeps, or loses the
  // network says nothing at all, and the other player sits in a match that
  // can never end. So each side beats quietly and watches the silence:
  // first a warning, because a few seconds of nothing is usually just a
  // bad connection, then the match is called.
  var HEARTBEAT_MS = 3000;
  var QUIET_MS = 5000;
  var LOST_MS = 12000;

  var client = null;
  var channel = null;
  var handlers = {};
  var beatTimer = null;
  var lastSeen = 0;
  var quiet = false;
  var state = { role: null, code: null, connected: false, seed: null, name: '', oppName: '' };

  // Names are shown to the other player, so they are trimmed here as well
  // as on the page: nothing longer than a label, no control characters.
  function cleanName(n) {
    return String(n == null ? '' : n).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 14);
  }
  var joinTimer = null;

  function stopJoinRetry() {
    if (joinTimer) { clearInterval(joinTimer); joinTimer = null; }
  }

  function stopHeartbeat() {
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
    quiet = false;
  }

  function startHeartbeat() {
    stopHeartbeat();
    lastSeen = Date.now();
    beatTimer = setInterval(function () {
      if (!channel || !state.connected) return;
      send('ping', {});
      var silent = Date.now() - lastSeen;
      if (silent >= LOST_MS) {
        stopHeartbeat();
        state.connected = false;
        emit('lost', { silentMs: silent });
      } else if (silent >= QUIET_MS && !quiet) {
        quiet = true;
        emit('quiet', { silentMs: silent });
      } else if (silent < QUIET_MS && quiet) {
        quiet = false;
        emit('back', {});
      }
    }, HEARTBEAT_MS);
  }

  function ensureLib() {
    return new Promise(function (resolve, reject) {
      if (global.supabase && global.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = CDN;
      s.onload = function () {
        if (global.supabase && global.supabase.createClient) resolve();
        else reject(new Error('supabase-js loaded but missing createClient'));
      };
      s.onerror = function () { reject(new Error('failed to load supabase-js')); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (!client) {
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: { params: { eventsPerSecond: 20 } } // a board per lock, attacks are rare
      });
    }
    return client;
  }

  function randCode() {
    // No easily-confused characters (0/O, 1/I/L).
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var c = '';
    for (var i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    return c;
  }

  function randSeed() {
    return (Math.floor(Math.random() * 4294967296)) >>> 0 || 1; // never 0: that means "unseeded"
  }

  function on(event, fn) { handlers[event] = fn; }
  function emit(event, data) { if (handlers[event]) { try { handlers[event](data); } catch (e) {} } }

  function subscribe(code) {
    var ch = getClient().channel('bs-' + code, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'msg' }, function (m) { onMsg(m && m.payload); });
    return new Promise(function (resolve, reject) {
      var settled = false;
      ch.subscribe(function (status) {
        if (settled) return;
        if (status === 'SUBSCRIBED') { settled = true; resolve(ch); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { settled = true; reject(new Error(status)); }
      });
    });
  }

  function send(type, payload) {
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'msg', payload: { t: type, d: payload || {} } });
  }

  function onMsg(p) {
    if (!p || !p.t) return;

    // Anything arriving is proof they are still there, a ping included.
    lastSeen = Date.now();
    if (quiet) { quiet = false; emit('back', {}); }
    if (p.t === 'ping') return;

    if (p.t === 'join') {
      // Always re-acknowledge: an earlier 'accept' may have been lost while a
      // tab was suspended. Only announce the opponent once, though — 1v1.
      if (state.role === 'host') {
        // Re-send the name too: the guest may have missed the first accept.
        state.oppName = cleanName(p.d && p.d.name) || state.oppName;
        send('accept', { seed: state.seed, name: state.name });
        if (!state.connected) {
          state.connected = true;
          startHeartbeat();
          emit('opponentJoined', { seed: state.seed, name: state.oppName });
        }
      }
      return;
    }

    if (p.t === 'accept') {
      if (state.role === 'guest') {
        stopJoinRetry();
        if (!state.connected) {
          state.connected = true;
          state.seed = (p.d && p.d.seed) || null;
          state.oppName = cleanName(p.d && p.d.name);
          startHeartbeat();
          emit('opponentJoined', { seed: state.seed, name: state.oppName });
        }
      }
      return;
    }

    if (p.t === 'react')   { emit('react', p.d || {}); return; }
    if (p.t === 'attack')  { emit('attack', p.d || {}); return; }
    if (p.t === 'board')   { emit('board', p.d || {}); return; }
    if (p.t === 'topout')  { emit('topout', p.d || {}); return; }
    if (p.t === 'rematch') { emit('rematch', p.d || {}); return; }
    if (p.t === 'bye')     { stopHeartbeat(); state.connected = false; emit('left', {}); return; }
  }

  var VSNet = {
    get connected() { return state.connected; },
    get code() { return state.code; },
    get role() { return state.role; },
    get seed() { return state.seed; },
    get oppName() { return state.oppName; },
    on: on,

    // Create a room. Resolves with the 4-char code to share. The host owns
    // the seed, so both players draw the same pieces.
    host: function (name) {
      state.role = 'host'; state.code = randCode(); state.seed = randSeed(); state.connected = false;
      state.name = cleanName(name); state.oppName = '';
      return ensureLib().then(function () { return subscribe(state.code); }).then(function (ch) {
        channel = ch;
        return state.code;
      });
    },

    // Join a room by code. Resolves once subscribed; the connection is
    // confirmed by the 'opponentJoined' callback when the host accepts.
    join: function (code, name) {
      state.role = 'guest';
      state.code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      state.connected = false; state.seed = null;
      state.name = cleanName(name); state.oppName = '';
      return ensureLib().then(function () { return subscribe(state.code); }).then(function (ch) {
        channel = ch;
        send('join', { name: state.name });
        stopJoinRetry();
        joinTimer = setInterval(function () {
          if (state.connected || !channel) { stopJoinRetry(); return; }
          send('join', { name: state.name });
        }, 1500);
        return state.code;
      });
    },

    // Warm the CDN while the lobby is open so CREATE/JOIN don't pay for it.
    preload: function () { return ensureLib().catch(function () {}); },

    attack: function (d) { send('attack', d); },
    board: function (d) { send('board', d); },
    topout: function (d) { send('topout', d || {}); },
    // One emoji after the match. Purely cosmetic — nothing reads it back.
    react: function (d) { send('react', d || {}); },
    rematch: function (d) { send('rematch', d || {}); },

    // A rematch needs a new seed, or both players replay the same game.
    newSeed: function () { state.seed = randSeed(); return state.seed; },
    setSeed: function (s) { state.seed = s || null; },

    leave: function () {
      stopJoinRetry();
      stopHeartbeat();
      try {
        if (channel) { send('bye', {}); getClient().removeChannel(channel); }
      } catch (e) {}
      channel = null;
      state.role = null; state.code = null; state.connected = false; state.seed = null; state.oppName = '';
    }
  };

  global.VSNet = VSNet;
})(window);
