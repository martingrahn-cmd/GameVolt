// ==============================
// Snake — Multi-Mode Entrypoint
// ==============================

// Stop old loops
if (window.__snakeLoopId) {
    cancelAnimationFrame(window.__snakeLoopId);
    window.__snakeLoopId = null;
}

import { Game } from "./game.js";
import { MenuScreen } from "./menu.js";
import { Input } from "./input.js";

import { audioNokia }     from "./nokia/audio_nokia.js";
import { SnakeNokia }     from "./nokia/snake_nokia.js";
import { RendererNokia }  from "./nokia/renderer_nokia.js";
import { HudNokia }       from "./nokia/hud_nokia.js";
import { ScoringNokia }   from "./nokia/scoring_nokia.js";

import { Snake16bit }     from "./16bit/snake_16bit.js";
import { Renderer16bit }  from "./16bit/renderer_16bit.js";
import { Hud16bit }       from "./16bit/hud_16bit.js";
import { Scoring16bit }   from "./16bit/scoring_16bit.js";
import { Food16bit }      from "./16bit/food_16bit.js";
import { Tutorial16bit }  from "./16bit/tutorial_16bit.js";
import { GameOver16bit }  from "./16bit/gameover_16bit.js";

import { audioNeo }       from "./audio.js";
import { audioNeoSFX }    from "./audio_neo_sfx.js";

import { Themes } from "./themes.js";

// ------------------------------------------------------------
// AUDIO UNLOCK FOR iOS (first touch/click)
// ------------------------------------------------------------
let audioUnlocked = false;

async function unlockAudio(mode) {
    if (audioUnlocked) return;
    audioUnlocked = true;
    
    if (mode === "neo") {
        await audioNeo.unlock();
        console.log("🔓 Neo audio unlocked");
    } else {
        audioNokia.unlock();
        console.log("🔓 Nokia audio unlocked");
    }
}

