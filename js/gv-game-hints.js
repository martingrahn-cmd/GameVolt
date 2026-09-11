// Shared device requirements for the portal cards and player.
(function () {
    'use strict';

    var landscape = ['slipstream-vector', 'breakout', 'asteroid-storm', 'type-or-die'];
    function requiresLandscape(id) { return landscape.indexOf(id) !== -1; }

    function decorate(root) {
        var links = [];
        if (root.matches && root.matches('a[href*="game="]')) links.push(root);
        if (root.querySelectorAll) links = links.concat(Array.from(root.querySelectorAll('a[href*="game="]')));
        links.forEach(function (card) {
            var url = new URL(card.href, window.location.href);
            if (url.origin !== window.location.origin || !requiresLandscape(url.searchParams.get('game'))) return;
            if (card.querySelector('.gv-landscape-hint')) return;
            var title = card.querySelector('.game-title, .continue-name, .gv-sidebar-name, .gv-search-name');
            if (!title) return;
            var hint = document.createElement('span');
            hint.className = 'gv-landscape-hint';
            hint.textContent = '↔ Landscape on mobile';
            hint.title = 'Turn your phone or tablet sideways to play.';
            title.insertAdjacentElement('afterend', hint);
        });
    }

    function start() {
        var style = document.createElement('style');
        style.textContent = '.gv-landscape-hint{display:block;margin:5px 0;color:var(--text-medium,#a0a4c0);font-size:0.75rem;font-weight:500;line-height:1.4}' +
            '.gv-search-item .gv-landscape-hint{color:#a0a4c0}';
        document.head.appendChild(style);
        decorate(document);
        new MutationObserver(function (records) {
            records.forEach(function (record) {
                record.addedNodes.forEach(function (node) { if (node.nodeType === 1) decorate(node); });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    window.GVGameHints = { requiresLandscape: requiresLandscape, decorate: decorate };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
