/* GameVolt theme toggle — cycles dim -> light -> dark, persists to localStorage 'gv-theme'.
   Self-contained: injects its own button + styles into the page header.
   Pages must set data-theme on <html> and include the pre-paint loader in <head>. */
(function () {
    'use strict';

    var THEMES = ['dim', 'light', 'dark'];
    var LABELS = { dim: 'Dim', light: 'Light', dark: 'Dark' };
    var ICONS = {
        dim: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 7a5 5 0 0 1 0 10z" fill="currentColor" stroke="none"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        light: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        dark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
    };

    function current() {
        var t = document.documentElement.getAttribute('data-theme');
        return THEMES.indexOf(t) !== -1 ? t : 'dim';
    }

    function apply(theme, btn) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('gv-theme', theme); } catch (e) {}
        var next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
        btn.innerHTML = ICONS[theme];
        btn.setAttribute('aria-label', 'Theme: ' + LABELS[theme] + '. Switch to ' + LABELS[next] + '.');
        btn.title = LABELS[theme] + ' theme — click for ' + LABELS[next];
    }

    function init() {
        var host = document.querySelector('.header-content');
        if (!host || document.getElementById('gv-theme-btn')) return;

        var css = document.createElement('style');
        css.textContent =
            '.gv-theme-btn{display:inline-flex;align-items:center;justify-content:center;' +
            'width:36px;height:36px;padding:0;border-radius:50%;cursor:pointer;flex:0 0 auto;' +
            'background:var(--bg-glass, rgba(255,255,255,0.05));' +
            'border:1px solid var(--border-subtle, rgba(255,255,255,0.1));' +
            'color:var(--text-medium, #a0a4c0);transition:color .2s,border-color .2s,transform .15s;}' +
            '.gv-theme-btn:hover{color:var(--primary-light, #a78bfa);border-color:var(--border-glow, rgba(124,92,252,0.3));transform:scale(1.06);}' +
            '.gv-theme-btn:active{transform:scale(0.94);}' +
            '.gv-theme-btn svg{display:block;}';
        document.head.appendChild(css);

        var btn = document.createElement('button');
        btn.id = 'gv-theme-btn';
        btn.className = 'gv-theme-btn';
        btn.type = 'button';
        btn.addEventListener('click', function () {
            var next = THEMES[(THEMES.indexOf(current()) + 1) % THEMES.length];
            apply(next, btn);
        });
        apply(current(), btn);

        var userArea = document.getElementById('gv-user-area');
        if (userArea && userArea.parentNode) {
            userArea.parentNode.insertBefore(btn, userArea);
        } else {
            host.appendChild(btn);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
