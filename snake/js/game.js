// ============================================================
// game.js — Unified Neo/Nokia engine (v6.0)
// With scoring, pause, game over, level progression
// ============================================================

import { Renderer } from "./renderer.js";
import { Grid } from "./grid.js";
import { Snake } from "./snake.js?v=1.9";
import { Food } from "./food.js?v=1.9";
import { Input } from "./input.js?v=1.9";
import { loadLevel } from "./levels.js?v=1.9";
import { Scoring } from "./scoring.js";
import { Hud } from "./hud.js";
import { GameOverScreen } from "./gameover.js?v=1.9";
import { PauseScreen } from "./pause.js";
import { LevelCompleteScreen } from "./levelcomplete.js?v=1.9";
import { OptionsScreen } from "./options.js?v=1.9";
import { recordRun, HighScoresScreen } from "./achievements.js?v=1.9";
import { HighscoreManager } from "./highscore.js?v=1.9";

export class Game {
    constructor() {
        // Core state
        this.canvas = null;
        this.level = null;
        this.grid = null;
        this.renderer = null;
        this.snake = null;
        this.food = null;
        this.initialLevel = null;
        this.input = null;

        // UI
        this.hud = null;
        this.gameOverScreen = new GameOverScreen();
        this.pauseScreen = new PauseScreen();

        // Scoring - created via factory for mode override
        this.scoring = null;

        // Game state
        this.state = "playing"; // "playing", "paused", "gameover", "levelcomplete"
        this.last = 0;
        this.dt = 0; // Delta time for rendering

        // Level progression
        this.currentLevelIndex = 1;
        this.foodEatenThisLevel = 0;
        
        // Mode flags
        this.endlessMode = false;  // No level progression (Nokia/16-bit)
        this.wraparoundMode = false; // No wall collision, snake wraps (16-bit)
        this.gameMode = "neo";

        // Screens
        this.levelCompleteScreen = new LevelCompleteScreen();
        this.optionsScreen = new OptionsScreen();
        // Enable ads: this.levelCompleteScreen.setAdEnabled(true);
        
        // Highscore system — local storage layer + the modern LOCAL/GLOBAL board
        this.highscoreManager = new HighscoreManager();
        this.highScoresScreen = new HighScoresScreen();
        this._sdkPauseSelection = 0;
        
        // Sound hooks are set on prototype by patchGameForMode in main.js
    }

    // ------------------------------------------------------------
    // FACTORIES — Patched by main.js when Nokia mode is selected
    // ------------------------------------------------------------
    createRenderer(canvas) {
        return new Renderer(canvas, this.grid);
    }

    createSnake(startX, startY, dir) {
        return new Snake(startX, startY, dir);
    }

    createHud(canvas) {
        return new Hud(this);
    }

    createScoring() {
        return new Scoring();
    }

    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------
    async init(canvas) {
        this.canvas = canvas;
        this.level = await loadLevel("level01");
        this.initialLevel = JSON.parse(JSON.stringify(this.level));

        // Grid
        this.grid = new Grid(this.level.gridWidth, this.level.gridHeight);
        
        // Scoring (via factory for mode override)
        this.scoring = this.createScoring();
        this.scoring.reset();
        this.foodEatenThisLevel = 0;

        // Renderer
        this.renderer = this.createRenderer(canvas);
        if (this.renderer.resize) this.renderer.resize();

        // Snake
        const [sx, sy] = this.level.start;
        this.snake = this.createSnake(sx, sy, this.level.startDir);

        // Inject sound callback into snake's step function
        this._hookSnakeSound();

        // Food
        this.food = new Food(this.grid);
        this.food.setWalls(this.level.walls || []);

        // HUD
        this.hud = this.createHud(canvas);
        
        // Setup HUD forbidden zone for food spawning
        if (this.hud && this.hud.setupForbiddenZone) {
            this.hud.setupForbiddenZone(this.food);
        }
        
        // Spawn first food (after forbidden zone is set)
        this.food.respawn(this.snake);

        // Input with action support
        this.input = new Input(
            dir => this._handleDirection(dir),
            action => this._handleAction(action)
        );

        // Resize handler
        window.addEventListener("resize", () => {
            if (this.renderer.resize) this.renderer.resize();
        });

        // Keyboard shortcuts for background/music
        window.addEventListener("keydown", e => {
            // Ignore shortcuts when the user is typing in a text field
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            // B = Toggle background mode (lite/full)
            if (e.key === "b" || e.key === "B") {
                if (this.renderer && this.renderer.background) {
                    const mode = this.renderer.background.toggleMode();
                    console.log(`🎨 Background: ${mode}`);
                }
            }
            // N = Next background effect (full mode only)
            if (e.key === "n" || e.key === "N") {
                if (this.renderer && this.renderer.background) {
                    this.renderer.background.nextEffect();
                    console.log(`🎨 Effect: ${this.renderer.background.getEffectName()}`);
                }
            }

            // O = Options menu (only when playing or paused, skip if SDK pause is active)
            if ((e.key === "o" || e.key === "O") && (this.state === "playing" || this.state === "paused") && !this._sdkPause) {
                this._showOptions();
            }

            // H = Highscores (skip if SDK pause is active)
            if ((e.key === "h" || e.key === "H") && this.state !== "options" && !this._sdkPause) {
                this._showHighscores();
            }
        });

        // Apply saved settings
        this._applyInitialSettings();

        // Start loop
        this.state = "playing";
        this.last = performance.now();
        window.__snakeLoopId = requestAnimationFrame(this.loop.bind(this));
    }

