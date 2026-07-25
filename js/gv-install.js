/* GameVolt "install app" prompt — self-contained, portal-wide.
   Injects a small button into the header next to the theme toggle when the
   browser says the site is installable, and an iOS hint sheet where Safari
   offers no prompt at all. Mirrors the per-game pattern already used by
   Spinburn / Connect 4 / Vector Hexagon.

   Deliberately quiet: it never opens anything on its own, and once dismissed
   it stays gone for 30 days. Nothing here runs when the site is already
   installed and running standalone. */
(function () {
    'use strict';

    var DISMISS_KEY = 'gv-install-dismissed';
    var DISMISS_DAYS = 30;
    var deferredPrompt = null;
    var btn = null;

    function isStandalone() {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
               window.navigator.standalone === true;
    }

    function dismissedRecently() {
        try {
            var t = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
            return t && (Date.now() - t) < DISMISS_DAYS * 864e5;
        } catch (e) { return false; }
    }

    function remember() {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
    }

    function injectStyles() {
        if (document.getElementById('gv-install-css')) return;
        var css = document.createElement('style');
        css.id = 'gv-install-css';
        css.textContent =
            '.gv-install-btn{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;' +
            'padding:7px 13px;border-radius:999px;cursor:pointer;font:inherit;font-size:0.78rem;font-weight:700;' +
            'background:var(--bg-gradient-alt,linear-gradient(135deg,#6d4dff,#9b82ff));color:#fff;' +
            'border:none;white-space:nowrap;transition:transform .15s,opacity .2s;}' +
            '.gv-install-btn:hover{opacity:.9;transform:translateY(-1px);}' +
            '.gv-install-btn svg{display:block;}' +
            '@media (max-width:600px){.gv-install-btn span{display:none;}.gv-install-btn{padding:7px 9px;}}' +
            /* iOS hint sheet */
            '.gv-ios-sheet{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9992;' +
            'width:min(420px,92vw);padding:14px 16px;border-radius:14px;' +
            'background:var(--bg-surface,#1e1b2b);color:var(--text-bright,#f0ecff);' +
            'border:1px solid var(--border-subtle,rgba(255,255,255,0.12));' +
            'box-shadow:0 18px 50px rgba(0,0,0,0.45);font-size:0.85rem;line-height:1.5;' +
            'display:flex;gap:12px;align-items:flex-start;}' +
            '.gv-ios-sheet b{color:var(--primary-light,#b4a0ff);}' +
            '.gv-ios-close{margin-left:auto;background:none;border:none;color:var(--text-muted,#857da0);' +
            'font-size:1.3rem;line-height:1;cursor:pointer;padding:0 2px;flex:0 0 auto;}';
        document.head.appendChild(css);
    }

    function mountButton() {
        if (btn || dismissedRecently()) return;
        var host = document.querySelector('.header-content');
        if (!host) return;
        injectStyles();

        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gv-install-btn';
        btn.id = 'gv-install-btn';
        btn.title = 'Install GameVolt as an app';
        btn.innerHTML =
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
            'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></svg>' +
            '<span>Install app</span>';
        btn.addEventListener('click', function () {
            if (!deferredPrompt) return;
            var p = deferredPrompt;
            deferredPrompt = null;
            btn.remove(); btn = null;
            p.prompt();
            if (p.userChoice) {
                p.userChoice.then(function (res) {
                    if (res && res.outcome === 'dismissed') remember();
                }).catch(function () {});
            }
        });

        // sit just left of the theme toggle when it's there, else at the end
        var theme = document.getElementById('gv-theme-btn');
        if (theme && theme.parentNode) theme.parentNode.insertBefore(btn, theme);
        else host.appendChild(btn);
    }

    function showIosHint() {
        if (dismissedRecently() || document.getElementById('gv-ios-sheet')) return;
        injectStyles();
        var el = document.createElement('div');
        el.className = 'gv-ios-sheet';
        el.id = 'gv-ios-sheet';
        el.innerHTML =
            '<div>Add GameVolt to your Home Screen: tap <b>Share</b>, then ' +
            '<b>Add to Home Screen</b>. Plays offline, no App Store.</div>' +
            '<button class="gv-ios-close" aria-label="Dismiss">&times;</button>';
        el.querySelector('.gv-ios-close').addEventListener('click', function () {
            remember();
            el.remove();
        });
        document.body.appendChild(el);
    }

    function init() {
        if (isStandalone()) return;   // already installed — never nag

        window.addEventListener('beforeinstallprompt', function (e) {
            e.preventDefault();
            deferredPrompt = e;
            mountButton();
        });

        window.addEventListener('appinstalled', function () {
            remember();
            if (btn) { btn.remove(); btn = null; }
            var sheet = document.getElementById('gv-ios-sheet');
            if (sheet) sheet.remove();
        });

        // iOS Safari never fires beforeinstallprompt, so hint manually — but
        // only in Safari itself (Chrome/Firefox on iOS can't install at all).
        var ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
            setTimeout(showIosHint, 4000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