// ------------------------------------------------------------
// Patch motor beroende på mode
// ------------------------------------------------------------
function patchGameForMode(mode) {

    if (mode === "neo") {
        Themes.set("synth");
        // Neo uses default renderer with Background effects
        // and default Hud from game.js
        return;
    }

    if (mode === "nokia") {
        Themes.set("3310");

        // Snake override
        Game.prototype.createSnake = function (sx, sy, dir) {
            return new SnakeNokia(sx, sy, dir);
        };

        // Renderer override
        Game.prototype.createRenderer = function (canvas) {
            return new RendererNokia(canvas, this.grid);
        };

        // HUD override (Nokia uses its own HUD)
        Game.prototype.createHud = function (canvas) {
            return new HudNokia(this, canvas);
        };

        // Scoring override (simple 1 point per food)
        Game.prototype.createScoring = function () {
            return new ScoringNokia();
        };
        
        // Endless mode - no level progression
        const originalInit = Game.prototype.init;
        Game.prototype.init = async function(canvas) {
            await originalInit.call(this, canvas);
            this.endlessMode = true;
            this.highscoreManager.setMode("nokia");
            
            // Play Nokia ringtone at game start!
            audioNokia.playRingtone();
        };

        // SOUND HOOKS (matchar AudioNokia)
        // No move sound - only eat and crash
        Game.prototype.onEat   = () => audioNokia.eat();
        Game.prototype.onCrash = () => audioNokia.crash();
    }

    if (mode === "16bit") {
        Themes.set("synth");
        
        // Snake override (wraparound)
        Game.prototype.createSnake = function (sx, sy, dir) {
            const snake = new Snake16bit(sx, sy, dir, this.grid.w, this.grid.h);
            return snake;
        };

        // Renderer override
        Game.prototype.createRenderer = function (canvas) {
            return new Renderer16bit(canvas, this.grid);
        };

        // HUD override (minimal - renderer handles UI)
        Game.prototype.createHud = function (canvas) {
            return new Hud16bit(this);
        };

        // Scoring override (chain combo system)
        Game.prototype.createScoring = function () {
            return new Scoring16bit();
        };

        // Food override (5 fruits + queue)
        Game.prototype.createFood = function () {
            return new Food16bit(this.grid);
        };
        
        // Store tutorial and game over references
        let tutorial16bit = null;
        let gameOver16bit = null;
        
        // Override init for 16-bit specific setup
        const originalInit16 = Game.prototype.init;
        Game.prototype.init = async function(canvas) {
            this.canvas = canvas;
            this.mode16bit = true;
            
            // Responsive grid based on screen orientation
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isPortrait = vh > vw;
            
            // Portrait: taller grid (24×32), Landscape/Desktop: wider grid (32×24)
            const gridW = isPortrait ? 24 : 32;
            const gridH = isPortrait ? 32 : 24;
            const startX = isPortrait ? 12 : 5;
            const startY = isPortrait ? 5 : 12;
            
            // Load a simple level (no walls for 16-bit)
            this.level = {
                gridWidth: gridW,
                gridHeight: gridH,
                start: [startX, startY],
                startDir: "right",
                walls: [],
                foodNeeded: 999
            };

            // Grid
            this.grid = { w: this.level.gridWidth, h: this.level.gridHeight };
            
            // Scoring
            this.scoring = this.createScoring();
            this.scoring.reset();

            // Renderer
            this.renderer = this.createRenderer(canvas);
            if (this.renderer.resize) this.renderer.resize();

            // Snake
            const [sx, sy] = this.level.start;
            this.snake = this.createSnake(sx, sy, this.level.startDir);
            this.snake.setGridSize(this.grid.w, this.grid.h);

            // Food (5 fruits + queue system)
            this.food = this.createFood();
            this.food.init(this.snake);

            // HUD
            this.hud = this.createHud(canvas);

            // Input
            this.input = new Input(
                dir => this._handleDirection(dir),
                action => this._handleAction(action)
            );

            // Mode flags
            this.endlessMode = true;
            this.wraparoundMode = true;
            
            // Highscore
            this.highscoreManager.setMode("16bit");
            
            // Game over screen
            gameOver16bit = new GameOver16bit();
            
            // Tutorial (first time only)
            tutorial16bit = new Tutorial16bit();
            
            // Resize handler
            window.addEventListener("resize", () => {
                if (this.renderer.resize) this.renderer.resize();
            });

            // State
            this.state = "tutorial";
            this.last = performance.now();

            console.log("✅ 16-bit Fruit Chain initialized!");
            
            // Show tutorial, then start game AND music (after user gesture)
            tutorial16bit.show(() => {
                this.state = "playing";
                this.last = performance.now();
                this._startLoop();
                
                // Start music HERE - after user has clicked to dismiss tutorial
                start16bitMusic();
            });
        };

        // Override game loop for 16-bit specific logic
        Game.prototype._startLoop = function() {
            const loop = (now) => {
                window.__snakeLoopId = requestAnimationFrame(loop);
                
                const dt = Math.min((now - this.last) / 1000, 0.1);
                this.last = now;
                
                if (this.state === "playing") {
                    this._update16bit(dt);
                }
                
                this._render16bit(dt);
            };
            
            loop(performance.now());
        };

        // 16-bit specific update
        Game.prototype._update16bit = function(dt) {
            // Update snake
            this.snake.update(dt);
            
            // Update snake speed based on scoring
            this.snake.stepTime = this.scoring.getCurrentSpeed();

            const head = this.snake.gridHead();

            // Self collision
            if (this.snake.hitsSelf()) {
                if (window.audioNeoSFX) window.audioNeoSFX.crash();
                this._gameOver16bit();
                return;
            }

            // Check lock-in zone
            if (this.food.checkLockIn(head) && this.scoring.canLockIn()) {
                this._lockIn();
                return;
            }

            // Check fruit collision
            const fruit = this.food.checkCollision(head);
            if (fruit) {
                const result = this.food.eat(fruit, this.snake);
                this.snake.grow(1);
                
                if (result.correct) {
                    const scoreResult = this.scoring.eatCorrect();
                    
                    // Visual effects
                    if (window.audioNeoSFX) window.audioNeoSFX.eat();
                    
                    const fruitX = this.renderer.offsetX + fruit.x * this.renderer.cell + this.renderer.cell/2;
                    const fruitY = this.renderer.offsetY + fruit.y * this.renderer.cell + this.renderer.cell/2;
                    
                    this.renderer.addParticles(fruitX, fruitY, 8, '#44ff88');
                    this.renderer.addFloatingMessage(`+${scoreResult.points}`, fruitX, fruitY, '#44ff88');
                    
                    // Level up effects
                    if (scoreResult.levelUp) {
                        this.renderer.triggerScreenShake(8);
                        this.renderer.triggerScreenFlash('#44ff88', 0.3);
                        this.renderer.addFloatingMessage(scoreResult.levelUp.name, this.renderer.viewW/2, this.renderer.viewH/2, '#ffff44');
                        if (window.audioNeoSFX) window.audioNeoSFX.combo(scoreResult.multiplier);
                    }
                    
                } else {
                    const scoreResult = this.scoring.eatWrong();
                    
                    // Wrong fruit effects
                    if (window.audioNeoSFX) window.audioNeoSFX.impact();
                    
                    const fruitX = this.renderer.offsetX + fruit.x * this.renderer.cell + this.renderer.cell/2;
                    const fruitY = this.renderer.offsetY + fruit.y * this.renderer.cell + this.renderer.cell/2;
                    
                    this.renderer.addParticles(fruitX, fruitY, 5, '#ff4444');
                    this.renderer.addFloatingMessage('WRONG!', fruitX, fruitY, '#ff4444');
                    this.renderer.triggerScreenShake(5);
                    
                    if (scoreResult.lostChain > 0) {
                        this.renderer.addFloatingMessage(`-${scoreResult.lostChain} chain`, fruitX, fruitY - 30, '#ff8844');
                    }
                }
            }
        };

        // Lock-in handler
        Game.prototype._lockIn = function() {
            const result = this.scoring.lockIn();
            
            // Big celebration
            if (window.audioNeoSFX) window.audioNeoSFX.levelComplete();
            
            this.renderer.triggerScreenShake(10);
            this.renderer.triggerScreenFlash('#44ff88', 0.5);
            this.renderer.addFloatingMessage(`LOCKED x${result.multiplier}!`, this.renderer.viewW/2, this.renderer.viewH/3, '#44ff88');
            this.renderer.addFloatingMessage(`+${result.bonus}`, this.renderer.viewW/2, this.renderer.viewH/2, '#ffff44');
            
            // Particle explosion
            const cx = this.renderer.viewW / 2;
            const cy = this.renderer.viewH / 2;
            for (let i = 0; i < 30; i++) {
                this.renderer.addParticles(cx, cy, 1, `hsl(${Math.random() * 360}, 80%, 60%)`);
            }
            
            // Reset for new round
            this.food.resetForNewRound(this.snake);
            
            // Update snake speed for new round
            this.snake.stepTime = this.scoring.getBaseSpeed();
            
            // [AD HOOK] - This is where rewarded ad could be shown
            console.log(`🎯 Round ${result.newRound} - AD HOOK POINT`);
        };

        // 16-bit render
        Game.prototype._render16bit = function(dt) {
            this.renderer.render(this, dt);
        };

        // Game over for 16-bit
        Game.prototype._gameOver16bit = function() {
            this.state = "gameover";
            
            if (window.audioNeoSFX) window.audioNeoSFX.gameOver();
            
            const stats = this.scoring.getFinalStats();
            
            // Check highscore
            if (this.highscoreManager.isHighscore(stats.score)) {
                if (window.audioNeoSFX) window.audioNeoSFX.newHighscore();
                
                this.highscoreEntryScreen.show(
                    stats.score,
                    stats.bestChain,
                    (position) => {
                        // Show highscore list with new entry highlighted
                        this.highscoreListScreen.show(() => {
                            gameOver16bit.show(stats, () => this._restart16bit(), () => this._returnToMenu());
                        }, position);
                    }
                );
            } else {
                gameOver16bit.show(stats, () => this._restart16bit(), () => this._returnToMenu());
            }
        };

        // Restart 16-bit
        Game.prototype._restart16bit = function() {
            this.scoring.reset();
            
            const [sx, sy] = this.level.start;
            this.snake = this.createSnake(sx, sy, this.level.startDir);
            this.snake.setGridSize(this.grid.w, this.grid.h);
            
            this.food.init(this.snake);
            
            this.state = "playing";
            this.last = performance.now();
        };
        
        // Override _handleAction for 16-bit mode (with audio toggles)
        const original_handleAction = Game.prototype._handleAction;
        Game.prototype._handleAction = function(action) {
            // Handle audio toggles in any state
            if (action === "toggleMusic") {
                if (this.renderer?.toggleMusic) {
                    this.renderer.toggleMusic();
                } else {
                    window.dispatchEvent(new CustomEvent('toggleMusic16bit'));
                }
                return;
            }
            if (action === "toggleSFX") {
                if (this.renderer?.toggleSFX) {
                    this.renderer.toggleSFX();
                } else {
                    window.dispatchEvent(new CustomEvent('toggleSFX16bit'));
                }
                return;
            }
            
            // Call original handler for other actions
            original_handleAction.call(this, action);
        };

        // Use Neo SFX
        Game.prototype.onEat = () => {
            if (window.audioNeoSFX) window.audioNeoSFX.eat();
        };
        Game.prototype.onCrash = () => {
            if (window.audioNeoSFX) window.audioNeoSFX.crash();
        };
    }
}