    // ------------------------------------------------------------
    // INPUT HANDLERS
    // ------------------------------------------------------------
    _handleDirection(dir) {
        // Don't handle directions if options or highscores are showing
        if (this.optionsScreen?.isShowing || this.highScoresScreen?.isShowing) {
            return;
        }
        
        // Handle game over menu navigation
        if (this.state === "gameover") {
            this.gameOverScreen.handleDirection(dir);
            return;
        }

        // Handle pause menu navigation
        if (this.state === "paused") {
            if (this._sdkPause) this._moveSdkPauseSelection(dir);
            else this.pauseScreen.handleDirection(dir);
            return;
        }

        // Normal gameplay
        if (this.state === "playing" && this.snake) {
            this.snake.setDir(dir);
        }
    }

    _handleAction(action) {
        // Handle audio toggles in any state (always available)
        if (action === "toggleMusic") {
            if (this.renderer?.toggleMusic) {
                this.renderer.toggleMusic();
            }
            return;
        }
        if (action === "toggleSFX") {
            if (this.renderer?.toggleSFX) {
                this.renderer.toggleSFX();
            }
            return;
        }
        
        // Don't handle actions if options or highscores are showing
        if (this.optionsScreen?.isShowing || this.highScoresScreen?.isShowing) {
            return;
        }
        
        // Game over screen
        if (this.state === "gameover") {
            this.gameOverScreen.handleAction(action);
            return;
        }

        // Pause screen
        if (this.state === "paused") {
            if (this._sdkPause) {
                if (action === "start" || action === "back") this._closeSdkPause();
                else if (action === "confirm") this._activateSdkPauseSelection();
                return;
            }
            // Fallback PauseScreen
            // Start button resumes
            if (action === "start") {
                this._resume();
                return;
            }
            this.pauseScreen.handleAction(action);
            return;
        }

        // Playing — toggle pause with back or start
        // Debounce: SDK pause calls onResume on same keypress that game input sees
        if (this.state === "playing" && (action === "back" || action === "start")) {
            if (this._resumedAt && performance.now() - this._resumedAt < 100) return;
            this._showPause();
        }
    }

    // ------------------------------------------------------------
    // SOUND HOOK
    // ------------------------------------------------------------
    _hookSnakeSound() {
        // Different snake classes use different step methods
        // Neo/Nokia: _stepOnce, 16bit: _step
        const stepMethod = this.snake._stepOnce ? '_stepOnce' : '_step';
        
        if (this.snake[stepMethod]) {
            const originalStep = this.snake[stepMethod].bind(this.snake);
            this.snake[stepMethod] = () => {
                originalStep();
                if (this.onMove) this.onMove();
            };
        }
    }

