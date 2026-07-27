// GameVolt — average rating badge on game cards.
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

    var CSS =
        '.game-rating{display:flex;align-items:center;gap:5px;margin:-4px 0 8px;' +
        'font-size:0.82rem;font-weight:700;line-height:1}' +
        '.game-rating-star{color:#fbbf24;font-size:0.95rem}' +
        '.game-rating-avg{color:var(--text-bright)}' +
        '.game-rating-count{color:var(--text-muted);font-weight:600;font-size:0.76rem}';

    var cache = null;   // Map<gameId, {avg, count}>, fetched at most once

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
        if (!(window.GameVolt && GameVolt.rating && GameVolt.rating.getAllAggregates)) {
            cache = {};
            return Promise.resolve(cache);
        }
        return GameVolt.rating.getAllAggregates().then(function (map) {
            cache = map || {};
            return cache;
        }).catch(function () {
            cache = {};
            return cache;
        });
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
            if (!agg || !agg.count) continue;          // unrated: show nothing
            if (!needsBadge(card)) continue;
            var title = card.querySelector('.game-title');
            if (!title) continue;
            var el = document.createElement('div');
            el.className = 'game-rating';
            el.setAttribute('aria-label',
                agg.avg.toFixed(1) + ' out of 5, ' + agg.count +
                ' rating' + (agg.count === 1 ? '' : 's'));
            el.innerHTML =
                '<span class="game-rating-star" aria-hidden="true">★</span>' +
                '<span class="game-rating-avg">' + agg.avg.toFixed(1) + '</span>' +
                '<span class="game-rating-count">(' + agg.count + ')</span>';
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

    window.GVCardRatings = { load: load, render: render };

    // The SDK connects to Supabase asynchronously, so wait for onReady when it
    // is present. With no SDK, render() still runs and simply finds nothing.
    function start() {
        if (window.GameVolt && GameVolt.onReady) GameVolt.onReady(render);
        else render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