// ------------------------------------------------------------
// START MUSIC (Neo mode)
// ------------------------------------------------------------
async function startNeoMusic() {
    // Try mp3 first (Safari), then ogg (Firefox/Chrome)
    const formats = [
        "./assets/music/music_01.mp3",
        "./assets/music/music_01.ogg"
    ];
    
    for (const url of formats) {
        try {
            await audioNeo.playMusic(url);
            console.log(`🎵 Playing: ${url}`);
            return; // Success, stop trying
        } catch (e) {
            console.log(`⚠️ Failed to play ${url}, trying next...`);
        }
    }
    
    console.log("⚠️ Music autoplay blocked or no supported format");
}

// ------------------------------------------------------------
// START MUSIC (16-bit mode)
// ------------------------------------------------------------
async function start16bitMusic() {
    const url = "./assets/music/music_01_16bit.mp3";
    
    try {
        await audioNeo.playMusic(url);
        console.log(`🎵 Playing 16-bit music: ${url}`);
    } catch (e) {
        console.log("⚠️ 16-bit music autoplay blocked:", e);
    }
}

// Listen for music toggle from game
window.addEventListener("toggleMusic", () => {
    audioNeo.toggleMusic();
    console.log(`🎵 Music: ${audioNeo.isPlaying ? "ON" : "OFF"}`);
});

