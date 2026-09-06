// Read the games' own saves; opening the portal never records a completion.
(function () {
    'use strict';

    function localKey(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }
    function object(raw) {
        try { var value = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
        catch (e) { return {}; }
    }
    function number(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
    function streak(value) { return Number.isInteger(value) && value > 0 ? value : 0; }
    function status(id, now, storage) {
        var today = localKey(now), yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        var previousDay = localKey(yesterday);
        var result = { available: true, completed: false, streak: 0, seconds: null, stars: null };
        try {
            if (id === 'short-circuit') {
                var sc = object(storage.getItem('short-circuit:daily'));
                result.completed = sc.date === today;
                result.streak = sc.date === today || sc.date === previousDay ? streak(sc.streak) : 0;
                if (result.completed) result.seconds = number(sc.time);
            } else if (id === 'golden-glyphs') {
                var utcToday = now.toISOString().slice(0, 10);
                result.completed = storage.getItem('daily_complete_' + utcToday) === 'true';
                var start = Date.parse(utcToday + 'T00:00:00Z');
                for (var offset = 0; offset < 365; offset++) {
                    var key = new Date(start - offset * 86400000).toISOString().slice(0, 10);
                    if (storage.getItem('daily_complete_' + key) === 'true') result.streak++;
                    else if (offset !== 0) break;
                }
                var gg = object(storage.getItem('goldenGlyphsDailyResults'))[utcToday];
                if (result.completed && gg) { result.seconds = number(gg.time); result.stars = number(gg.stars); }
            } else if (id === 'livewire') {
                var lastDay;
                try { lastDay = JSON.parse(storage.getItem('fb_daily_done')); } catch (e) {}
                result.completed = lastDay === today;
                if (lastDay === today || lastDay === previousDay) {
                    try { result.streak = streak(JSON.parse(storage.getItem('fb_daily_streak'))); } catch (e) {}
                }
                // The legacy best/stars are all-time values, never today's result.
                var lw = object(storage.getItem('fb_daily_result'));
                if (result.completed && lw.date === today) {
                    var ms = number(lw.timeMs);
                    result.seconds = ms === null ? null : ms / 1000;
                    result.stars = number(lw.stars);
                }
            }
        } catch (e) {
            return { available: false, completed: false, streak: 0, seconds: null, stars: null };
        }
        return result;
    }
    function formatTime(seconds) {
        if (seconds < 60) return seconds.toFixed(1) + 's';
        var rounded = Math.round(seconds);
        return Math.floor(rounded / 60) + ':' + String(rounded % 60).padStart(2, '0');
    }
    function start() {
        var cards = document.querySelectorAll('[data-daily-game]');
        if (!cards.length) return;
        var timer;
        function render() {
            var now = new Date(), complete = 0, available = true;
            cards.forEach(function (card) {
                var progress;
                try { progress = status(card.dataset.dailyGame, now, window.localStorage); }
                catch (e) { progress = { available: false }; }
                available = available && progress.available;
                complete += progress.completed ? 1 : 0;
                card.classList.toggle('daily-complete', !!progress.completed);
                card.querySelector('.daily-state').textContent = !progress.available ? 'Progress unavailable' : progress.completed ? 'Completed today ✓' : 'Ready to play';
                var details = [];
                if (progress.seconds != null) details.push('Best today ' + formatTime(progress.seconds));
                if (progress.stars > 0 && progress.stars <= 3) details.push(progress.stars + '/3 stars');
                if (progress.streak) details.push(progress.streak + '-day streak');
                else if (progress.available) details.push('Start a daily streak');
                card.querySelector('.daily-result').textContent = details.join(' · ');
            });
            document.getElementById('dailyProgressSummary').textContent = available ? complete + ' of 3 complete today · Progress in this browser' : 'Progress cannot be read in this browser. You can still play.';
            clearTimeout(timer);
            // Short Circuit/Livewire roll over locally; Golden Glyphs uses UTC.
            var localMidnight = new Date(now); localMidnight.setHours(24, 0, 0, 0);
            var utcMidnight = new Date(now); utcMidnight.setUTCHours(24, 0, 0, 0);
            timer = setTimeout(render, Math.min(localMidnight - now, utcMidnight - now) + 1000);
        }
        render();
        ['pageshow', 'focus', 'storage'].forEach(function (event) { window.addEventListener(event, render); });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
    }
    window.GVDailyProgress = { status: status, formatTime: formatTime };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
