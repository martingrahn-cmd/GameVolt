// Main menu system with keyboard + gamepad navigation
class MenuSystem {
    constructor() {
        this.currentScreen = 'main'; // 'main', 'settings', 'none'
        this.selectedIndex = 0;
        this.items = [];
        this.gpPrevButtons = {};
        this.active = true;

        // Lockout window after construction — block all input briefly so that
        // a button still held from a previous screen (game over → main menu, or
        // pause → main menu) cannot bleed through into the menu. The Gamepad
        // API can also report empty initially after reload, so we need a window
        // long enough to detect held buttons after the API wakes up.
        this.lockoutUntil = performance.now() + 700;

        // Held set is rebuilt every poll while we're in lockout — any button
        // detected as pressed during the lockout window must be released before
        // it counts as a press.
        this.gpHeldFromBoot = new Set();

        this.refreshItems();
        this.setupInput();
        this.updateSelection();
        this.pollGamepad();
        this._ensureMenuStars();

        // Start menu music — try immediately, then fall back to first interaction
        // (click/keydown/gamepad) so the autoplay policy doesn't block it.
        this._tryStartMenuMusic();
        this._startMenuMusic = () => {
            this._tryStartMenuMusic();
            this._removeMenuMusicListeners();
        };
        document.addEventListener('click', this._startMenuMusic);
        document.addEventListener('keydown', this._startMenuMusic);
    }

    _removeMenuMusicListeners() {
        if (this._startMenuMusic) {
            document.removeEventListener('click', this._startMenuMusic);
            document.removeEventListener('keydown', this._startMenuMusic);
        }
    }

    _tryStartMenuMusic() {
        // Don't start menu music if the game is already running or about to start
        if (!this.active) return;
        if (window.game && window.game.gameActive) return;
        if (window.game && window.game.audio) {
            window.game.audio.playMusic('menu_theme');
        }
    }

    refreshItems() {
        let screen = null;
        if (this.currentScreen === 'main') screen = document.getElementById('mainMenu');
        else if (this.currentScreen === 'settings') screen = document.getElementById('settingsScreen');
        else if (this.currentScreen === 'remap') screen = document.getElementById('remapScreen');
        else if (this.currentScreen === 'howtoplay') screen = document.getElementById('howToPlayScreen');
        else if (this.currentScreen === 'hangar') screen = document.getElementById('hangarScreen');
        else if (this.currentScreen === 'worlds') screen = document.getElementById('worldsScreen');
        else if (this.currentScreen === 'challengeselect') screen = document.getElementById('challengeSelectScreen');
        else if (this.currentScreen === 'achievements') screen = document.getElementById('achievementsScreen');
        else if (this.currentScreen === 'highscores') screen = document.getElementById('highscoresScreen');
        else if (this.currentScreen === 'remapkb') screen = document.getElementById('remapKbScreen');
        if (!screen) { this.items = []; return; }
        // Include both .menu-item and .remap-row as navigable items
        this.items = Array.from(screen.querySelectorAll('.menu-item, .remap-row'));
        this.selectedIndex = 0;
        this.updateSelection();
        this.refreshHighScores();
        this.refreshLoadoutInfo();
    }

    // Show current ship + world in their menu item descriptions
    refreshLoadoutInfo() {
        const shipEl = document.getElementById('menuShipInfo');
        if (shipEl && typeof Ships !== 'undefined') {
            shipEl.textContent = Ships.getEquipped().name;
        }
        const worldEl = document.getElementById('menuWorldInfo');
        if (worldEl && typeof Worlds !== 'undefined') {
            const w = Worlds.getAll().find(w => w.id === Worlds.getSelectedId());
            worldEl.textContent = w ? w.name : 'RANDOM';
        }
        const trophyEl = document.getElementById('menuTrophyInfo');
        if (trophyEl && typeof Achievements !== 'undefined' && typeof TROPHIES !== 'undefined') {
            trophyEl.textContent = `${Achievements.getUnlockedCount()} / ${TROPHIES.length}`;
        }
    }

