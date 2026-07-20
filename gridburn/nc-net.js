// ============================================================
// nc-net.js — room-code online multiplayer transport for Gridburn.
//
// Same pattern as Connect 4's c4-net.js: a thin wrapper over Supabase
// Realtime *broadcast* channels (ephemeral pub/sub — no tables, no RLS,
// public anon key is fine). One channel per 4-char room code.
//
// The game itself runs deterministic lockstep on top of this: only turn
// inputs and tick frontiers ever cross the wire (see index.html). This file
// is transport only — host/join handshake plus typed sends. Unlike Connect 4
// (one move per turn), lockstep sends ~14 small messages/sec per client, so
// the client-side rate limiter is raised via eventsPerSecond.
//
// Handshake: host creates a room (player 1, cyan) and waits; guest joins
// (player 2, orange) and sends "join"; host replies "accept"; both connected.
// ============================================================
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://nwkjayseuhvvpkdgpivm.supabase.co';
  // Public anon key (safe to ship; broadcast channels need no elevated access).
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2pheXNldWh2dnBrZGdwaXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzQxMzYsImV4cCI6MjA4Nzk1MDEzNn0.lGCRdYlgxWJlzM6_XpML3f8AKUJG3tLmzNRLTPR0TnU';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  var client = null;
  var channel = null;
  var handlers = {};
  var state = { role: null, code: null, connected: false, myPlayer: null };

  function ensureLib() {
    return new Promise(function (resolve, reject) {
      if (global.supabase && global.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = CDN;
      s.onload = function () {
        if (global.supabase && global.supabase.createClient) resolve();
        else reject(new Error('supabase-js unavailable after load'));
      };
      s.onerror = function () { reject(new Error('failed to load supabase-js')); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (!client) {
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: { params: { eventsPerSecond: 30 } } // lockstep sends ~14/s + turns
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

  function on(event, fn) { handlers[event] = fn; }
  function emit(event, data) { if (handlers[event]) { try { handlers[event](data); } catch (e) {} } }

  function subscribe(code) {
    var ch = getClient().channel('gb-' + code, { config: { broadcast: { self: false } } });
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
    if (p.t === 'join') {
      // Guest announced itself. Accept the first one; ignore extras (1v1 only).
      if (state.role === 'host' && !state.connected) {
        state.connected = true;
        send('accept', {});
        emit('opponentJoined', {});
      }
    } else if (p.t === 'accept') {
      if (state.role === 'guest' && !state.connected) {
        state.connected = true;
        emit('opponentJoined', {});
      }
    } else if (p.t === 'input') {
      emit('input', p.d || {});
    } else if (p.t === 'rematch') {
      emit('rematch', p.d || {});
    } else if (p.t === 'bye') {
      state.connected = false;
      emit('left', {});
    }
  }

  var NCNet = {
    get connected() { return state.connected; },
    get myPlayer() { return state.myPlayer; },   // 1 = host (cyan), 2 = guest (orange)
    get code() { return state.code; },
    get role() { return state.role; },
    on: on,

    // Create a room. Resolves with the 4-char code to share.
    host: function () {
      state.role = 'host'; state.code = randCode(); state.myPlayer = 1; state.connected = false;
      return ensureLib().then(function () { return subscribe(state.code); }).then(function (ch) {
        channel = ch;
        return state.code;
      });
    },

    // Join a room by code. Resolves once subscribed (connection confirmed via
    // the 'opponentJoined' callback when the host accepts).
    join: function (code) {
      state.role = 'guest';
      state.code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      state.myPlayer = 2; state.connected = false;
      return ensureLib().then(function () { return subscribe(state.code); }).then(function (ch) {
        channel = ch;
        send('join', {});
        return state.code;
      });
    },

    input: function (d) { send('input', d); },
    rematch: function () { send('rematch', {}); },

    leave: function () {
      try {
        if (channel) { send('bye', {}); getClient().removeChannel(channel); }
      } catch (e) {}
      channel = null;
      state.role = null; state.code = null; state.connected = false; state.myPlayer = null;
    }
  };

  global.NCNet = NCNet;
  if (typeof module !== 'undefined' && module.exports) module.exports = NCNet;
})(typeof window !== 'undefined' ? window : this);
