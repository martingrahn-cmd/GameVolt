// Main game class
class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.player = null;
        this.waves = null;
        this.ui = null;
        this.particles = null;
        this.audio = null;
        
        this.gameActive = true;
        this.deltaTime = 0;
        this.lastTime = 0;
        
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 0;
    }
    
    init() {
        // Load persisted settings before any system reads them
        if (typeof Settings !== 'undefined') Settings.load();

        // Initialize audio first
        this.audio = new AudioManager();
        this.audio.init();
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = this.createNebulaBackground();
        this.scene.fog = new THREE.Fog(0x0a0a1a, 200, 300);
        
        // Camera - top-down orthographic
        const width = window.innerWidth;
        const height = window.innerHeight;
        const frustumSize = 150;
        
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * width / height / 2,
            frustumSize * width / height / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        this.camera.position.set(0, 60, 0);
        this.camera.lookAt(0, 0, 0);

        // Track frustum + lazy-follow state for the responsive camera
        this._frustumBase = frustumSize;
        this._frustumCurrent = frustumSize;
        this._camFollowX = 0;
        this._camFollowZ = 0;
        // Damage-cam roll — set by triggerPlayerHitFeedback, decays each frame
        this._camTiltAmount = 0;

        // BOUNDS uses an enlarged frustum so wrap-around always happens off
        // screen even when the combat zoom-out kicks in (camera shows up to
        // ~+15% wider than base; bounds get a 25-unit margin on top of that).
        const boundsFrustum = frustumSize + 25;
        BOUNDS.updateFromCamera({
            left:  -boundsFrustum * width / height / 2,
            right:  boundsFrustum * width / height / 2,
            top:    boundsFrustum / 2,
            bottom: -boundsFrustum / 2
        });
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // Cap pixel ratio so Retina/4K screens don't render at 2× backing
        // resolution. 1.5 keeps things crisp without paying full DPR cost.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.3;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Post-processing pipeline with bloom
        this.composer = new THREE.EffectComposer(this.renderer);
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom at half resolution — visually identical for our pixel-soft
        // glow style, ~4× cheaper than full-res. Big perf win on Retina.
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(Math.floor(width / 2), Math.floor(height / 2)),
            0.8,   // strength
            0.4,   // radius
            0.6    // threshold (only bright objects bloom, not nebula bg)
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // Chromatic aberration shader pass — radial RGB split, gentle baseline
        // that ramps up briefly during heavy screen shake (player damage,
        // bombs, boss hits). Adds a subtle CRT/lens character.
        const chromaticShader = {
            uniforms: {
                tDiffuse: { value: null },
                amount:   { value: 0.0009 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                varying vec2 vUv;
                void main() {
                    vec2 dir = vUv - 0.5;
                    vec2 offset = dir * amount;
                    float r = texture2D(tDiffuse, vUv - offset).r;
                    vec4 g = texture2D(tDiffuse, vUv);
                    float b = texture2D(tDiffuse, vUv + offset).b;
                    gl_FragColor = vec4(r, g.g, b, g.a);
                }
            `
        };
        const chromaticPass = new THREE.ShaderPass(chromaticShader);
        this.composer.addPass(chromaticPass);
        this.chromaticPass = chromaticPass;

        // Color-grade shader pass — applies a per-world tint multiply with
        // a strength dial. Defaults to identity (no shift) so rounds without
        // a configured tint still look exactly as before.
        const gradeShader = {
            uniforms: {
                tDiffuse: { value: null },
                tint:     { value: new THREE.Color(1, 1, 1) },
                strength: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec3 tint;
                uniform float strength;
                varying vec2 vUv;
                void main() {
                    vec4 c = texture2D(tDiffuse, vUv);
                    vec3 graded = c.rgb * tint;
                    gl_FragColor = vec4(mix(c.rgb, graded, strength), c.a);
                }
            `
        };
        const gradePass = new THREE.ShaderPass(gradeShader);
        this.composer.addPass(gradePass);
        this.gradePass = gradePass;

        // Radial speed blur — pixels stretch outward from screen center,
        // intensity driven by player speed. Creates a "hyperspace" feel
        // without needing per-streak geometry.
        const speedBlurShader = {
            uniforms: {
                tDiffuse: { value: null },
                strength: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float strength;
                varying vec2 vUv;
                void main() {
                    if (strength < 0.001) {
                        gl_FragColor = texture2D(tDiffuse, vUv);
                        return;
                    }
                    vec2 center = vec2(0.5, 0.5);
                    vec2 dir = (vUv - center) * strength;
                    vec3 col = vec3(0.0);
                    const int SAMPLES = 6;
                    for (int i = 0; i < SAMPLES; i++) {
                        float t = float(i) / float(SAMPLES - 1);
                        col += texture2D(tDiffuse, vUv - dir * t).rgb;
                    }
                    gl_FragColor = vec4(col / float(SAMPLES), 1.0);
                }
            `
        };
        const speedBlurPass = new THREE.ShaderPass(speedBlurShader);
        this.composer.addPass(speedBlurPass);
        this.speedBlurPass = speedBlurPass;
        
        // Add background stars (doesn't need player)
        this.setupBackground();
        
        // Ground plane (invisible, only receives shadows)
        const groundGeom = new THREE.PlaneGeometry(400, 400);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Make game globally available BEFORE building the background — its
        // constructor calls buildRandom() which pushes a per-world color
        // grade into window.game, and we need the reference set first.
        window.game = this;
        window.gameInstance = this;

        // Background planets / moons (built once, randomized per game start)
        if (typeof Background !== 'undefined') {
            this.background = new Background(this.scene);
        }

        // Game objects - CREATE PLAYER FIRST
        this.particles = new ParticleSystem(this.scene);
        this.powerupManager = new PowerUpManager(this.scene);
        this.ufoManager = new UFOManager(this.scene);

        // Players array — index 0 is P1, index 1 is P2 (only present in co-op).
        // `this.player` remains as a convenience alias for P1 so existing code
        // that references it doesn't break.
        this.players = [];
        this.player = new Player(this.scene, { slot: 0, inputScheme: 'auto' });
        this.scene.add(this.player.mesh);
        this.player.scene = this.scene;
        this.players.push(this.player);

        this.player.mesh.visible = false; // hidden until gameplay starts
        this.coopMode = false; // toggled in startMode
        
        // NOW setup lighting (needs player to exist)
        this.setupLighting();
        
        this.ui = new UI();

        // Input handling
        this.setupInput();
        this.setupGameOverTouch();

        // Don't start game loop yet — wait for menu selection
        this.gameActive = false;
        this.gameMode = null;

        // Hit feedback — brief world freeze on player damage
        this.hitLagTimer = 0;

        // Build the hangar preview (its own Three.js scene + canvas) so it's
        // ready to render the moment the player opens the hangar screen.
        if (typeof Hangar !== 'undefined') {
            window.hangar = new Hangar();
        }

        // Mobile touch controls
        if (typeof TouchControls !== 'undefined' && typeof isTouchDevice === 'function' && isTouchDevice()) {
            this.touchControls = new TouchControls();
            document.body.classList.add('touch-device');
        }

        // Start attract mode (animated menu background)
        this.startAttractMode();

        // Debug: ?mission=N in URL jumps straight to that challenge
        const urlMission = new URLSearchParams(window.location.search).get('mission');
        if (urlMission) {
            const id = parseInt(urlMission, 10);
            if (id > 0) {
                console.log(`[DEBUG] Jumping to mission ${id}`);
                setTimeout(() => this.startMode('challenge', { missionId: id }), 500);
            }
        }

        // Console helper: game.testMission(15) to jump to any mission
        window.testMission = (id) => {
            this.resetAndStartMode('challenge', { missionId: id });
        };
    }

    startMode(mode, options = {}) {
        this.stopAttractMode();
        if (this.player) this.player.mesh.visible = true;
        this.gameMode = mode;
        this.gameActive = true;
        this.coopMode = !!options.coop || mode === 'coop';

        // Reload the ship model so any hangar changes are picked up.
        if (this.player) this.player.reloadShipModel();

        // Track ship usage for achievements
        if (typeof Achievements !== 'undefined' && typeof Ships !== 'undefined') {
            const ship = Ships.getEquipped();
            if (ship) Achievements.addShipUsed(ship.id);
        }

        // Restart play-time tracker for new run
        if (typeof GameVoltTracker !== 'undefined') {
            GameVoltTracker.start('AsteroidStorm');
        }

        // Show touch controls on mobile
        if (this.touchControls) this.touchControls.show();

        // Re-randomize the background so each run gets a fresh planet
        if (this.background) this.background.buildRandom();

        // Initialize wave system
        this.waves = new WaveManager();
        this.waves.scene_ref = this.scene;
        this.waves.spawnWave(this.scene);

        // Challenge mode — create manager and apply mission modifiers
        this.challengeManager = null;
        if (mode === 'challenge' && options.missionId && typeof ChallengeManager !== 'undefined') {
            this.challengeManager = new ChallengeManager(options.missionId);
            this.challengeManager.start(this);
            this._currentMissionId = options.missionId;
            const objEl = document.getElementById('hudObjective');
            if (objEl) objEl.style.display = '';

            // Show mission intro splash (name + description + 3-2-1)
            // unless we're already in a seamless transition
            if (!this._missionTransitioning) {
                this._showMissionIntro(this.challengeManager.mission);
            }
        } else {
            const objEl = document.getElementById('hudObjective');
            if (objEl) objEl.style.display = 'none';
        }

        // Spawn or remove P2 based on coop mode
        this.setupCoopPlayer();

        // Show HUD elements
        document.querySelectorAll('.cockpit-corner, .edge-bar, #hudTop, #hudBottomLeft, #hudBottomRight, #hudLeftDeco, #hudRightDeco, #scanlines, #vignette, #crtFlicker').forEach(
            el => el.style.display = ''
        );

        // Show/hide P2 HUD
        const p2hud = document.getElementById('hudP2');
        if (p2hud) p2hud.style.display = this.coopMode ? 'flex' : 'none';
        const p2brHud = document.getElementById('hudBottomRightP2');
        if (p2brHud) p2brHud.style.display = this.coopMode ? 'block' : 'none';

        // Start loop (guarded — gameLoop reschedules itself, so avoid double-starting)
        this.lastTime = Date.now();
        if (!this._loopStarted) {
            this._loopStarted = true;
            this.gameLoop();
        }

        // Show pre-game splash on first run of this mode (per browser)
        this.maybeShowSplash(mode);
    }

    maybeShowSplash(mode) {
        const splash = document.getElementById('preGameSplash');
        if (!splash) return;

        const seenKey = `astroidStorm.splashSeen.${mode}`;
        let seen = false;
        try { seen = !!localStorage.getItem(seenKey); } catch (e) {}
        if (seen) return;

        // Build splash content based on mode
        const titleEl = document.getElementById('splashTitle');
        const contentEl = document.getElementById('splashContent');
        if (!titleEl || !contentEl) return;

        const titles = {
            campaign: 'CAMPAIGN',
            coop: 'CO-OP CAMPAIGN',
            challenges: 'CHALLENGES',
            wave: 'WAVE ASSAULT'
        };
        titleEl.textContent = titles[mode] || mode.toUpperCase();

        const isCoop = this.coopMode;
        let html = '';
        html += `<div class="splash-row">`;
        html += `<span class="splash-key">&larr;&rarr;</span> ROTATE &nbsp; `;
        html += `<span class="splash-key">&uarr;</span> THRUST &nbsp; `;
        html += `<span class="splash-key">&darr;</span> BRAKE</div>`;
        html += `<div class="splash-row">`;
        html += `<span class="splash-key">SPACE</span> SHOOT &nbsp; `;
        html += `<span class="splash-key">SHIFT</span> WARP</div>`;
        html += `<div class="splash-row"><span class="splash-key">ESC</span> PAUSE &nbsp; `;
        html += `<span class="splash-key">M</span> MUTE</div>`;
        html += `<div class="splash-row" style="margin-top:14px; opacity:0.7;">— OR USE A GAMEPAD —</div>`;

        if (isCoop) {
            html += `<div class="splash-line" style="margin:14px auto;"></div>`;
            html += `<div class="splash-row p2">`;
            html += `<span class="splash-key">A D</span> ROTATE &nbsp; `;
            html += `<span class="splash-key">W</span> THRUST &nbsp; `;
            html += `<span class="splash-key">Q</span> SHOOT</div>`;
            html += `<div class="splash-row p2"><span class="splash-key">S</span> BRAKE &nbsp; `;
            html += `<span class="splash-key">E</span> WARP</div>`;
            html += `<div class="splash-row p2" style="margin-top:8px; opacity:0.6;">P2 USES WASD OR A SECOND GAMEPAD</div>`;
            html += `<div class="splash-row" style="margin-top:14px; color:rgba(255,200,100,0.8); font-size:7px;">FLY CLOSE TO A DOWNED TEAMMATE TO REVIVE</div>`;
        }

        contentEl.innerHTML = html;
        splash.classList.add('show');
        splash.style.display = 'flex';
        this._splashActive = true;
        try { localStorage.setItem(seenKey, '1'); } catch (e) {}

        // Pause the world while splash is up
        this.gameActive = false;

        // Dismiss handler — any key/click/gamepad button
        const dismiss = () => {
            if (!this._splashActive) return;
            this._splashActive = false;
            splash.classList.remove('show');
            splash.style.display = 'none';
            this.gameActive = true;
            this.lastTime = Date.now(); // avoid huge dt jump
            document.removeEventListener('keydown', dismiss);
            document.removeEventListener('click', dismiss);
        };
        document.addEventListener('keydown', dismiss);
        document.addEventListener('click', dismiss);

        // Also dismiss on any gamepad button — poll briefly
        const pollDismiss = () => {
            if (!this._splashActive) return;
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const gp of gamepads) {
                if (!gp) continue;
                for (const b of gp.buttons) {
                    if (b && b.pressed) { dismiss(); return; }
                }
            }
            requestAnimationFrame(pollDismiss);
        };
        requestAnimationFrame(pollDismiss);

        // Auto-dismiss after 8 seconds in case the player just stares
        setTimeout(() => { if (this._splashActive) dismiss(); }, 8000);
    }

    setupCoopPlayer() {
        // Decide input schemes based on what's connected.
        // P1 prefers gamepad0, falls back to keyboard1 (arrows).
        // P2 prefers gamepad1, falls back to keyboard2 (WASD).
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gpCount = gamepads.filter(g => !!g).length;

        if (this.coopMode) {
            this.player.inputScheme = gpCount >= 1 ? 'gamepad0' : 'keyboard1';

            // Create P2 if not already there
            if (!this.players[1]) {
                const p2 = new Player(this.scene, {
                    slot: 1,
                    inputScheme: gpCount >= 2 ? 'gamepad1' : 'keyboard2'
                });
                p2.scene = this.scene;
                this.scene.add(p2.mesh);
                this.players.push(p2);
            } else {
                this.players[1].inputScheme = gpCount >= 2 ? 'gamepad1' : 'keyboard2';
                this.players[1].permaDead = false;
                this.players[1].isGhost = false;
                this.players[1].mesh.visible = true;
                if (!this.players[1].mesh.parent) this.scene.add(this.players[1].mesh);
                this.players[1].reset();
            }
        } else {
            this.player.inputScheme = 'auto';
            // Fully remove P2 from the scene + the players[] array in singleplayer
            if (this.players[1]) {
                this.players[1].mesh.visible = false;
                if (this.players[1].mesh.parent) this.scene.remove(this.players[1].mesh);
                this.players.length = 1; // drop P2 from the active array
            }
        }
    }

    // ── In-place reset (no page reload) ──
    // Tears down the active run and brings every system back to a fresh state
    // so we can either start a new run or return to the main menu.
    _resetGameState() {
        // Stop all input/active flags
        this.gameActive = false;
        this.paused = false;
        this.hitLagTimer = 0;
        this.shakeIntensity = 0;
        this.keys = {};

        // Hide overlays
        const goScreen = document.getElementById('gameOverScreen');
        if (goScreen) {
            goScreen.classList.remove('show');
            goScreen.classList.remove('locked');
        }
        const pauseScreen = document.getElementById('pauseScreen');
        if (pauseScreen) pauseScreen.style.display = 'none';
        this.gameOverActive = false;
        this.gameOverLockoutTimer = 0;
        this.challengeManager = null;
        this._missionTransitioning = false;
        const mSplash = document.getElementById('missionSplash');
        if (mSplash) mSplash.style.display = 'none';
        const goHeader = document.querySelector('#gameOverScreen h1');
        if (goHeader) {
            goHeader.textContent = 'GAME OVER';
            goHeader.style.color = '';
        }
        const objEl = document.getElementById('hudObjective');
        if (objEl) objEl.style.display = 'none';

        // Tear down gameplay systems
        if (this.waves) {
            this.waves.destroy();
            this.waves = null;
        }
        if (this.ufoManager) this.ufoManager.clear();
        if (this.powerupManager) this.powerupManager.clear();
        if (this.particles) this.particles.clear();

        // Reset all players + UI
        for (const p of this.players) {
            if (p && p.reset) p.reset();
        }
        if (this.ui) this.ui.reset();

        // Stop thrust noise + drone hum
        if (this.audio) {
            this.audio.setThrust(false);
            this.audio.setDroneAmbient(false);
        }

        // Reset death cam + camera state so the next run starts framed
        this._deathCamActive = false;
        this._deathCamTime = 0;
        this._camFollowX = 0;
        this._camFollowZ = 0;
        if (this._frustumBase !== undefined) {
            this._frustumCurrent = this._frustumBase;
        }
    }

    resetAndStartMode(mode) {
        // Capture the current mission id BEFORE _resetGameState nulls the
        // challenge manager so restarting a failed mission re-enters the
        // same one instead of falling back to campaign.
        const missionId = this._currentMissionId;

        this._resetGameState();

        // Restore music to normal volume (gameOver faded it down).
        // Challenge mode uses its own track; everything else uses gameplay.
        const targetTrack = mode === 'challenge' ? 'challenge_theme' : 'gameplay_theme';
        if (this.audio) {
            if (this.audio.currentTrack === targetTrack) {
                this.audio.fadeMusic(0.5, 0.5);
            } else {
                this.audio.playMusic(targetTrack);
            }
        }

        const opts = { coop: mode === 'coop' };
        if (mode === 'challenge' && missionId) opts.missionId = missionId;
        this.startMode(mode, opts);
    }

    resetToMainMenu() {
        this._resetGameState();
        this._currentMissionId = null;

        // Hide touch controls
        if (this.touchControls) this.touchControls.hide();

        // Hide HUD
        document.querySelectorAll('.cockpit-corner, .edge-bar, #hudTop, #hudBottomLeft, #hudBottomRight, #hudLeftDeco, #hudRightDeco, #scanlines, #vignette, #crtFlicker').forEach(
            el => el.style.display = 'none'
        );

        // Switch back to menu music
        if (this.audio) this.audio.playMusic('menu_theme');

        // Show the main menu and (re-)create the menu system so navigation works.
        const mm = document.getElementById('mainMenu');
        if (mm) mm.style.display = 'flex';
        const ss = document.getElementById('settingsScreen');
        if (ss) ss.style.display = 'none';

        if (window.menuSystem) {
            window.menuSystem.active = true;
            window.menuSystem.lockoutUntil = performance.now() + 700;
            window.menuSystem.gpHeldFromBoot = new Set();
            window.menuSystem.showScreen('main');
            if (typeof window.menuSystem.refreshHighScores === 'function') {
                window.menuSystem.refreshHighScores();
            }
        } else {
            window.menuSystem = new MenuSystem();
        }

        // Restart attract mode
        this.startAttractMode();
    }
    
    setupLighting() {
        // Directional light (key light)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight.position.set(30, 60, 30);
        dirLight.target.position.set(0, 0, 0);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        // 1024 is plenty for a top-down arcade — 2048 was overkill.
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);
        this.scene.add(dirLight.target);
        
        // Ambient light
        const ambientLight = new THREE.HemisphereLight(0x2a1044, 0x151525, 1.0);
        this.scene.add(ambientLight);
        
        // Point light on player (cyan)
        this.playerLight = new THREE.PointLight(0x00ffff, 0.5, 60, 2);
        this.playerLight.position.copy(this.player.mesh.position);
        this.scene.add(this.playerLight);
    }
    
    createNebulaBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Base dark space
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, 1024, 1024);

        // Nebula clouds via radial gradients
        const clouds = [
            { x: 300, y: 400, r: 450, color: [50, 100, 200, 0.4] },
            { x: 700, y: 300, r: 400, color: [140, 60, 180, 0.35] },
            { x: 500, y: 700, r: 350, color: [30, 140, 140, 0.3] },
            { x: 200, y: 200, r: 300, color: [180, 80, 50, 0.25] },
            { x: 800, y: 600, r: 350, color: [80, 40, 160, 0.3] },
            { x: 450, y: 500, r: 500, color: [60, 30, 120, 0.2] },
            { x: 150, y: 700, r: 300, color: [100, 60, 160, 0.25] },
        ];
        for (const c of clouds) {
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            grad.addColorStop(0, `rgba(${c.color[0]},${c.color[1]},${c.color[2]},${c.color[3]})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1024, 1024);
        }

        // Stars on the background texture
        for (let i = 0; i < 600; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const brightness = 150 + Math.random() * 105;
            const size = Math.random() < 0.05 ? 2 : Math.random() < 0.2 ? 1.5 : 1;
            ctx.fillStyle = `rgba(${brightness},${brightness},${brightness + 30},${0.5 + Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    setupBackground() {
        // 3D star field for depth
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 500;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 1] = -20 - Math.random() * 80;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
            sizes[i] = 0.2 + Math.random() * 0.8;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.7
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);

        // Wrap-around boundary lines — rebuilt on resize so the rectangle
        // always matches the current camera frustum (otherwise old stale
        // lines appear as cyan stripes inside the play area when the window
        // is enlarged or the display changes).
        const borderMat = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.25
        });
        this.borderLine = new THREE.Line(new THREE.BufferGeometry(), borderMat);
        this.scene.add(this.borderLine);
        this._rebuildBorderLine();

        // Pulsing edge glow bars + warp-direction chevrons.
        // Each cardinal edge gets a solid cyan bar that brightens when the
        // closest player approaches it, and a chevron pointing INWARD on
        // the OPPOSITE edge (the wrap-target) so the player can see where
        // they'll come back from.
        this.edgeBars = [];
        this.edgeChevrons = [];
        for (let i = 0; i < 4; i++) {
            const barMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff, transparent: true, opacity: 0,
                depthWrite: false, blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), barMat);
            bar.rotation.x = -Math.PI / 2;
            bar.position.y = 0.35;
            this.scene.add(bar);
            this.edgeBars.push({ mesh: bar, material: barMat });

            const chevMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff, transparent: true, opacity: 0,
                depthWrite: false, blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const chev = new THREE.Mesh(this._makeChevronGeometry(), chevMat);
            chev.position.y = 0.45;
            this.scene.add(chev);
            this.edgeChevrons.push({ mesh: chev, material: chevMat });
        }
        this._rebuildEdgeGlows();
    }

    _makeChevronGeometry() {
        // V-shaped arrow flat in XZ plane, pointing in +Z (toward play area)
        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
            -2.5, 0, -1.0,    0, 0,  1.5,    2.5, 0, -1.0,
            -2.5, 0, -2.2,    0, 0,  0.3,    2.5, 0, -2.2
        ]);
        const idx = [0, 1, 2, 0, 4, 1, 1, 4, 2, 3, 4, 0, 5, 2, 4];
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    _rebuildEdgeGlows() {
        if (!this.edgeBars) return;
        const b = BOUNDS;
        const w = b.maxX - b.minX;
        const h = b.maxZ - b.minZ;
        const barThickness = 1.2;
        const inset = 0.3;
        // Sides: 0=top (z=minZ), 1=bottom (z=maxZ), 2=left (x=minX), 3=right (x=maxX)
        const sides = [
            { len: w, x: 0,                    z: b.minZ + inset, chevX: 0,  chevZ: b.maxZ - 6, chevRotY: Math.PI },
            { len: w, x: 0,                    z: b.maxZ - inset, chevX: 0,  chevZ: b.minZ + 6, chevRotY: 0 },
            { len: h, x: b.minX + inset,       z: 0,              chevX: b.maxX - 6, chevZ: 0,  chevRotY: Math.PI / 2 },
            { len: h, x: b.maxX - inset,       z: 0,              chevX: b.minX + 6, chevZ: 0,  chevRotY: -Math.PI / 2 }
        ];
        for (let i = 0; i < 4; i++) {
            const cfg = sides[i];
            const bar = this.edgeBars[i];
            bar.mesh.geometry.dispose();
            // Top/bottom edges: bar runs along X. Left/right: along Z.
            const isHoriz = i < 2;
            bar.mesh.geometry = isHoriz
                ? new THREE.PlaneGeometry(cfg.len, barThickness)
                : new THREE.PlaneGeometry(barThickness, cfg.len);
            bar.mesh.position.set(cfg.x, 0.35, cfg.z);

            const chev = this.edgeChevrons[i];
            chev.mesh.position.set(cfg.chevX, 0.45, cfg.chevZ);
            chev.mesh.rotation.y = cfg.chevRotY;
        }
    }

    _rebuildBorderLine() {
        if (!this.borderLine) return;
        const b = BOUNDS;
        const points = [
            new THREE.Vector3(b.minX, 0.5, b.minZ),
            new THREE.Vector3(b.maxX, 0.5, b.minZ),
            new THREE.Vector3(b.maxX, 0.5, b.maxZ),
            new THREE.Vector3(b.minX, 0.5, b.maxZ),
            new THREE.Vector3(b.minX, 0.5, b.minZ),
        ];
        this.borderLine.geometry.dispose();
        this.borderLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    setupInput() {
        this.paused = false;
        this.pauseSelectedIndex = 0;
        this._pauseGpPrev = {};

        // Fullscreen button + F key
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Prevent browser scrolling for game keys (critical in iframes/itch.io)
            const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyX'];
            if (gameKeys.includes(e.code)) e.preventDefault();

            // Mute toggle works in every screen — handle it before any other branch
            if (e.code === 'KeyM' && !e.repeat) {
                if (this.audio && this.audio.toggleMute) {
                    const muted = this.audio.toggleMute();
                    const ind = document.getElementById('muteIndicator');
                    if (ind) ind.classList.toggle('show', muted);
                }
                return;
            }

            // Ship material debug panel (K)
            if (e.code === 'KeyK' && !e.repeat) {
                this.toggleShipDebugPanel();
                return;
            }

            // Game over menu intercepts input first
            if (this.gameOverActive) {
                if (this.handleGameOverKeydown(e)) {
                    e.preventDefault();
                    return;
                }
                return; // ignore other inputs while game over menu is up
            }

            if (e.code === 'Escape' || e.code === 'KeyP') {
                // If the pause-menu HOW TO PLAY shortcut is open, ESC/P
                // backs out to the pause panel instead of resuming.
                if (this._pauseHelpActive) {
                    this._hidePauseHelp();
                } else {
                    this.togglePause();
                }
            }
            if (e.code === 'KeyF' && !this.paused) this.toggleFullscreen();
            if (this.paused) {
                if (e.code === 'ArrowUp') {
                    const items = document.querySelectorAll('.pause-item');
                    this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + items.length) % items.length;
                    this.updatePauseSelection();
                }
                if (e.code === 'ArrowDown') {
                    const items = document.querySelectorAll('.pause-item');
                    this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % items.length;
                    this.updatePauseSelection();
                }
                if (e.code === 'Enter' || e.code === 'Space') {
                    this.executePauseAction();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            // Once a held-at-game-over key is released, fresh presses count
            if (this.gameOverHeldKeys && this.gameOverHeldKeys.has(e.code)) {
                this.gameOverHeldKeys.delete(e.code);
            }
        });

        // Pause menu click + touch
        const handlePauseTap = (e) => {
            if (!this.paused) return;
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const item = target ? target.closest('.pause-item') : null;
            if (item) {
                const items = Array.from(document.querySelectorAll('.pause-item'));
                this.pauseSelectedIndex = items.indexOf(item);
                this.executePauseAction();
                e.preventDefault();
            }
        };
        document.addEventListener('click', handlePauseTap);
        document.addEventListener('touchend', handlePauseTap, { passive: false });

        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        window.addEventListener('resize', () => {
            this.onWindowResize();
            this._checkOrientation();
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this._checkOrientation(), 200);
        });
    }

    _checkOrientation() {
        if (!this.touchControls) return;
        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait && this.gameActive && !this.paused) {
            this.togglePause();
        }
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const fs = this._frustumCurrent || this._frustumBase || 150;

        this.camera.left = -fs * width / height / 2;
        this.camera.right = fs * width / height / 2;
        this.camera.top = fs / 2;
        this.camera.bottom = -fs / 2;
        this.camera.updateProjectionMatrix();

        // Bounds enlarged with margin (combat zoom-out + camera follow)
        const boundsFrustum = (this._frustumBase || 150) + 25;
        BOUNDS.updateFromCamera({
            left:  -boundsFrustum * width / height / 2,
            right:  boundsFrustum * width / height / 2,
            top:    boundsFrustum / 2,
            bottom: -boundsFrustum / 2
        });

        this.renderer.setSize(width, height);
        if (this.composer) this.composer.setSize(width, height);
        // Bloom render target stays at half resolution
        if (this.bloomPass) {
            this.bloomPass.setSize(Math.floor(width / 2), Math.floor(height / 2));
        }

        // Border rectangle + edge glows must match the new camera bounds
        this._rebuildBorderLine();
        if (this._rebuildEdgeGlows) this._rebuildEdgeGlows();
    }
    
    update(dt) {
        // Death cam runs independently of gameActive — keeps particles + the
        // wreckage drifting in slow motion while the camera glides toward
        // the crash site, then the gameover modal fades in on top.
        if (this._deathCamActive) {
            this._updateDeathCam(dt);
            return;
        }
        if (!this.gameActive) return;

        // Hit lag — freeze world updates for a brief moment after player takes damage.
        // Render still runs each frame so the player sees the frozen scene.
        if (this.hitLagTimer > 0) {
            this.hitLagTimer -= dt;
            return;
        }

        // Update screen shake decay
        if (this.shakeIntensity > 0) {
            this.shakeIntensity -= this.shakeDecay * dt;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }
        // Drive chromatic aberration amount from current shake intensity,
        // plus a transient spike fired by triggerPlayerHitFeedback().
        if (this.chromaticPass) {
            const baseline = 0.0009;
            const shakeExtra = Math.min(0.006, this.shakeIntensity * 0.003);
            if (this._chromaticSpike === undefined) this._chromaticSpike = 0;
            this._chromaticSpike *= Math.exp(-dt * 5);
            this.chromaticPass.uniforms.amount.value =
                baseline + shakeExtra + this._chromaticSpike;
        }

        // Speed-based radial blur — only kicks in near top speed and stays
        // subtle so gameplay readability isn't hurt. Disabled completely
        // below the activation threshold so we don't pay the per-pixel cost.
        if (this.speedBlurPass && this.player) {
            const speed = this.player.velocity.length();
            const ratio = speed / this.player.maxSpeed;
            const target = ratio > 0.78 ? (ratio - 0.78) * 0.08 : 0;
            const lerpRate = 1 - Math.exp(-dt * 5);
            const cur = this.speedBlurPass.uniforms.strength.value;
            const next = cur + (target - cur) * lerpRate;
            this.speedBlurPass.uniforms.strength.value = next;
            this.speedBlurPass.enabled = next > 0.0008;
        }
        const shakeX = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
        const shakeZ = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;

        // Lazy camera follow — softly track the active-player centroid at 30%
        // of their offset so the ship has room to fly around without the
        // camera glued to it.
        const apForCam = this.players.filter(p => !p.permaDead);
        let camTargetX = 0, camTargetZ = 0;
        if (apForCam.length > 0) {
            let sx = 0, sz = 0;
            for (const p of apForCam) { sx += p.position.x; sz += p.position.z; }
            sx /= apForCam.length; sz /= apForCam.length;
            camTargetX = sx * 0.28;
            camTargetZ = sz * 0.28;
        }
        const followLerp = 1 - Math.exp(-dt * 2.2);
        this._camFollowX += (camTargetX - this._camFollowX) * followLerp;
        this._camFollowZ += (camTargetZ - this._camFollowZ) * followLerp;
        this.camera.position.x = this._camFollowX + shakeX;
        this.camera.position.z = this._camFollowZ + shakeZ;

        // Damage-cam roll — decays toward 0 with exp falloff for cinematic
        // tilt on player hits. Driven by triggerPlayerHitFeedback.
        if (Math.abs(this._camTiltAmount) > 0.0005) {
            this._camTiltAmount *= Math.exp(-dt * 4);
            this.camera.rotation.z = this._camTiltAmount;
        } else if (this._camTiltAmount !== 0) {
            this._camTiltAmount = 0;
            this.camera.rotation.z = 0;
        }

        // Combat-aware zoom: more threat → slightly wider view, eased
        const threatLevel =
            (this.waves ? this.waves.asteroids.length : 0) +
            (this.ufoManager ? this.ufoManager.hostileUFOs.length * 3 : 0);

        // Background dimmer — drop renderer exposure as threat rises so the
        // nebula/star backdrop fades while the bright emissive ships, bullets
        // and explosions stay readable. Eased so it doesn't pump.
        const baseExposure = 2.3;
        const targetExposure = baseExposure - Math.min(0.7, threatLevel * 0.04);
        const expoLerp = 1 - Math.exp(-dt * 1.5);
        if (this._currentExposure === undefined) this._currentExposure = baseExposure;
        this._currentExposure += (targetExposure - this._currentExposure) * expoLerp;
        this.renderer.toneMappingExposure = this._currentExposure;

        const targetFrustum = this._frustumBase + Math.min(20, threatLevel * 0.55);
        const zoomLerp = 1 - Math.exp(-dt * 0.9);
        this._frustumCurrent += (targetFrustum - this._frustumCurrent) * zoomLerp;
        if (Math.abs(this._frustumCurrent - targetFrustum) > 0.05 ||
            this._frustumLastApplied !== this._frustumCurrent) {
            const fs = this._frustumCurrent;
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.left = -fs * w / h / 2;
            this.camera.right = fs * w / h / 2;
            this.camera.top = fs / 2;
            this.camera.bottom = -fs / 2;
            this.camera.updateProjectionMatrix();
            this._frustumLastApplied = this._frustumCurrent;
        }

        // Edge glow + warp-direction chevrons — pulse based on player approach
        if (this.edgeBars && apForCam.length > 0) {
            const b = BOUNDS;
            // Distance from each edge: 0=top(minZ), 1=bottom(maxZ), 2=left(minX), 3=right(maxX)
            const edgeDists = [Infinity, Infinity, Infinity, Infinity];
            for (const p of apForCam) {
                edgeDists[0] = Math.min(edgeDists[0], p.position.z - b.minZ);
                edgeDists[1] = Math.min(edgeDists[1], b.maxZ - p.position.z);
                edgeDists[2] = Math.min(edgeDists[2], p.position.x - b.minX);
                edgeDists[3] = Math.min(edgeDists[3], b.maxX - p.position.x);
            }
            const t = performance.now() * 0.005;
            const pulse = 0.55 + Math.sin(t) * 0.4;
            const chevPulse = 0.6 + Math.sin(t * 2.2) * 0.4;
            for (let i = 0; i < 4; i++) {
                const proximity = Math.max(0, 1 - edgeDists[i] / 30);
                this.edgeBars[i].material.opacity = proximity * 0.85 * pulse;
                // Opposite-edge chevron lights up at the same time so the
                // player sees where they will reappear on wrap-around.
                this.edgeChevrons[i].material.opacity = proximity * 0.75 * chevPulse;
            }
        } else if (this.edgeBars) {
            for (let i = 0; i < 4; i++) {
                this.edgeBars[i].material.opacity = 0;
                this.edgeChevrons[i].material.opacity = 0;
            }
        }
        
        // Active players (filter out perma-dead)
        const activePlayers = this.players.filter(p => !p.permaDead);

        // Update each player's input + physics + ghost state
        for (const p of this.players) {
            if (p.permaDead) continue;
            p.handleInput(this.keys, this.mouseX, this.mouseY);
            p.update(dt);
            // Ghost revive logic — pass the partner so we can check proximity
            if (p.isGhost) {
                const partner = this.players.find(o => o !== p && !o.isGhost && !o.permaDead);
                p.updateGhost(dt, partner);
            }
        }

        // Thrust audio — any active player thrusting plays the engine
        let anyThrust = false;
        let maxSpeed = 0;
        for (const p of activePlayers) {
            if (p.input.thrust) anyThrust = true;
            const sp = p.velocity.length() / p.maxSpeed;
            if (sp > maxSpeed) maxSpeed = sp;
        }
        this.audio.setThrust(anyThrust, maxSpeed);

        // Supply drone ambient
        const hasDrone = this.ufoManager && this.ufoManager.supplyDrones.length > 0;
        this.audio.setDroneAmbient(hasDrone);

        // Player point light follows P1 — offset behind the ship when thrusting
        // so the engine glow illuminates the exhaust area, not the nose.
        if (this.playerLight) {
            const lightTarget = activePlayers[0] || this.player;
            const thrusting = lightTarget.input.thrust;
            // Offset the light well behind the ship so it illuminates the
            // exhaust / engine area rather than washing over the hull.
            const offsetDist = thrusting ? 12 : 2;
            const lx = lightTarget.position.x - Math.sin(lightTarget.angle) * offsetDist;
            const lz = lightTarget.position.z - Math.cos(lightTarget.angle) * offsetDist;
            this.playerLight.position.set(lx, 2, lz);
            const baseIntensity = 0.4;
            const thrustBoost = thrusting ? 2.0 : 0;
            const flicker = thrusting ? (0.8 + Math.random() * 0.4) : 1;
            this.playerLight.intensity = (baseIntensity + thrustBoost) * flicker;
            this.playerLight.color.setHex(thrusting ? 0x44ccff : lightTarget.colorHex);
        }

        // Update particles
        this.particles.update(dt);

        // Update background (slow planet rotation + moon orbit)
        if (this.background) this.background.update(dt);

        // Update projectiles for both players
        for (const p of this.players) {
            if (!p.projectiles) continue;
            p.projectiles = p.projectiles.filter(proj => {
                proj.update(dt);
                if (!proj.isAlive()) {
                    if (proj.isSpread) {
                        const spos = proj.position.clone();
                        this.particles.createCrackFlash(spos, 3, 0xffddaa);
                        this.particles.createExplosion(spos, 0xffffcc, 10);
                        this.particles.createExplosion(spos, 0xff8833, 18);
                        this.particles.createExplosion(spos, 0xff4400, 8);
                        this.particles.createShockwave(spos, 0xff8844, 12, 0.35);
                        this.particles.createDebris(spos, 4, 2);
                        this.addScreenShake(0.2, 3);
                        this.audio.playSpreadPop();
                        const blastRadius = 6;
                        for (let i = this.waves.asteroids.length - 1; i >= 0; i--) {
                            const ast = this.waves.asteroids[i];
                            if (proj.position.distance(ast.position) < blastRadius + ast.radius) {
                                this.ui.addScore({ 'large': 25, 'medium': 50, 'small': 100 }[ast.size], 1, ast.position);
                                this.particles.createCrackFlash(ast.position.clone(), ast.radius);
                                this.particles.createExplosion(ast.position.clone(), 0xff6600, 15);
                                this.particles.createDebris(ast.position.clone(), { 'large': 8, 'medium': 5, 'small': 3 }[ast.size], ast.radius);
                                this.particles.createScorch(ast.position.clone(), ast.radius);
                                this.audio.playExplosion();
                                this.waves.asteroidHit(this.scene, i);
                                if (this.challengeManager) this.challengeManager.onAsteroidDestroyed();
                                if (typeof onAsteroidDestroyed === 'function') onAsteroidDestroyed(p.activePowerup || 'default');
                            }
                        }
                    }
                    proj.destroy();
                    return false;
                }
                return true;
            });
        }

        // Update waves
        this.waves.update(dt);

        // Collision detection: projectiles vs asteroids — check each player's bullets
        for (const p of this.players) {
            if (!p.projectiles) continue;
            for (let i = p.projectiles.length - 1; i >= 0; i--) {
                const projectile = p.projectiles[i];
                for (let j = this.waves.asteroids.length - 1; j >= 0; j--) {
                    const asteroid = this.waves.asteroids[j];
                    // Piercing projectiles skip already-hit targets
                    if (projectile.piercing && projectile.hitTargets.has(asteroid)) continue;
                    if (checkCollision(projectile.position, projectile.radius, asteroid.position, asteroid.radius)) {
                        const score = { 'large': 25, 'medium': 50, 'small': 100 }[asteroid.size];
                        this.ui.addScore(score, 1, asteroid.position);
                        const pos = asteroid.position.clone();
                        const sz = asteroid.size;
                        this.particles.createCrackFlash(pos, asteroid.radius);
                        // Size-scaled explosion: large asteroids get more particles + color shift
                        if (sz === 'large') {
                            this.particles.createExplosion(pos, 0xffaa33, 25);
                            this.particles.createExplosion(pos, 0xff4400, 10);
                            this.particles.createShockwave(pos, 0xff8844, 18, 0.4);
                            this.addScreenShake(0.8, 3);
                        } else if (sz === 'medium') {
                            this.particles.createExplosion(pos, 0xff6600, 18);
                            this.particles.createShockwave(pos, 0xff6633, 12, 0.3);
                            this.addScreenShake(0.6, 3);
                        } else {
                            this.particles.createExplosion(pos, 0xff6600, 12);
                            this.addScreenShake(0.3, 3);
                        }
                        const debrisCount = { 'large': 10, 'medium': 6, 'small': 3 }[sz];
                        this.particles.createDebris(pos, debrisCount, asteroid.radius);
                        this.particles.createScorch(pos, asteroid.radius);
                        this.audio.playExplosion();
                        if (projectile.piercing) {
                            projectile.hitTargets.add(asteroid);
                        } else {
                            projectile.destroy();
                            p.projectiles.splice(i, 1);
                        }
                        this.waves.asteroidHit(this.scene, j);
                        if (this.challengeManager) this.challengeManager.onAsteroidDestroyed();
                        if (typeof onAsteroidDestroyed === 'function') onAsteroidDestroyed(p.activePowerup || 'default');
                        if (!projectile.piercing) break; // piercing continues through
                    }
                }
            }
        }

        // Collision detection: each living player vs asteroids
        for (const p of activePlayers) {
            if (p.isGhost) continue; // ghosts pass through
            for (let i = this.waves.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.waves.asteroids[i];
                if (checkCollision(p.position, p.radius, asteroid.position, asteroid.radius)) {
                    const alive = p.takeDamage(asteroid.position, asteroid.radius);
                    this.triggerPlayerHitFeedback();
                    if (!alive && !this.coopMode) {
                        this.gameOver();
                        return;
                    }
                    break;
                }
            }
        }

        // Update UFOs (target the closest non-ghost player)
        const ufoTarget = activePlayers.find(p => !p.isGhost) || activePlayers[0] || this.player;
        this.ufoManager.update(dt, ufoTarget, this.waves.getDifficulty());

        // Projectiles vs supply drones — check each player's bullets
        for (const p of this.players) {
            const droneHitPos = this.ufoManager.checkDroneHits(p.projectiles);
            if (droneHitPos) {
                this.particles.createExplosion(droneHitPos, 0xff44aa, 20);
                this.audio.playUFOExplosion();
                this.addScreenShake(0.3, 2);
                this.ui.addScore(150, 1, droneHitPos);
                this.powerupManager.trySpawnAt(droneHitPos);
            }
        }

        // Projectiles vs hostile UFOs — check each player's bullets
        for (const p of this.players) {
            const hostileHit = this.ufoManager.checkHostileHits(p.projectiles);
            if (hostileHit) {
                if (hostileHit.killed) {
                    // Score + extralife fire on the killing shot, but the
                    // BIG explosion + sound + heavy shake are deferred to
                    // the UFO's death animation (it spins out and crashes).
                    this.ui.addScore(500, 1, hostileHit.pos);
                    if (!this.challengeManager) {
                        this.powerupManager.spawnSpecific(hostileHit.pos, 'extralife');
                    }
                    if (this.challengeManager) this.challengeManager.onHostileKilled();
                    if (typeof onUFOKilled === 'function') onUFOKilled();
                    this.particles.createExplosion(hostileHit.pos, 0xff8844, 8);
                    this.addScreenShake(0.25, 3);
                } else {
                    // Non-kill hit — yellow sparks at the impact point so
                    // the player gets clear "I hit it" feedback even when
                    // the UFO survives. Halo flash on the UFO + audio + light shake.
                    this.particles.createHitSparks(hostileHit.pos, 0xffcc44, 8);
                    this.audio.playUFOExplosion();
                    this.addScreenShake(0.2, 3);
                }
            }
        }

        // Hostile UFO projectiles vs each living player
        for (const p of activePlayers) {
            if (p.isGhost) continue;
            const hitPos = this.ufoManager.checkHostileProjectilesVsPlayer(p.position, p.radius);
            if (hitPos) {
                const alive = p.takeDamage(hitPos);
                this.triggerPlayerHitFeedback();
                if (!alive && !this.coopMode) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Update and check power-ups for each player (individual pickups)
        this.powerupManager.update(dt, activePlayers);
        for (const p of activePlayers) {
            if (p.isGhost) continue;
            const pickedUp = this.powerupManager.checkCollision(p.position, p.radius);
            if (pickedUp) {
                p.applyPowerup(pickedUp);
            }
        }

        // Game over: only when ALL players are perma-dead
        const allDead = this.players.every(p => p.permaDead);
        if (allDead) {
            if (this.challengeManager) {
                this.missionFailed();
            } else {
                this.gameOver();
            }
            return;
        }

        // Challenge mode: update objective tracking + check complete/fail
        if (this.challengeManager && !this._missionTransitioning) {
            this.challengeManager.update(dt, this);
            if (this.challengeManager && this.challengeManager.isComplete()) {
                this.missionComplete();
                return;
            }
            if (this.challengeManager && this.challengeManager.isFailed()) {
                this.missionFailed();
                return;
            }
        } else if (this.challengeManager && this._missionTransitioning) {
            // Log if we're skipping because transition is active
        }

        // Update UI — pass both players for the HUD
        this.ui.update(dt, this.players, this.waves.getDifficulty());

        // Achievement tracking: no-damage timer + periodic check
        if (typeof checkAchievements === 'function') {
            if (this._noDamageTimer === undefined) this._noDamageTimer = 0;
            this._noDamageTimer += dt;
            this._achievementCheckTimer = (this._achievementCheckTimer || 0) + dt;
            if (this._achievementCheckTimer >= 2.0) {
                this._achievementCheckTimer = 0;
                checkAchievements(this);
            }
        }
    }
    
    // Brief world freeze for impact moments — UFO crash, boss hit, etc.
    // Builds on top of the existing hitLagTimer used for player damage.
    triggerHitStop(duration) {
        this.hitLagTimer = Math.max(this.hitLagTimer, duration);
    }

    addScreenShake(intensity, decay) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDecay = decay;
    }

    // Combined visual feedback when the player takes damage:
    // shake + brief world freeze + red screen-edge vignette flash.
    // The ship's own wobble + emissive flash are triggered inside Player.takeDamage.
    triggerPlayerHitFeedback() {
        this._noDamageTimer = 0; // Reset no-damage timer for achievements
        this.addScreenShake(0.8, 4);
        this.hitLagTimer = 0.08; // ~80ms world freeze
        // Damage-cam roll — random ±5° tilt that decays back to level
        const tiltSign = Math.random() < 0.5 ? 1 : -1;
        this._camTiltAmount = tiltSign * (0.07 + Math.random() * 0.025);
        // Brief chromatic-aberration spike that decays each frame
        this._chromaticSpike = Math.max(this._chromaticSpike || 0, 0.010);
        const v = document.getElementById('hitVignette');
        if (v) {
            // Restart the CSS animation by removing/re-adding the class
            v.classList.remove('flash');
            void v.offsetWidth; // force reflow
            v.classList.add('flash');
        }
    }

    _updateDeathCam(dt) {
        this._deathCamTime += dt;
        const dur = this._deathCamDuration || 0.95;
        const t = Math.min(1, this._deathCamTime / dur);

        // Particles run at FULL speed so they actually spread outward —
        // slow-mo on velocity-driven particles just makes them clump
        // (which is exactly what produced the "orange filled circle"
        // bug). World props (asteroids, UFOs, background) keep slow-mo
        // for cinematic feel.
        if (this.particles) this.particles.update(dt);
        const slowDt = dt * 0.35;
        if (this.waves) {
            for (const ast of this.waves.asteroids) ast.update(slowDt);
        }
        if (this.ufoManager) this.ufoManager.update(slowDt, this.player, 1);
        if (this.background) this.background.update(slowDt);
        if (this.player && this.player.projectiles) {
            for (const proj of this.player.projectiles) {
                if (proj && proj.update) proj.update(slowDt);
            }
        }

        // Camera drifts toward the wreckage and zooms in
        const wreck = this._deathCamWreckage || { x: 0, z: 0 };
        const targetX = wreck.x * 0.4;
        const targetZ = wreck.z * 0.4;
        const camLerp = 1 - Math.exp(-dt * 3.5);
        if (this._camFollowX === undefined) this._camFollowX = 0;
        if (this._camFollowZ === undefined) this._camFollowZ = 0;
        this._camFollowX += (targetX - this._camFollowX) * camLerp;
        this._camFollowZ += (targetZ - this._camFollowZ) * camLerp;

        if (this.shakeIntensity > 0) {
            this.shakeIntensity -= this.shakeDecay * dt;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }
        const shakeX = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
        const shakeZ = this.shakeIntensity > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
        this.camera.position.x = this._camFollowX + shakeX;
        this.camera.position.z = this._camFollowZ + shakeZ;

        // No zoom-in during death cam — shards spread visibly faster than
        // the camera can track, so we keep the wide view to let them read.

        // Punchy chromatic aberration that decays over the cam window
        if (this.chromaticPass) {
            this.chromaticPass.uniforms.amount.value = 0.005 + (1 - t) * 0.008;
        }

        if (this._deathCamTime >= dur) {
            this._deathCamActive = false;
        }
    }

    // Per-world color grade — called from Background.buildRandom whenever
    // a new world is picked. Identity (no tint) when grade is missing.
    applyColorGrade(grade) {
        if (!this.gradePass) return;
        if (grade) {
            this.gradePass.uniforms.tint.value.setRGB(
                grade.r ?? 1.0,
                grade.g ?? 1.0,
                grade.b ?? 1.0
            );
            this.gradePass.uniforms.strength.value = grade.strength ?? 0.0;
        } else {
            this.gradePass.uniforms.tint.value.setRGB(1, 1, 1);
            this.gradePass.uniforms.strength.value = 0;
        }
    }

    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    gameLoop = () => {
        requestAnimationFrame(this.gameLoop);

        const now = Date.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05); // Cap to prevent huge jumps on tab switch
        this.lastTime = now;

        // Check gamepad Start button for pause
        this.checkGamepadPause();

        if (this.paused) {
            this.handlePauseInput();
            this.render(); // still render the scene behind pause
            return;
        }

        // Attract mode — animated menu background
        if (!this.gameActive && !this.gameOverActive && this._attractMode && this._attractMode.active) {
            this.updateAttractMode(dt);
            this.render();
            return;
        }

        // Game over menu lifecycle
        if (this.gameOverActive) {
            if (this.gameOverLockoutTimer > 0) {
                this.gameOverLockoutTimer -= dt;
                if (this.gameOverLockoutTimer <= 0) {
                    this.gameOverLockoutTimer = 0;
                    document.getElementById('gameOverScreen').classList.remove('locked');
                }
            }
            // Death cam must keep running during game-over so particles
            // animate (otherwise they freeze on the first frame).
            if (this._deathCamActive) {
                this._updateDeathCam(dt);
            } else if (this.particles) {
                // Death cam finished but lingering particles should still fade out
                this.particles.update(dt);
            }
            this.handleGameOverGamepad();
            this.render();
            return;
        }

        this.update(dt);
        this.render();
        this.updateGamepadOverlay();
        this.checkMenuGamepad();
    }

    checkGamepadPause() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) { if (g) { gp = g; break; } }
        if (!gp) return;

        const startPressed = (typeof GamepadBindings !== 'undefined')
            ? GamepadBindings.isPressed(gp, 'pause')
            : (gp.buttons[9] && gp.buttons[9].pressed);

        if (startPressed && !this._startPrev && !this.paused && this.gameActive) {
            this.togglePause();
        }
        this._startPrev = startPressed;
    }

    checkMenuGamepad() {
        // Game over input is handled by handleGameOverGamepad, and the main
        // menu has its own gamepad polling in MenuSystem. Nothing to do here.
    }

    updateGamepadOverlay() {
        // Init perf state
        if (this._perfInit === undefined) {
            this._perfInit = true;
            this._perfFrameTimes = []; // recent frame durations in ms
            this._perfLastFrameTime = performance.now();
            this._perfHistory = new Array(150).fill(0); // 5s at ~30 samples/sec
            this._perfLastSample = performance.now();
            this._perfDom = null;
        }

        const now = performance.now();
        const dtMs = now - this._perfLastFrameTime;
        this._perfLastFrameTime = now;

        // Track recent frame times for instant FPS
        this._perfFrameTimes.push(dtMs);
        if (this._perfFrameTimes.length > 60) this._perfFrameTimes.shift();

        // Compute average FPS over last 60 frames
        const avgMs = this._perfFrameTimes.reduce((a, b) => a + b, 0) / this._perfFrameTimes.length;
        const fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;

        // Sample for graph every ~33ms
        if (now - this._perfLastSample >= 33) {
            this._perfHistory.shift();
            this._perfHistory.push(fps);
            this._perfLastSample = now;
        }

        // Build/update DOM
        const overlay = document.getElementById('gamepadOverlay');
        if (!overlay) return;

        overlay.style.opacity = '1';

        if (!this._perfDom) {
            overlay.innerHTML = `
                <div id="perfFps" style="font-size:16px; margin-bottom:4px;"></div>
                <canvas id="perfGraph" width="150" height="40" style="display:block; margin-bottom:6px; background:rgba(0,0,0,0.4); border:1px solid rgba(0,255,255,0.15);"></canvas>
                <div id="perfStats" style="line-height:1.5;"></div>
            `;
            this._perfDom = {
                fps: document.getElementById('perfFps'),
                graph: document.getElementById('perfGraph'),
                stats: document.getElementById('perfStats')
            };
        }

        const fpsColor = fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffcc00' : '#ff4444';
        this._perfDom.fps.style.color = fpsColor;
        this._perfDom.fps.textContent = `FPS ${fps}`;

        // Draw graph
        const canvas = this._perfDom.graph;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Reference lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - (60 / 120) * canvas.height);
        ctx.lineTo(canvas.width, canvas.height - (60 / 120) * canvas.height);
        ctx.stroke();

        // Graph line
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < this._perfHistory.length; i++) {
            const v = this._perfHistory[i];
            const x = (i / this._perfHistory.length) * canvas.width;
            const y = canvas.height - Math.min(120, v) / 120 * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const asteroidCount = this.waves ? this.waves.asteroids.length : 0;
        const projCount = this.player ? this.player.projectiles.length : 0;
        const particleCount = this.particles ? this.particles.particles.length : 0;
        const flashCount = this.particles ? this.particles.flashes.length : 0;
        const ufoCount = this.ufoManager ? this.ufoManager.hostileUFOs.length + this.ufoManager.supplyDrones.length : 0;

        this._perfDom.stats.innerHTML = `
            asteroids: ${asteroidCount}<br>
            projectiles: ${projCount}<br>
            particles: ${particleCount}<br>
            flashes: ${flashCount}<br>
            ufos: ${ufoCount}
        `;
    }
    
    // ── Challenge mission transitions (game never stops) ──
    missionComplete() {
        // Save progress
        if (this.challengeManager && typeof ChallengeProgress !== 'undefined') {
            ChallengeProgress.save(this.challengeManager.mission.id, this.ui.score);
        }
        if (typeof onMissionComplete === 'function') onMissionComplete();
        // Sweep any lingering hostile UFOs so they don't bleed into the next
        // mission. Particle puff for each so the disappearance reads.
        if (this.ufoManager && this.ufoManager.hostileUFOs) {
            for (const ufo of this.ufoManager.hostileUFOs) {
                if (this.particles && ufo.position) {
                    this.particles.createExplosion(
                        new Vector2D(ufo.position.x, ufo.position.z), 0xff4400, 12
                    );
                }
                ufo.destroy();
            }
            this.ufoManager.hostileUFOs.length = 0;
        }
        this._startMissionTransition(true);
    }

    missionFailed() {
        // No auto-advance — failure goes straight to a dedicated MISSION
        // FAILED game-over screen so the player gets clear feedback and a
        // retry option instead of being silently pushed to the next mission.
        this.gameOver({ missionFailed: true });
    }

    // Show mission name + description + 3-2-1 countdown at mission start
    _showMissionIntro(mission) {
        const splash = document.getElementById('missionSplash');
        if (!splash) return;

        const resultEl = document.getElementById('splashResult');
        const scoreEl = document.getElementById('splashScore');
        const nextEl = document.getElementById('splashNext');

        // Pause challenge tracking during intro
        this._missionTransitioning = true;

        splash.style.display = 'flex';
        splash.style.background = 'transparent';

        if (resultEl) {
            resultEl.textContent = mission.title;
            resultEl.style.color = '#ffcc00';
            resultEl.style.textShadow = '0 0 20px rgba(255,204,0,0.8), 0 0 40px rgba(255,204,0,0.3)';
            resultEl.style.fontSize = '22px';
        }
        if (scoreEl) {
            scoreEl.textContent = mission.description;
            scoreEl.style.fontSize = '10px';
        }
        if (nextEl) {
            nextEl.textContent = '';
            nextEl.style.fontSize = '36px';
        }

        // Show title for 1s, then countdown
        setTimeout(() => { if (nextEl) nextEl.textContent = '3'; }, 1000);
        setTimeout(() => { if (nextEl) nextEl.textContent = '2'; }, 1700);
        setTimeout(() => { if (nextEl) nextEl.textContent = '1'; }, 2400);
        setTimeout(() => {
            splash.style.display = 'none';
            if (resultEl) resultEl.style.fontSize = '22px';
            if (nextEl) nextEl.style.fontSize = '28px';
            this._missionTransitioning = false;
        }, 3100);
    }

    _startMissionTransition(success) {
        if (this._missionTransitioning) return;
        this._missionTransitioning = true;

        const nextMission = this.challengeManager ? this.challengeManager.getNextMissionId() : null;

        if (!nextMission) {
            // Last mission — show ALL COMPLETE then return to menu
            const splash = document.getElementById('missionSplash');
            const resultEl = document.getElementById('splashResult');
            const scoreEl = document.getElementById('splashScore');
            const nextEl = document.getElementById('splashNext');
            if (splash) {
                splash.style.display = 'flex';
                splash.style.background = 'transparent';
            }
            if (resultEl) {
                resultEl.textContent = success ? 'ALL MISSIONS COMPLETE' : 'MISSION FAILED';
                resultEl.style.color = success ? '#ffcc00' : '#ff4444';
                resultEl.style.textShadow = success
                    ? '0 0 25px rgba(255,204,0,0.9), 0 0 50px rgba(255,204,0,0.4)'
                    : '0 0 25px rgba(255,68,68,0.9)';
                resultEl.style.fontSize = '18px';
            }
            if (scoreEl) scoreEl.textContent = `FINAL SCORE ${this.ui.score.toLocaleString()}`;
            if (nextEl) nextEl.textContent = '';
            this.gameActive = false;
            setTimeout(() => {
                if (splash) splash.style.display = 'none';
                if (resultEl) resultEl.style.fontSize = '22px';
                this.challengeManager = null;
                this._missionTransitioning = false;
                this.resetToMainMenu();
            }, 4000);
            return;
        }

        // Flash result text over gameplay (no black overlay, no game pause)
        const splashResult = document.getElementById('splashResult');
        const splash = document.getElementById('missionSplash');
        if (splash) {
            splash.style.display = 'flex';
            splash.style.background = 'transparent'; // no black overlay
        }
        if (splashResult) {
            splashResult.textContent = success ? 'COMPLETE' : 'FAILED';
            splashResult.style.color = success ? '#00ff88' : '#ff4444';
            splashResult.style.textShadow = success
                ? '0 0 30px rgba(0,255,136,0.9), 0 0 60px rgba(0,255,136,0.4)'
                : '0 0 30px rgba(255,68,68,0.9), 0 0 60px rgba(255,68,68,0.4)';
        }
        const scoreEl = document.getElementById('splashScore');
        const statsEl = document.getElementById('splashStats');
        const rankEl = document.getElementById('splashRank');
        const nextEl = document.getElementById('splashNext');
        if (scoreEl) scoreEl.textContent = '';
        if (statsEl) statsEl.textContent = '';
        if (rankEl) rankEl.textContent = '';
        if (nextEl) nextEl.textContent = '';

        // Mission summary stats
        if (success && this.challengeManager) {
            const elapsed = this.challengeManager.elapsed;
            const destroyed = this.waves ? this.waves.destroyed : 0;
            const maxCombo = this.ui ? this.ui.maxCombo : 0;
            const score = this.ui ? this.ui.score : 0;
            const mins = Math.floor(elapsed / 60);
            const secs = Math.floor(elapsed % 60);
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

            if (statsEl) {
                statsEl.innerHTML = `TIME ${timeStr} &nbsp; SCORE ${score.toLocaleString()}<br>` +
                    `DESTROYED ${destroyed} &nbsp; BEST COMBO x${maxCombo}`;
            }

            // Rank based on score + time + combo
            const rank = this._calcMissionRank(this.challengeManager.mission, score, elapsed, maxCombo);
            if (rankEl) {
                const rankColors = { S: '#ffd700', A: '#00ff88', B: '#00ccff', C: '#aaaaaa' };
                rankEl.textContent = rank;
                rankEl.style.color = rankColors[rank] || '#ffffff';
            }
        }

        // Game keeps running — player can still fly and shoot.
        // Reset challenge state and prepare next mission after brief flash.
        const nextData = (typeof MISSIONS !== 'undefined') ? MISSIONS.find(m => m.id === nextMission) : null;

        // Phase 1: result flash (0.8s)
        setTimeout(() => {
            // Show next mission title
            if (splashResult) {
                splashResult.textContent = nextData ? nextData.title : `MISSION ${nextMission}`;
                splashResult.style.color = '#ffcc00';
                splashResult.style.textShadow = '0 0 20px rgba(255,204,0,0.8), 0 0 40px rgba(255,204,0,0.3)';
            }
            if (scoreEl) scoreEl.textContent = nextData ? nextData.description : '';
        }, 800);

        // Phase 2: countdown 3, 2, 1 (starts at 1.6s)
        setTimeout(() => {
            if (splashResult) splashResult.style.fontSize = '14px';
            if (nextEl) { nextEl.textContent = '3'; nextEl.style.fontSize = '36px'; }
        }, 1600);
        setTimeout(() => { if (nextEl) nextEl.textContent = '2'; }, 2300);
        setTimeout(() => { if (nextEl) nextEl.textContent = '1'; }, 3000);

        // Phase 3: GO — swap to next mission, keep the world intact
        setTimeout(() => {
            if (splash) splash.style.display = 'none';
            if (splashResult) splashResult.style.fontSize = '22px';
            if (nextEl) nextEl.style.fontSize = '28px';

            // Clear state the new mission must not inherit
            this.challengeManager = null;
            if (this.player && this.player.powerupLocked) {
                this.player.activePowerup = null;
                this.player.powerupTimer = 0;
                this.player.powerupLocked = false;
            }
            // Restore shoot rate in case previous mission had noWeapon or ammoLimit
            if (this.player) {
                this.player.shootRate = 0.3;
            }
            // Reset wave manager defaults so noAsteroids/spawnRate don't bleed through
            if (this.waves) {
                this.waves.spawnInterval = 2.0;
                this.waves.maxAsteroids = 25;
            }

            // Hand off to the next mission — ChallengeManager.start() applies
            // all the new modifiers (difficulty, weapon lock, boss spawn) on
            // top of the existing play state. Waves, asteroids, UFOs,
            // particles, score and player position all carry through.
            this.challengeManager = new ChallengeManager(nextMission);
            this.challengeManager.start(this);
            this._currentMissionId = nextMission;
            this.gameActive = true;
            this.lastTime = Date.now();
            this._missionTransitioning = false;
            const objEl = document.getElementById('hudObjective');
            if (objEl) objEl.style.display = '';
        }, 3700);
    }

    _calcMissionRank(mission, score, elapsed, maxCombo) {
        // S = exceptional, A = great, B = good, C = completed
        // Score thresholds scale with mission difficulty
        const diff = mission.difficulty || 1;
        const scoreThresholds = {
            S: 3000 * diff,
            A: 1500 * diff,
            B: 500 * diff
        };
        // Time bonus: faster = better (under 30s per difficulty = fast)
        const fastTime = elapsed < 30 * diff;
        // Combo bonus
        const highCombo = maxCombo >= 8 + diff * 2;

        let points = 0;
        if (score >= scoreThresholds.S) points += 3;
        else if (score >= scoreThresholds.A) points += 2;
        else if (score >= scoreThresholds.B) points += 1;

        if (fastTime) points += 1;
        if (highCombo) points += 1;

        if (points >= 4) return 'S';
        if (points >= 3) return 'A';
        if (points >= 1) return 'B';
        return 'C';
    }

    gameOver(opts = {}) {
        if (this._missionTransitioning) return;
        // Hide touch controls during game over
        if (this.touchControls) this.touchControls.hide();
        // Any failure in challenge mode goes to a real MISSION FAILED screen
        // (no silent auto-advance, no free-pass respawns). The restart
        // button re-enters the same mission via _currentMissionId.
        const missionFailed = !!opts.missionFailed || !!this.challengeManager;
        if (this.challengeManager) {
            this.challengeManager = null;
        }

        // Swap the game-over headline to match the context
        const goHeader = document.querySelector('#gameOverScreen h1');
        if (goHeader) {
            goHeader.textContent = missionFailed ? 'MISSION FAILED' : 'GAME OVER';
            goHeader.style.color = missionFailed ? '#ff4444' : '';
        }

        this.gameActive = false;
        this.audio.playDeathExplosion();
        this.audio.setThrust(false);
        // Fade current music down hard so the explosion + gameover theme take over
        this.audio.fadeMusic(0.0, 0.8);

        // Capture wreckage anchor for the death-cam slow zoom
        // In co-op, find the last player that died
        const deathTarget = this.coopMode
            ? (this.players.find(p => !p.permaDead) || this.players[this.players.length - 1])
            : this.player;
        if (deathTarget) {
            this._deathCamWreckage = {
                x: deathTarget.position.x,
                z: deathTarget.position.z
            };
            this._deathCamActive = true;
            this._deathCamTime = 0;
            // 4s: 3 explosion beats spread over ~1.5s, shards and embers
            // drift visibly for another ~2.5s before modal fades in.
            this._deathCamDuration = 4.0;
        }

        // Death sequence — layered ship break-apart with fireball, shockwave,
        // flying ship shards, sparks, debris, and multi-beat detonations.
        if (this.player && this.player.mesh) {
            const pos = this.player.position.clone();

            // Beat 1: initial white-hot flash + fireball + ship shatters apart
            this.particles.createCrackFlash(pos, 8, 0xffffff);
            this.particles.createDeathFireball(pos, 0xff6622, 18, 1.8);
            this.particles.createShipShatter(pos, 0x00ffff, 0xff8800, 24);
            this.particles.createExplosion(pos, 0xffffcc, 40);
            this.particles.createExplosion(pos, 0xff4400, 60);
            this.particles.createShockwave(pos, 0xff8844, 50, 1.0);
            this.particles.createScorch(pos, 12);

            // Beat 2: secondary detonation — more shards + debris fly out (~600ms)
            setTimeout(() => {
                if (!this.particles) return;
                this.particles.createExplosion(pos, 0xff8822, 45);
                this.particles.createShipShatter(pos, 0x00ccdd, 0xff6600, 10);
                this.particles.createDebris(pos, 20, 8);
                this.particles.createShockwave(pos, 0xff5522, 35, 0.8);
                this.addScreenShake(1.8, 4);
            }, 600);

            // Beat 3: final ember burst + lingering sparks (~1.3s)
            setTimeout(() => {
                if (!this.particles) return;
                this.particles.createExplosion(pos, 0xff5511, 30);
                this.particles.createExplosion(pos, 0xffaa44, 15);
                this.particles.createDebris(pos, 10, 5);
            }, 1300);

            this.addScreenShake(3.0, 5);
            this.player.mesh.visible = false;
        }

        // Submit score for current mode + check for new high (with stats)
        let isNewHigh = false;
        const runStats = {
            time: this.waves ? Math.floor(this.waves.elapsed) : 0,
            asteroids: this.waves ? this.waves.destroyed : 0,
            maxCombo: this.ui ? this.ui.maxCombo : 0
        };
        if (typeof Highscores !== 'undefined') {
            isNewHigh = Highscores.submit(this.gameMode, this.ui.score, runStats);
        }
        const best = (typeof Highscores !== 'undefined') ? Highscores.get(this.gameMode) : 0;

        // Submit to GameVolt leaderboard (always use 'default' mode for the
        // global leaderboard — local highscores keep per-mode granularity)
        if (window.GameVolt) {
            GameVolt.leaderboard.submit(this.ui.score, { mode: 'default' });
        }

        // Notify portal via postMessage
        if (typeof gvPost === 'function') {
            gvPost('game_over', { score: this.ui.score, mode: this.gameMode, wave: this.waves ? this.waves.getDifficulty() : 0 });
        }

        // End play-time tracking
        if (typeof GameVoltTracker !== 'undefined' && GameVoltTracker.startTime) {
            GameVoltTracker.end({ score: this.ui.score, outcome: 'game_over' });
        }

        // Hold on the explosion + shard spread for ~1.3s before fading the
        // game-over screen in. Music takes over earlier so its swell
        // carries into the modal reveal.
        setTimeout(() => {
            this.audio.playMusic('gameover_theme');
        }, 500);
        setTimeout(() => {
            this.ui.showGameOver(this.waves.getDifficulty(), this.ui.score, best, isNewHigh, runStats);
        }, 3200);

        // Game over menu state — input lockout covers the full sequence
        this.gameOverActive = true;
        this.gameOverSelectedIndex = 0;
        this.gameOverLockoutTimer = 4.0;

        // Snapshot keys currently held — they must be released before counting as a press
        this.gameOverHeldKeys = new Set();
        for (const code in this.keys) {
            if (this.keys[code]) this.gameOverHeldKeys.add(code);
        }

        // Snapshot gamepad buttons currently held
        this._gameOverGpHeld = new Set();
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;
            for (let i = 0; i < gp.buttons.length; i++) {
                if (gp.buttons[i] && gp.buttons[i].pressed) {
                    this._gameOverGpHeld.add(i);
                }
            }
            // Also block axes that are currently outside deadzone
            this._gameOverGpAxisHeld = {};
            if (gp.axes[0] < -0.5 || gp.axes[0] > 0.5) this._gameOverGpAxisHeld.x = true;
            if (gp.axes[1] < -0.5 || gp.axes[1] > 0.5) this._gameOverGpAxisHeld.y = true;
            break;
        }
        if (!this._gameOverGpAxisHeld) this._gameOverGpAxisHeld = {};
        this._gameOverGpPrev = {};

        document.getElementById('gameOverScreen').classList.add('locked');
        this.updateGameOverSelection();
    }

    updateGameOverSelection() {
        const items = document.querySelectorAll('.gameover-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.gameOverSelectedIndex);
        });
    }

    navigateGameOver(dir) {
        const items = document.querySelectorAll('.gameover-item');
        if (items.length === 0) return;
        this.gameOverSelectedIndex = (this.gameOverSelectedIndex + dir + items.length) % items.length;
        this.updateGameOverSelection();
        if (this.audio) this.audio.playMenuNavigate && this.audio.playMenuNavigate();
    }

    executeGameOverAction() {
        const items = document.querySelectorAll('.gameover-item');
        const action = items[this.gameOverSelectedIndex]?.getAttribute('data-action');
        if (this.audio && this.audio.playMenuSelect) this.audio.playMenuSelect();
        if (action === 'restart') {
            this.resetAndStartMode(this.gameMode);
        } else if (action === 'mainmenu') {
            this.resetToMainMenu();
        }
    }

    handleGameOverGamepad() {
        if (!this.gameOverActive) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) { if (g) { gp = g; break; } }
        if (!gp) return;

        // Always run release detection — even during lockout — so that held
        // buttons get cleared the moment they're released.
        for (const i of [0, 1, 12, 13]) {
            if (this._gameOverGpHeld.has(i) && !(gp.buttons[i] && gp.buttons[i].pressed)) {
                this._gameOverGpHeld.delete(i);
            }
        }
        if (Math.abs(gp.axes[1]) < 0.3) this._gameOverGpAxisHeld.y = false;

        // Suppress all button activations during lockout window
        if (this.gameOverLockoutTimer > 0) {
            // While locked, keep marking any pressed button as "still held"
            // so they must be released after lockout before they count.
            for (const i of [0, 1, 12, 13]) {
                if (gp.buttons[i] && gp.buttons[i].pressed) {
                    this._gameOverGpHeld.add(i);
                }
            }
            if (Math.abs(gp.axes[1]) > 0.5) this._gameOverGpAxisHeld.y = true;
            return;
        }

        const upBtn = (gp.buttons[12] && gp.buttons[12].pressed);
        const downBtn = (gp.buttons[13] && gp.buttons[13].pressed);
        const stickUp = gp.axes[1] < -0.5;
        const stickDown = gp.axes[1] > 0.5;
        const confirmBtn0 = gp.buttons[0] && gp.buttons[0].pressed;
        const confirmBtn1 = gp.buttons[1] && gp.buttons[1].pressed;

        const upActive = (upBtn || stickUp) && !this._gameOverGpAxisHeld.y &&
                         !this._gameOverGpHeld.has(12);
        if (upActive && !this._gameOverGpPrev.up) this.navigateGameOver(-1);

        const downActive = (downBtn || stickDown) && !this._gameOverGpAxisHeld.y &&
                           !this._gameOverGpHeld.has(13);
        if (downActive && !this._gameOverGpPrev.down) this.navigateGameOver(1);

        const confirmActive = (confirmBtn0 && !this._gameOverGpHeld.has(0)) ||
                              (confirmBtn1 && !this._gameOverGpHeld.has(1));
        if (confirmActive && !this._gameOverGpPrev.confirm) {
            this.executeGameOverAction();
        }

        this._gameOverGpPrev = {
            up: upActive,
            down: downActive,
            confirm: confirmActive
        };
    }

    setupGameOverTouch() {
        if (this._gameOverTouchBound) return;
        this._gameOverTouchBound = true;
        const handler = (e) => {
            if (!this.gameOverActive) return;
            if (this.gameOverLockoutTimer > 0) return;
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const item = target ? target.closest('.gameover-item') : null;
            if (item) {
                const items = document.querySelectorAll('.gameover-item');
                const idx = Array.from(items).indexOf(item);
                if (idx >= 0) {
                    this.gameOverSelectedIndex = idx;
                    this.updateGameOverSelection();
                    this.executeGameOverAction();
                    e.preventDefault();
                }
            }
        };
        document.addEventListener('touchend', handler, { passive: false });
        document.addEventListener('click', handler);
    }

    handleGameOverKeydown(e) {
        if (!this.gameOverActive) return false;
        if (this.gameOverLockoutTimer > 0) return true; // swallow input during lockout

        // If this key was held when game over started, ignore until released
        if (this.gameOverHeldKeys.has(e.code)) return true;

        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            this.navigateGameOver(-1);
            return true;
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.navigateGameOver(1);
            return true;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
            this.executeGameOverAction();
            return true;
        }
        return false;
    }

    toggleShipDebugPanel() {
        const panel = document.getElementById('shipDebugPanel');
        if (!panel) return;
        const open = panel.style.display === 'none';
        panel.style.display = open ? 'block' : 'none';
        if (open) this.buildShipDebugPanel();
    }

    buildShipDebugPanel() {
        const content = document.getElementById('shipDebugContent');
        if (!content) return;
        const meshes = this._shipMeshes || (this.player && this.player.shipMeshes) || [];
        content.innerHTML = '';

        if (meshes.length === 0) {
            content.innerHTML = '<div style="opacity:0.6;">No ship loaded. Start a game first.</div>';
            return;
        }

        meshes.forEach((mesh, idx) => {
            const m = mesh.material;
            const row = document.createElement('div');
            row.style.cssText = 'border-top:1px solid rgba(0,255,255,0.2); padding:6px 0; margin-top:6px;';
            const name = mesh.name || `(mesh #${idx})`;
            const colorHex = m.color ? `#${m.color.getHexString()}` : '-';
            const emissiveHex = m.emissive ? `#${m.emissive.getHexString()}` : '-';
            const sideLabel = m.side === THREE.DoubleSide ? 'Double' : m.side === THREE.BackSide ? 'Back' : 'Front';

            row.innerHTML = `
                <div style="font-weight:bold; color:#ffff00;">[${idx}] ${name}</div>
                <div style="opacity:0.7;">type=${m.type}, color=${colorHex}, side=${sideLabel}</div>
                <div style="opacity:0.7;">emissive=${emissiveHex} i=${(m.emissiveIntensity||0).toFixed(2)}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                    <button data-a="hide" data-i="${idx}">Hide</button>
                    <button data-a="opaque" data-i="${idx}">Opaque</button>
                    <button data-a="strip-emissive" data-i="${idx}">No Emissive</button>
                    <button data-a="front" data-i="${idx}">Side=Front</button>
                </div>
                <div style="margin-top:4px;">Opacity <input type="range" min="0" max="1" step="0.05" value="${m.opacity}" data-prop="opacity" data-i="${idx}" style="width:100%;"><span data-val="opacity-${idx}">${m.opacity.toFixed(2)}</span></div>
                <div>EmissInt <input type="range" min="0" max="3" step="0.05" value="${m.emissiveIntensity||0}" data-prop="emissiveIntensity" data-i="${idx}" style="width:100%;"><span data-val="emissiveIntensity-${idx}">${(m.emissiveIntensity||0).toFixed(2)}</span></div>
                <div>Metal <input type="range" min="0" max="1" step="0.05" value="${m.metalness||0}" data-prop="metalness" data-i="${idx}" style="width:100%;"><span data-val="metalness-${idx}">${(m.metalness||0).toFixed(2)}</span></div>
                <div>Rough <input type="range" min="0" max="1" step="0.05" value="${m.roughness||0}" data-prop="roughness" data-i="${idx}" style="width:100%;"><span data-val="roughness-${idx}">${(m.roughness||0).toFixed(2)}</span></div>
            `;
            content.appendChild(row);
        });

        // Wire up controls
        content.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-a]');
            if (!btn) return;
            const i = parseInt(btn.getAttribute('data-i'));
            const action = btn.getAttribute('data-a');
            const mesh = meshes[i];
            if (!mesh) return;
            if (action === 'hide') { mesh.visible = !mesh.visible; btn.textContent = mesh.visible ? 'Hide' : 'Show'; }
            else if (action === 'opaque') {
                mesh.material.transparent = false;
                mesh.material.opacity = 1.0;
                mesh.material.depthWrite = true;
                mesh.material.needsUpdate = true;
            }
            else if (action === 'strip-emissive') {
                if (mesh.material.emissive) mesh.material.emissive.setHex(0x000000);
                mesh.material.emissiveIntensity = 0;
                mesh.material.needsUpdate = true;
            }
            else if (action === 'front') {
                mesh.material.side = THREE.FrontSide;
                mesh.material.needsUpdate = true;
            }
        });
        content.addEventListener('input', (e) => {
            const slider = e.target.closest('input[data-prop]');
            if (!slider) return;
            const i = parseInt(slider.getAttribute('data-i'));
            const prop = slider.getAttribute('data-prop');
            const v = parseFloat(slider.value);
            const mesh = meshes[i];
            if (!mesh) return;
            mesh.material[prop] = v;
            mesh.material.needsUpdate = true;
            const valEl = content.querySelector(`[data-val="${prop}-${i}"]`);
            if (valEl) valEl.textContent = v.toFixed(2);
        });
    }

    toggleFullscreen() {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
            if (req) req.call(el);
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
            if (exit) exit.call(document);
        }
    }

    // ── Attract Mode (animated menu background) ────────────
    startAttractMode() {
        const am = {
            asteroids: [],
            drones: [],
            projectiles: [],
            shipMesh: null,
            shipPos: new Vector2D(0, 0),
            shipVel: new Vector2D(0, 0),
            shipAngle: Math.random() * Math.PI * 2,
            shipSpeed: 0,
            shootCooldown: 0,
            droneTimer: 12 + Math.random() * 8,
            active: true
        };

        // Spawn 6-8 drifting asteroids
        const count = 6 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            this._attractSpawnAsteroid(am);
        }

        // Load a random ship from the catalog for the AI demo
        const shipGroup = new THREE.Group();
        shipGroup.position.set(0, 0.5, 0);
        this.scene.add(shipGroup);
        am.shipMesh = shipGroup;

        if (typeof Ships !== 'undefined' && THREE.GLTFLoader) {
            const catalog = Ships.CATALOG;
            const pick = catalog[Math.floor(Math.random() * catalog.length)];
            const loader = new THREE.GLTFLoader();
            if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
            loader.load(pick.path, (gltf) => {
                if (!am.active) return; // attract mode already stopped
                const model = gltf.scene;
                if (pick.rotateY) {
                    const rotMat = new THREE.Matrix4().makeRotationY(pick.rotateY);
                    model.traverse(c => { if (c.isMesh && c.geometry) c.geometry.applyMatrix4(rotMat); });
                }
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3(); box.getSize(size);
                const center = new THREE.Vector3(); box.getCenter(center);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 10.5 / maxDim;
                model.scale.set(scale, scale, scale);
                model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
                model.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material.emissive = c.material.color.clone();
                        c.material.emissiveIntensity = 0.4;
                    }
                });
                shipGroup.add(model);

                // Engine flames
                const flameMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6 });
                const flameGeo = new THREE.ConeGeometry(0.2, 1.5, 6);
                const backZ = (box.min.z - center.z) * scale;
                for (const xOff of [-0.8, 0.8]) {
                    const flame = new THREE.Mesh(flameGeo, flameMat.clone());
                    flame.rotation.x = -Math.PI / 2;
                    flame.position.set(xOff, 0, backZ - 0.5);
                    shipGroup.add(flame);
                }
            });
        }

        this._attractMode = am;

        // Start game loop if not already running (for attract rendering)
        this.lastTime = Date.now();
        if (!this._loopStarted) {
            this._loopStarted = true;
            this.gameLoop();
        }
    }

    stopAttractMode() {
        const am = this._attractMode;
        if (!am || !am.active) return;

        for (const ast of am.asteroids) {
            ast.destroy();
        }
        for (const drone of am.drones) {
            drone.destroy();
        }
        for (const proj of am.projectiles) {
            proj.destroy();
        }
        if (am.shipMesh) this.scene.remove(am.shipMesh);
        if (this.particles) this.particles.clear();

        am.active = false;
        this._attractMode = null;
    }

    _attractSpawnAsteroid(am) {
        const b = BOUNDS;
        const side = Math.floor(Math.random() * 4);
        let x, z;
        switch (side) {
            case 0: x = b.minX; z = (Math.random() - 0.5) * 150; break;
            case 1: x = b.maxX; z = (Math.random() - 0.5) * 150; break;
            case 2: x = (Math.random() - 0.5) * 150; z = b.minZ; break;
            case 3: x = (Math.random() - 0.5) * 150; z = b.maxZ; break;
        }
        const speed = 3 + Math.random() * 5;
        const toCenter = new Vector2D(-x, -z).normalize();
        toCenter.x += (Math.random() - 0.5) * 0.6;
        toCenter.z += (Math.random() - 0.5) * 0.6;
        toCenter.normalize();
        const vel = toCenter.scale(speed);
        const sizes = ['large', 'medium', 'small'];
        const size = sizes[Math.floor(Math.random() * 2)]; // large or medium
        const ast = new Asteroid(new Vector2D(x, z), size, vel, null, this.scene);
        this.scene.add(ast.mesh);
        am.asteroids.push(ast);
    }

    updateAttractMode(dt) {
        const am = this._attractMode;
        if (!am || !am.active) return;

        // Update background planets
        if (this.background) this.background.update(dt);

        // Update particles
        if (this.particles) this.particles.update(dt);

        // ── Asteroids ──
        for (let i = am.asteroids.length - 1; i >= 0; i--) {
            const ast = am.asteroids[i];
            ast.update(dt);
        }
        // Respawn if too few
        while (am.asteroids.length < 6) {
            this._attractSpawnAsteroid(am);
        }

        // ── Supply Drone ──
        am.droneTimer -= dt;
        if (am.droneTimer <= 0) {
            const drone = new SupplyDrone(this.scene);
            this.scene.add(drone.mesh);
            am.drones.push(drone);
            am.droneTimer = 15 + Math.random() * 10;
        }
        for (let i = am.drones.length - 1; i >= 0; i--) {
            am.drones[i].update(dt);
            if (!am.drones[i].isAlive()) {
                am.drones[i].destroy();
                am.drones.splice(i, 1);
            }
        }

        // ── AI Ship ──
        const ship = am;

        // Find nearest asteroid
        let nearest = null;
        let nearDist = Infinity;
        for (const ast of am.asteroids) {
            const d = Math.sqrt(
                (ast.position.x - ship.shipPos.x) ** 2 +
                (ast.position.z - ship.shipPos.z) ** 2
            );
            if (d < nearDist) { nearDist = d; nearest = ast; }
        }

        // Edge avoidance
        const margin = 15;
        const b = BOUNDS;
        let avoidAngle = null;
        if (ship.shipPos.x < b.minX + margin) avoidAngle = 0;
        else if (ship.shipPos.x > b.maxX - margin) avoidAngle = Math.PI;
        if (ship.shipPos.z < b.minZ + margin) avoidAngle = Math.PI / 2;
        else if (ship.shipPos.z > b.maxZ - margin) avoidAngle = -Math.PI / 2;

        // Steering
        const turnRate = 2.5;
        let targetAngle = ship.shipAngle;
        if (avoidAngle !== null) {
            targetAngle = avoidAngle;
        } else if (nearest) {
            targetAngle = Math.atan2(
                nearest.position.x - ship.shipPos.x,
                nearest.position.z - ship.shipPos.z
            );
        }
        let diff = targetAngle - ship.shipAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        ship.shipAngle += Math.sign(diff) * Math.min(Math.abs(diff), turnRate * dt);

        // Thrust
        const accel = 25;
        const maxSpeed = 30;
        ship.shipSpeed = Math.min(maxSpeed, ship.shipSpeed + accel * dt);
        ship.shipVel.x = Math.sin(ship.shipAngle) * ship.shipSpeed;
        ship.shipVel.z = Math.cos(ship.shipAngle) * ship.shipSpeed;
        ship.shipPos.x += ship.shipVel.x * dt;
        ship.shipPos.z += ship.shipVel.z * dt;

        // Wrap around
        updateWrapAround(ship.shipPos.x !== undefined ? { position: ship.shipPos, radius: 2 } : ship);

        // Update mesh
        if (am.shipMesh) {
            am.shipMesh.position.set(ship.shipPos.x, 0.5, ship.shipPos.z);
            am.shipMesh.rotation.y = ship.shipAngle;

            // Animate engine flames
            for (let i = 1; i < am.shipMesh.children.length; i++) {
                const flame = am.shipMesh.children[i];
                const flicker = 0.8 + Math.random() * 0.4;
                flame.scale.set(1, 1, 1.2 + Math.random() * 0.6);
                flame.material.opacity = 0.5 * flicker;
            }
        }

        // Thrust particles
        if (this.particles) {
            const thrustPos = new Vector2D(
                ship.shipPos.x - Math.sin(ship.shipAngle) * 3,
                ship.shipPos.z - Math.cos(ship.shipAngle) * 3
            );
            const thrustDir = new Vector2D(-Math.sin(ship.shipAngle), -Math.cos(ship.shipAngle));
            this.particles.createThrust(thrustPos, thrustDir);
        }

        // ── Shooting ──
        ship.shootCooldown -= dt;
        if (nearest && nearDist < 35 && ship.shootCooldown <= 0) {
            // Check if facing target
            const facingDiff = Math.abs(diff);
            if (facingDiff < 0.3) {
                const speed = 60;
                const spawnDist = 4;
                const pos = new Vector2D(
                    ship.shipPos.x + Math.sin(ship.shipAngle) * spawnDist,
                    ship.shipPos.z + Math.cos(ship.shipAngle) * spawnDist
                );
                const vel = new Vector2D(
                    Math.sin(ship.shipAngle) * speed,
                    Math.cos(ship.shipAngle) * speed
                );
                const proj = new Projectile(pos, vel, this.scene);
                this.scene.add(proj.mesh);
                am.projectiles.push(proj);
                ship.shootCooldown = 0.4;
            }
        }

        // ── Projectile update + collision ──
        for (let i = am.projectiles.length - 1; i >= 0; i--) {
            const proj = am.projectiles[i];
            proj.update(dt);
            if (!proj.isAlive()) {
                proj.destroy();
                am.projectiles.splice(i, 1);
                continue;
            }
            // Check vs asteroids
            for (let j = am.asteroids.length - 1; j >= 0; j--) {
                const ast = am.asteroids[j];
                if (checkCollision(proj.position, proj.radius, ast.position, ast.radius)) {
                    // Full explosion matching gameplay quality
                    if (this.particles) {
                        const pos = ast.position.clone();
                        this.particles.createCrackFlash(pos, ast.radius);
                        if (ast.size === 'large') {
                            this.particles.createExplosion(pos, 0xffaa33, 20);
                            this.particles.createExplosion(pos, 0xff4400, 8);
                            this.particles.createShockwave(pos, 0xff8844, 16, 0.35);
                        } else {
                            this.particles.createExplosion(pos, 0xff6600, 14);
                        }
                        const dc = { 'large': 8, 'medium': 5, 'small': 3 }[ast.size];
                        this.particles.createDebris(pos, dc, ast.radius);
                        this.particles.createScorch(pos, ast.radius);
                    }
                    ast.destroy();
                    am.asteroids.splice(j, 1);
                    proj.destroy();
                    am.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Update player light to follow AI ship
        if (this.playerLight) {
            this.playerLight.position.set(ship.shipPos.x, 3, ship.shipPos.z);
            this.playerLight.intensity = 1.5 + Math.random() * 0.5;
            this.playerLight.color.setHex(0x44ccff);
        }

        // Subtle camera drift — slowly follows the AI ship
        const camLerp = 1 - Math.exp(-dt * 0.8);
        this.camera.position.x += (ship.shipPos.x * 0.15 - this.camera.position.x) * camLerp;
        this.camera.position.z += (ship.shipPos.z * 0.15 - this.camera.position.z) * camLerp;
    }

    togglePause() {
        if (!this.gameActive && !this.paused) return; // game over, ignore
        this.paused = !this.paused;
        const screen = document.getElementById('pauseScreen');
        if (this.paused) {
            this.gameActive = false;
            screen.style.display = 'flex';
            this.pauseSelectedIndex = 0;
            this.updatePauseSelection();
        } else {
            // Resuming — make sure the help shortcut is closed too
            if (this._pauseHelpActive) {
                const hp = document.getElementById('howToPlayScreen');
                if (hp) hp.style.display = 'none';
                this._pauseHelpActive = false;
            }
            this.gameActive = true;
            screen.style.display = 'none';
            this.lastTime = Date.now(); // reset dt to avoid jump
        }
    }

    updatePauseSelection() {
        const items = document.querySelectorAll('.pause-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.pauseSelectedIndex);
        });
    }

    handlePauseInput() {
        if (!this.paused) return;
        const items = document.querySelectorAll('.pause-item');

        // Keyboard
        // (handled in keydown listener for Escape, arrows and enter handled here via keys state)

        // Gamepad
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) { if (g) { gp = g; break; } }

        if (gp) {
            const up = (gp.buttons[12] && gp.buttons[12].pressed) || (gp.axes[1] < -0.5);
            const down = (gp.buttons[13] && gp.buttons[13].pressed) || (gp.axes[1] > 0.5);
            // While the help shortcut is open, B should back out instead of
            // counting as confirm. Confirm-on-A only when help is closed.
            const aPressed = (gp.buttons[0] && gp.buttons[0].pressed);
            const bPressed = (gp.buttons[1] && gp.buttons[1].pressed);
            const confirm = this._pauseHelpActive ? aPressed : (aPressed || bPressed);
            const startBtn = (gp.buttons[9] && gp.buttons[9].pressed);

            // B back-out from the help shortcut
            if (this._pauseHelpActive && bPressed && !this._pauseGpPrev.b) {
                this._hidePauseHelp();
            }

            if (up && !this._pauseGpPrev.up && !this._pauseHelpActive) {
                this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + items.length) % items.length;
                this.updatePauseSelection();
            }
            if (down && !this._pauseGpPrev.down && !this._pauseHelpActive) {
                this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % items.length;
                this.updatePauseSelection();
            }
            if (confirm && !this._pauseGpPrev.confirm && !this._pauseHelpActive) {
                this.executePauseAction();
            }
            if (startBtn && !this._pauseGpPrev.start && !this._pauseHelpActive) {
                this.togglePause(); // resume
            }

            this._pauseGpPrev = { up, down, confirm, start: startBtn, b: bPressed };
        }
    }

    executePauseAction() {
        const items = document.querySelectorAll('.pause-item');
        const action = items[this.pauseSelectedIndex]?.getAttribute('data-action');
        if (action === 'resume') {
            this.togglePause();
        } else if (action === 'howtoplay') {
            this._showPauseHelp();
        } else if (action === 'restart') {
            this.resetAndStartMode(this.gameMode);
        } else if (action === 'mainmenu') {
            this.resetToMainMenu();
        }
    }

    // Pause-menu HOW TO PLAY shortcut: hide the pause panel, show the
    // shared controls overview, set a flag so ESC / B returns here instead
    // of toggling the pause back on.
    _showPauseHelp() {
        const ps = document.getElementById('pauseScreen');
        const hp = document.getElementById('howToPlayScreen');
        if (ps) ps.style.display = 'none';
        if (hp) hp.style.display = 'flex';
        this._pauseHelpActive = true;

        // Touch handler for BACK button inside how-to-play during pause
        if (!this._pauseHelpTouchBound) {
            this._pauseHelpTouchBound = true;
            const handler = (e) => {
                if (!this._pauseHelpActive) return;
                const touch = e.changedTouches ? e.changedTouches[0] : e;
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const item = target ? target.closest('.menu-item') : null;
                if (item && item.getAttribute('data-mode') === 'back') {
                    this._hidePauseHelp();
                    e.preventDefault();
                }
            };
            document.addEventListener('touchend', handler, { passive: false });
            document.addEventListener('click', handler);
        }
    }

    _hidePauseHelp() {
        const ps = document.getElementById('pauseScreen');
        const hp = document.getElementById('howToPlayScreen');
        if (hp) hp.style.display = 'none';
        if (ps) ps.style.display = 'flex';
        this._pauseHelpActive = false;
    }
}

