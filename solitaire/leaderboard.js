/**
 * GameVolt Solitaire — Supabase Leaderboard Module
 * -------------------------------------------------
 * Shared leaderboard UI for all solitaire variants, backed by the GameVolt SDK
 * (window.GameVolt.leaderboard). This replaces the old Firebase/Firestore board
 * and its anonymous localStorage nicknames.
 *
 * game_id is 'solitaire' (set via GameVolt.init('solitaire') on each variant
 * page). Each variant is a distinct leaderboard MODE:
 *   klondike, freecell, spider_1suit, spider_2suit, spider_4suit,
 *   pyramid, tripeaks, golf
 *
 * Scores are higher-is-better (get_leaderboard orders score DESC), matching the
 * previous board. Signed-in players appear on the global board with their
 * GameVolt username + procedural avatar; guests get a localStorage-only
 * personal best plus the SDK's sign-in nudge. There is no server-side data
 * migration — the Supabase boards start empty (a clean reset), and the old
 * Firebase scores are simply left behind.
 *
 * The public facade (window.Leaderboard.submit / .show / …) is unchanged, so
 * the variant pages need no edits beyond a cache-busting ?v= on the include.
 *
 * NOTE: this file is loaded BEFORE /sdk/gamevolt.js on the variant pages, so it
 * must reference window.GameVolt lazily (at call time), never at load time.
 */