// Track current game mode
let currentGameMode = null;

// Listen for music on/off from options
window.addEventListener("setMusic", (e) => {
    const enabled = e.detail;
    // Only start Neo music if we're in Neo mode (not Nokia or 16-bit)
    if (enabled && !audioNeo.isPlaying && currentGameMode === "neo") {
        startNeoMusic();
    } else if (!enabled && audioNeo.isPlaying) {
        audioNeo.stopMusic();
    }
    console.log(`🎵 Music: ${enabled ? "ON" : "OFF"}`);
});

// Listen for music resume (restart/continue)
window.addEventListener("resumeMusic", () => {
    // Only resume if we're in a mode with music
    if (currentGameMode === "neo" || currentGameMode === "16bit") {
        audioNeo.resumeMusic();
    }
});

// Listen for sound effects on/off from options
let soundEffectsEnabled = true;
window.addEventListener("setSoundEffects", (e) => {
    soundEffectsEnabled = e.detail;
    audioNokia.setEnabled(soundEffectsEnabled);
    audioNeoSFX.setEnabled(soundEffectsEnabled);
    console.log(`🔊 Sound effects: ${soundEffectsEnabled ? "ON" : "OFF"}`);
});

// Track music enabled state separately (user preference)
let music16bitEnabled = true;

// Listen for 16-bit music toggle (from icons or keyboard)
window.addEventListener("toggleMusic16bit", (e) => {
    music16bitEnabled = !music16bitEnabled;
    
    if (music16bitEnabled) {
        // User wants music ON - start it
        start16bitMusic();
    } else {
        // User wants music OFF - stop it
        audioNeo.stopMusic();
    }
    
    // Sync renderer icon state
    if (window.currentGame?.renderer?.setMusicEnabled) {
        window.currentGame.renderer.setMusicEnabled(music16bitEnabled);
    }
    console.log(`🎵 16-bit Music: ${music16bitEnabled ? "ON" : "OFF"}`);
});

