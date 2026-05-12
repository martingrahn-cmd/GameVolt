// UI and HUD
class UI {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 2.0;
        this.pickupNotifyTimer = 0;
        this.decoInitialized = false;
    }

    initDeco() {
        if (this.decoInitialized) return;
        this.decoInitialized = true;

        // Left side bars (visualizer style)
        const leftDeco = document.getElementById('hudLeftDeco');
        for (let i = 0; i < 12; i++) {
            const bar = document.createElement('div');
            bar.className = 'deco-bar';
            bar.style.height = (4 + Math.random() * 16) + 'px';
            leftDeco.appendChild(bar);
        }

        // Right side threat bars
        const rightDeco = document.getElementById('hudRightDeco');
        for (let i = 0; i < 8; i++) {
            const bar = document.createElement('div');
            bar.className = 'threat-bar';
            bar.style.width = (6 + Math.random() * 20) + 'px';
            rightDeco.appendChild(bar);
        }
    }

    update(dt, playersOrLives, waveNumber) {
        this.initDeco();

        // Accept either an array of Player objects (new co-op API) or a raw
        // lives number (old single-player call sites).
        if (Array.isArray(playersOrLives)) {
            this.players = playersOrLives;
            this.lives = playersOrLives[0] ? playersOrLives[0].lives : 0;
        } else {
            this.players = null;
            this.lives = playersOrLives;
        }
        this.wave = waveNumber;

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
        } else if (this.combo > 0) {
            this.combo = 0;
        }

        // Pickup notification fade
        if (this.pickupNotifyTimer > 0) {
            this.pickupNotifyTimer -= dt;
            const el = document.getElementById('pickupNotify');
            if (this.pickupNotifyTimer <= 0) {
                el.style.opacity = '0';
            }
        }

        this.updateHUD();
        this.updateDeco();
    }

    updateDeco() {
        // Animate left bars based on player velocity
        const leftBars = document.querySelectorAll('#hudLeftDeco .deco-bar');
        const player = window.game && window.game.player;
        const speed = player ? player.velocity.length() / player.maxSpeed : 0;

        leftBars.forEach((bar, i) => {
            const h = 4 + (speed * 20 + Math.sin(Date.now() * 0.005 + i * 0.8) * 6);
            bar.style.height = h + 'px';
            const bright = speed > 0.5 ? 'rgba(0,255,255,0.3)' : 'rgba(0,255,255,0.12)';
            bar.style.background = bright;
        });

        // Animate right bars based on asteroid count (threat)
        const rightBars = document.querySelectorAll('#hudRightDeco .threat-bar');
        const asteroidCount = window.game && window.game.waves ? window.game.waves.asteroids.length : 0;
        const threat = Math.min(1, asteroidCount / 15);

        rightBars.forEach((bar, i) => {
            const w = 6 + (threat * 24 + Math.sin(Date.now() * 0.003 + i * 1.1) * 4);
            bar.style.width = w + 'px';
            if (threat > 0.7) {
                bar.style.background = 'rgba(255,40,0,0.35)';
            } else if (threat > 0.4) {
                bar.style.background = 'rgba(255,120,0,0.2)';
            } else {
                bar.style.background = 'rgba(255,60,0,0.12)';
            }
        });
    }

    updateHUD() {
        // Score
        document.getElementById('hudScore').textContent = this.score.toLocaleString();

        // Level
        document.getElementById('hudLevel').textContent = `LVL ${this.wave}`;

        // Challenge objective HUD
        this.updateChallengeHUD();

        // P1 lives (dynamic diamond pips — grows when extra lives are picked up)
        const p1lives = this.players ? (this.players[0] ? this.players[0].lives : 0) : this.lives;
        const p1ghost = this.players && this.players[0] && this.players[0].isGhost;
        const p1dead = this.players && this.players[0] && this.players[0].permaDead;
        const p1max = Math.max(3, p1lives); // show at least 3 slots
        const p1container = document.getElementById('p1LivesContainer');
        if (p1container) {
            // Add pips if needed
            while (p1container.children.length < p1max) {
                const pip = document.createElement('div');
                pip.className = 'life-pip';
                p1container.appendChild(pip);
            }
            // Remove excess pips (e.g. after restart with fewer lives)
            while (p1container.children.length > p1max) {
                p1container.removeChild(p1container.lastChild);
            }
            for (let i = 0; i < p1container.children.length; i++) {
                const pip = p1container.children[i];
                if ((i + 1) <= p1lives && !p1ghost && !p1dead) {
                    pip.classList.remove('lost');
                    // Last life: pulse red
                    if (p1lives === 1) pip.classList.add('last-life');
                    else pip.classList.remove('last-life');
                } else {
                    pip.classList.add('lost');
                    pip.classList.remove('last-life');
                }
            }
        }

        // Danger state on lives panel — red glow when on last life
        const blPanel = document.getElementById('hudBottomLeft');
        if (blPanel) {
            if (p1lives === 1 && !p1ghost && !p1dead) blPanel.classList.add('danger');
            else blPanel.classList.remove('danger');
        }

        // Invulnerability dim
        if (blPanel) {
            const p1 = this.players ? this.players[0] : null;
            if (p1 && p1.invulnerable && p1lives > 0) blPanel.classList.add('invulnerable');
            else blPanel.classList.remove('invulnerable');
        }

        // Boss-active HUD tint
        const hudTop = document.getElementById('hudTop');
        if (hudTop) {
            const hasBoss = window.game && window.game.challengeManager && window.game.challengeManager.bossAlive;
            if (hasBoss) hudTop.classList.add('boss-active');
            else hudTop.classList.remove('boss-active');
        }

        // P2 row (only in co-op)
        if (this.players && this.players[1]) {
            const p2 = this.players[1];
            // Dynamic P2 life pips
            const p2container = document.getElementById('p2LivesContainer');
            if (p2container) {
                const p2max = Math.max(3, p2.lives);
                while (p2container.children.length < p2max) {
                    const pip = document.createElement('div');
                    pip.className = 'life-pip life-pip-p2';
                    p2container.appendChild(pip);
                }
                while (p2container.children.length > p2max) {
                    p2container.removeChild(p2container.lastChild);
                }
                for (let i = 0; i < p2container.children.length; i++) {
                    const pip = p2container.children[i];
                    if ((i + 1) <= p2.lives && !p2.isGhost && !p2.permaDead) {
                        pip.classList.remove('lost');
                        if (p2.lives === 1) pip.classList.add('last-life');
                        else pip.classList.remove('last-life');
                    } else {
                        pip.classList.add('lost');
                        pip.classList.remove('last-life');
                    }
                }
            }

            // P2 teleport cooldown
            const teleFillP2 = document.getElementById('teleportFillP2');
            if (teleFillP2) {
                const pct = Math.max(0, 1 - p2.teleportCooldown / p2.teleportCooldownMax) * 100;
                teleFillP2.style.width = pct + '%';
                teleFillP2.style.background = pct >= 100 ? '#ff44dd' : 'rgba(255,68,221,0.4)';
                teleFillP2.style.boxShadow = pct >= 100 ? '0 0 6px #ff44dd' : 'none';
            }

            // P2 powerup indicator
            const p2PowerupEl = document.getElementById('hudPowerupP2');
            const p2LabelEl = document.getElementById('hudPowerupLabelP2');
            const p2TimerEl = document.getElementById('hudPowerupTimerP2');
            if (p2PowerupEl && p2.activePowerup) {
                const config = POWERUP_TYPES[p2.activePowerup];
                const pct = (p2.powerupTimer / config.duration) * 100;
                p2LabelEl.textContent = `${config.label} ${Math.ceil(p2.powerupTimer)}s`;
                p2TimerEl.style.width = pct + '%';
                p2PowerupEl.style.opacity = '1';
            } else if (p2PowerupEl) {
                p2PowerupEl.style.opacity = '0';
            }

            // P2 shield indicator
            const p2ShieldEl = document.getElementById('hudShieldP2');
            if (p2ShieldEl) {
                p2ShieldEl.style.opacity = p2.hasShield ? '1' : '0';
            }

            // Revive timer indicator on whichever player is ghost
            const reviveEl = document.getElementById('reviveIndicator');
            if (reviveEl) {
                let ghost = this.players.find(p => p.isGhost);
                if (ghost) {
                    const secs = Math.ceil(ghost.reviveTimer);
                    reviveEl.textContent = `P${ghost.slot + 1} REVIVE ${secs}s`;
                    reviveEl.style.color = '#' + ghost.colorHex.toString(16).padStart(6, '0');
                    reviveEl.style.opacity = '1';
                } else {
                    reviveEl.style.opacity = '0';
                }
            }
        }

        // P1 Power-up indicator
        const powerupEl = document.getElementById('hudPowerup');
        const labelEl = document.getElementById('hudPowerupLabel');
        const timerEl = document.getElementById('hudPowerupTimer');
        const player = this.players ? this.players[0] : (window.game && window.game.player);

        if (player && player.activePowerup) {
            const config = POWERUP_TYPES[player.activePowerup];
            const pct = (player.powerupTimer / config.duration) * 100;
            const colorHex = '#' + config.color.toString(16).padStart(6, '0');

            const secs = Math.ceil(player.powerupTimer);
            labelEl.textContent = `${config.label} ${secs}s`;
            timerEl.style.width = pct + '%';
            timerEl.style.background = colorHex;
            timerEl.style.boxShadow = `0 0 6px ${colorHex}`;
            powerupEl.style.borderColor = `${colorHex}66`;
            powerupEl.style.color = colorHex;
            powerupEl.style.textShadow = `0 0 8px ${colorHex}99`;
            powerupEl.style.opacity = '1';
        } else {
            powerupEl.style.opacity = '0';
        }

        // P1 Shield indicator
        const shieldEl = document.getElementById('hudShield');
        if (player && player.hasShield) {
            shieldEl.style.opacity = '1';
        } else {
            shieldEl.style.opacity = '0';
        }

        // P1 Teleport cooldown bar
        const teleportFill = document.getElementById('teleportFill');
        if (teleportFill && player) {
            const pct = Math.max(0, 1 - player.teleportCooldown / player.teleportCooldownMax) * 100;
            teleportFill.style.width = pct + '%';
            teleportFill.style.background = pct >= 100 ? '#00ffff' : 'rgba(0,255,255,0.4)';
            teleportFill.style.boxShadow = pct >= 100 ? '0 0 6px #00ffff' : 'none';
        }
    }

    addScore(points, multiplier = 1, position = null) {
        const finalScore = Math.floor(points * multiplier * (1 + this.combo * 0.5));
        const prevScore = this.score;
        this.score += finalScore;
        this.combo += 1;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.comboTimer = this.comboTimeout;

        // Combo riser — floats "+50 ×3" up from the kill spot
        if (position && window.game && window.game.particles) {
            window.game.particles.createScoreFloater(
                position, finalScore, this.combo
            );
        }

        // Combo milestone sound + center burst
        if (this.combo === 5 || this.combo === 10 || this.combo === 15 || this.combo === 20 || this.combo === 25 || this.combo === 30) {
            if (window.game && window.game.audio) window.game.audio.playCombo();
            this._showComboBurst(this.combo);
        }

        // Score milestone event beat — fires when crossing key thresholds.
        const milestones = [10000, 25000, 50000, 100000, 250000];
        for (const m of milestones) {
            if (prevScore < m && this.score >= m) {
                this._triggerScoreMilestone(m);
                break;
            }
        }

        this.updateComboText();
        return finalScore;
    }

    _triggerScoreMilestone(value) {
        // Pulse the score panel
        const el = document.getElementById('hudScore');
        if (el) {
            el.classList.remove('milestone');
            void el.offsetWidth;       // force reflow
            el.classList.add('milestone');
        }
        // Center-screen burst text reusing the pickupNotify lane
        const labels = {
            10000: '10K!', 25000: '25K!', 50000: '50K!',
            100000: '100K!', 250000: '250K!'
        };
        this.showPickupNotify(labels[value] || `${value.toLocaleString()}`, '#ffcc44');
        if (window.game && window.game.audio && window.game.audio.playCombo) {
            window.game.audio.playCombo();
        }
    }

    updateComboText() {
        const hudCombo = document.getElementById('hudCombo');
        if (this.combo > 1) {
            hudCombo.textContent = `x${this.combo}`;
            hudCombo.style.opacity = '1';
            // Scale up with combo — subtle size growth
            const scale = Math.min(1.8, 1 + this.combo * 0.03);
            hudCombo.style.fontSize = `${7 * scale}px`;
            // Color intensity ramps with combo
            if (this.combo >= 20) {
                hudCombo.style.color = '#ff44ff';
                hudCombo.style.textShadow = '0 0 14px rgba(255,68,255,0.9)';
            } else if (this.combo >= 10) {
                hudCombo.style.color = '#ffaa22';
                hudCombo.style.textShadow = '0 0 12px rgba(255,170,34,0.8)';
            } else if (this.combo >= 5) {
                hudCombo.style.color = '#ffff00';
                hudCombo.style.textShadow = '0 0 10px rgba(255,255,0,0.7)';
            } else {
                hudCombo.style.color = '#ffff00';
                hudCombo.style.textShadow = '0 0 8px rgba(255,255,0,0.6)';
            }
            // Pop animation on each new combo hit
            hudCombo.classList.remove('combo-pop');
            void hudCombo.offsetWidth;
            hudCombo.classList.add('combo-pop');
        } else {
            hudCombo.style.opacity = '0';
            hudCombo.style.fontSize = '7px';
        }
    }

    _showComboBurst(combo) {
        const el = document.getElementById('comboBurst');
        if (!el) return;
        let color = '#ffff00';
        let size = 28;
        if (combo >= 25) { color = '#ff44ff'; size = 42; }
        else if (combo >= 15) { color = '#ffaa22'; size = 36; }
        else if (combo >= 10) { color = '#00ff88'; size = 32; }
        el.textContent = `x${combo}`;
        el.style.color = color;
        el.style.textShadow = `0 0 30px ${color}, 0 0 60px ${color}`;
        el.style.fontSize = size + 'px';
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%,-50%) scale(1.5)';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(1)';
        }, 50);
        setTimeout(() => {
            el.style.opacity = '0';
        }, 800);
    }

    hideComboText() {
        document.getElementById('hudCombo').style.opacity = '0';
    }

    showPickupNotify(text, color) {
        const el = document.getElementById('pickupNotify');
        el.textContent = text;
        el.style.color = color;
        el.style.textShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
        el.style.opacity = '1';
        el.style.top = '40%';
        this.pickupNotifyTimer = 1.5;

        // Animate upward
        setTimeout(() => {
            el.style.top = '35%';
            el.style.opacity = '0';
        }, 1000);
    }

    showGameOver(waveReached, finalScore, bestScore = 0, isNewHigh = false, stats = null) {
        const screen = document.getElementById('gameOverScreen');
        document.getElementById('finalScore').textContent = finalScore.toLocaleString();
        document.getElementById('waveReached').textContent = `LEVEL ${waveReached}`;

        // Stats line
        const statsEl = document.getElementById('goStats');
        if (statsEl && stats) {
            const mins = Math.floor(stats.time / 60);
            const secs = stats.time % 60;
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            statsEl.innerHTML = `TIME ${timeStr} &nbsp; DESTROYED ${stats.asteroids} &nbsp; BEST COMBO x${stats.maxCombo}`;
        } else if (statsEl) {
            statsEl.textContent = '';
        }

        // Rank
        const rankEl = document.getElementById('goRank');
        if (rankEl && stats) {
            let rank = 'C';
            const s = finalScore;
            const hasCombo = stats.maxCombo >= 10;
            const hasTime = stats.time >= 120;
            let pts = 0;
            if (s >= 50000) pts += 3; else if (s >= 20000) pts += 2; else if (s >= 5000) pts += 1;
            if (hasCombo) pts += 1;
            if (hasTime) pts += 1;
            if (pts >= 4) rank = 'S'; else if (pts >= 3) rank = 'A'; else if (pts >= 1) rank = 'B';
            const colors = { S: '#ffd700', A: '#00ff88', B: '#00ccff', C: '#aaaaaa' };
            rankEl.textContent = rank;
            rankEl.style.color = colors[rank];
            rankEl.style.textShadow = `0 0 20px ${colors[rank]}`;
        } else if (rankEl) {
            rankEl.textContent = '';
        }

        const bestEl = document.getElementById('highScoreLine');
        if (bestEl) {
            bestEl.textContent = bestScore > 0 ? `BEST ${bestScore.toLocaleString()}` : '';
        }
        const newEl = document.getElementById('newHighScore');
        if (newEl) {
            newEl.style.display = isNewHigh ? 'block' : 'none';
        }

        screen.classList.add('show');
    }

    updateChallengeHUD() {
        const game = window.game;
        if (!game || !game.challengeManager) return;

        const info = game.challengeManager.getHUDInfo();
        const titleEl = document.getElementById('objectiveTitle');
        const textEl = document.getElementById('objectiveText');
        const fillEl = document.getElementById('objectiveFill');
        const timeEl = document.getElementById('objectiveTime');

        if (titleEl) titleEl.textContent = info.title;
        if (textEl) textEl.textContent = info.text;
        if (fillEl) fillEl.style.width = Math.min(100, (info.pct || 0) * 100) + '%';
        if (timeEl) {
            const parts = [];
            if (info.timeRemaining !== undefined) {
                parts.push(`TIME ${Math.ceil(info.timeRemaining)}s`);
            }
            if (info.ammo !== undefined) {
                parts.push(`AMMO ${info.ammo}`);
            }
            timeEl.textContent = parts.join('  ');
            if (info.timeRemaining !== undefined && info.timeRemaining < 10) {
                timeEl.style.color = 'rgba(255,80,80,0.9)';
            } else if (info.ammo !== undefined && info.ammo <= 5) {
                timeEl.style.color = 'rgba(255,80,80,0.9)';
            } else {
                timeEl.style.color = 'rgba(255,100,100,0.5)';
            }
        }
    }

    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.hideComboText();
        this.updateHUD();
    }
}