(function () {
    'use strict';

    var PB_PREFIX = 'solitaire_pb_'; // localStorage personal best, per mode
    var _authHooked = false;

    function hasBoard() { return !!(window.GameVolt && window.GameVolt.leaderboard); }
    function currentUser() {
        try { return (window.GameVolt && GameVolt.auth && GameVolt.auth.getUser()) || null; }
        catch (e) { return null; }
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.round(seconds || 0));
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + String(s).padStart(2, '0');
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : text;
        return div.innerHTML;
    }

    var MODE_LABELS = {
        klondike: 'Klondike',
        freecell: 'FreeCell',
        spider_1suit: 'Spider · 1 Suit',
        spider_2suit: 'Spider · 2 Suits',
        spider_4suit: 'Spider · 4 Suits',
        pyramid: 'Pyramid',
        tripeaks: 'TriPeaks',
        golf: 'Golf'
    };
    function prettyMode(mode) { return MODE_LABELS[mode] || (mode || '').replace(/_/g, ' '); }

    // ---- personal best (localStorage keeps time/moves the global board drops) ----
    function loadPB(mode) {
        try { return JSON.parse(localStorage.getItem(PB_PREFIX + mode) || 'null'); }
        catch (e) { return null; }
    }
    function savePB(mode, data) {
        var prev = loadPB(mode);
        if (!prev || (data.score || 0) > (prev.score || 0)) {
            try { localStorage.setItem(PB_PREFIX + mode, JSON.stringify(data)); } catch (e) {}
        }
    }

    // ---- submit ----
    function submitScore(mode, score, time, moves /*, extra */) {
        score = Math.round(score || 0);
        savePB(mode, { score: score, time: Math.round(time || 0), moves: Math.round(moves || 0) });
        if (hasBoard()) {
            try { return Promise.resolve(GameVolt.leaderboard.submit(score, { mode: mode })); }
            catch (e) { return Promise.resolve(null); }
        }
        return Promise.resolve(null);
    }

    // ---- fetch ----
    function getLeaderboard(mode, limit) {
        if (!hasBoard()) return Promise.resolve([]);
        return GameVolt.leaderboard.get({ mode: mode, limit: limit || 100 })
            .then(function (rows) { return rows || []; })
            .catch(function () { return []; });
    }

    // --------------------------------------------------------------------------
    // Modal UI
    // --------------------------------------------------------------------------
    function createLeaderboardModal() {
        if (document.getElementById('leaderboardModal')) return;

        var modal = document.createElement('div');
        modal.id = 'leaderboardModal';
        modal.className = 'modal-overlay';
        modal.innerHTML =
            '<div class="modal leaderboard-modal">' +
                '<div class="modal-header">' +
                    '<h2 class="modal-title">🏆 Leaderboard</h2>' +
                    '<div class="lb-variant" id="lbVariant"></div>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div class="lb-signin" id="lbSignin" style="display:none">' +
                        '<span>Sign in to save your score to the global leaderboard.</span>' +
                        '<button class="btn btn-secondary" id="lbSigninBtn">Sign in</button>' +
                    '</div>' +
                    '<div class="leaderboard-list" id="leaderboardList">' +
                        '<div class="loading">Loading…</div>' +
                    '</div>' +
                    '<div class="personal-best">' +
                        '<h4>Your Best</h4>' +
                        '<div id="personalBestInfo">-</div>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-actions">' +
                    '<button class="btn btn-primary" id="closeLeaderboardBtn">Close</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        var style = document.createElement('style');
        style.textContent =
            '.leaderboard-modal { max-width: 520px; }' +
            '.lb-variant { margin-top: 6px; font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); }' +
            '.lb-signin { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap;' +
            '  margin-bottom: 16px; padding: 12px 14px; border-radius: 8px;' +
            '  background: rgba(251, 191, 36, 0.10); border: 1px solid rgba(251, 191, 36, 0.35); }' +
            '.lb-signin span { font-size: 0.85rem; color: var(--text-secondary); }' +
            '.leaderboard-list { max-height: 360px; overflow-y: auto; }' +
            '.lb-entry { display: grid; grid-template-columns: 42px 30px 1fr 90px; gap: 10px; padding: 9px 10px;' +
            '  border-radius: 6px; align-items: center; transition: background 0.2s; }' +
            '.lb-entry:nth-child(odd) { background: rgba(255,255,255,0.03); }' +
            '.lb-entry:hover { background: rgba(255,255,255,0.08); }' +
            '.lb-entry.you { background: rgba(251, 191, 36, 0.15); border: 1px solid var(--gold); }' +
            '.lb-rank { font-family: "Playfair Display", serif; font-size: 1.05rem; font-weight: 700; color: var(--gold); }' +
            '.lb-rank.gold { color: #ffd700; } .lb-rank.silver { color: #c0c0c0; } .lb-rank.bronze { color: #cd7f32; }' +
            '.lb-av { width: 30px; height: 30px; border-radius: 50%; flex: 0 0 auto; overflow: hidden;' +
            '  display: inline-flex; align-items: center; justify-content: center;' +
            '  font-weight: 700; font-size: 13px; line-height: 1;' +
            '  background: rgba(255,255,255,0.12); color: var(--text-primary); }' +
            '.lb-av.has-face { background: transparent; }' +
            '.lb-av .gv-avatar, .lb-av .gv-avatar svg, .lb-av .gv-avatar img { width: 100%; height: 100%; display: block; }' +
            '.lb-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
            '.lb-score { font-family: "Playfair Display", serif; font-weight: 600; color: var(--gold-light); text-align: right; }' +
            '.personal-best { margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }' +
            '.personal-best h4 { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }' +
            '#personalBestInfo { font-family: "Playfair Display", serif; font-size: 1.1rem; color: var(--gold); }' +
            '.loading, .no-scores { text-align: center; padding: 40px; color: var(--text-secondary); }';
        document.head.appendChild(style);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.classList.remove('active');
        });
        document.getElementById('closeLeaderboardBtn').addEventListener('click', function () {
            modal.classList.remove('active');
        });
        document.getElementById('lbSigninBtn').addEventListener('click', function () {
            if (window.GameVolt && GameVolt.auth) GameVolt.auth.login();
        });

        // When auth state changes while the modal is open, refresh it.
        if (!_authHooked && window.GameVolt && GameVolt.auth && GameVolt.auth.onStateChange) {
            _authHooked = true;
            GameVolt.auth.onStateChange(function () {
                var m = document.getElementById('leaderboardModal');
                if (m && m.classList.contains('active') && m.dataset.mode) {
                    showLeaderboard(m.dataset.mode);
                }
            });
        }
    }

    function renderRows(rows) {
        var list = document.getElementById('leaderboardList');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = '<div class="no-scores">No scores yet. Be the first!</div>';
            return;
        }
        var myId = hasBoard() && GameVolt.leaderboard.userId ? GameVolt.leaderboard.userId() : null;
        list.innerHTML = '';
        rows.forEach(function (r, i) {
            var isYou = myId && r.user_id === myId;
            var rank = r.rank || (i + 1);
            var rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            var name = r.username || 'Player';
            var initial = escapeHtml((name.charAt(0) || '?').toUpperCase());
            var row = document.createElement('div');
            row.className = 'lb-entry' + (isYou ? ' you' : '');
            row.innerHTML =
                '<div class="lb-rank ' + rankClass + '">#' + rank + '</div>' +
                '<div class="lb-av" data-av="' + i + '">' + initial + '</div>' +
                '<div class="lb-name">' + escapeHtml(name) + (isYou ? ' (You)' : '') + '</div>' +
                '<div class="lb-score">' + Number(r.score || 0).toLocaleString() + '</div>';
            list.appendChild(row);
        });

        // Progressive enhancement: swap each initial badge for a procedural face
        // (gv1 avatar_url -> SVG face, real URL -> <img>, missing -> initial).
        if (window.GameVolt && GameVolt.avatar) {
            rows.forEach(function (r, i) {
                var slot = list.querySelector('.lb-av[data-av="' + i + '"]');
                if (!slot) return;
                slot.textContent = '';
                slot.classList.add('has-face');
                slot.appendChild(GameVolt.avatar.render(r.avatar_url, { size: 30, name: r.username }));
            });
        }
    }

    function renderPersonalBest(mode) {
        var el = document.getElementById('personalBestInfo');
        if (!el) return;
        var best = loadPB(mode);
        if (best) {
            var parts = [Number(best.score || 0).toLocaleString() + ' pts'];
            if (best.time) parts.push(formatTime(best.time));
            if (best.moves) parts.push(best.moves + ' moves');
            el.textContent = parts.join(' • ');
        } else {
            el.textContent = 'No games completed yet';
        }
    }

    function showLeaderboard(mode) {
        createLeaderboardModal();
        var modal = document.getElementById('leaderboardModal');
        modal.dataset.mode = mode;

        var variantEl = document.getElementById('lbVariant');
        if (variantEl) variantEl.textContent = prettyMode(mode);

        var signin = document.getElementById('lbSignin');
        if (signin) signin.style.display = currentUser() ? 'none' : 'flex';

        renderPersonalBest(mode);
        document.getElementById('leaderboardList').innerHTML = '<div class="loading">Loading…</div>';
        modal.classList.add('active');

        return getLeaderboard(mode, 100).then(renderRows);
    }

    // --------------------------------------------------------------------------
    // Public facade (unchanged surface so variant pages need no logic edits)
    // --------------------------------------------------------------------------
    window.Leaderboard = {
        submit: submitScore,
        getAll: getLeaderboard,
        getToday: getLeaderboard, // no daily board on the SDK; alias to all-time
        getRank: function (mode) {
            if (!hasBoard()) return Promise.resolve(null);
            return GameVolt.leaderboard.getRank({ mode: mode })
                .then(function (r) { return r ? r.rank : null; })
                .catch(function () { return null; });
        },
        getPersonalBest: function (mode) { return Promise.resolve(loadPB(mode)); },
        show: showLeaderboard,
        // Account username now owns the display name; kept as no-op-ish shims for
        // backward compatibility with any older caller.
        getNickname: function () { var u = currentUser(); return u ? (u.username || '') : ''; },
        setNickname: function (n) { return (n || '').toString().trim().substring(0, 20); },
        formatTime: formatTime,
        formatDate: function () { return ''; }
    };
})();