// Listen for 16-bit SFX toggle (from icons or keyboard)
window.addEventListener("toggleSFX16bit", (e) => {
    soundEffectsEnabled = !soundEffectsEnabled;
    audioNeoSFX.setEnabled(soundEffectsEnabled);
    // Sync renderer icon state
    if (window.currentGame?.renderer?.setSFXEnabled) {
        window.currentGame.renderer.setSFXEnabled(soundEffectsEnabled);
    }
    console.log(`🔊 16-bit SFX: ${soundEffectsEnabled ? "ON" : "OFF"}`);
});

// Listen for Nokia music toggle (from icons or keyboard)
window.addEventListener("toggleMusicNokia", (e) => {
    // Nokia doesn't have music yet, but this is ready for when it does
    // For now, toggle the Neo music system if it's playing
    audioNeo.toggleMusic();
    console.log(`🎵 Nokia Music: ${audioNeo.isPlaying ? "ON" : "OFF"}`);
});

// Listen for Nokia SFX toggle (from icons or keyboard)
window.addEventListener("toggleSFXNokia", (e) => {
    soundEffectsEnabled = !soundEffectsEnabled;
    audioNokia.setEnabled(soundEffectsEnabled);
    audioNeoSFX.setEnabled(soundEffectsEnabled);
    console.log(`🔊 Nokia SFX: ${soundEffectsEnabled ? "ON" : "OFF"}`);
});

// Listen for 16-bit pause (from pause icon)
window.addEventListener("pause16bit", () => {
    if (window.currentGame && window.currentGame.state === "playing") {
        window.currentGame._showPause();
    }
});

// Listen for Nokia pause (from pause icon)
window.addEventListener("pauseNokia", () => {
    if (window.currentGame && window.currentGame.state === "playing") {
        window.currentGame._showPause();
    }
});

// Expose audioNeoSFX globally for game.js to use
window.audioNeoSFX = audioNeoSFX;

// Global audio unlock on any user interaction (for stubborn browsers)
let globalUnlockDone = false;
function globalAudioUnlock() {
    if (globalUnlockDone) return;
    globalUnlockDone = true;
    
    audioNeo.unlock();
    audioNokia.unlock();
    console.log("🔓 Global audio unlock triggered");
    
    // Remove listeners after unlock
    document.removeEventListener("click", globalAudioUnlock);
    document.removeEventListener("touchstart", globalAudioUnlock);
    document.removeEventListener("keydown", globalAudioUnlock);
}

document.addEventListener("click", globalAudioUnlock);
document.addEventListener("touchstart", globalAudioUnlock);
document.addEventListener("keydown", globalAudioUnlock);

// ------------------------------------------------------------
// START
// ------------------------------------------------------------
window.addEventListener("load", async () => {
    console.log("🐍 Snake loading...");

    if (window.__snakeGameStarted) {
        console.log("⚠️ Game already started, skipping");
        return;
    }
    window.__snakeGameStarted = true;

    try {
        // MENU
        console.log("📋 Showing menu...");
        const menu = new MenuScreen();
        const mode = await menu.show();
        console.log(`🎮 Selected mode: ${mode}`);

        // Unlock audio on menu selection (user gesture)
        await unlockAudio(mode);

        // Configure engine
        patchGameForMode(mode);
        currentGameMode = mode; // Track current mode for music control
        console.log("⚙️ Engine configured");

        // Start game
        const canvas = document.getElementById("gameCanvas");
        if (!canvas) {
            console.error("❌ Canvas not found!");
            return;
        }
        
        const g = new Game();
        window.currentGame = g; // Expose for pause icon
        console.log("🎯 Starting game...");
        await g.init(canvas);
        console.log("✅ Game initialized!");
        
        // Start music for Neo mode only
        if (mode === "neo") {
            await startNeoMusic();
        }
        
        // 16-bit music is started after tutorial closes (see patchGameForMode)
        // Nokia mode has no music (just ringtone at start)
        
    } catch (err) {
        console.error("❌ Error starting game:", err);
    }
});