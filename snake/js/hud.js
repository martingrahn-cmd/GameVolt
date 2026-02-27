// ============================================================
// HUD.js — Neo Mode Heads-Up Display (Inside Game Area)
// ============================================================
// Draws HUD inside the game grid, top area
// Food spawning is blocked in HUD zone

export class Hud {
    constructor(game) {
        this.game = game;
        this.comboFadeTime = 0;
        this.lastCombo = 0;
        this.pointsPopups = [];
        
        // HUD takes up top 2 rows of grid
        this.hudRows = 2;
        
        // Create pause button
        this._createPauseButton();
    }

    _createPauseButton() {
        // Remove existing if any
        const existing = document.getElementById("hud-pause-btn");
        if (existing) existing.remove();
        
        const btn = document.createElement("button");
        btn.id = "hud-pause-btn";
        btn.innerHTML = "❚❚";
        btn.setAttribute("aria-label", "Pause");
        btn.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            width: 44px;
            height: 44px;
            border: 2px solid rgba(0, 255, 240, 0.6);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.5);
            color: rgba(0, 255, 240, 0.9);
            font-size: 16px;
            cursor: pointer;
            z-index: 100;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Hover/active states
        btn.addEventListener("mouseenter", () => {
            btn.style.background = "rgba(0, 255, 240, 0.2)";
            btn.style.borderColor = "rgba(0, 255, 240, 0.9)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.background = "rgba(0, 0, 0, 0.5)";
            btn.style.borderColor = "rgba(0, 255, 240, 0.6)";
        });
        
        // Click handler
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.game.state === "playing") {
                if (window.audioNeoSFX) window.audioNeoSFX.click();
                this.game._showPause();
            }
        });
        
        // Touch handler (prevent double-tap zoom)
        btn.addEventListener("touchend", (e) => {
            e.preventDefault();
        });
        
        document.body.appendChild(btn);
        this.pauseButton = btn;
    }

    // Show/hide pause button
    setPauseButtonVisible(visible) {
        if (this.pauseButton) {
            this.pauseButton.style.display = visible ? "flex" : "none";
        }
    }

    // Clean up
    destroy() {
        if (this.pauseButton) {
            this.pauseButton.remove();
            this.pauseButton = null;
        }
    }

    // Get the forbidden zone for food spawning (in grid coordinates)
    getForbiddenZone() {
        const gridW = this.game.grid?.w || 48;
        // Block top rows where HUD is displayed
        return {
            x1: 0,
            y1: 0,
            x2: gridW - 1,
            y2: this.hudRows - 1
        };
    }

    // Setup forbidden zone on food object
    setupForbiddenZone(food) {
        const zone = this.getForbiddenZone();
        food.addForbiddenZone(zone.x1, zone.y1, zone.x2, zone.y2);
    }

    addPointsPopup(points, combo) {
        this.pointsPopups.push({
            points,
            combo,
            x: 0.5,
            y: 0.25,
            life: 1.0,
            vy: -0.08
        });
    }

    update(dt) {
        // Update combo fade
        if (this.game.scoring) {
            const combo = this.game.scoring.combo;
            if (combo > 0) {
                this.comboFadeTime = 2.0;
                this.lastCombo = combo;
            } else if (this.comboFadeTime > 0) {
                this.comboFadeTime -= dt;
            }
        }

        // Update point popups
        for (let i = this.pointsPopups.length - 1; i >= 0; i--) {
            const p = this.pointsPopups[i];
            p.life -= dt;
            p.y += p.vy * dt;
            if (p.life <= 0) {
                this.pointsPopups.splice(i, 1);
            }
        }
    }

    // Render HUD inside the game area (called by renderer)
    renderInGame(ctx, cell, gridW, gridH) {
        const scoring = this.game.scoring;
        if (!scoring) return;

        ctx.save();

        // Font size based on cell size
        const fontSize = Math.max(10, cell * 0.7);
        ctx.font = `${fontSize}px "Press Start 2P", monospace`;
        ctx.textBaseline = "middle";

        const padding = cell * 0.5;
        const rowHeight = cell;
        const centerY = rowHeight;

        // ---- SCORE (left) ----
        const score = scoring.getDisplayScore();
        ctx.fillStyle = "rgba(0, 255, 240, 0.95)";
        ctx.shadowColor = "rgba(0, 255, 240, 0.7)";
        ctx.shadowBlur = 8;
        ctx.textAlign = "left";
        ctx.fillText(`SCORE ${score}`, padding, centerY);

        // ---- LEVEL (center) ----
        ctx.fillStyle = "rgba(255, 0, 180, 0.95)";
        ctx.shadowColor = "rgba(255, 0, 180, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(`LVL ${scoring.currentLevel}`, (gridW * cell) / 2, centerY);

        // ---- PROGRESS (right) ----
        const foodNeeded = this.game.level?.foodNeeded || 10;
        const current = scoring.foodEaten % foodNeeded;
        ctx.fillStyle = "rgba(255, 255, 100, 0.9)";
        ctx.shadowColor = "rgba(255, 255, 100, 0.6)";
        ctx.textAlign = "right";
        ctx.fillText(`${current}/${foodNeeded}`, gridW * cell - padding, centerY);

        // ---- Subtle separator line ----
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 0, 180, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.hudRows * cell);
        ctx.lineTo(gridW * cell, this.hudRows * cell);
        ctx.stroke();

        ctx.restore();
    }

    // Render floating elements (combo, points) - screen space
    renderOverlay(ctx, canvasWidth, canvasHeight) {
        const scoring = this.game.scoring;
        if (!scoring) return;

        ctx.save();
        
        // Reset transform for overlay (screen space)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        const vw = canvasWidth / dpr;
        const vh = canvasHeight / dpr;
        const fontSize = Math.max(14, Math.min(vw, vh) * 0.03);

        // ---- COMBO (center, fades out) ----
        if (this.comboFadeTime > 0 && this.lastCombo > 0) {
            const alpha = Math.min(1, this.comboFadeTime);
            const multiplier = Math.min(1 + this.lastCombo * 0.5, 3);
            const comboText = `${multiplier.toFixed(1)}x COMBO!`;
            
            ctx.font = `${fontSize * 1.8}px "Press Start 2P", monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
            ctx.shadowColor = `rgba(255, 150, 0, ${alpha * 0.8})`;
            ctx.shadowBlur = 20;
            ctx.fillText(comboText, vw / 2, vh * 0.5);
        }

        // ---- FLOATING POINTS ----
        for (const p of this.pointsPopups) {
            const alpha = p.life;
            ctx.font = `${fontSize * 1.2}px "Press Start 2P", monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
            ctx.shadowColor = `rgba(0, 255, 200, ${alpha * 0.6})`;
            ctx.shadowBlur = 10;
            ctx.fillText(`+${p.points}`, vw * p.x, vh * p.y);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Legacy render method (for compatibility)
    render(ctx, canvasWidth, canvasHeight) {
        this.renderOverlay(ctx, canvasWidth, canvasHeight);
    }
}