    // Stamp the persisted high score into each gameplay menu item.
    refreshHighScores() {
        if (typeof Highscores === 'undefined') return;
        for (const item of this.items) {
            const mode = item.getAttribute('data-mode');
            if (!mode || mode === 'settings' || mode === 'back') continue;
            const best = Highscores.get(mode);
            let badge = item.querySelector('.menu-item-best');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'menu-item-best';
                item.appendChild(badge);
            }
            badge.textContent = best > 0 ? `BEST ${best.toLocaleString()}` : '';
        }
    }

    isLocked() {
        return performance.now() < this.lockoutUntil;
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (!this.active) return;
            if (this.isLocked()) return;

            if (e.code === 'ArrowUp') {
                this.navigate(this._isGridScreen() ? -this._getGridColumns() : -1);
                e.preventDefault();
            } else if (e.code === 'ArrowDown') {
                this.navigate(this._isGridScreen() ? this._getGridColumns() : 1);
                e.preventDefault();
            } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                const item = this.items[this.selectedIndex];
                if (this._isGridScreen()) {
                    this.navigate(e.code === 'ArrowRight' ? 1 : -1);
                    e.preventDefault();
                } else if (this.currentScreen === 'highscores') {
                    this._cycleHighscoreTab(e.code === 'ArrowRight' ? 1 : -1);
                    e.preventDefault();
                } else if (this.currentScreen === 'remapkb') {
                    this._cycleKbRemapTab(e.code === 'ArrowRight' ? 1 : -1);
                    e.preventDefault();
                } else if (item && item.getAttribute('data-control') === 'slider') {
                    const dir = e.code === 'ArrowRight' ? 1 : -1;
                    this.adjustSlider(item, dir * 5);
                    e.preventDefault();
                } else if (this.currentScreen === 'hangar' && window.hangar) {
                    window.hangar.browse(e.code === 'ArrowRight' ? 1 : -1);
                    e.preventDefault();
                }
            } else if (e.code === 'Enter' || e.code === 'Space') {
                this.select();
                e.preventDefault();
            } else if (e.code === 'Escape') {
                if (this._capturingAction) {
                    this.cancelBindingCapture();
                } else if (this.currentScreen === 'remap' || this.currentScreen === 'remapkb') {
                    this.showScreen('settings');
                } else if (this.currentScreen === 'settings') {
                    this.showScreen('main');
                } else if (this.currentScreen === 'hangar' && this._hangarLaunching) {
                    // Launch in progress — ignore
                } else if (this.currentScreen === 'hangar' && window.hangar && window.hangar.playLaunchSequence) {
                    this._hangarLaunching = true;
                    window.hangar.playLaunchSequence(() => {
                        this._hangarLaunching = false;
                        this.showScreen('main');
                    });
                } else if (this.currentScreen !== 'main') {
                    this.showScreen('main');
                }
            }
        });

        // Mouse/touch click on items — touchend on mobile, click on desktop.
        // Prevents double-fire by tracking last tap time.
        let lastTapTime = 0;
        const handleTap = (e) => {
            if (!this.active) return;
            if (this.isLocked()) return;
            const now = Date.now();
            if (now - lastTapTime < 400) return; // debounce
            lastTapTime = now;
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const item = target ? target.closest('.menu-item, .remap-row') : null;
            if (item && this.items.includes(item)) {
                this.selectedIndex = this.items.indexOf(item);
                this.updateSelection();
                this.select();
                e.preventDefault();
            }
        };
        document.addEventListener('click', handleTap);
        document.addEventListener('touchend', handleTap, { passive: false });

        // Hover
        document.addEventListener('mouseover', (e) => {
            if (!this.active) return;
            const item = e.target.closest('.menu-item, .remap-row');
            if (item && this.items.includes(item)) {
                this.selectedIndex = this.items.indexOf(item);
                this.updateSelection();
            }
        });
    }

    pollGamepad() {
        if (!this.active) {
            requestAnimationFrame(() => this.pollGamepad());
            return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) { if (g) { gp = g; break; } }

        if (gp) {
            // Update settings screen gamepad status
            const gpStatus = document.getElementById('settingsGPStatus');
            if (gpStatus && this.currentScreen === 'settings') {
                gpStatus.textContent = gp.id;
                gpStatus.style.color = 'rgba(0,255,0,0.6)';
            }

            // Clear held-from-boot once buttons are released
            for (const i of [0, 1, 2, 3, 12, 13]) {
                if (this.gpHeldFromBoot.has(i) && !(gp.buttons[i] && gp.buttons[i].pressed)) {
                    this.gpHeldFromBoot.delete(i);
                }
            }

            // During the lockout window, keep marking any pressed button as
            // held-from-boot. This handles the case where the gamepad API
            // wasn't ready on the first construction frame.
            if (this.isLocked()) {
                for (const i of [0, 1, 2, 3, 12, 13]) {
                    if (gp.buttons[i] && gp.buttons[i].pressed) {
                        this.gpHeldFromBoot.add(i);
                    }
                }
                this.gpPrevButtons = { up: false, down: false, confirm: false, back: false };
                requestAnimationFrame(() => this.pollGamepad());
                return;
            }

            // Capture mode: read raw input for remapping
            if (this._capturingAction) {
                // Allow B/back to cancel
                if (gp.buttons[1] && gp.buttons[1].pressed && !this._captureIgnoreButtons.has(1)) {
                    this.cancelBindingCapture();
                } else {
                    // Clear ignore-set entries once they release
                    for (const i of Array.from(this._captureIgnoreButtons)) {
                        if (!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3))) {
                            this._captureIgnoreButtons.delete(i);
                        }
                    }
                    for (const i of Array.from(this._captureIgnoreAxes)) {
                        if (Math.abs(gp.axes[i] || 0) < 0.3) this._captureIgnoreAxes.delete(i);
                    }

                    const captured = GamepadBindings.captureInput(gp, this._captureIgnoreButtons, this._captureIgnoreAxes);
                    if (captured) {
                        // Bind it (replaces existing bindings for this action)
                        GamepadBindings.setBinding(this._remapGpId, this._capturingAction, [captured]);
                        this.flashControllerInput(captured);
                        this.cancelBindingCapture();
                        this.renderRemapList();
                        this.refreshItems();
                    }
                }

                this.gpPrevButtons = { up: false, down: false, left: false, right: false, confirm: false, back: false };
                requestAnimationFrame(() => this.pollGamepad());
                return;
            }

            const isPressed = (i) => gp.buttons[i] && gp.buttons[i].pressed && !this.gpHeldFromBoot.has(i);

            // D-pad / stick navigation (uses raw inputs so the menu still works
            // even if the player has remapped pause/teleport etc to the same buttons).
            const up = isPressed(12) || (gp.axes[1] < -0.5);
            const down = isPressed(13) || (gp.axes[1] > 0.5);
            const left = isPressed(14) || (gp.axes[0] < -0.5);
            const right = isPressed(15) || (gp.axes[0] > 0.5);
            const confirm = isPressed(0) || isPressed(1);
            const back = isPressed(2) || isPressed(3);

            // Only trigger on press, not hold
            const gridStep = this._isGridScreen() ? this._getGridColumns() : 1;
            if (up && !this.gpPrevButtons.up) this.navigate(-gridStep);
            if (down && !this.gpPrevButtons.down) this.navigate(gridStep);
            // Left/right navigates ±1 on grid screens, cycles tabs on highscores
            if (this._isGridScreen()) {
                if (left && !this.gpPrevButtons.left) this.navigate(-1);
                if (right && !this.gpPrevButtons.right) this.navigate(1);
            } else if (this.currentScreen === 'highscores') {
                if (left && !this.gpPrevButtons.left) this._cycleHighscoreTab(-1);
                if (right && !this.gpPrevButtons.right) this._cycleHighscoreTab(1);
            } else if (this.currentScreen === 'remapkb') {
                if (left && !this.gpPrevButtons.left) this._cycleKbRemapTab(-1);
                if (right && !this.gpPrevButtons.right) this._cycleKbRemapTab(1);
            }

            // Sliders: left/right adjusts when a slider item is selected
            const selectedItem = this.items[this.selectedIndex];
            const isSlider = selectedItem && selectedItem.getAttribute('data-control') === 'slider';
            if (isSlider) {
                // Continuous adjust while held — small step every frame
                if (left || right) {
                    const dir = right ? 1 : -1;
                    this.adjustSlider(selectedItem, dir * 2);
                }
            } else if (this.currentScreen === 'hangar' && window.hangar) {
                // Hangar: left/right browses ships (only on press, not hold)
                if (left && !this.gpPrevButtons.left) window.hangar.browse(-1);
                if (right && !this.gpPrevButtons.right) window.hangar.browse(1);
            }

            if (confirm && !this.gpPrevButtons.confirm) this.select();
            if (back && !this.gpPrevButtons.back) {
                if (this.currentScreen === 'remap' || this.currentScreen === 'remapkb') {
                    this.showScreen('settings');
                } else if (this.currentScreen === 'hangar' && this._hangarLaunching) {
                    // Launch in progress
                } else if (this.currentScreen === 'hangar' && window.hangar && window.hangar.playLaunchSequence) {
                    this._hangarLaunching = true;
                    window.hangar.playLaunchSequence(() => {
                        this._hangarLaunching = false;
                        this.showScreen('main');
                    });
                } else if (this.currentScreen !== 'main') {
                    this.showScreen('main');
                }
            }

            this.gpPrevButtons = { up, down, left, right, confirm, back };
        }

        requestAnimationFrame(() => this.pollGamepad());
    }

    adjustSlider(item, delta) {
        const action = item.getAttribute('data-action');
        const sliderId = action === 'music' ? 'musicSlider' : 'sfxSlider';
        const valueId = action === 'music' ? 'musicSliderValue' : 'sfxSliderValue';
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        if (!slider) return;

        const cur = parseInt(slider.value, 10);
        const next = Math.max(0, Math.min(100, cur + delta));
        if (next === cur) return;
        slider.value = next;
        if (valueEl) valueEl.textContent = next;

        const audio = window.game && window.game.audio;
        if (audio) {
            const v = next / 100;
            if (action === 'music') audio.setMusicVolume(v);
            else audio.setSfxVolume(v);
        }
    }

    playNav() {
        if (window.game && window.game.audio) window.game.audio.playMenuNavigate();
    }
    playSelect() {
        if (window.game && window.game.audio) window.game.audio.playMenuSelect();
    }

    _isGridScreen() {
        return this.currentScreen === 'achievements' || this.currentScreen === 'challengeselect';
    }

    _getGridColumns() {
        // Count columns by finding the first visible .trophy-cards grid container
        const screenIds = {
            achievements: 'achievementsScreen',
            challengeselect: 'challengeSelectScreen'
        };
        const screenEl = document.getElementById(screenIds[this.currentScreen]);
        const grid = screenEl ? screenEl.querySelector('.trophy-cards') : document.querySelector('.trophy-cards');
        if (!grid) return 1;
        const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        return cols || 1;
    }

    navigate(dir) {
        if (this.items.length === 0) return;
        this.playNav();
        const skipLocked = !this._isGridScreen();
        let next = this.selectedIndex;
        // Clamp for grid navigation (large steps shouldn't wrap)
        const absDir = Math.abs(dir);
        if (absDir > 1) {
            next = next + dir;
            if (next < 0) next = 0;
            if (next >= this.items.length) next = this.items.length - 1;
            this.selectedIndex = next;
            this.updateSelection();
            return;
        }
        for (let i = 0; i < this.items.length; i++) {
            next = (next + dir + this.items.length) % this.items.length;
            if (!skipLocked || !this.items[next].classList.contains('locked')) break;
        }
        this.selectedIndex = next;
        this.updateSelection();
    }

    updateSelection() {
        this.items.forEach((item, i) => {
            if (i === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    select() {
        const item = this.items[this.selectedIndex];
        if (!item) return;
        if (item.classList.contains('locked')) return;

        // Sliders don't have a "select" action — they're adjusted with L/R
        if (item.getAttribute('data-control') === 'slider') return;

        this.playSelect();

        const mode = item.getAttribute('data-mode');

        switch (mode) {
            case 'campaign':
                this.startGame('campaign');
                break;
            case 'coop':
                this.startGame('coop');
                break;
            case 'challenges':
                this.showScreen('challengeselect');
                this.populateChallengeList();
                break;
            case 'achievements':
                this.showScreen('achievements');
                this.populateAchievements();
                break;
            case 'highscores':
                this.showScreen('highscores');
                this.populateHighscores('campaign');
                break;
            case 'startmission':
                const missionId = parseInt(item.getAttribute('data-mission'));
                if (missionId) this.startGame('challenge', { missionId });
                break;
            case 'wave':
                this.startGame('wave');
                break;
            case 'hangar':
                this.showScreen('hangar');
                break;
            case 'worlds':
                this.showScreen('worlds');
                this.populateWorldsList();
                break;
            case 'selectworld':
                if (typeof Worlds !== 'undefined') {
                    const worldId = item.getAttribute('data-world');
                    Worlds.setSelectedId(worldId);
                    const keepIdx = this.selectedIndex;
                    this.populateWorldsList();
                    this.selectedIndex = keepIdx;
                    this.updateSelection();
                }
                break;
            case 'equip':
                if (window.hangar) window.hangar.equipCurrent();
                break;
            case 'howtoplay':
                this.showScreen('howtoplay');
                break;
            case 'settings':
                this.showScreen('settings');
                this.initSoundSliders();
                break;
            case 'remap':
                this.showScreen('remap');
                break;
            case 'remapkb':
                this.showScreen('remapkb');
                this._initKbRemapScreen('keyboard1');
                break;
            case 'resetkb':
                if (typeof KeyboardBindings !== 'undefined') {
                    KeyboardBindings.reset(this._kbRemapSlot || 'keyboard1');
                    this._initKbRemapScreen(this._kbRemapSlot || 'keyboard1');
                }
                break;
            case 'reset':
                this.resetCurrentBindings();
                break;
            case 'fullscreen':
                if (window.gameInstance) window.gameInstance.toggleFullscreen();
                break;
            case 'back':
                if (this.currentScreen === 'remap') this.showScreen('settings');
                else if (this.currentScreen === 'remapkb') this.showScreen('settings');
                else if (this.currentScreen === 'hangar' && this._hangarLaunching) {
                    // Launch already in progress — ignore
                } else if (this.currentScreen === 'hangar' && window.hangar && window.hangar.playLaunchSequence) {
                    this._hangarLaunching = true;
                    window.hangar.playLaunchSequence(() => {
                        this._hangarLaunching = false;
                        this.showScreen('main');
                    });
                } else {
                    this.showScreen('main');
                }
                break;
        }

        // Remap row click → start capture
        if (item.classList.contains('remap-row')) {
            this.startBindingCapture(item.getAttribute('data-action'));
        }
    }

    showScreen(screen) {
        // Launch sequence is handled by the back/escape/gamepad handlers
        // in select(). showScreen just does the screen swap.
        document.getElementById('mainMenu').style.display = screen === 'main' ? 'flex' : 'none';
        document.getElementById('settingsScreen').style.display = screen === 'settings' ? 'flex' : 'none';
        const remapEl = document.getElementById('remapScreen');
        if (remapEl) remapEl.style.display = screen === 'remap' ? 'flex' : 'none';
        const howEl = document.getElementById('howToPlayScreen');
        if (howEl) howEl.style.display = screen === 'howtoplay' ? 'flex' : 'none';
        const hangarEl = document.getElementById('hangarScreen');
        if (hangarEl) hangarEl.style.display = screen === 'hangar' ? 'flex' : 'none';
        const worldsEl = document.getElementById('worldsScreen');
        if (worldsEl) worldsEl.style.display = screen === 'worlds' ? 'flex' : 'none';
        const challengeEl = document.getElementById('challengeSelectScreen');
        if (challengeEl) challengeEl.style.display = screen === 'challengeselect' ? 'flex' : 'none';
        const achieveEl = document.getElementById('achievementsScreen');
        if (achieveEl) achieveEl.style.display = screen === 'achievements' ? 'flex' : 'none';
        const hsEl = document.getElementById('highscoresScreen');
        if (hsEl) hsEl.style.display = screen === 'highscores' ? 'flex' : 'none';
        const kbRemapEl = document.getElementById('remapKbScreen');
        if (kbRemapEl) kbRemapEl.style.display = screen === 'remapkb' ? 'flex' : 'none';

        // Hangar lifecycle: only render its preview while visible
        if (window.hangar) {
            if (screen === 'hangar') {
                window.hangar.show();
                this._initHangarBrowseButtons();
            }
            else window.hangar.hide();
        }

        this.currentScreen = screen;
        this.selectedIndex = 0;
        this.refreshItems();
        if (screen === 'settings') this.initSoundSliders();
        if (screen === 'remap') this.initRemapScreen();

        // Screen change sound
        if (screen !== 'main') this.playNav();

        // Screen fade-in transition
        const screenIds = {
            main: 'mainMenu', settings: 'settingsScreen', hangar: 'hangarScreen',
            worlds: 'worldsScreen', challengeselect: 'challengeSelectScreen',
            achievements: 'achievementsScreen', highscores: 'highscoresScreen',
            howtoplay: 'howToPlayScreen', remap: 'remapScreen', remapkb: 'remapKbScreen'
        };
        const activeEl = document.getElementById(screenIds[screen]);
        if (activeEl) {
            activeEl.classList.remove('screen-transition');
            void activeEl.offsetWidth;
            activeEl.classList.add('screen-transition');
        }

        // Stagger fade-in on menu items
        this._animateMenuItems();
    }

    _animateMenuItems() {
        for (let i = 0; i < this.items.length; i++) {
            const el = this.items[i];
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = `menu-fade-in 0.35s ease-out ${i * 0.04}s both`;
        }
    }

    // Inject floating star particles into all menu screens (once)
    _ensureMenuStars() {
        if (this._starsInjected) return;
        this._starsInjected = true;
        const screens = [
            'mainMenu', 'settingsScreen', 'worldsScreen',
            'challengeSelectScreen', 'achievementsScreen', 'highscoresScreen'
        ];
        for (const id of screens) {
            const el = document.getElementById(id);
            if (!el) continue;
            // Don't duplicate
            if (el.querySelector('.menu-stars')) continue;
            const container = document.createElement('div');
            container.className = 'menu-stars';
            const count = 25;
            for (let i = 0; i < count; i++) {
                const star = document.createElement('span');
                star.style.left = Math.random() * 100 + '%';
                star.style.animationDuration = (12 + Math.random() * 20) + 's';
                star.style.animationDelay = (Math.random() * 15) + 's';
                // Vary size and brightness
                const size = 1 + Math.random() * 2;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                star.style.opacity = (0.2 + Math.random() * 0.5).toString();
                // Some stars are warm colored
                if (Math.random() < 0.2) {
                    star.style.background = 'rgba(255,170,68,0.5)';
                    star.style.boxShadow = '0 0 4px rgba(255,170,68,0.3)';
                }
                container.appendChild(star);
            }
            el.insertBefore(container, el.firstChild);
        }
    }

    _cycleKbRemapTab(dir) {
        const slots = ['keyboard1', 'keyboard2'];
        const current = slots.indexOf(this._kbRemapSlot || 'keyboard1');
        const next = (current + dir + slots.length) % slots.length;
        this._initKbRemapScreen(slots[next]);
        this.playNav();
    }

    _initKbRemapScreen(slot) {
        if (typeof KeyboardBindings === 'undefined') return;
        this._kbRemapSlot = slot;

        // Tabs
        const tabsEl = document.getElementById('kbRemapTabs');
        if (tabsEl) {
            tabsEl.innerHTML = '';
            for (const s of ['keyboard1', 'keyboard2']) {
                const tab = document.createElement('div');
                tab.className = `hs-tab${s === slot ? ' active' : ''}`;
                tab.textContent = s === 'keyboard1' ? 'PLAYER 1' : 'PLAYER 2';
                tab.style.cursor = 'pointer';
                tab.addEventListener('click', () => this._initKbRemapScreen(s));
                tabsEl.appendChild(tab);
            }
        }

        // Action rows
        const listEl = document.getElementById('kbRemapList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const bindings = KeyboardBindings.get(slot);
        for (const action of KeyboardBindings.ACTIONS) {
            const codes = bindings[action] || [];
            const row = document.createElement('div');
            row.className = 'menu-item';
            row.setAttribute('tabindex', '0');
            row.setAttribute('data-kbaction', action);
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
            const keyStr = codes.map(c => KeyboardBindings.getKeyName(c)).join(' / ');
            row.innerHTML = `
                <span class="menu-item-label" style="font-size:9px;">${KeyboardBindings.LABELS[action]}</span>
                <span style="font-size:9px; color:#ffcc00; letter-spacing:2px; min-width:80px; text-align:right;">${keyStr}</span>
            `;
            row.addEventListener('click', () => this._startKbCapture(slot, action));
            row.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._startKbCapture(slot, action);
            });
            listEl.appendChild(row);
        }
        this.refreshItems();
    }

    _startKbCapture(slot, action) {
        const overlay = document.getElementById('kbRemapCapture');
        const actionLabel = document.getElementById('kbRemapAction');
        if (!overlay) return;
        overlay.style.display = 'flex';
        if (actionLabel) actionLabel.textContent = KeyboardBindings.LABELS[action];

        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener('keydown', handler, true);

            if (e.code === 'Escape') {
                overlay.style.display = 'none';
                return;
            }

            // Save the new binding
            const bindings = KeyboardBindings.get(slot);
            bindings[action] = [e.code];
            KeyboardBindings.save(slot, bindings);
            overlay.style.display = 'none';
            this._initKbRemapScreen(slot);
        };
        document.addEventListener('keydown', handler, true);
    }

    _initHangarBrowseButtons() {
        if (this._hangarBrowseBound) return;
        this._hangarBrowseBound = true;
        const prev = document.getElementById('hangarPrev');
        const next = document.getElementById('hangarNext');
        if (prev) {
            prev.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (window.hangar) window.hangar.browse(-1);
            }, { passive: false });
            prev.addEventListener('click', () => {
                if (window.hangar) window.hangar.browse(-1);
            });
        }
        if (next) {
            next.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (window.hangar) window.hangar.browse(1);
            }, { passive: false });
            next.addEventListener('click', () => {
                if (window.hangar) window.hangar.browse(1);
            });
        }
    }

    populateChallengeList() {
        const container = document.getElementById('challengeList');
        if (!container || typeof MISSIONS === 'undefined') return;
        container.innerHTML = '';

        const typeIcons = { destroy: '💥', survive: '🛡', hunt: '🎯', restricted: '🔒', score: '⭐', boss: '👑', combo: '🔥' };
        const diffLabels = { 1: 'INTRO', 2: 'MEDIUM', 3: 'HARD', 4: 'VERY HARD', 5: 'NIGHTMARE' };
        const diffColors = { 1: '#00ff88', 2: '#44ddbb', 3: '#ffaa44', 4: '#ff6644', 5: '#ff2244' };

        // Group by difficulty
        const groups = {};
        for (const m of MISSIONS) {
            if (!groups[m.difficulty]) groups[m.difficulty] = [];
            groups[m.difficulty].push(m);
        }

        for (const diff of Object.keys(groups).sort((a, b) => a - b)) {
            const missions = groups[diff];
            const groupCompleted = missions.filter(m =>
                (typeof ChallengeProgress !== 'undefined') && ChallengeProgress.get(m.id).completed
            ).length;

            // Section header
            const header = document.createElement('div');
            header.className = 'trophy-section-header';
            header.style.color = diffColors[diff] || '#00ffff';
            header.style.borderColor = (diffColors[diff] || '#00ffff') + '55';
            header.textContent = `${diffLabels[diff] || 'TIER ' + diff} — ${groupCompleted} / ${missions.length}`;
            container.appendChild(header);

            // Cards grid
            const cards = document.createElement('div');
            cards.className = 'trophy-cards';
            for (let idx = 0; idx < missions.length; idx++) {
                const m = missions[idx];
                const globalIdx = MISSIONS.indexOf(m);
                const prog = (typeof ChallengeProgress !== 'undefined') ? ChallengeProgress.get(m.id) : {};
                const done = prog.completed;
                const prevDone = globalIdx === 0 || ((typeof ChallengeProgress !== 'undefined') && ChallengeProgress.get(MISSIONS[globalIdx - 1].id).completed);
                const unlocked = done || prevDone;

                const card = document.createElement('div');
                card.className = `trophy-card menu-item ${unlocked ? (done ? 'unlocked' : 'unlocked') : 'locked'}`;
                if (unlocked) {
                    card.setAttribute('data-mode', 'startmission');
                    card.setAttribute('data-mission', m.id);
                }
                card.setAttribute('tabindex', '0');
                const icon = unlocked ? (typeIcons[m.type] || '●') : '🔒';
                const best = prog.best > 0 ? `BEST ${prog.best.toLocaleString()}` : '';
                card.innerHTML = `
                    <div class="mission-card-number">${m.id} ${icon}</div>
                    <div class="trophy-card-name">${m.title}</div>
                    <div class="trophy-card-desc">${unlocked ? m.description : '???'}</div>
                    <div style="font-size:7px; letter-spacing:1px; color:rgba(0,255,255,0.4); margin-top:auto;">
                        ${done ? '<span style="color:#00ff88;">✓ CLEAR</span> ' : ''}${best}
                    </div>
                `;
                cards.appendChild(card);
            }
            container.appendChild(cards);
        }

        // Back button
        const back = document.createElement('div');
        back.className = 'menu-item';
        back.setAttribute('data-mode', 'back');
        back.setAttribute('tabindex', '0');
        back.innerHTML = `
            <span class="menu-item-icon">◀</span>
            <span class="menu-item-label">BACK</span>
            <span class="menu-item-desc"></span>
        `;
        container.appendChild(back);
        this.refreshItems();
    }

    populateAchievements() {
        const grid = document.getElementById('trophyGrid');
        const progressEl = document.getElementById('trophyProgress');
        if (!grid || typeof Achievements === 'undefined' || typeof TROPHIES === 'undefined') return;

        const all = Achievements.getAll();
        const unlocked = all.filter(t => t.unlocked).length;
        if (progressEl) progressEl.textContent = `${unlocked} / ${TROPHIES.length} trophies unlocked`;

        const menuInfo = document.getElementById('menuTrophyInfo');
        if (menuInfo) menuInfo.textContent = `${unlocked} / ${TROPHIES.length}`;

        grid.innerHTML = '';
        const tiers = [
            { key: 'bronze',   label: 'BRONZE',   count: 15 },
            { key: 'silver',   label: 'SILVER',   count: 10 },
            { key: 'gold',     label: 'GOLD',     count: 5 },
            { key: 'platinum', label: 'PLATINUM', count: 1 }
        ];
        for (const tier of tiers) {
            const tierTrophies = all.filter(t => t.tier === tier.key);
            if (tierTrophies.length === 0) continue;
            const tierUnlocked = tierTrophies.filter(t => t.unlocked).length;

            // Section header
            const header = document.createElement('div');
            header.className = `trophy-section-header ${tier.key}`;
            header.textContent = `${tier.label} — ${tierUnlocked} / ${tierTrophies.length}`;
            grid.appendChild(header);

            // Cards container
            const cards = document.createElement('div');
            cards.className = 'trophy-cards';
            for (const t of tierTrophies) {
                const card = document.createElement('div');
                card.className = `trophy-card menu-item ${t.unlocked ? 'unlocked' : 'trophy-locked'}`;
                card.setAttribute('tabindex', '0');
                card.innerHTML = `
                    <div class="trophy-card-header">
                        <span class="trophy-card-icon">${t.icon}</span>
                        <span class="trophy-card-name">${t.name}</span>
                    </div>
                    <div class="trophy-card-desc">${t.unlocked ? t.desc : '???'}</div>
                    <div class="trophy-card-tier ${t.tier}">${t.tier.toUpperCase()}</div>
                `;
                cards.appendChild(card);
            }
            grid.appendChild(cards);
        }
        this.refreshItems();
    }

    populateHighscores(activeMode) {
        this._hsActiveMode = activeMode;
        const tabsEl = document.getElementById('highscoreTabs');
        const listEl = document.getElementById('highscoreList');
        if (!tabsEl || !listEl || typeof Highscores === 'undefined') return;

        const modes = [
            { key: 'campaign', label: 'CAMPAIGN' },
            { key: 'coop', label: 'CO-OP' },
            { key: 'challenge', label: 'CHALLENGES' }
        ];

        // Tabs
        tabsEl.innerHTML = '';
        for (const m of modes) {
            const tab = document.createElement('div');
            tab.className = `hs-tab${m.key === activeMode ? ' active' : ''}`;
            tab.textContent = m.label;
            tab.addEventListener('click', () => this.populateHighscores(m.key));
            tabsEl.appendChild(tab);
        }

        // List
        const entries = Highscores.getList(activeMode);
        listEl.innerHTML = '';

        if (entries.length === 0) {
            listEl.innerHTML = '<div class="hs-empty">NO SCORES YET</div>';
            this.refreshItems();
            return;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'hs-row header';
        header.innerHTML = `
            <span class="hs-rank">#</span>
            <span>SCORE</span>
            <span>TIME</span>
            <span>COMBO</span>
        `;
        listEl.appendChild(header);

        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const row = document.createElement('div');
            row.className = 'hs-row';
            const stats = e.stats || {};
            const timeStr = stats.time != null
                ? (stats.time >= 60 ? `${Math.floor(stats.time / 60)}m ${stats.time % 60}s` : `${stats.time}s`)
                : '—';
            const comboStr = stats.maxCombo != null ? `x${stats.maxCombo}` : '—';
            row.innerHTML = `
                <span class="hs-rank">${i + 1}</span>
                <span class="hs-score">${e.score.toLocaleString()}</span>
                <span class="hs-stats">${timeStr}</span>
                <span class="hs-stats">${comboStr}</span>
            `;
            listEl.appendChild(row);
        }
        this.refreshItems();
    }

    _cycleHighscoreTab(dir) {
        const modes = ['campaign', 'coop', 'challenge'];
        const currentIdx = modes.indexOf(this._hsActiveMode || 'campaign');
        const nextIdx = (currentIdx + dir + modes.length) % modes.length;
        this._hsActiveMode = modes[nextIdx];
        this.populateHighscores(modes[nextIdx]);
        this.playNav();
    }

    populateWorldsList() {
        const container = document.getElementById('worldsList');
        if (!container || typeof Worlds === 'undefined') return;
        const worlds = Worlds.getAll();
        const selectedId = Worlds.getSelectedId();
        container.innerHTML = '';
        for (const w of worlds) {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.setAttribute('data-mode', 'selectworld');
            div.setAttribute('data-world', w.id);
            div.setAttribute('tabindex', '0');
            const isSelected = w.id === selectedId;
            div.innerHTML = `
                <span class="menu-item-icon" style="color:${isSelected ? '#ffcc00' : ''};">${isSelected ? '&#9733;' : '&#9734;'}</span>
                <span class="menu-item-label">${w.name}</span>
                <span class="menu-item-desc" style="min-width:80px; text-align:right;">${isSelected ? 'SELECTED' : w.description}</span>
            `;
            container.appendChild(div);
        }
        // Add back button
        const back = document.createElement('div');
        back.className = 'menu-item';
        back.setAttribute('data-mode', 'back');
        back.setAttribute('tabindex', '0');
        back.innerHTML = `
            <span class="menu-item-icon">&#9664;</span>
            <span class="menu-item-label">BACK</span>
            <span class="menu-item-desc"></span>
        `;
        container.appendChild(back);
        this.refreshItems();
    }

    initRemapScreen() {
        // Detect connected gamepad to label/store bindings against
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) { if (g) { gp = g; break; } }
        const nameEl = document.getElementById('remapControllerName');
        if (nameEl) {
            nameEl.textContent = gp ? gp.id : 'No gamepad detected — connect one to remap';
            nameEl.style.color = gp ? 'rgba(0,255,0,0.6)' : 'rgba(255,100,100,0.6)';
        }
        this._remapGpId = gp ? gp.id : null;
        this._capturingAction = null;

        this.renderRemapList();
        this.refreshItems();
    }

    renderRemapList() {
        const list = document.getElementById('remapList');
        if (!list) return;
        list.innerHTML = '';

        if (!this._remapGpId) return;

        const bindings = GamepadBindings.getBindings(this._remapGpId);
        for (const action of GamepadBindings.REMAPPABLE) {
            const row = document.createElement('div');
            row.className = 'remap-row';
            row.setAttribute('tabindex', '0');
            row.setAttribute('data-action', action);

            const label = document.createElement('span');
            label.className = 'remap-action-label';
            label.textContent = GamepadBindings.LABELS[action] || action;
            row.appendChild(label);

            const bindingList = document.createElement('span');
            bindingList.className = 'remap-binding-list';
            const inputs = bindings[action] || [];
            bindingList.textContent = inputs.length > 0
                ? inputs.map(i => GamepadBindings.inputLabel(i)).join(' / ')
                : '—';
            row.appendChild(bindingList);

            list.appendChild(row);
        }
    }

    startBindingCapture(action) {
        if (!this._remapGpId) return;
        this._capturingAction = action;

        const promptEl = document.getElementById('remapPrompt');
        if (promptEl) promptEl.textContent = `PRESS A BUTTON FOR ${(GamepadBindings.LABELS[action] || action).toUpperCase()}…`;

        // Highlight the row
        for (const row of document.querySelectorAll('.remap-row')) {
            row.classList.toggle('capturing', row.getAttribute('data-action') === action);
        }

        // Snapshot currently held inputs so the press that opened the capture
        // (e.g. A on the menu) doesn't get bound by accident.
        this._captureIgnoreButtons = new Set();
        this._captureIgnoreAxes = new Set();
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;
            for (let i = 0; i < gp.buttons.length; i++) {
                if (gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3)) {
                    this._captureIgnoreButtons.add(i);
                }
            }
            for (let i = 0; i < gp.axes.length; i++) {
                if (Math.abs(gp.axes[i]) > 0.3) this._captureIgnoreAxes.add(i);
            }
            break;
        }
    }

    cancelBindingCapture() {
        this._capturingAction = null;
        const promptEl = document.getElementById('remapPrompt');
        if (promptEl) promptEl.textContent = '';
        for (const row of document.querySelectorAll('.remap-row')) {
            row.classList.remove('capturing');
        }
    }

    resetCurrentBindings() {
        if (!this._remapGpId) return;
        GamepadBindings.resetBindings(this._remapGpId);
        this.renderRemapList();
        this.refreshItems();
        const promptEl = document.getElementById('remapPrompt');
        if (promptEl) promptEl.textContent = 'BINDINGS RESET TO DEFAULTS';
        setTimeout(() => {
            if (promptEl && promptEl.textContent === 'BINDINGS RESET TO DEFAULTS') promptEl.textContent = '';
        }, 1200);
    }

    flashControllerInput(input) {
        if (!input) return;
        const key = input.type === 'button' ? `button-${input.index}` : `axis-${input.index}`;
        const el = document.querySelector(`.remap-controller [data-input="${key}"]`);
        if (el) {
            el.classList.remove('pulse');
            void el.offsetWidth;
            el.classList.add('pulse');
        }
    }

    initSoundSliders() {
        const audio = window.game && window.game.audio;
        if (!audio) return;

        const musicSlider = document.getElementById('musicSlider');
        const sfxSlider = document.getElementById('sfxSlider');
        const musicValue = document.getElementById('musicSliderValue');
        const sfxValue = document.getElementById('sfxSliderValue');

        if (musicSlider && !musicSlider._wired) {
            musicSlider.value = Math.round((audio.musicVolume || 1) * 100);
            if (musicValue) musicValue.textContent = musicSlider.value;
            musicSlider.addEventListener('input', () => {
                const v = parseInt(musicSlider.value, 10) / 100;
                audio.setMusicVolume(v);
                if (musicValue) musicValue.textContent = musicSlider.value;
            });
            musicSlider._wired = true;
        }

        if (sfxSlider && !sfxSlider._wired) {
            sfxSlider.value = Math.round((audio.sfxVolume || 1) * 100);
            if (sfxValue) sfxValue.textContent = sfxSlider.value;
            sfxSlider.addEventListener('input', () => {
                const v = parseInt(sfxSlider.value, 10) / 100;
                audio.setSfxVolume(v);
                if (sfxValue) sfxValue.textContent = sfxSlider.value;

                // Play a test sound so the user can hear the change
                if (audio.playMenuNavigate) audio.playMenuNavigate();
            });
            sfxSlider._wired = true;
        }
    }

    startGame(mode, extraOpts = {}) {
        this.active = false;
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('settingsScreen').style.display = 'none';
        const challengeEl = document.getElementById('challengeSelectScreen');
        if (challengeEl) challengeEl.style.display = 'none';

        // Hide loading message
        const loadMsg = document.getElementById('loadingMessage');
        if (loadMsg) loadMsg.style.display = 'none';

        // Kill any pending menu music listeners so they can't fire after game starts
        this._removeMenuMusicListeners();

        // Switch to mode-appropriate music — challenge has its own track
        if (window.game && window.game.audio) {
            const track = mode === 'challenge' ? 'challenge_theme' : 'gameplay_theme';
            window.game.audio.playMusic(track);
        }

        // Start the game
        if (window.gameInstance) {
            const opts = { coop: mode === 'coop', ...extraOpts };
            window.gameInstance.startMode(mode, opts);
        }
    }
}
