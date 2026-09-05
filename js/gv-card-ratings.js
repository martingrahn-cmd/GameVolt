// GameVolt — rating badges and confidence-aware catalog ranking.
//
// The front page has shown this since the ratings launch; the category pages
// and Favorites never did, so the same card looked rated on one page and
// unrated on the next. This is that renderer, lifted out of index.html so
// every listing page shares one implementation.
//
// Purely additive by design: no SDK, no ratings, or a failed request all mean
// the cards render exactly as they do today. It never blocks first paint —
// badges appear when the data arrives.
//
// Cards are found by the markup every listing page already uses:
//   <a href="/play/?game=<slug>" class="game-card"> … <h3 class="game-title">
//
// Exposes window.GVCardRatings.load() so a page that also sorts by rating
// (the front page's "Top Rated" pill) shares the same single request.
(function () {
    'use strict';

    var MIN_RATINGS = 5;

    function validAggregate(agg) {
        return !!agg && Number.isFinite(agg.avg) && agg.avg >= 1 && agg.avg <= 5 &&
            Number.isInteger(agg.count) && agg.count > 0;
    }

    // Five votes qualify a game. Ten neutral (3/5) prior votes temper small
    // samples; the displayed average is always the actual player average.
    function rankScore(agg) {
        if (!validAggregate(agg) || agg.count < MIN_RATINGS) return null;
        return (agg.avg * agg.count + 3 * 10) / (agg.count + 10);
    }

    var CSS =
        '.game-rating{display:flex;align-items:center;gap:5px;margin:-4px 0 8px;' +
        'font-size:0.82rem;font-weight:700;line-height:1}' +
        '.game-rating-star{color:#fbbf24;font-size:0.95rem}' +
        '.game-rating-avg{color:var(--text-bright)}' +
        '.game-rating-count{color:var(--text-muted);font-weight:600;font-size:0.76rem}';

    var cache = null;   // Map<gameId, {avg, count}>
    var pending = null; // Rendering and sorting share an in-flight request.

    function injectCSS() {
        // index.html already carries these rules inline; don't duplicate them.
        if (document.getElementById('gv-card-ratings-css')) return;
        var s = document.createElement('style');
        s.id = 'gv-card-ratings-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function slugOf(card) {
        var m = (card.getAttribute('href') || '').match(/game=([\w-]+)/);
        return m ? m[1] : '';
    }

    // One request for every game's ratings, not one per game.
    function load() {
        if (cache) return Promise.resolve(cache);
        if (pending) return pending;
        if (!(window.GameVolt && GameVolt.rating && GameVolt.rating.getAllAggregates)) {
            return Promise.resolve(null);
        }
        pending = new Promise(function(resolve, reject) {
            function fetchRatings() {
                Promise.resolve().then(function() {
                    return GameVolt.rating.getAllAggregates();
                }).then(resolve, reject);
            }
            if (GameVolt.onReady) GameVolt.onReady(fetchRatings);
            else fetchRatings();
        }).then(function (map) {
            cache = map || {};
            return cache;
        }).catch(function () {
            return null; // A failed request must not permanently cache an empty map.
        }).finally(function() {
            pending = null;
        });
        return pending;
    }

    function needsBadge(card) {
        return !card.querySelector('.game-rating');
    }

    // Idempotent: safe to run again over cards that already carry a badge.
    function paint(map) {
        if (!map) return;
        var cards = document.querySelectorAll('a.game-card[href*="game="]');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var agg = map[slugOf(card)];
            if (!validAggregate(agg)) continue;       // unrated: show nothing
            if (!needsBadge(card)) continue;
            var title = card.querySelector('.game-title');
            if (!title) continue;
            var el = document.createElement('div');
            el.className = 'game-rating';
            if (agg.count < MIN_RATINGS) {
                el.classList.add('game-rating-early');
                el.textContent = agg.count + ' rating' + (agg.count === 1 ? '' : 's') + ' · Early ratings';
                el.style.color = 'var(--text-medium)';
                el.style.fontWeight = '400';
                el.style.fontSize = '0.875rem';
                el.style.lineHeight = '1.4';
                el.title = 'At least 5 player ratings are needed for Top Rated.';
            } else {
                el.setAttribute('aria-label',
                    agg.avg.toFixed(1) + ' out of 5, ' + agg.count + ' ratings');
                el.innerHTML =
                    '<span class="game-rating-star" aria-hidden="true">★</span>' +
                    '<span class="game-rating-avg">' + agg.avg.toFixed(1) + '</span>' +
                    '<span class="game-rating-count">(' + agg.count + ')</span>';
            }
            title.insertAdjacentElement('afterend', el);
        }
    }

    // Favorites builds its grid from storage after this module has already run,
    // and it rebuilds on every unfavourite — so watch for cards that appear
    // later instead of painting once. Repaints use the cached map, never a new
    // request, and only fire when an unbadged card actually shows up (the
    // badges this inserts are not themselves cards, so it cannot loop).
    var observing = false;
    function observe() {
        if (observing || typeof MutationObserver !== 'function' || !document.body) return;
        observing = true;
        new MutationObserver(function (records) {
            for (var i = 0; i < records.length; i++) {
                var added = records[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType !== 1) continue;
                    var hit = (n.matches && n.matches('a.game-card[href*="game="]') && needsBadge(n)) ||
                        (n.querySelector && n.querySelector('a.game-card[href*="game="]'));
                    if (hit) { paint(cache); return; }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    function render() {
        injectCSS();
        return load().then(function (map) {
            paint(map);
            observe();
        }).catch(function () {});
    }

    window.GVCardRatings = { load: load, render: render, rankScore: rankScore, MIN_RATINGS: MIN_RATINGS };

    // The SDK connects to Supabase asynchronously, so wait for onReady when it
    // is present. With no SDK, render() still runs and simply finds nothing.
    function start() {
        // The play page also imports the policy, but needs no catalog fetch.
        if (!document.querySelector('a.game-card[href*="game="]')) {
            // Favorites can build its cards after this script has loaded.
            // Only the play page has a game iframe and uses the policy alone.
            if (document.getElementById('gameFrame')) return;
        }
        if (window.GameVolt && GameVolt.onReady) GameVolt.onReady(render);
        else render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