// Start game when page loads
function initGame() {
    // THREE should be available since we load it locally
    const maxRetries = 5;
    let retries = 0;
    
    function tryInit() {
        if (typeof window.THREE === 'undefined') {
            retries++;
            if (retries < maxRetries) {
                console.log(`Waiting for Three.js... (attempt ${retries})`);
                setTimeout(tryInit, 100);
                return;
            } else {
                console.error('Three.js failed to load after', maxRetries, 'attempts');
                const loadingMsg = document.getElementById('loadingMessage');
                if (loadingMsg) {
                    loadingMsg.textContent = 'Error: Three.js failed to load';
                    loadingMsg.style.color = '#ff0000';
                }
                return;
            }
        }
        
        console.log('✓ Three.js is available');

        // Hide loading message
        const loadingMsg = document.getElementById('loadingMessage');
        if (loadingMsg) {
            loadingMsg.style.display = 'none';
        }

        // Hide HUD until game starts
        document.querySelectorAll('.cockpit-corner, .edge-bar, #hudTop, #hudBottomLeft, #hudBottomRight, #hudLeftDeco, #hudRightDeco, #scanlines, #vignette, #crtFlicker').forEach(
            el => el.style.display = 'none'
        );

        try {
            const game = new Game();
            game.init();

            // Show main menu (restarts are now in-place — no reload path needed)
            const menu = new MenuSystem();
            window.menuSystem = menu;

            // Reflect persisted mute state in the indicator on first paint
            if (game.audio && game.audio.muted) {
                const ind = document.getElementById('muteIndicator');
                if (ind) ind.classList.add('show');
            }

            // ===== GameVolt SDK integration =====
            if (window.GameVolt) {
                GameVolt.init('asteroid-storm');
                GameVolt.save.registerMigration({
                    keys: ['astroidStorm.highscores', 'astroidStorm.achievements', 'astroidStorm.achievementStats'],
                    merge: function(local, cloud) {
                        // Highscores: merge per-mode top-10 lists
                        var lh = local['astroidStorm.highscores'] || {};
                        var ch = cloud || {};
                        var merged = {};
                        var allModes = new Set(Object.keys(lh).concat(Object.keys(ch)));
                        allModes.forEach(function(mode) {
                            var localEntries = Array.isArray(lh[mode]) ? lh[mode] : (typeof lh[mode] === 'number' && lh[mode] > 0 ? [{ score: lh[mode], date: null, stats: null }] : []);
                            var cloudEntries = Array.isArray(ch[mode]) ? ch[mode] : (typeof ch[mode] === 'number' && ch[mode] > 0 ? [{ score: ch[mode], date: null, stats: null }] : []);
                            var all = localEntries.concat(cloudEntries);
                            all.sort(function(a, b) { return b.score - a.score; });
                            // Deduplicate by score+date
                            var seen = {};
                            merged[mode] = all.filter(function(e) {
                                var key = e.score + '|' + (e.date || '');
                                if (seen[key]) return false;
                                seen[key] = true;
                                return true;
                            }).slice(0, 10);
                        });
                        return merged;
                    },
                    getScores: function(local) {
                        var hs = local['astroidStorm.highscores'];
                        if (!hs) return [];
                        var scores = [];
                        for (var mode in hs) {
                            var entries = Array.isArray(hs[mode]) ? hs[mode] : [];
                            if (entries.length > 0) {
                                scores.push({ score: entries[0].score, mode: mode });
                            }
                        }
                        return scores;
                    },
                    getAchievements: function(local) {
                        var achs = local['astroidStorm.achievements'];
                        if (!achs || typeof achs !== 'object') return [];
                        return Object.keys(achs).map(function(id) {
                            return { id: id, unlocked_at: achs[id] };
                        });
                    }
                });
            }

            // Start play-time tracker
            if (typeof GameVoltTracker !== 'undefined') {
                GameVoltTracker.start('AsteroidStorm');
            }

            console.log('✓ Asteroid Storm initialized successfully!');
        } catch (error) {
            console.error('✗ Failed to initialize game:', error);
            console.error('Stack:', error.stack);
            
            const loadingMsg = document.getElementById('loadingMessage');
            if (loadingMsg) {
                loadingMsg.textContent = 'Error: ' + error.message;
                loadingMsg.style.color = '#ff0000';
                loadingMsg.style.display = 'block';
            }
        }
    }
    
    tryInit();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM already loaded
    setTimeout(initGame, 100);
}