    // ------------------------------------------------------------
    // WALL COLLISION CHECK
    // ------------------------------------------------------------
    _hitsWall(x, y) {
        const walls = this.level?.walls || [];
        for (const wall of walls) {
            if (x >= wall.x && x < wall.x + wall.w &&
                y >= wall.y && y < wall.y + wall.h) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------
    // MAIN GAME LOOP
    // ------------------------------------------------------------
    loop(ms) {
        window.__snakeLoopId = requestAnimationFrame(this.loop.bind(this));

        const dt = Math.min((ms - this.last) / 1000, 0.03);
        this.last = ms;
        this.dt = dt; // Store for rendering

        // Don't update if paused or game over
        if (this.state !== "playing") {
            // Still render (frozen frame, but background still animates)
            this._render();
            return;
        }

        // Update snake
        this.snake.update(dt);

        // Update HUD
        if (this.hud && this.hud.update) {
            this.hud.update(dt);
        }

        const h = this.snake.gridHead();

        // WALL HIT (border) - skip in wraparound mode
        if (!this.wraparoundMode && !this.grid.inBounds(h.x, h.y)) {
            if (window.audioNeoSFX) window.audioNeoSFX.crash();
            if (this.onCrash) this.onCrash();
            this._gameOver();
            return;
        }

        // WALL HIT (level walls) - skip in wraparound mode
        if (!this.wraparoundMode && this._hitsWall(h.x, h.y)) {
            if (window.audioNeoSFX) window.audioNeoSFX.crash();
            if (this.onCrash) this.onCrash();
            this._gameOver();
            return;
        }

        // SELF HIT
        if (this.snake.hitsSelf()) {
            if (window.audioNeoSFX) window.audioNeoSFX.crash();
            if (this.onCrash) this.onCrash();
            this._gameOver();
            return;
        }

        // FOOD
        if (h.x === this.food.x && h.y === this.food.y) {
            this.snake.grow(3);

            // Scoring
            const result = this.scoring.eat();
            this.foodEatenThisLevel++;

            // Speed up slightly per food eaten (only in Neo mode, not endless)
            if (!this.endlessMode) {
                this.snake.stepTime = Math.max(0.05, this.snake.stepTime - 0.002);
            }

            // Floating points popup
            if (this.hud && this.hud.addPointsPopup) {
                this.hud.addPointsPopup(result.points, result.combo);
            }

            // Sound effect - use custom onEat if defined, otherwise Neo SFX
            if (this.onEat) {
                this.onEat();
            } else if (window.audioNeoSFX) {
                window.audioNeoSFX.eat();
                if (result.combo >= 2) {
                    window.audioNeoSFX.combo(result.combo);
                }
            }

            if (!this.food.respawn(this.snake)) {
                this._gameOver(true);
                return;
            }

            // Check level progression (skip if endless mode)
            if (!this.endlessMode) {
                const foodNeeded = this.level.foodNeeded || 10;
                if (this.foodEatenThisLevel >= foodNeeded) {
                    this._showLevelComplete();
                }
            }
        }

        // RENDER
        this._render();
    }

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------
    _render() {
        this.renderer.render(this, this.dt);

        // HUD overlay (Neo mode)
        if (this.hud && this.hud.render) {
            this.hud.render(
                this.renderer.ctx,
                this.canvas.width,
                this.canvas.height
            );
        }
    }

    // ------------------------------------------------------------
    // LEVEL COMPLETE SCREEN
    // ------------------------------------------------------------
    async _showLevelComplete() {
        this.state = "levelcomplete";
        
        // Get next level info
        const nextLevelIndex = this.currentLevelIndex + 1;
        const nextLevelName = `level${nextLevelIndex.toString().padStart(2, '0')}`;
        const nextLevel = await loadLevel(nextLevelName);
        
        // Play fanfare
        if (window.audioNeoSFX) window.audioNeoSFX.levelComplete();
        
        this.levelCompleteScreen.show({
            levelNum: this.currentLevelIndex,
            levelName: this.level.name || `Level ${this.currentLevelIndex}`,
            score: this.scoring.score,
            nextLevelNum: nextLevelIndex,
            nextLevelName: nextLevel?.name || "Final Challenge"
        }, async () => {
            // On continue - advance to next level
            await this._advanceLevel(nextLevel);
            this.state = "playing";
            this.last = performance.now();
        });
    }

    // ------------------------------------------------------------
    // LEVEL PROGRESSION
    // ------------------------------------------------------------
    async _advanceLevel(preloadedLevel = null) {
        this.currentLevelIndex++;
        this.foodEatenThisLevel = 0;
        this.scoring.advanceLevel();

        // Try to load next level, or stay on current with harder params
        const nextLevelName = `level${this.currentLevelIndex.toString().padStart(2, '0')}`;
        const nextLevel = preloadedLevel || await loadLevel(nextLevelName);
        
        if (nextLevel && nextLevel.name !== "Fallback") {
            this.level = nextLevel;
            this.grid = new Grid(this.level.gridWidth, this.level.gridHeight);
            this.renderer.grid = this.grid;
            this.renderer.size = this.grid.w;
            if (this.renderer.resize) this.renderer.resize();
            this.food.grid = this.grid;
            
            // Setup HUD forbidden zone and walls for new grid
            this.food.clearForbiddenZones();
            this.food.setWalls(this.level.walls || []);
            if (this.hud && this.hud.setupForbiddenZone) {
                this.hud.setupForbiddenZone(this.food);
            }
        }

        // Base speed per level (gets faster each level)
        // Level 1: 0.12s, Level 5: 0.10s, Level 10: 0.07s
        const baseSpeed = Math.max(0.06, 0.13 - this.currentLevelIndex * 0.007);

        // Reset snake position with new base speed
        const [sx, sy] = this.level.start;
        this.snake = this.createSnake(sx, sy, this.level.startDir);
        this.snake.stepTime = baseSpeed;
        this._hookSnakeSound();

        // Respawn food
        this.food.respawn(this.snake);
        
        console.log(`🎮 Level ${this.currentLevelIndex} - Base speed: ${baseSpeed.toFixed(3)}s`);
    }

    // ------------------------------------------------------------
    // OPTIONS
    // ------------------------------------------------------------
    _showOptions() {
        const wasPlaying = this.state === "playing";
        this.state = "options";
        
        this.optionsScreen.show(
            // onClose
            () => {
                this.state = wasPlaying ? "playing" : "paused";
                this.last = performance.now();
            },
            // onSettingChange
            (key, value) => {
                this._applySetting(key, value);
            }
        );
    }

    _applySetting(key, value) {
        console.log(`⚙️ Setting ${key} = ${value}`);
        
        switch (key) {
            case "backgroundEffects":
                if (this.renderer) {
                    this.renderer.backgroundEnabled = value;
                    if (this.renderer.background) {
                        this.renderer.background.setMode(value ? "lite" : "off");
                    }
                }
                break;
                
            case "soundEffects":
                // Dispatch event for Nokia audio
                window.dispatchEvent(new CustomEvent("setSoundEffects", { detail: value }));
                break;
                
            case "music":
                window.dispatchEvent(new CustomEvent("setMusic", { detail: value }));
                break;
        }
    }

    // Apply settings on game start
    _applyInitialSettings() {
        const settings = this.optionsScreen.getSettings();
        for (const [key, value] of Object.entries(settings)) {
            this._applySetting(key, value);
        }
    }

    // ------------------------------------------------------------
    // PAUSE
    // ------------------------------------------------------------
    _showPause() {
        this.state = "paused";
        if (window.audioNeoSFX) window.audioNeoSFX.pause();

        // Hide pause button while paused
        if (this.hud?.setPauseButtonVisible) {
            this.hud.setPauseButtonVisible(false);
        }

        // Use SDK pause menu when available
        if (window.GameVolt) {
            this._sdkPause = true;

            // Read current volume levels for slider init
            const musicVol = window._snakeMusicVolume !== undefined ? window._snakeMusicVolume : 0.7;
            const sfxVol = window.audioNeoSFX ? window.audioNeoSFX.volume : 0.5;

            window.GameVolt.ui.pauseMenu({
                musicVolume: musicVol,
                sfxVolume: sfxVol,
                onResume: () => this._resume(),
                onRestart: () => this._restart(),
                onQuit: () => this._returnToMenu(),
                onMusicVolume: (v) => {
                    window._snakeMusicVolume = v;
                    // Set volume on the music player
                    if (window._snakeAudioNeo) {
                        window._snakeAudioNeo.setVolume(v);
                        // If dragged to 0, mute; if dragged above 0, ensure playing
                        if (v === 0 && window._snakeAudioNeo.isPlaying) {
                            window._snakeAudioNeo.toggleMusic();
                        } else if (v > 0 && window._snakeAudioNeo.audio && window._snakeAudioNeo.audio.paused) {
                            window._snakeAudioNeo.resumeMusic();
                        }
                    }
                    // Also update options setting
                    this.optionsScreen.setSetting("music", v > 0);
                },
                onSfxVolume: (v) => {
                    if (window.audioNeoSFX) {
                        window.audioNeoSFX.setVolume(v);
                        window.audioNeoSFX.setEnabled(v > 0);
                    }
                    // Also update options setting
                    this.optionsScreen.setSetting("soundEffects", v > 0);
                }
            });
            this._sdkPauseSelection = 0;
            this._updateSdkPauseSelection();
        } else {
            // Fallback: old PauseScreen
            this._sdkPause = false;
            this.pauseScreen.show(
                () => this._resume(),
                () => this._restart(),
                () => this._returnToMenu(),
                () => this._showOptionsFromPause(),
                () => this._showHighscoresFromPause()
            );
        }
    }

    _sdkPauseItems() {
        const pause = document.getElementById("gv-pause");
        if (!pause?.classList.contains("open")) return [];
        return Array.from(pause.querySelectorAll(".gv-pause-btn, .gv-pause-slider"))
            .filter(item => item.offsetParent !== null);
    }

    _updateSdkPauseSelection() {
        const pause = document.getElementById("gv-pause");
        if (!pause) return;
        if (!document.getElementById("snake-sdk-pause-gamepad-style")) {
            const style = document.createElement("style");
            style.id = "snake-sdk-pause-gamepad-style";
            style.textContent = "#gv-pause .snake-pad-selected{outline:3px solid #38f5e1;outline-offset:3px;box-shadow:0 0 18px rgba(56,245,225,.55)}";
            document.head.appendChild(style);
        }
        pause.querySelectorAll(".snake-pad-selected").forEach(item => item.classList.remove("snake-pad-selected"));
        const items = this._sdkPauseItems();
        if (!items.length) return;
        this._sdkPauseSelection = Math.max(0, Math.min(items.length - 1, this._sdkPauseSelection));
        items[this._sdkPauseSelection].classList.add("snake-pad-selected");
    }

    _moveSdkPauseSelection(dir) {
        const items = this._sdkPauseItems();
        if (!items.length) return;
        const current = items[this._sdkPauseSelection];
        if ((dir === "left" || dir === "right") && current?.matches("input[type=range]")) {
            const step = dir === "left" ? -10 : 10;
            current.value = Math.max(Number(current.min), Math.min(Number(current.max), Number(current.value) + step));
            current.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (dir === "up" || dir === "down") {
            this._sdkPauseSelection = (this._sdkPauseSelection + (dir === "up" ? -1 : 1) + items.length) % items.length;
        }
        this._updateSdkPauseSelection();
        if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
    }

    _activateSdkPauseSelection() {
        const item = this._sdkPauseItems()[this._sdkPauseSelection];
        if (item?.matches("button")) item.click();
    }

    _closeSdkPause() {
        if (window.GameVolt?.ui?.isPaused()) window.GameVolt.ui.pauseMenu();
    }

    _showOptionsFromPause() {
        this.optionsScreen.show(
            () => {}, // onClose - stay in pause
            (key, value) => this._applySetting(key, value)
        );
    }

    _showHighscoresFromPause() {
        this.highScoresScreen.show(() => {
            // Return to pause menu (already showing)
        }, this._highscoreBoardKey());
    }

    _resume() {
        if (window.audioNeoSFX) window.audioNeoSFX.pause();
        this.state = "playing";
        this.last = performance.now();
        this._sdkPause = false;
        this._resumedAt = performance.now(); // debounce vs SDK keypress

        // Show pause button again
        if (this.hud?.setPauseButtonVisible) {
            this.hud.setPauseButtonVisible(true);
        }
    }

    // ------------------------------------------------------------
    // GAME OVER
    // ------------------------------------------------------------
    _gameOver(boardCleared = false) {
        this.state = "gameover";
        const stats = this.scoring.getFinalStats();
        stats.boardCleared = boardCleared;

        // Trophies + global leaderboard. This method serves Neo and Nokia;
        // Nokia earns only the nostalgia trophy but still submits to its own board.
        const _mode = this._highscoreBoardKey();
        try { recordRun(_mode, stats); } catch (e) { /* ignore */ }
        if (stats.score > 0 && window.GameVolt && window.GameVolt.leaderboard) {
            const _board = _mode === "neo" ? "default" : "nokia";
            try { window.GameVolt.leaderboard.submit(stats.score, { mode: _board }); } catch (e) { /* ignore */ }
        }

        // Hide pause button
        if (this.hud?.setPauseButtonVisible) {
            this.hud.setPauseButtonVisible(false);
        }
        
        // Auto-save score (skip if 0)
        let position = 0;
        if (stats.score > 0) {
            position = this.highscoreManager.addScore(stats.score, this.currentLevelIndex);
        }

        if (position > 0) {
            // New highscore — play sound, show the modern board for this mode
            if (window.audioNeoSFX) window.audioNeoSFX.newHighscore();
            this.highScoresScreen.show(() => {
                this._showGameOverScreen(stats);
            }, _mode);
        } else {
            // No highscore — game over directly
            if (window.audioNeoSFX) window.audioNeoSFX.gameOver();
            this._showGameOverScreen(stats);
        }
    }

    _showGameOverScreen(stats) {
        // In endless mode, don't show continue option
        const continueCallback = this.endlessMode || stats.boardCleared ? null : () => this._continue();
        
        this.gameOverScreen.show(
            stats,
            () => this._restart(),
            () => this._returnToMenu(),
            continueCallback
        );
    }

    // ------------------------------------------------------------
    // CONTINUE (after rewarded ad)
    // ------------------------------------------------------------
    _continue() {
        // Reset score but keep current level
        this.scoring.reset();
        this.scoring.setLevel(this.currentLevelIndex);
        this.foodEatenThisLevel = 0;

        // Reset snake on current level
        const [sx, sy] = this.level.start;
        this.snake = this.createSnake(sx, sy, this.level.startDir);
        
        // Set speed for current level
        const baseSpeed = Math.max(0.06, 0.13 - this.currentLevelIndex * 0.007);
        this.snake.stepTime = baseSpeed;
        
        this._hookSnakeSound();
        this.food.respawn(this.snake);

        this.state = "playing";
        this.last = performance.now();
        
        // Show pause button
        if (this.hud?.setPauseButtonVisible) {
            this.hud.setPauseButtonVisible(true);
        }
        
        // Resume music if it was playing
        window.dispatchEvent(new CustomEvent("resumeMusic"));
        
        console.log(`🔄 Continue on Level ${this.currentLevelIndex} - Score reset`);
    }

    // ------------------------------------------------------------
    // HIGHSCORES
    // ------------------------------------------------------------
    _showHighscores() {
        const prevState = this.state;
        this.state = "highscores";
        
        this.highScoresScreen.show(() => {
            this.state = prevState;
            this.last = performance.now();
        }, this._highscoreBoardKey());
    }

    _highscoreBoardKey() {
        return this.gameMode === "16bit" ? "16bit" : (this.gameMode === "nokia" ? "nokia" : "neo");
    }

    // ------------------------------------------------------------
    // RESTART
    // ------------------------------------------------------------
    _restart() {
        if (this.mode16bit && this._restart16bit) {
            this._restart16bit();
            return;
        }

        // Reset everything
        this.scoring.reset();
        this.currentLevelIndex = 1;
        this.foodEatenThisLevel = 0;
        
        // Reset continue availability
        this.gameOverScreen.resetContinue();

        // A new run always starts on the original first level, including its
        // grid, walls and food constraints.
        if (this.initialLevel) this.level = JSON.parse(JSON.stringify(this.initialLevel));
        this.grid = new Grid(this.level.gridWidth, this.level.gridHeight);
        this.renderer.grid = this.grid;
        this.renderer.size = this.grid.w;
        if (this.renderer.resize) this.renderer.resize();
        this.food.grid = this.grid;
        if (this.food.clearForbiddenZones) this.food.clearForbiddenZones();
        if (this.food.setWalls) this.food.setWalls(this.level.walls || []);
        if (this.hud?.setupForbiddenZone) this.hud.setupForbiddenZone(this.food);

        const [sx, sy] = this.level.start;
        this.snake = this.createSnake(sx, sy, this.level.startDir);
        this._hookSnakeSound();

        this.food.respawn(this.snake);

        this.state = "playing";
        this.last = performance.now();
        
        // Show pause button
        if (this.hud?.setPauseButtonVisible) {
            this.hud.setPauseButtonVisible(true);
        }
        
        // Resume music if it was playing
        window.dispatchEvent(new CustomEvent("resumeMusic"));
    }

    // ------------------------------------------------------------
    // RETURN TO MENU
    // ------------------------------------------------------------
    _returnToMenu() {
        // Stop game loop
        if (window.__snakeLoopId) {
            cancelAnimationFrame(window.__snakeLoopId);
            window.__snakeLoopId = null;
        }

        // Reset started flag and return to the mode picker, including from a
        // direct ?mode= deep link.
        window.__snakeGameStarted = false;
        const url = new URL(window.location.href);
        url.searchParams.delete("mode");
        if (["neo", "nokia", "16bit"].includes(url.hash.slice(1).toLowerCase())) url.hash = "";
        window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    }

    // ------------------------------------------------------------
    // LEGACY RESET (for Nokia mode compatibility)
    // ------------------------------------------------------------
    reset() {
        this._restart();
    }
}
