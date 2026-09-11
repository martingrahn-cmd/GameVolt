(function () {
    'use strict';
    // Only games with existing Gamepad API input handlers belong here.
    var games = [
        { id: 'slipstream-vector', name: 'Slipstream Vector', genre: 'Anti-gravity racing', art: '/assets/thumbnails/slipstream-vector-tall.png', description: 'Race twelve circuits across four worlds. Master loops, corkscrews, weapons and a rival field that never cheats.' },
        { id: 'hoverdash', name: 'HoverDash', genre: 'Neon lane runner', art: '/assets/thumbnails/hoverdash.webp', preview: '/hoverdash/preview.mp4', description: 'Find your rhythm in the neon rush. Switch lanes, jump obstacles and keep the run alive.' },
        { id: 'axeluga', name: 'Axeluga', genre: 'Space shooter', art: '/assets/thumbnails/axeluga.webp', preview: '/axeluga/preview.mp4', description: 'Take the controls, dodge enemy fire and blast your way through the next wave.' },
        { id: 'snake', name: 'Snake Neo', genre: 'Arcade classic', art: '/assets/thumbnails/snake.webp', preview: '/snake/preview.mp4', description: 'An arcade classic with three ways to play. Chase the next bite and leave yourself a way out.' },
        { id: 'blockstorm', name: 'BlockStorm', genre: 'Block puzzle', art: '/assets/thumbnails/blockstorm.webp', preview: '/blockstorm/preview.mp4', description: 'Build clean lines through the storm. Master three modes with precise controller movement, rotations and drops.' },
        { id: 'asteroid-storm', name: 'Asteroid Storm', genre: 'Space survival', art: '/assets/thumbnails/asteroid-storm.webp', preview: '/asteroid-storm/preview.mp4', description: 'Pilot your ship through the chaos. Break apart asteroids and fight to survive another wave.' },
        { id: 'gridburn', name: 'Gridburn', genre: 'Light cycle duels', art: '/gridburn/og-image.png', preview: '/gridburn/preview.mp4', description: 'Every turn leaves a trail. Cut off your rival and keep clear of the walls in neon light cycle duels.' },
        { id: 'manny-the-mole', name: 'Manny the Mole', genre: 'Digging arcade', art: '/manny-the-mole/og-image.png', preview: '/manny-the-mole/preview.mp4', description: 'Head underground, dig through the mine and watch for falling blocks. A little planning goes a long way.' }
    ];
    var $ = function (id) { return document.getElementById(id); };
    var selected = 0, playing = false, profileOpen = false, controllerFullscreen = false, frame = null, previous = {}, lastDirection = '', repeatAt = 0, returnSince = null, heroAnimationTimer = null;
    var libraryZone = 'games', toolbarIndex = 0;
    var authIndex = 0;
    var toolbarItems = [$('gv-login-btn'), $('fullscreen'), $('exitBigPicture')];
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cards = games.map(function (game, index) {
        var card = document.createElement('button');
        card.type = 'button'; card.className = 'game-card';
        card.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
        card.setAttribute('aria-label', 'Select ' + game.name);
        var art = document.createElement('img'); art.src = game.art; art.alt = ''; art.width = 320; art.height = 200;
        var name = document.createElement('span'); name.className = 'card-name'; name.textContent = game.name;
        card.append(art, name);
        card.addEventListener('focus', function () { leaveToolbar(); select(index, false); });
        card.addEventListener('click', function () { select(index, false); });
        $('gameShelf').append(card);
        return card;
    });
    var carouselButtons = games.map(function (game, index) {
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'carousel-dot';
        button.setAttribute('aria-label', 'Show ' + game.name);
        button.innerHTML = '<span>' + String(index + 1).padStart(2, '0') + '</span><i></i>';
        button.addEventListener('click', function () { select(index, false); });
        $('carouselRail').append(button);
        return button;
    });
    function updatePreview(game) {
        var video = $('selectedVideo'), still = $('selectedStill');
        video.poster = game.art;
        if (game.preview) {
            $('previewLabel').textContent = 'LIVE PREVIEW';
            $('previewStatus').textContent = 'MUTED';
            still.hidden = true; video.hidden = false;
            if (video.src !== game.preview) {
                video.src = game.preview;
                if (video.load) video.load();
            }
            if (video.play) {
                var promise = video.play();
                if (promise && promise.catch) promise.catch(function () {});
            }
        } else {
            $('previewLabel').textContent = 'KEY ART';
            $('previewStatus').textContent = 'FULL GAME';
            if (video.pause) video.pause();
            video.hidden = true; still.hidden = false; still.src = game.art;
        }
    }
    function animateHero(direction) {
        var stage = $('heroStage');
        if (!direction || reducedMotion || !stage || !stage.classList || !stage.classList.add) return;
        if (heroAnimationTimer) window.clearTimeout(heroAnimationTimer);
        stage.classList.remove('ring-next', 'ring-previous');
        void stage.offsetWidth;
        stage.classList.add(direction === 'next' ? 'ring-next' : 'ring-previous');
        heroAnimationTimer = window.setTimeout(function () {
            stage.classList.remove('ring-next', 'ring-previous');
            heroAnimationTimer = null;
        }, 560);
    }
    function select(index, focus) {
        var oldSelected = selected;
        var target = (index + games.length) % games.length;
        var forwardDistance = (target - oldSelected + games.length) % games.length;
        var direction = target === oldSelected ? '' : forwardDistance <= games.length / 2 ? 'next' : 'previous';
        selected = target;
        var game = games[selected];
        var previousGame = games[(selected - 1 + games.length) % games.length];
        var nextGame = games[(selected + 1) % games.length];
        var farPreviousGame = games[(selected - 2 + games.length) % games.length];
        var farNextGame = games[(selected + 2) % games.length];
        cards.forEach(function (card, i) {
            var distance = Math.min(Math.abs(i - selected), 3);
            card.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
            card.setAttribute('data-side', i < selected ? 'left' : i > selected ? 'right' : 'active');
            card.setAttribute('data-distance', String(distance));
        });
        carouselButtons.forEach(function (button, i) { button.setAttribute('aria-current', i === selected ? 'true' : 'false'); });
        $('selectedArt').src = game.art;
        $('previousPeekArt').src = previousGame.art;
        $('previousPeekName').textContent = previousGame.name;
        $('nextPeekArt').src = nextGame.art;
        $('nextPeekName').textContent = nextGame.name;
        $('farPreviousPeekArt').src = farPreviousGame.art;
        $('farPreviousPeekName').textContent = farPreviousGame.name;
        $('farNextPeekArt').src = farNextGame.art;
        $('farNextPeekName').textContent = farNextGame.name;
        updatePreview(game);
        $('selectedTitle').textContent = game.name;
        $('selectedCategory').textContent = game.genre.toUpperCase();
        $('selectedDescription').textContent = game.description;
        $('selectedIndex').textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(games.length).padStart(2, '0');
        $('play').setAttribute('aria-label', 'Play ' + game.name);
        animateHero(direction);
        if (focus) {
            cards[selected].focus({ preventScroll: true });
            cards[selected].scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
        }
        try { sessionStorage.setItem('gv_big_picture_selected', game.id); } catch (e) {}
    }
    function paintToolbarFocus() {
        toolbarItems.forEach(function (item, index) { item.classList.toggle('controller-focus', libraryZone === 'toolbar' && index === toolbarIndex); });
    }
    function focusToolbar(index) {
        libraryZone = 'toolbar';
        toolbarIndex = (index + toolbarItems.length) % toolbarItems.length;
        paintToolbarFocus();
        toolbarItems[toolbarIndex].focus({ preventScroll: true });
    }
    function leaveToolbar() {
        libraryZone = 'games';
        paintToolbarFocus();
    }
    toolbarItems.forEach(function (item, index) {
        item.addEventListener('focus', function () { libraryZone = 'toolbar'; toolbarIndex = index; paintToolbarFocus(); });
    });
    function launch() {
        if (playing || profileOpen) return;
        playing = true;
        $('library').hidden = true; $('player').hidden = false;
        $('playingTitle').textContent = games[selected].name;
        frame = document.createElement('iframe');
        frame.title = 'Play ' + games[selected].name;
        frame.allow = 'autoplay; fullscreen; gamepad';
        frame.src = '/play/?game=' + games[selected].id + '&from=big_picture&big-picture=1';
        frame.addEventListener('load', function () { if (frame) frame.focus(); });
        $('playerMount').append(frame);
        $('returnProgress').value = 0;
        $('returnPrompt').classList.toggle('holding', false);
        $('returnPrompt').classList.toggle('intro', false);
        void $('returnPrompt').offsetWidth;
        $('returnPrompt').classList.toggle('intro', true);
    }
    function back() {
        if (!playing) return;
        // Remove the player entirely so hidden games cannot keep running or making sound.
        frame.remove(); frame = null; playing = false; returnSince = null;
        $('returnPrompt').classList.toggle('holding', false);
        $('returnPrompt').classList.toggle('intro', false);
        $('returnProgress').value = 0;
        $('player').hidden = true; $('library').hidden = false;
        select(selected, true);
    }
    function openProfile() {
        if (playing || profileOpen) return;
        profileOpen = true;
        $('library').hidden = true; $('profileView').hidden = false;
        if (window.GVBigPictureProfile) window.GVBigPictureProfile.refresh();
        $('profileScroller').scrollTop = 0;
        $('profileBack').focus({ preventScroll: true });
    }
    function closeProfile() {
        if (!profileOpen) return;
        profileOpen = false;
        $('profileView').hidden = true; $('library').hidden = false;
        focusToolbar(0);
    }
    function scrollProfile(amount) {
        var scroller = $('profileScroller');
        if (scroller.scrollBy) scroller.scrollBy({ top: amount, behavior: reducedMotion ? 'instant' : 'smooth' });
        else scroller.scrollTop += amount;
    }
    function profileAction() {
        if (!$('profileGuest').hidden) return $('profileLogin');
        if (!$('profileContent').hidden) return $('profileFullLink');
        return null;
    }
    function focusProfileAction() {
        var action = profileAction();
        if (action) action.focus({ preventScroll: true });
    }
    function authModal() {
        return document.querySelector ? document.querySelector('#gv-auth-modal.open') : null;
    }
    function authControls(modal) {
        var qrPanel = modal.querySelector('.gv-qr-panel');
        if (qrPanel && qrPanel.style.display !== 'none') {
            return [modal.querySelector('.gv-qr-retry'), modal.querySelector('.gv-qr-cancel'), modal.querySelector('.gv-close')]
                .filter(function (control) { return control && control.style.display !== 'none'; });
        }
        var emailForm = modal.querySelector('.gv-form');
        var codeForm = modal.querySelector('.gv-code-form');
        var controls = [modal.querySelector('.gv-apple-btn'), modal.querySelector('.gv-google-btn'), modal.querySelector('.gv-qr-btn')]
            .filter(function (control) { return control && control.style.display !== 'none'; });
        if (emailForm && emailForm.style.display !== 'none') {
            controls.push(modal.querySelector('.gv-email'), modal.querySelector('.gv-btn'));
        } else if (codeForm) {
            controls.push(modal.querySelector('.gv-code'), modal.querySelector('.gv-verify-btn'), modal.querySelector('.gv-code-back'));
        }
        controls.push(modal.querySelector('.gv-close'));
        return controls.filter(Boolean);
    }
    function focusAuth(index) {
        var modal = authModal();
        if (!modal) return;
        var controls = authControls(modal);
        if (!controls.length) return;
        authIndex = (index + controls.length) % controls.length;
        controls.forEach(function (control, i) { control.classList.toggle('controller-focus', i === authIndex); });
        controls[authIndex].focus({ preventScroll: true });
    }
    function closeAuth() {
        var modal = authModal();
        if (!modal) return;
        var close = modal.querySelector('.gv-close');
        if (close) close.click();
        $('profileLogin').focus({ preventScroll: true });
    }
    function openLogin() {
        if (!(window.GameVolt && window.GameVolt.auth && window.GameVolt.auth.login)) return;
        window.GameVolt.auth.login();
    }
    function exit() { window.location.href = '/'; }
    $('play').addEventListener('click', launch);
    $('prevGame').addEventListener('click', function () { select(selected - 1, true); });
    $('nextGame').addEventListener('click', function () { select(selected + 1, true); });
    $('back').addEventListener('click', back);
    $('gv-login-btn').addEventListener('click', openProfile);
    $('profileBack').addEventListener('click', closeProfile);
    $('profileLogin').addEventListener('click', openLogin);
    function paintFullscreenLabel() {
        var active = !!document.fullscreenElement || controllerFullscreen;
        $('fullscreen').querySelector('span').textContent = document.fullscreenElement ? 'Exit fullscreen' : controllerFullscreen ? 'Exit TV view' : 'Fullscreen';
        $('fullscreen').setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    function setControllerFullscreen(active) {
        controllerFullscreen = active;
        if (document.body && document.body.classList) document.body.classList.toggle('controller-fullscreen', active);
        paintFullscreenLabel();
        var mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
        $('notice').textContent = active ? 'TV view on · To hide the browser bar, press ' + (mac ? 'Control–Command–F' : 'F11') + ' once' : '';
    }
    async function toggleFullscreen(controllerRequest) {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (controllerFullscreen) setControllerFullscreen(false);
            else if (controllerRequest && document.documentElement.requestFullscreen) {
                try { await document.documentElement.requestFullscreen(); }
                catch (e) { setControllerFullscreen(true); }
            }
            else if (controllerRequest) setControllerFullscreen(true);
            else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            else $('notice').textContent = 'Fullscreen is unavailable in this browser. You can still play here.';
        } catch (e) { $('notice').textContent = 'Fullscreen could not open. You can still play here.'; }
    }
    $('fullscreen').addEventListener('click', function (event) { toggleFullscreen(event && event.isTrusted === false); });
    document.addEventListener('fullscreenchange', function () {
        paintFullscreenLabel();
    });
    document.addEventListener('keydown', function (event) {
        if (playing) {
            if (event.key === 'Escape') { event.preventDefault(); back(); }
            return;
        }
        var openAuthModal = authModal();
        if (openAuthModal) {
            if (event.key === 'Escape') { event.preventDefault(); closeAuth(); }
            else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault(); focusAuth(authIndex + (event.key === 'ArrowUp' ? -1 : 1));
            }
            return;
        }
        if (profileOpen) {
            if (event.key === 'Escape') { event.preventDefault(); closeProfile(); }
            else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                var action = profileAction();
                if (event.key === 'ArrowDown' && document.activeElement === $('profileBack') && action) focusProfileAction();
                else if (event.key === 'ArrowUp' && action && document.activeElement === action) $('profileBack').focus({ preventScroll: true });
                else scrollProfile(event.key === 'ArrowUp' ? -240 : 240);
            }
            return;
        }
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (libraryZone === 'toolbar') {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault(); focusToolbar(toolbarIndex + (event.key === 'ArrowLeft' ? -1 : 1));
            } else if (event.key === 'ArrowDown') {
                event.preventDefault(); leaveToolbar(); select(selected, true);
            } else if (event.key === 'Escape') { event.preventDefault(); if (controllerFullscreen) setControllerFullscreen(false); else exit(); }
            return;
        }
        var direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (direction) { event.preventDefault(); select(selected + direction, true); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusToolbar(0); }
        else if (event.key === 'Enter' && cards.includes(document.activeElement)) { event.preventDefault(); if (!event.repeat) launch(); }
        else if (event.key === 'Escape') { event.preventDefault(); if (controllerFullscreen) setControllerFullscreen(false); else exit(); }
    });
    function poll(now) {
        var pads = [];
        try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; } catch (e) {}
        var pad = pads.find(function (p) { return p && p.connected && p.mapping === 'standard'; });
        var status = pad ? 'Controller connected' : pads.some(Boolean) ? 'Use a standard controller, keyboard or touch' : 'Press a button on your controller';
        if ($('controllerStatus').textContent !== status) $('controllerStatus').textContent = status;
        $('controllerStatus').classList.toggle('connected', !!pad);
        if (pad && !document.hidden) {
            var pressed = function (index) { return !!(pad.buttons[index] && pad.buttons[index].pressed); };
            var state = { accept: pressed(0), back: pressed(1), profile: pressed(2), fullscreen: pressed(3), view: pressed(8), menu: pressed(9), combo: pressed(8) && pressed(9),
                left: pressed(14) || pad.axes[0] < -0.55, right: pressed(15) || pad.axes[0] > 0.55,
                up: pressed(12) || pad.axes[1] < -0.55, down: pressed(13) || pad.axes[1] > 0.55 };
            if (playing) {
                // View / Share is unused by the games, so the shell can always
                // reclaim navigation even while focus is inside nested iframes.
                if (state.view || state.menu) {
                    if (returnSince === null) returnSince = now;
                    var holdTime = state.combo ? 650 : state.view ? 1000 : 1500;
                    var elapsed = now - returnSince;
                    $('returnPrompt').classList.toggle('intro', false);
                    $('returnPrompt').classList.toggle('holding', true);
                    $('returnProgress').value = Math.min(100, Math.round(elapsed / holdTime * 100));
                    $('returnPromptText').textContent = state.combo ? 'Returning to Big Picture…' : 'Keep holding to return…';
                    if (elapsed >= holdTime) back();
                } else {
                    returnSince = null;
                    $('returnPrompt').classList.toggle('holding', false);
                    $('returnProgress').value = 0;
                    $('returnPromptText').textContent = 'Hold View / Share to return';
                }
            } else if (authModal()) {
                var authDirection = state.up ? 'up' : state.down ? 'down' : '';
                if (authDirection && (authDirection !== lastDirection || now >= repeatAt)) {
                    focusAuth(authIndex + (authDirection === 'up' ? -1 : 1));
                    repeatAt = now + (authDirection !== lastDirection ? 350 : 150);
                }
                lastDirection = authDirection;
                if (state.accept && !previous.accept) {
                    var authActive = document.activeElement;
                    if (authActive && authActive.click) authActive.click();
                }
                if (state.back && !previous.back) closeAuth();
            } else if (profileOpen) {
                var profileDirection = state.up ? 'up' : state.down ? 'down' : '';
                if (profileDirection && (profileDirection !== lastDirection || now >= repeatAt)) {
                    var action = profileAction();
                    if (profileDirection === 'down' && document.activeElement === $('profileBack') && action) focusProfileAction();
                    else if (profileDirection === 'up' && action && document.activeElement === action) $('profileBack').focus({ preventScroll: true });
                    else scrollProfile(profileDirection === 'up' ? -240 : 240);
                    repeatAt = now + (profileDirection !== lastDirection ? 350 : 150);
                }
                lastDirection = profileDirection;
                if (state.fullscreen && !previous.fullscreen) toggleFullscreen(true);
                if (state.profile && !previous.profile) closeProfile();
                if (state.accept && !previous.accept) {
                    var profileActive = document.activeElement;
                    if (profileActive === $('profileBack') || profileActive === profileAction()) {
                        profileActive.click();
                        if (profileActive === $('profileLogin')) focusAuth(1);
                    }
                }
                if (state.back && !previous.back) closeProfile();
            } else {
                var direction = state.left ? 'left' : state.right ? 'right' : '';
                if (libraryZone === 'toolbar') {
                    if (direction && (direction !== lastDirection || now >= repeatAt)) {
                        focusToolbar(toolbarIndex + (direction === 'left' ? -1 : 1));
                        repeatAt = now + (direction !== lastDirection ? 350 : 150);
                    }
                    if (state.down && !previous.down) { leaveToolbar(); select(selected, true); }
                } else {
                    if (direction && (direction !== lastDirection || now >= repeatAt)) {
                        select(selected + (direction === 'left' ? -1 : 1), true);
                        repeatAt = now + (direction !== lastDirection ? 350 : 150);
                    }
                    if (state.up && !previous.up) focusToolbar(0);
                }
                lastDirection = direction;
                if (state.fullscreen && !previous.fullscreen) toggleFullscreen(true);
                if (state.profile && !previous.profile) openProfile();
                if (state.accept && !previous.accept) {
                    var active = document.activeElement;
                    if (libraryZone === 'toolbar' || active === $('prevGame') || active === $('nextGame') || (active && active.matches('.exit, .brand'))) active.click();
                    else launch();
                }
                if (state.back && !previous.back) {
                    if (controllerFullscreen) setControllerFullscreen(false);
                    else exit();
                }
            }
            previous = state;
        } else {
            previous = {}; lastDirection = ''; returnSince = null;
            if (playing) {
                $('returnPrompt').classList.toggle('holding', false);
                $('returnProgress').value = 0;
                $('returnPromptText').textContent = 'Hold View / Share to return';
            }
        }
        window.requestAnimationFrame(poll);
    }
    try {
        var stored = games.findIndex(function (game) { return game.id === sessionStorage.getItem('gv_big_picture_selected'); });
        if (stored >= 0) selected = stored;
    } catch (e) {}
    select(selected, false);
    window.requestAnimationFrame(poll);
})();
