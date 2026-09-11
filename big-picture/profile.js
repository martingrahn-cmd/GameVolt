(function () {
    'use strict';

    var games = [
        { id: 'slipstream-vector', name: 'Slipstream Vector' },
        { id: 'hoverdash', name: 'HoverDash' },
        { id: 'axeluga', name: 'Axeluga' },
        { id: 'snake', name: 'Snake Neo' },
        { id: 'blockstorm', name: 'BlockStorm' },
        { id: 'asteroid-storm', name: 'Asteroid Storm' },
        { id: 'gridburn', name: 'Gridburn' },
        { id: 'manny-the-mole', name: 'Manny the Mole' }
    ];
    var $ = function (id) { return document.getElementById(id); };
    var loadNumber = 0;
    var guestCopy = 'Sign in on GameVolt before opening Big Picture to sync scores and trophies. If you are already signed in, your session follows you here automatically.';

    function clear(element) {
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function makeRow(name, value, progress) {
        var row = document.createElement('div'); row.className = 'profile-row';
        var label = document.createElement('span'); label.textContent = name;
        var score = document.createElement('strong'); score.textContent = value;
        row.append(label, score);
        if (typeof progress === 'number') {
            var track = document.createElement('span'); track.className = 'profile-progress';
            var fill = document.createElement('i'); fill.style.width = Math.max(0, Math.min(100, progress)) + '%';
            track.append(fill); row.append(track);
        }
        return row;
    }

    function showGuest(message) {
        $('profileLoading').hidden = true;
        $('profileContent').hidden = true;
        $('profileGuest').hidden = false;
        $('profileTitle').textContent = message ? 'Profile unavailable' : 'Play as a guest';
        $('profileGuest').querySelector('p').textContent = message || guestCopy;
    }

    function renderAvatar(user) {
        var host = $('profileAvatar'); clear(host);
        var name = user.username || 'Player';
        if (window.GameVolt.avatar && window.GameVolt.avatar.render) {
            host.append(window.GameVolt.avatar.render(user.avatar_url, { size: 104, name: name, alt: name + ' avatar' }));
        } else {
            host.textContent = name.charAt(0).toUpperCase();
        }
    }

    function formatScore(gameId, score) {
        var config = window.GVLeaderboardConfig;
        if (config && config.format) return config.format(gameId, score, config.mode(gameId));
        return Number(score).toLocaleString();
    }

    function renderProfile(user, profile, achievementData) {
        profile = profile || {};
        achievementData = achievementData || { total: 0, unlocked: 0, games: {} };
        var bestScores = profile.bestScores || {};
        var scoredGames = games.filter(function (game) { return bestScores[game.id]; });
        var completion = achievementData.total ? Math.round(achievementData.unlocked / achievementData.total * 100) : 0;

        renderAvatar(user);
        $('profileName').textContent = user.username || 'Player';
        $('profileEmail').textContent = user.email || 'GameVolt player';
        $('profileTrophies').textContent = achievementData.unlocked || 0;
        $('profileCompletion').textContent = completion + '%';
        $('profileScoredGames').textContent = scoredGames.length;
        $('profileJoined').textContent = profile.created_at
            ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';

        clear($('profileScores'));
        if (scoredGames.length) {
            scoredGames.forEach(function (game) {
                $('profileScores').append(makeRow(game.name, formatScore(game.id, bestScores[game.id].score)));
            });
        } else {
            var emptyScores = document.createElement('p'); emptyScores.className = 'profile-empty';
            emptyScores.textContent = 'Play a Big Picture game to put your first score here.';
            $('profileScores').append(emptyScores);
        }

        clear($('profileGameTrophies'));
        var trophyGames = games.filter(function (game) {
            return achievementData.games && achievementData.games[game.id] && achievementData.games[game.id].total;
        });
        if (trophyGames.length) {
            trophyGames.forEach(function (game) {
                var data = achievementData.games[game.id];
                var progress = data.total ? data.unlocked / data.total * 100 : 0;
                $('profileGameTrophies').append(makeRow(game.name, data.unlocked + ' / ' + data.total, progress));
            });
        } else {
            var emptyTrophies = document.createElement('p'); emptyTrophies.className = 'profile-empty';
            emptyTrophies.textContent = 'No trophy progress is available yet.';
            $('profileGameTrophies').append(emptyTrophies);
        }

        $('profileLoading').hidden = true;
        $('profileGuest').hidden = true;
        $('profileContent').hidden = false;
    }

    function load(user) {
        var request = ++loadNumber;
        if (!user) { showGuest(); return Promise.resolve(); }
        $('profileGuest').hidden = true; $('profileContent').hidden = true; $('profileLoading').hidden = false;
        return Promise.all([
            window.GameVolt.auth.getFullProfile(),
            window.GameVolt.achievements.getProfile()
        ]).then(function (results) {
            if (request === loadNumber) renderProfile(user, results[0], results[1]);
        }).catch(function () {
            if (request === loadNumber) showGuest('Your session is active, but the profile could not be loaded. Check your connection and try again.');
        });
    }

    function refresh() {
        if (!window.GameVolt) return Promise.resolve();
        return load(window.GameVolt.auth.getUser());
    }

    function init() {
        if (!window.GameVolt) {
            showGuest('Profile services are unavailable. You can keep playing as a guest on this device.');
            return;
        }
        window.GameVolt.onReady(refresh);
        window.GameVolt.auth.onStateChange(load);
        window.GameVolt.init('profile');
    }

    window.GVBigPictureProfile = { init: init, refresh: refresh, renderProfile: renderProfile };
    init();
})();
