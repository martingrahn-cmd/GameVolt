// Attribute real gameplay to the portal entry that led to it. No storage or SDK required.
(function () {
    'use strict';

    var sources = ['martins_picks', 'daily_challenges', 'catalog', 'continue_playing', 'favorites', 'new_games', 'sidebar'];
    function normalizeSource(value) { return sources.indexOf(value) !== -1 ? value : 'direct'; }

    function context(href, gameId, sourceOverride) {
        var url = new URL(href, window.location.href);
        var matchesGame = url.searchParams.get('game') === gameId;
        return {
            game_id: gameId,
            selection_source: normalizeSource(sourceOverride || (matchesGame ? url.searchParams.get('from') : null)),
            entry_mode: matchesGame && !sourceOverride && url.searchParams.get('mode') === 'daily' ? 'daily' : 'default'
        };
    }

    function enrich(params, entry) {
        // Caller-owned parameters stay untouched; a game cannot overwrite its entry context.
        return Object.assign({}, params || {}, entry);
    }

    function send(name, entry) {
        // Analytics must never delay or prevent navigation when unavailable.
        try { if (typeof window.gtag === 'function') window.gtag('event', name, entry); } catch (e) {}
    }

    function prepareLink(link) {
        var section = link.closest('[data-selection-source]');
        if (!section) return null;
        var source = normalizeSource(section.getAttribute('data-selection-source'));
        if (source === 'direct') return null;
        var url = new URL(link.href, window.location.href);
        var id = url.searchParams.get('game');
        if (url.origin !== window.location.origin || url.pathname !== '/play/' || !/^[a-z0-9-]+$/.test(id || '')) return null;
        url.searchParams.set('from', source);
        var href = url.pathname + url.search + url.hash;
        if (link.getAttribute('href') !== href) link.setAttribute('href', href);
        return context(url.href, id);
    }

    function prepare(root) {
        if (root.matches && root.matches('a[href*="game="]')) prepareLink(root);
        if (root.querySelectorAll) root.querySelectorAll('a[href*="game="]').forEach(prepareLink);
    }

    function start() {
        prepare(document);
        // Favorites and recent games can arrive after the static cards.
        new MutationObserver(function (records) {
            records.forEach(function (record) {
                record.addedNodes.forEach(function (node) { if (node.nodeType === 1) prepare(node); });
            });
        }).observe(document.body, { childList: true, subtree: true });
        function select(event) {
            if (event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
            var link = event.target.closest && event.target.closest('a[href*="game="]');
            if (!link) return;
            var entry = prepareLink(link);
            if (entry) send('game_select', entry);
        }
        document.addEventListener('click', select);
        document.addEventListener('auxclick', select);
    }

    window.GVDiscovery = { context: context, enrich: enrich, send: send, prepare: prepare };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
