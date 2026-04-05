// ============================================================
// GameVolt SDK v1 — Auth, Cloud Save, Leaderboard, Achievements, Challenges
// Load via: <script src="/sdk/gamevolt.js"></script>
// Usage:   if (window.GameVolt) GameVolt.init('game-slug');
// ============================================================

(function() {
  'use strict';

  // TODO: Replace with your Supabase project credentials
  var SUPABASE_URL = 'https://nwkjayseuhvvpkdgpivm.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2pheXNldWh2dnBrZGdwaXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzQxMzYsImV4cCI6MjA4Nzk1MDEzNn0.lGCRdYlgxWJlzM6_XpML3f8AKUJG3tLmzNRLTPR0TnU';
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
        '<p class="gv-sub">Sign in to save your progress</p>' +
        '<button class="gv-google-btn" type="button">' +
          '<svg class="gv-google-icon" viewBox="0 0 24 24" width="20" height="20">' +
            '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>' +
            '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
            '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
            '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>' +
          '</svg>' +
          'Sign in with Google' +
        '</button>' +
        '<div class="gv-divider"><span>or</span></div>' +
        '<form class="gv-form">' +
          '<input type="email" class="gv-email" placeholder="your@email.com" required autocomplete="email">' +
          '<button type="submit" class="gv-btn">SEND MAGIC LINK</button>' +
        '</form>' +
        '<p class="gv-msg"></p>' +
        '<p class="gv-note">No password needed. Sign in with Google or a magic link.</p>' +
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
      '.gv-google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;border-radius:8px;border:1px solid #444;background:#fff;color:#333;font-weight:600;font-size:14px;cursor:pointer;transition:background 0.2s}' +
      '.gv-google-btn:hover{background:#f0f0f0}' +
      '.gv-google-icon{flex-shrink:0}' +
      '.gv-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:#666;font-size:12px}' +
      '.gv-divider::before,.gv-divider::after{content:"";flex:1;height:1px;background:#333}' +
      '.gv-msg{color:#4caf50;font-size:13px;margin:12px 0 0;min-height:20px}' +
      '.gv-msg.error{color:#f44336}' +
      '.gv-note{color:#666;font-size:12px;margin:12px 0 0}';
    document.head.appendChild(css);
    document.body.appendChild(modal);

    // Events
    modal.querySelector('.gv-backdrop').onclick = closeModal;
    modal.querySelector('.gv-close').onclick = closeModal;
    modal.querySelector('.gv-google-btn').onclick = signInWithGoogle;
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

  function signInWithGoogle() {
    if (!sb) return;
    var redirectTo = window.location.origin + '/auth/callback/';
    // In iframe: navigate the top window so Safari ITP doesn't block OAuth
    if (window.self !== window.top) {
      sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo, skipBrowserRedirect: true }
      }).then(function(res) {
        if (res.data && res.data.url) {
          try { window.top.sessionStorage.setItem('gv_return_to', window.top.location.href); } catch (e) {}
          window.top.location.href = res.data.url;
        }
      });
      return;
    }
    // Standalone: normal OAuth flow
    sessionStorage.setItem('gv_return_to', window.location.href);
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo }
    });
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
    },

    updateProfile: function(data) {
      if (!currentUser || !sb) return Promise.reject('Not logged in');
      return sb.from('profiles').update(data).eq('id', currentUser.id)
        .then(function(res) {
          if (res.error) throw res.error;
          if (data.username && userProfile) userProfile.username = data.username;
          if (data.avatar_url !== undefined && userProfile) userProfile.avatar_url = data.avatar_url;
          notifyStateChange();
        });
    },

    getFullProfile: function() {
      if (!currentUser || !sb) return Promise.resolve(null);
      return Promise.all([
        sb.from('profiles').select('*').eq('id', currentUser.id).single(),
        sb.from('scores').select('game_id, score, created_at')
          .eq('user_id', currentUser.id)
          .order('score', { ascending: false })
      ]).then(function(results) {
        var profile = results[0].data;
        if (!profile) return null;
        var scoresByGame = {};
        (results[1].data || []).forEach(function(s) {
          if (!scoresByGame[s.game_id] || s.score > scoresByGame[s.game_id].score) {
            scoresByGame[s.game_id] = s;
          }
        });
        profile.bestScores = scoresByGame;
        return profile;
      });
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

      // Fetch existing cloud save (maybeSingle avoids 406 when no save exists)
      return sb.from('saves').select('save_data').eq('user_id', currentUser.id).eq('game_id', currentGameId).maybeSingle()
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
              return sb.from('scores').upsert({
                user_id: currentUser.id,
                game_id: currentGameId,
                mode: best.mode || 'default',
                score: best.score
              }, { ignoreDuplicates: true });
            }
          }
        })
        .then(function() {
          // Migrate achievements (raw fetch with ignore-duplicates)
          if (migrationConfig.getAchievements) {
            var achs = migrationConfig.getAchievements(localData);
            if (achs && achs.length > 0) {
              return sb.auth.getSession().then(function(s) {
                var token = s.data && s.data.session ? s.data.session.access_token : SUPABASE_KEY;
                var rows = achs.map(function(a) {
                  return {
                    user_id: currentUser.id,
                    achievement_id: currentGameId + '-' + a.id,
                    unlocked_at: a.unlocked_at ? new Date(a.unlocked_at).toISOString() : new Date().toISOString()
                  };
                });
                return fetch(SUPABASE_URL + '/rest/v1/user_achievements?on_conflict=user_id,achievement_id', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + token,
                    'Prefer': 'return=minimal,resolution=ignore-duplicates'
                  },
                  body: JSON.stringify(rows)
                });
              });
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

      return sb.auth.getSession().then(function(s) {
        var token = s.data && s.data.session ? s.data.session.access_token : SUPABASE_KEY;
        return fetch(SUPABASE_URL + '/rest/v1/user_achievements?on_conflict=user_id,achievement_id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + token,
            'Prefer': 'return=minimal,resolution=ignore-duplicates'
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            achievement_id: fullId,
            unlocked_at: new Date().toISOString()
          })
        });
      });
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
  // CHALLENGE module (async multiplayer)
  // --------------------------------------------------------

  var challenge = {
    /**
     * Create a new challenge.
     * @param {object} opts - { seed, levelCount, config }
     * @returns {Promise<{ id, seed, level_count }>}
     */
    create: function(opts) {
      if (!currentUser || !sb) return Promise.reject('Login required to create challenges');
      opts = opts || {};
      var row = {
        game_id: currentGameId,
        created_by: currentUser.id,
        seed: opts.seed || Date.now().toString(36),
        level_count: opts.levelCount || 10,
        config: opts.config || {}
      };
      return sb.from('challenges').insert(row).select('id, seed, level_count').single()
        .then(function(res) {
          if (res.error) throw res.error;
          return res.data;
        });
    },

    /**
     * Get a challenge with all runs (for result comparison).
     * @param {string} challengeId - UUID
     * @returns {Promise<{ challenge, runs[] }>}
     */
    get: function(challengeId) {
      if (!sb) return Promise.reject('Not connected');
      return sb.rpc('get_challenge', { p_challenge_id: challengeId })
        .then(function(res) {
          if (res.error) throw res.error;
          var rows = res.data || [];
          if (rows.length === 0) return null;
          var first = rows[0];
          var info = {
            id: first.challenge_id,
            game_id: first.game_id,
            seed: first.seed,
            level_count: first.level_count,
            config: first.config,
            status: first.status,
            created_at: first.created_at,
            created_by: first.created_by,
            creator_username: first.creator_username
          };
          var runs = [];
          rows.forEach(function(r) {
            if (r.run_user_id) {
              runs.push({
                user_id: r.run_user_id,
                username: r.run_username,
                avatar_url: r.run_avatar_url,
                score: r.run_score,
                time_ms: r.run_time_ms,
                completed_count: r.run_completed_count,
                total_count: r.run_total_count,
                splits: r.run_splits,
                stats: r.run_stats,
                completed_at: r.run_completed_at
              });
            }
          });
          return { challenge: info, runs: runs };
        });
    },

    /**
     * Submit a run result for a challenge.
     * @param {string} challengeId - UUID
     * @param {object} result - { score, timeMs, completedCount, totalCount, splits, stats }
     * @returns {Promise<void>}
     */
    submit: function(challengeId, result) {
      if (!currentUser || !sb) return Promise.reject('Login required to submit challenge runs');
      result = result || {};
      var row = {
        challenge_id: challengeId,
        user_id: currentUser.id,
        score: result.score || 0,
        time_ms: result.timeMs || 0,
        completed_count: result.completedCount || 0,
        total_count: result.totalCount || 0,
        splits: result.splits || [],
        stats: result.stats || {}
      };
      return sb.from('challenge_runs').upsert(row, { onConflict: 'challenge_id,user_id' })
        .then(function(res) {
          if (res.error) throw res.error;
        });
    },

    /**
     * List my challenges (created + participated).
     * @param {object} opts - { limit }
     * @returns {Promise<array>}
     */
    list: function(opts) {
      if (!currentUser || !sb) return Promise.resolve([]);
      opts = opts || {};
      return sb.rpc('get_my_challenges', {
        p_user_id: currentUser.id,
        p_game_id: currentGameId,
        p_limit: opts.limit || 20
      }).then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      }).catch(function() { return []; });
    },

    /**
     * Subscribe to new runs on a challenge (realtime).
     * Returns an unsubscribe function.
     * @param {string} challengeId - UUID
     * @param {function} callback - called with the new run row
     * @returns {function} unsubscribe
     */
    onResult: function(challengeId, callback) {
      if (!sb) return function() {};
      var channel = sb.channel('challenge-' + challengeId)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'challenge_runs',
          filter: 'challenge_id=eq.' + challengeId
        }, function(payload) {
          if (payload.new && typeof callback === 'function') {
            // Enrich with username
            sb.from('profiles').select('username, avatar_url').eq('id', payload.new.user_id).single()
              .then(function(res) {
                var run = payload.new;
                if (res.data) {
                  run.username = res.data.username;
                  run.avatar_url = res.data.avatar_url;
                }
                callback(run);
              });
          }
        })
        .subscribe();
      return function() { sb.removeChannel(channel); };
    },

    /**
     * Get daily leaderboard for a specific seed.
     * @param {string} seed - e.g. "daily-2026-04-02"
     * @param {object} opts - { limit }
     * @returns {Promise<array>}
     */
    getDailyLeaderboard: function(seed, opts) {
      if (!sb) return Promise.resolve([]);
      opts = opts || {};
      return sb.rpc('get_daily_leaderboard', {
        p_game_id: currentGameId,
        p_seed: seed,
        p_limit: opts.limit || 50
      }).then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      }).catch(function() { return []; });
    }
  };

  // --------------------------------------------------------
  // UI module — achievement toast with Crystal sound
  // --------------------------------------------------------

  var toastQueue = [];
  var toastActive = false;
  var toastEl = null;
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function crystalBell(freq, time, dur, vol, dest) {
    var c = audioCtx;
    // Fundamental
    var o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    var g1 = c.createGain();
    g1.gain.setValueAtTime(0, time);
    g1.gain.linearRampToValueAtTime(vol, time + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.001, time + dur);
    o1.connect(g1); g1.connect(dest);
    o1.start(time); o1.stop(time + dur + 0.05);
    // Overtone (3x — octave + fifth)
    var o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 3;
    var g2 = c.createGain();
    g2.gain.setValueAtTime(0, time);
    g2.gain.linearRampToValueAtTime(vol * 0.15, time + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.5);
    o2.connect(g2); g2.connect(dest);
    o2.start(time); o2.stop(time + dur * 0.5 + 0.05);
    // Shimmer overtone (5x)
    var o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = freq * 5;
    o3.detune.value = 7;
    var g3 = c.createGain();
    g3.gain.setValueAtTime(0, time);
    g3.gain.linearRampToValueAtTime(vol * 0.06, time + 0.003);
    g3.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.3);
    o3.connect(g3); g3.connect(dest);
    o3.start(time); o3.stop(time + dur * 0.3 + 0.05);
  }

  function playCrystalSound(tier) {
    var c = getAudioCtx();
    if (!c) return;
    var dest = c.destination;
    var now = c.currentTime;

    if (tier === 'bronze') {
      crystalBell(880, now, 0.5, 0.2, dest);
      crystalBell(1320, now + 0.08, 0.4, 0.12, dest);
    } else if (tier === 'silver') {
      crystalBell(784, now, 0.5, 0.18, dest);
      crystalBell(988, now + 0.1, 0.5, 0.18, dest);
      crystalBell(1318, now + 0.2, 0.45, 0.14, dest);
    } else if (tier === 'gold') {
      crystalBell(784, now, 0.6, 0.16, dest);
      crystalBell(988, now + 0.1, 0.55, 0.17, dest);
      crystalBell(1175, now + 0.2, 0.5, 0.17, dest);
      crystalBell(1568, now + 0.3, 0.6, 0.15, dest);
    } else {
      // platinum
      var notes = [784, 988, 1175, 1318, 1568];
      for (var i = 0; i < notes.length; i++) {
        crystalBell(notes[i], now + i * 0.1, 0.7 - i * 0.05, 0.14, dest);
      }
      // Glow: sustained high shimmer
      var glowNotes = [2093, 2637, 3136];
      for (var j = 0; j < glowNotes.length; j++) {
        var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = glowNotes[j];
        o.detune.value = (j - 1) * 8;
        var g = c.createGain();
        g.gain.setValueAtTime(0, now + 0.4);
        g.gain.linearRampToValueAtTime(0.03, now + 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        o.connect(g); g.connect(dest);
        o.start(now + 0.4); o.stop(now + 1.05);
      }
    }
  }

  function ensureToastDOM() {
    if (toastEl) return;
    toastEl = document.createElement('div');
    toastEl.id = 'gv-trophy-toast';
    toastEl.innerHTML =
      '<div class="gv-toast-icon"></div>' +
      '<div class="gv-toast-body">' +
        '<div class="gv-toast-label">ACHIEVEMENT UNLOCKED</div>' +
        '<div class="gv-toast-tier"></div>' +
        '<div class="gv-toast-name"></div>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#gv-trophy-toast{position:fixed;bottom:-80px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#0a0a18ee;border:1px solid #ffd70066;border-radius:10px;padding:10px 20px;z-index:9999;transition:bottom .5s cubic-bezier(.34,1.56,.64,1);box-shadow:0 0 30px #ffd70033;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;white-space:nowrap}' +
      '#gv-trophy-toast.show{bottom:24px}' +
      '.gv-toast-icon{font-size:28px}' +
      '.gv-toast-label{font-size:9px;color:#ffd700;letter-spacing:3px;font-weight:700;text-transform:uppercase}' +
      '.gv-toast-tier{font-size:9px;font-weight:700;letter-spacing:2px}' +
      '.gv-toast-tier.bronze{color:#cd7f32}.gv-toast-tier.silver{color:#c0c0c0}.gv-toast-tier.gold{color:#ffd700}.gv-toast-tier.platinum{color:#b4ffff}' +
      '.gv-toast-name{font-size:14px;color:#fff;font-weight:700;letter-spacing:1px}';
    document.head.appendChild(css);
    document.body.appendChild(toastEl);
  }

  function popToast() {
    if (toastQueue.length === 0) { toastActive = false; return; }
    toastActive = true;
    var trophy = toastQueue.shift();
    ensureToastDOM();
    toastEl.querySelector('.gv-toast-icon').textContent = trophy.icon || '';
    toastEl.querySelector('.gv-toast-name').textContent = trophy.name || trophy.title || '';
    var tierEl = toastEl.querySelector('.gv-toast-tier');
    var tier = trophy.tier || 'bronze';
    tierEl.textContent = tier.toUpperCase();
    tierEl.className = 'gv-toast-tier ' + tier;
    // Update border color per tier
    var borderColors = { bronze: '#cd7f3266', silver: '#c0c0c066', gold: '#ffd70066', platinum: '#b4ffff66' };
    toastEl.style.borderColor = borderColors[tier] || '#ffd70066';
    toastEl.classList.add('show');
    playCrystalSound(tier);
    setTimeout(function() {
      toastEl.classList.remove('show');
      setTimeout(popToast, 400);
    }, 2800);
  }

  var ui = {
    /**
     * Show an achievement toast with Crystal chime.
     * Queues multiple — they display one after another.
     * @param {object|array} trophy - { icon, name, tier } or array of these
     */
    achievementToast: function(trophy) {
      if (Array.isArray(trophy)) {
        for (var i = 0; i < trophy.length; i++) toastQueue.push(trophy[i]);
      } else {
        toastQueue.push(trophy);
      }
      if (!toastActive) popToast();
    }
  };

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------

  function init(gameId) {
    currentGameId = gameId;
    createWidget();

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
          // Just signed in — fetch profile and migrate (once per session)
          fetchProfile(currentUser.id).then(function() {
            closeModal();
            var migratedKey = 'gv_migrated_' + currentGameId;
            if (migrationConfig && !sessionStorage.getItem(migratedKey)) {
              sessionStorage.setItem(migratedKey, '1');
              save.migrate();
            }
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
        updateWidget();
        readyCallbacks.forEach(function(fn) { fn(); });
      });
    });
  }

  // --------------------------------------------------------
  // Floating user widget (injected into every game)
  // --------------------------------------------------------

  var widget = null;

  function createWidget() {
    if (widget) return;
    // Don't show widget inside iframe (parent page has its own login UI)
    if (window.self !== window.top) return;
    widget = document.createElement('div');
    widget.id = 'gv-user-widget';
    widget.innerHTML =
      '<button class="gv-widget-btn" type="button" aria-label="Account">' +
        '<span class="gv-widget-avatar">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        '</span>' +
        '<span class="gv-widget-name">Sign in</span>' +
      '</button>' +
      '<div class="gv-widget-menu" hidden>' +
        '<div class="gv-widget-user-info"></div>' +
        '<button class="gv-widget-logout" type="button">Sign out</button>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#gv-user-widget{position:fixed;top:10px;right:10px;z-index:9998;font-family:system-ui,-apple-system,sans-serif}' +
      '.gv-widget-btn{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 6px;border-radius:20px;border:1px solid #ffffff22;background:rgba(10,10,26,0.85);color:#ccc;font-size:12px;cursor:pointer;transition:all .2s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}' +
      '.gv-widget-btn:hover{background:rgba(10,10,26,0.95);color:#fff;border-color:#ffffff44}' +
      '.gv-widget-avatar{width:24px;height:24px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}' +
      '.gv-widget-avatar img{width:100%;height:100%;object-fit:cover}' +
      '.gv-widget-avatar svg{color:#666}' +
      '.gv-widget-btn.signed-in .gv-widget-avatar svg{color:#00e5ff}' +
      '.gv-widget-name{white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis}' +
      '.gv-widget-menu{position:absolute;top:calc(100% + 6px);right:0;background:#1a1a2e;border:1px solid #333;border-radius:10px;padding:12px;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.5)}' +
      '.gv-widget-user-info{color:#ccc;font-size:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #333}' +
      '.gv-widget-logout{width:100%;padding:8px;border-radius:6px;border:none;background:#ffffff11;color:#f44336;font-size:12px;cursor:pointer;transition:background .2s}' +
      '.gv-widget-logout:hover{background:#ffffff22}';
    document.head.appendChild(css);
    document.body.appendChild(widget);

    // Events
    var btn = widget.querySelector('.gv-widget-btn');
    var menu = widget.querySelector('.gv-widget-menu');

    btn.onclick = function() {
      if (!currentUser) {
        openModal();
      } else {
        menu.hidden = !menu.hidden;
      }
    };

    widget.querySelector('.gv-widget-logout').onclick = function() {
      menu.hidden = true;
      auth.logout();
    };

    // Close menu on outside click
    document.addEventListener('click', function(e) {
      if (!widget.contains(e.target)) {
        menu.hidden = true;
      }
    });
  }

  function updateWidget() {
    if (!widget) return;
    var btn = widget.querySelector('.gv-widget-btn');
    var avatarEl = widget.querySelector('.gv-widget-avatar');
    var nameEl = widget.querySelector('.gv-widget-name');
    var infoEl = widget.querySelector('.gv-widget-user-info');
    var menu = widget.querySelector('.gv-widget-menu');

    if (currentUser) {
      var name = (userProfile && userProfile.username) || 'Player';
      var avatarUrl = userProfile && userProfile.avatar_url;
      nameEl.textContent = name;
      btn.classList.add('signed-in');
      if (avatarUrl) {
        avatarEl.innerHTML = '<img src="' + avatarUrl + '" alt="">';
      } else {
        avatarEl.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      }
      infoEl.textContent = currentUser.email || name;
      menu.hidden = true;
    } else {
      nameEl.textContent = 'Sign in';
      btn.classList.remove('signed-in');
      avatarEl.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      menu.hidden = true;
    }
  }

  function notifyStateChange() {
    updateWidget();
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
    achievements: achievements,
    challenge: challenge,
    ui: ui
  };
})();
