// ============================================================
// GameVolt SDK v1 — Auth, Cloud Save, Leaderboard, Achievements
// Load via: <script src="/sdk/gamevolt.js"></script>
// Usage:   if (window.GameVolt) GameVolt.init('game-slug');
// ============================================================

(function() {
  'use strict';

  // TODO: Replace with your Supabase project credentials
  var SUPABASE_URL = 'https://nwkjayseuhvvpkdgpivm.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_o6lV-mGl4cFi5GR4virDjw_j8dJ8rUv';
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  var sb = null; // Supabase client
  var currentUser = null;
  var userProfile = null;
  var currentGameId = null;
  var ready = false;
  var readyCallbacks = [];
  var stateChangeCallbacks = [];
  var migrationConfig = null;

  // --------------------------------------------------------
  // Supabase loader
  // --------------------------------------------------------

  function loadSupabase() {
    return new Promise(function(resolve) {
      if (window.supabase) { resolve(); return; }
      var s = document.createElement('script');
      s.src = SUPABASE_CDN;
      s.onload = resolve;
      s.onerror = function() { console.warn('[GameVolt] Could not load Supabase'); resolve(); };
      document.head.appendChild(s);
    });
  }

  // --------------------------------------------------------
  // Login Modal (injected DOM)
  // --------------------------------------------------------

  var modal = null;

  function createModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'gv-auth-modal';
    modal.innerHTML =
      '<div class="gv-backdrop"></div>' +
      '<div class="gv-dialog">' +
        '<button class="gv-close" aria-label="Close">&times;</button>' +
        '<div class="gv-logo">GAMEVOLT</div>' +
        '<p class="gv-sub">Sign in with a magic link</p>' +
        '<form class="gv-form">' +
          '<input type="email" class="gv-email" placeholder="your@email.com" required autocomplete="email">' +
          '<button type="submit" class="gv-btn">SEND MAGIC LINK</button>' +
        '</form>' +
        '<p class="gv-msg"></p>' +
        '<p class="gv-note">No password needed. We\'ll email you a sign-in link.</p>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#gv-auth-modal{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;display:none;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif}' +
      '#gv-auth-modal.open{display:flex}' +
      '.gv-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.8)}' +
      '.gv-dialog{position:relative;background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:32px;max-width:380px;width:90%;text-align:center;color:#fff}' +
      '.gv-close{position:absolute;top:8px;right:12px;background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:4px 8px}' +
      '.gv-close:hover{color:#fff}' +
      '.gv-logo{font-size:22px;font-weight:bold;letter-spacing:3px;color:#00e5ff;margin-bottom:4px}' +
      '.gv-sub{color:#999;font-size:14px;margin:8px 0 20px}' +
      '.gv-form{display:flex;flex-direction:column;gap:12px}' +
      '.gv-email{padding:12px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;font-size:16px;outline:none}' +
      '.gv-email:focus{border-color:#00e5ff}' +
      '.gv-btn{padding:12px;border-radius:8px;border:none;background:#00e5ff;color:#000;font-weight:bold;font-size:14px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}' +
      '.gv-btn:hover{background:#33ecff}' +
      '.gv-btn:disabled{opacity:0.5;cursor:default}' +
      '.gv-msg{color:#4caf50;font-size:13px;margin:12px 0 0;min-height:20px}' +
      '.gv-msg.error{color:#f44336}' +
      '.gv-note{color:#666;font-size:12px;margin:12px 0 0}';
    document.head.appendChild(css);
    document.body.appendChild(modal);

    // Events
    modal.querySelector('.gv-backdrop').onclick = closeModal;
    modal.querySelector('.gv-close').onclick = closeModal;
    modal.querySelector('.gv-form').onsubmit = function(e) {
      e.preventDefault();
      var email = modal.querySelector('.gv-email').value.trim();
      if (!email) return;
      sendMagicLink(email);
    };
  }

  function openModal() {
    createModal();
    modal.querySelector('.gv-email').value = '';
    modal.querySelector('.gv-msg').textContent = '';
    modal.querySelector('.gv-msg').className = 'gv-msg';
    modal.querySelector('.gv-btn').disabled = false;
    modal.classList.add('open');
    modal.querySelector('.gv-email').focus();
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }

  function sendMagicLink(email) {
    if (!sb) return;
    var btn = modal.querySelector('.gv-btn');
    var msg = modal.querySelector('.gv-msg');
    btn.disabled = true;
    msg.textContent = '';
    msg.className = 'gv-msg';

    var redirectTo = window.location.origin + '/auth/callback/';

    sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectTo } })
      .then(function(res) {
        if (res.error) {
          msg.textContent = res.error.message;
          msg.className = 'gv-msg error';
          btn.disabled = false;
        } else {
          msg.textContent = 'Check your email for the magic link!';
          msg.className = 'gv-msg';
          btn.disabled = false;
        }
      })
      .catch(function() {
        msg.textContent = 'Something went wrong. Try again.';
        msg.className = 'gv-msg error';
        btn.disabled = false;
      });
  }

  // --------------------------------------------------------
  // Profile helper
  // --------------------------------------------------------

  function fetchProfile(userId) {
    if (!sb) return Promise.resolve(null);
    return sb.from('profiles').select('username, avatar_url').eq('id', userId).single()
      .then(function(res) {
        if (res.data) {
          userProfile = res.data;
          return res.data;
        }
        return null;
      })
      .catch(function() { return null; });
  }

  // --------------------------------------------------------
  // AUTH module
  // --------------------------------------------------------

  var auth = {
    login: function() {
      if (currentUser) return; // Already logged in
      openModal();
    },

    logout: function() {
      if (!sb) return Promise.resolve();
      return sb.auth.signOut().then(function() {
        currentUser = null;
        userProfile = null;
      });
    },

    getUser: function() {
      if (!currentUser) return null;
      return {
        id: currentUser.id,
        email: currentUser.email,
        username: userProfile ? userProfile.username : null,
        avatar_url: userProfile ? userProfile.avatar_url : null
      };
    },

    onStateChange: function(fn) {
      if (typeof fn === 'function') stateChangeCallbacks.push(fn);
    }
  };

  // --------------------------------------------------------
  // SAVE module
  // --------------------------------------------------------

  var save = {
    set: function(data) {
      if (!currentUser || !sb) {
        // Guest: localStorage fallback
        try { localStorage.setItem('gv_save_' + currentGameId, JSON.stringify(data)); } catch (e) {}
        return Promise.resolve();
      }
      return sb.from('saves').upsert({
        user_id: currentUser.id,
        game_id: currentGameId,
        save_data: data,
        updated_at: new Date().toISOString()
      }).then(function() {});
    },

    get: function() {
      if (!currentUser || !sb) {
        // Guest: localStorage fallback
        try {
          var raw = localStorage.getItem('gv_save_' + currentGameId);
          return Promise.resolve(raw ? JSON.parse(raw) : null);
        } catch (e) {
          return Promise.resolve(null);
        }
      }
      return sb.from('saves').select('save_data').eq('user_id', currentUser.id).eq('game_id', currentGameId).single()
        .then(function(res) { return res.data ? res.data.save_data : null; })
        .catch(function() { return null; });
    },

    migrate: function() {
      if (!currentUser || !sb || !migrationConfig) return Promise.resolve();

      // Read all local keys
      var localData = {};
      var keys = migrationConfig.keys || [];
      for (var i = 0; i < keys.length; i++) {
        try {
          var raw = localStorage.getItem(keys[i]);
          if (raw) localData[keys[i]] = JSON.parse(raw);
        } catch (e) {}
      }

      if (Object.keys(localData).length === 0) return Promise.resolve();

      // Fetch existing cloud save
      return sb.from('saves').select('save_data').eq('user_id', currentUser.id).eq('game_id', currentGameId).single()
        .then(function(res) {
          var cloudData = (res.data && res.data.save_data) ? res.data.save_data : null;
          var merged;

          if (migrationConfig.merge && typeof migrationConfig.merge === 'function') {
            merged = migrationConfig.merge(localData, cloudData);
          } else {
            // Default: prefer local if no cloud data
            merged = cloudData || localData[keys[0]] || {};
          }

          // Upsert merged save
          return sb.from('saves').upsert({
            user_id: currentUser.id,
            game_id: currentGameId,
            save_data: merged,
            updated_at: new Date().toISOString()
          });
        })
        .then(function() {
          // Migrate scores
          if (migrationConfig.getScores) {
            var scores = migrationConfig.getScores(localData);
            if (scores && scores.length > 0) {
              var best = scores[0]; // Already sorted desc
              return sb.from('scores').insert({
                user_id: currentUser.id,
                game_id: currentGameId,
                mode: best.mode || 'default',
                score: best.score
              });
            }
          }
        })
        .then(function() {
          // Migrate achievements
          if (migrationConfig.getAchievements) {
            var achs = migrationConfig.getAchievements(localData);
            if (achs && achs.length > 0) {
              var rows = achs.map(function(a) {
                return {
                  user_id: currentUser.id,
                  achievement_id: currentGameId + '-' + a.id,
                  unlocked_at: a.unlocked_at ? new Date(a.unlocked_at).toISOString() : new Date().toISOString()
                };
              });
              return sb.from('user_achievements').upsert(rows, { onConflict: 'user_id,achievement_id' });
            }
          }
        })
        .catch(function(e) { console.warn('[GameVolt] Migration error:', e); });
    },

    registerMigration: function(config) {
      migrationConfig = config;
    }
  };

  // --------------------------------------------------------
  // LEADERBOARD module
  // --------------------------------------------------------

  var leaderboard = {
    submit: function(score, opts) {
      if (!currentUser || !sb) return Promise.resolve(); // Guest: no-op
      opts = opts || {};
      return sb.from('scores').insert({
        user_id: currentUser.id,
        game_id: currentGameId,
        mode: opts.mode || 'default',
        score: score
      }).then(function() {});
    },

    get: function(opts) {
      if (!sb) return Promise.resolve([]);
      opts = opts || {};
      return sb.rpc('get_leaderboard', {
        p_game_id: currentGameId,
        p_mode: opts.mode || 'default',
        p_limit: opts.limit || 50
      }).then(function(res) { return res.data || []; })
        .catch(function() { return []; });
    },

    getRank: function(opts) {
      if (!currentUser || !sb) return Promise.resolve(null);
      opts = opts || {};
      return leaderboard.get({ mode: opts.mode || 'default', limit: 1000 })
        .then(function(rows) {
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].user_id === currentUser.id) {
              return { rank: rows[i].rank, score: rows[i].score };
            }
          }
          return null;
        });
    }
  };

  // --------------------------------------------------------
  // ACHIEVEMENTS module
  // --------------------------------------------------------

  var achievements = {
    unlock: function(id) {
      var fullId = currentGameId + '-' + id;

      if (!currentUser || !sb) {
        // Guest: store in localStorage
        try {
          var key = 'gv_ach_' + currentGameId;
          var raw = localStorage.getItem(key);
          var data = raw ? JSON.parse(raw) : {};
          if (!data[id]) {
            data[id] = Date.now();
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch (e) {}
        return Promise.resolve();
      }

      return sb.from('user_achievements').upsert({
        user_id: currentUser.id,
        achievement_id: fullId,
        unlocked_at: new Date().toISOString()
      }, { onConflict: 'user_id,achievement_id' }).then(function() {});
    },

    getAll: function() {
      if (!sb) return Promise.resolve([]);
      return sb.from('achievement_defs')
        .select('id, title, description, icon, tier, sort_order')
        .eq('game_id', currentGameId)
        .order('sort_order')
        .then(function(res) {
          var defs = res.data || [];
          if (!currentUser) return defs.map(function(d) { d.unlocked = false; return d; });

          return sb.from('user_achievements')
            .select('achievement_id, unlocked_at')
            .eq('user_id', currentUser.id)
            .like('achievement_id', currentGameId + '-%')
            .then(function(res2) {
              var unlocked = {};
              (res2.data || []).forEach(function(u) { unlocked[u.achievement_id] = u.unlocked_at; });
              return defs.map(function(d) {
                d.unlocked = !!unlocked[d.id];
                d.unlocked_at = unlocked[d.id] || null;
                return d;
              });
            });
        })
        .catch(function() { return []; });
    },

    getProfile: function() {
      if (!currentUser || !sb) return Promise.resolve({ total: 0, unlocked: 0, games: {} });

      return Promise.all([
        sb.from('achievement_defs').select('id, game_id, title, tier').order('sort_order'),
        sb.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', currentUser.id)
      ]).then(function(results) {
        var defs = results[0].data || [];
        var userAchs = {};
        (results[1].data || []).forEach(function(u) { userAchs[u.achievement_id] = u.unlocked_at; });

        var games = {};
        var total = 0;
        var unlocked = 0;

        defs.forEach(function(d) {
          var gid = d.game_id || 'global';
          if (!games[gid]) games[gid] = { total: 0, unlocked: 0, achievements: [] };
          games[gid].total++;
          total++;
          var isUnlocked = !!userAchs[d.id];
          if (isUnlocked) { games[gid].unlocked++; unlocked++; }
          games[gid].achievements.push({
            id: d.id, title: d.title, tier: d.tier,
            unlocked: isUnlocked, unlocked_at: userAchs[d.id] || null
          });
        });

        return { total: total, unlocked: unlocked, games: games };
      }).catch(function() { return { total: 0, unlocked: 0, games: {} }; });
    }
  };

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------

  function init(gameId) {
    currentGameId = gameId;

    loadSupabase().then(function() {
      if (!window.supabase) {
        console.warn('[GameVolt] Supabase not available, running in offline mode');
        ready = true;
        readyCallbacks.forEach(function(fn) { fn(); });
        return;
      }

      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

      // Listen for auth state changes
      sb.auth.onAuthStateChange(function(event, session) {
        var prevUser = currentUser;
        currentUser = session ? session.user : null;

        if (currentUser && !prevUser) {
          // Just signed in — fetch profile and migrate
          fetchProfile(currentUser.id).then(function() {
            closeModal();
            if (migrationConfig) save.migrate();
            notifyStateChange();
          });
        } else if (!currentUser && prevUser) {
          // Just signed out
          userProfile = null;
          notifyStateChange();
        }
      });

      // Check for existing session
      sb.auth.getSession().then(function(res) {
        if (res.data && res.data.session) {
          currentUser = res.data.session.user;
          fetchProfile(currentUser.id).then(function() {
            notifyStateChange();
          });
        }
        ready = true;
        readyCallbacks.forEach(function(fn) { fn(); });
      });
    });
  }

  function notifyStateChange() {
    var user = auth.getUser();
    for (var i = 0; i < stateChangeCallbacks.length; i++) {
      try { stateChangeCallbacks[i](user); } catch (e) {}
    }
  }

  function onReady(fn) {
    if (ready) { fn(); return; }
    readyCallbacks.push(fn);
  }

  // --------------------------------------------------------
  // Public API
  // --------------------------------------------------------

  window.GameVolt = {
    init: init,
    onReady: onReady,
    auth: auth,
    save: save,
    leaderboard: leaderboard,
    achievements: achievements
  };
})();
