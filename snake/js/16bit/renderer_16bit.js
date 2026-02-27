// ============================================================
// Renderer16bit.js — SNES-style with queue, lock-in, chain UI
// ============================================================

console.log(">>> LOADED RENDERER_16BIT v2.0 (Fruit Chain mode)");

export class Renderer16bit {
    constructor(canvas, grid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.grid = grid;
        
        this.cell = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // CRT effect settings
        this.crtEnabled = true;
        this.scanlineOpacity = 0.18;
        
        // Animation
        this.time = 0;
        
        // Tile pattern (cached)
        this.tilePattern = null;
        this.tileSize = 16;
        
        // Visual effects
        this.screenShake = 0;
        this.screenShakeX = 0;
        this.screenShakeY = 0;
        
        // Particles
        this.particles = [];
        
        // Flash effects
        this.screenFlash = 0;
        this.screenFlashColor = '#fff';
        
        // Fever mode visuals
        this.feverHue = 0;
        
        // Messages
        this.floatingMessages = [];
        
        // Audio state (for icons)
        this.musicEnabled = true;
        this.sfxEnabled = true;
        
        // Audio icon touch areas
        this.musicIconBounds = { x: 0, y: 0, w: 40, h: 40 };
        this.sfxIconBounds = { x: 0, y: 0, w: 40, h: 40 };
        
        // Pause button bounds
        this.pauseIconBounds = { x: 0, y: 0, w: 40, h: 40 };
        
        // Game reference (set later)
        this.game = null;
        
        // Setup touch/click listeners for icons
        this._setupAudioIconListeners();
    }
    
    setGame(game) {
        this.game = game;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        this.canvas.width = vw * dpr;
        this.canvas.height = vh * dpr;
        this.canvas.style.width = vw + "px";
        this.canvas.style.height = vh + "px";

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.viewW = vw;
        this.viewH = vh;
        this.isMobile = vw < 600;
        this.isPortrait = vh > vw;
        
        // Layout zones
        const iconHeight = this.isMobile ? 35 : 45;
        const queueHeight = this.isMobile ? 45 : 55;
        const topUIHeight = iconHeight + queueHeight;
        const bottomUIHeight = this.isPortrait ? 80 : 0; // Score area on portrait
        
        const availableHeight = vh - topUIHeight - bottomUIHeight;

        // Calculate cell size to fit grid
        this.cell = Math.floor(Math.min(vw / this.grid.w, availableHeight / this.grid.h));
        this.cell = Math.max(this.cell, 4);

        const gridPixelW = this.cell * this.grid.w;
        const gridPixelH = this.cell * this.grid.h;
        this.offsetX = (vw - gridPixelW) / 2;
        this.offsetY = topUIHeight + (availableHeight - gridPixelH) / 2;

        // UI positions
        this.iconY = 5;
        this.queueY = iconHeight + 5;
        this.scoreY = this.offsetY + gridPixelH + 15; // Below game area
        
        // Store grid bounds for visual border
        this.gridPixelW = gridPixelW;
        this.gridPixelH = gridPixelH;
        
        this._createTilePattern();
        
        console.log(`[16BIT] resized → grid: ${this.grid.w}x${this.grid.h}, cell: ${this.cell}, area: ${gridPixelW}x${gridPixelH}`);
    }

    _createTilePattern() {
        const size = this.tileSize;
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;
        const pctx = patternCanvas.getContext("2d");
        
        const color1 = "#1a3a5c";
        const color2 = "#0f2a4a";
        
        pctx.fillStyle = color1;
        pctx.fillRect(0, 0, size, size);
        pctx.fillRect(size, size, size, size);
        
        pctx.fillStyle = color2;
        pctx.fillRect(size, 0, size, size);
        pctx.fillRect(0, size, size, size);
        
        pctx.strokeStyle = "rgba(255,255,255,0.03)";
        pctx.lineWidth = 1;
        pctx.strokeRect(0.5, 0.5, size - 1, size - 1);
        pctx.strokeRect(size + 0.5, 0.5, size - 1, size - 1);
        pctx.strokeRect(0.5, size + 0.5, size - 1, size - 1);
        pctx.strokeRect(size + 0.5, size + 0.5, size - 1, size - 1);
        
        this.tilePattern = this.ctx.createPattern(patternCanvas, "repeat");
    }

    // --------------------------------------------------------
    // VISUAL EFFECTS
    // --------------------------------------------------------
    triggerScreenShake(intensity = 5) {
        this.screenShake = intensity;
    }

    triggerScreenFlash(color = '#fff', intensity = 0.5) {
        this.screenFlash = intensity;
        this.screenFlashColor = color;
    }

    addParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 50,
                life: 1,
                color,
                size: 3 + Math.random() * 4
            });
        }
    }

    addFloatingMessage(text, x, y, color = '#fff') {
        this.floatingMessages.push({
            text,
            x, y,
            vy: -60,
            life: 1.5,
            color
        });
    }

    _updateEffects(dt) {
        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShakeX = (Math.random() - 0.5) * this.screenShake * 2;
            this.screenShakeY = (Math.random() - 0.5) * this.screenShake * 2;
            this.screenShake *= 0.9;
            if (this.screenShake < 0.1) this.screenShake = 0;
        } else {
            this.screenShakeX = 0;
            this.screenShakeY = 0;
        }
        
        // Screen flash decay
        if (this.screenFlash > 0) {
            this.screenFlash -= dt * 3;
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt; // gravity
            p.life -= dt * 2;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update floating messages
        for (let i = this.floatingMessages.length - 1; i >= 0; i--) {
            const m = this.floatingMessages[i];
            m.y += m.vy * dt;
            m.life -= dt;
            if (m.life <= 0) {
                this.floatingMessages.splice(i, 1);
            }
        }
        
        // Fever hue rotation
        this.feverHue = (this.feverHue + dt * 100) % 360;
    }

    // --------------------------------------------------------
    // BACKGROUND
    // --------------------------------------------------------
    drawBackground(isFever) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(this.screenShakeX, this.screenShakeY);
        
        // Background gradient (entire screen)
        let grad;
        if (isFever) {
            grad = ctx.createLinearGradient(0, 0, 0, this.viewH);
            grad.addColorStop(0, `hsl(${this.feverHue}, 50%, 15%)`);
            grad.addColorStop(1, `hsl(${(this.feverHue + 60) % 360}, 50%, 8%)`);
        } else {
            grad = ctx.createLinearGradient(0, 0, 0, this.viewH);
            grad.addColorStop(0, "#0f1a2e");
            grad.addColorStop(0.5, "#0a1225");
            grad.addColorStop(1, "#050a15");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.viewW, this.viewH);
        
        // Draw animated stars in dead zones (outside game area)
        this._drawStars(ctx, isFever);
        
        // Draw synthwave grid in bottom dead zone (portrait only)
        if (this.isPortrait) {
            this._drawSynthwaveGrid(ctx, isFever);
        }
        
        // Tile pattern ONLY within game area
        if (this.tilePattern) {
            ctx.globalAlpha = isFever ? 0.3 : 0.5;
            ctx.fillStyle = this.tilePattern;
            ctx.fillRect(this.offsetX, this.offsetY, this.gridPixelW, this.gridPixelH);
            ctx.globalAlpha = 1;
        }
        
        // Draw border around game area
        ctx.strokeStyle = isFever ? `hsl(${this.feverHue}, 80%, 50%)` : '#4a9fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.offsetX, this.offsetY, this.gridPixelW, this.gridPixelH);
        
        // Glow effect on border
        ctx.shadowColor = isFever ? `hsl(${this.feverHue}, 100%, 50%)` : '#4a9fff';
        ctx.shadowBlur = 10;
        ctx.strokeRect(this.offsetX, this.offsetY, this.gridPixelW, this.gridPixelH);
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }
    
    _drawStars(ctx, isFever) {
        // Initialize stars once
        if (!this._stars) {
            this._stars = [];
            for (let i = 0; i < 60; i++) {
                this._stars.push({
                    x: Math.random() * this.viewW,
                    y: Math.random() * this.viewH,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 0.3 + 0.1,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        }
        
        // Draw and animate stars
        for (const star of this._stars) {
            // Skip stars inside game area
            if (star.x > this.offsetX && star.x < this.offsetX + this.gridPixelW &&
                star.y > this.offsetY && star.y < this.offsetY + this.gridPixelH) {
                continue;
            }
            
            // Twinkle animation
            const twinkle = Math.sin(this.time * 2 + star.twinkle) * 0.4 + 0.6;
            
            ctx.globalAlpha = twinkle * 0.8;
            ctx.fillStyle = isFever ? `hsl(${this.feverHue}, 70%, 70%)` : '#88aaff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Slow drift
            star.y += star.speed;
            if (star.y > this.viewH) {
                star.y = 0;
                star.x = Math.random() * this.viewW;
            }
        }
        ctx.globalAlpha = 1;
    }
    
    _drawSynthwaveGrid(ctx, isFever) {
        // Draw animated sun at top
        this._drawAnimatedSun(ctx, isFever);
        
        // Only draw grid in bottom dead zone
        const gridTop = this.offsetY + this.gridPixelH + 10;
        const gridBottom = this.viewH;
        const gridHeight = gridBottom - gridTop;
        
        if (gridHeight < 50) return;
        
        ctx.save();
        
        // Horizon line
        const horizonY = gridTop + gridHeight * 0.15;
        
        // Grid lines (perspective)
        ctx.strokeStyle = isFever ? `hsla(${this.feverHue}, 100%, 50%, 0.4)` : 'rgba(255, 0, 128, 0.25)';
        ctx.lineWidth = 1;
        
        // Horizontal lines (animated - moving towards viewer)
        const numHLines = 8;
        const scrollSpeed = this.time * 0.5 % 1;
        
        for (let i = 0; i < numHLines; i++) {
            const baseT = (i + scrollSpeed) / numHLines;
            const t = baseT % 1;
            const y = horizonY + (gridBottom - horizonY) * Math.pow(t, 0.6);
            ctx.globalAlpha = 0.15 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.viewW, y);
            ctx.stroke();
        }
        
        // Vertical lines (converging to horizon)
        const numVLines = 11;
        const vanishX = this.viewW / 2;
        for (let i = 0; i < numVLines; i++) {
            const t = (i - numVLines / 2) / (numVLines / 2);
            const bottomX = vanishX + t * this.viewW * 0.9;
            
            ctx.globalAlpha = 0.2 + (1 - Math.abs(t)) * 0.2;
            ctx.beginPath();
            ctx.moveTo(vanishX, horizonY);
            ctx.lineTo(bottomX, gridBottom);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    
    _drawAnimatedSun(ctx, isFever) {
        // Sun position - in the top dead zone, centered
        const sunX = this.viewW / 2;
        const sunY = this.queueY + 25; // Just below queue
        
        // Only draw if there's space above game area
        if (sunY > this.offsetY - 20) return;
        
        const baseRadius = 35;
        const pulse = Math.sin(this.time * 2) * 3;
        const sunRadius = baseRadius + pulse;
        
        ctx.save();
        
        // Outer glow (multiple layers)
        for (let i = 3; i >= 0; i--) {
            const glowRadius = sunRadius + i * 15;
            const alpha = 0.1 - i * 0.02;
            
            const glowGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowRadius);
            if (isFever) {
                glowGrad.addColorStop(0, `hsla(${this.feverHue}, 100%, 60%, ${alpha})`);
                glowGrad.addColorStop(1, 'transparent');
            } else {
                glowGrad.addColorStop(0, `rgba(255, 100, 50, ${alpha})`);
                glowGrad.addColorStop(1, 'transparent');
            }
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Sun rays (rotating)
        const numRays = 12;
        ctx.strokeStyle = isFever ? `hsla(${this.feverHue}, 100%, 70%, 0.3)` : 'rgba(255, 150, 50, 0.3)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2 + this.time * 0.5;
            const innerR = sunRadius + 5;
            const outerR = sunRadius + 20 + Math.sin(this.time * 3 + i) * 5;
            
            ctx.beginPath();
            ctx.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
            ctx.lineTo(sunX + Math.cos(angle) * outerR, sunY + Math.sin(angle) * outerR);
            ctx.stroke();
        }
        
        // Main sun body with gradient
        const sunGrad = ctx.createRadialGradient(sunX, sunY - sunRadius * 0.3, 0, sunX, sunY, sunRadius);
        if (isFever) {
            sunGrad.addColorStop(0, `hsl(${this.feverHue}, 100%, 80%)`);
            sunGrad.addColorStop(0.5, `hsl(${this.feverHue}, 100%, 60%)`);
            sunGrad.addColorStop(1, `hsl(${(this.feverHue + 30) % 360}, 100%, 40%)`);
        } else {
            sunGrad.addColorStop(0, '#ffee88');
            sunGrad.addColorStop(0.5, '#ffaa44');
            sunGrad.addColorStop(1, '#ff6622');
        }
        
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Retro horizontal lines through sun (synthwave style)
        ctx.globalCompositeOperation = 'destination-out';
        const lineCount = 5;
        for (let i = 0; i < lineCount; i++) {
            const lineY = sunY - sunRadius + (i + 1) * (sunRadius * 2 / (lineCount + 1));
            const lineWidth = Math.sqrt(sunRadius * sunRadius - Math.pow(lineY - sunY, 2)) * 2;
            
            if (lineWidth > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(sunX - lineWidth / 2, lineY - 1, lineWidth, 2);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // FRUIT QUEUE (top of screen)
    // --------------------------------------------------------
    drawQueue(queue, currentTarget) {
        const ctx = this.ctx;
        const isMobile = this.viewW < 600;
        
        // Responsive queue size
        const queueSize = isMobile ? 6 : 10;
        const itemSize = isMobile ? 28 : 36;
        const gap = isMobile ? 5 : 8;
        const totalWidth = queueSize * itemSize + (queueSize - 1) * gap;
        const startX = (this.viewW - totalWidth) / 2;
        const y = this.queueY;
        
        // Queue background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(startX - 10, y - 3, totalWidth + 20, itemSize + 10, 8);
        ctx.fill();
        
        // Draw queue items
        for (let i = 0; i < Math.min(queue.length, queueSize); i++) {
            const type = queue[i];
            const x = startX + i * (itemSize + gap);
            const isFirst = i === 0;
            
            // Highlight first item
            if (isFirst) {
                ctx.strokeStyle = '#44ff88';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(x - 4, y - 4, itemSize + 8, itemSize + 8, 6);
                ctx.stroke();
                
                // Glow
                ctx.shadowColor = '#44ff88';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            
            // Draw fruit icon
            this._drawFruitIcon(ctx, type, x + itemSize/2, y + itemSize/2, itemSize * 0.7);
            
            // Fade out later items
            if (i > 5) {
                ctx.fillStyle = `rgba(0, 0, 0, ${(i - 5) * 0.15})`;
                ctx.fillRect(x, y, itemSize, itemSize);
            }
        }
    }

    _drawFruitIcon(ctx, type, x, y, size) {
        const r = size / 2;
        
        ctx.save();
        ctx.translate(x, y);
        
        switch(type) {
            case 'apple':
                ctx.fillStyle = "#e53935";
                ctx.beginPath();
                ctx.arc(0, 2, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-1, -r - 2, 2, 4);
                ctx.fillStyle = "#4caf50";
                ctx.beginPath();
                ctx.ellipse(3, -r, 3, 2, 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'cherry':
                ctx.strokeStyle = "#5d4037";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -r);
                ctx.quadraticCurveTo(-r*0.5, 0, -r*0.4, r*0.3);
                ctx.moveTo(0, -r);
                ctx.quadraticCurveTo(r*0.5, 0, r*0.4, r*0.3);
                ctx.stroke();
                ctx.fillStyle = "#c62828";
                ctx.beginPath();
                ctx.arc(-r*0.4, r*0.5, r*0.5, 0, Math.PI * 2);
                ctx.arc(r*0.4, r*0.5, r*0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'orange':
                ctx.fillStyle = "#ff9800";
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#4caf50";
                ctx.beginPath();
                ctx.ellipse(0, -r, 3, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'grape':
                ctx.fillStyle = "#7b1fa2";
                const positions = [[0, -r*0.3], [-r*0.4, r*0.1], [r*0.4, r*0.1], [0, r*0.5]];
                for (const [gx, gy] of positions) {
                    ctx.beginPath();
                    ctx.arc(gx, gy, r*0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-1, -r - 2, 2, 3);
                break;
                
            case 'banana':
                ctx.rotate(-0.3);
                ctx.fillStyle = "#ffeb3b";
                ctx.beginPath();
                ctx.moveTo(-r, 0);
                ctx.quadraticCurveTo(-r, -r, 0, -r);
                ctx.quadraticCurveTo(r, -r, r, 0);
                ctx.quadraticCurveTo(r*0.6, r*0.3, 0, r*0.3);
                ctx.quadraticCurveTo(-r*0.6, r*0.3, -r, 0);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // LOCK-IN ZONE (center)
    // --------------------------------------------------------
    drawLockInZone(zone, canLockIn, multiplier, chain) {
        const ctx = this.ctx;
        const centerX = this.offsetX + zone.x * this.cell + this.cell / 2;
        const centerY = this.offsetY + zone.y * this.cell + this.cell / 2;
        const radius = (zone.radius + 0.5) * this.cell;
        
        ctx.save();
        ctx.translate(this.screenShakeX, this.screenShakeY);
        
        // Zone circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (canLockIn) {
            // Active - glowing
            const pulse = 0.7 + Math.sin(this.time * 4) * 0.3;
            ctx.fillStyle = `rgba(68, 255, 136, ${0.1 * pulse})`;
            ctx.fill();
            
            ctx.strokeStyle = `rgba(68, 255, 136, ${0.8 * pulse})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Glow effect
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 20 * pulse;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            // Inactive - dim
            ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Multiplier text in center
        ctx.font = `bold ${this.cell * 1.5}px 'Press Start 2P'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (canLockIn) {
            ctx.fillStyle = '#44ff88';
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#666';
        }
        
        ctx.fillText(`x${multiplier}`, centerX, centerY - this.cell * 0.3);
        
        // "LOCK IN" text
        ctx.font = `${this.cell * 0.5}px 'Press Start 2P'`;
        ctx.fillStyle = canLockIn ? '#44ff88' : '#444';
        ctx.fillText(canLockIn ? 'LOCK IN!' : 'NEED x2', centerX, centerY + this.cell * 0.6);
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // --------------------------------------------------------
    // CHAIN COUNTER
    // --------------------------------------------------------
    drawChainCounter(chain, multiplier, progress) {
        const ctx = this.ctx;
        
        // On portrait mobile, draw below game area
        if (this.isPortrait) {
            this._drawChainCounterPortrait(ctx, chain, multiplier, progress);
            return;
        }
        
        // Landscape: draw inside game area (top right)
        const x = this.viewW - 20;
        const y = this.offsetY + 20;
        
        ctx.save();
        ctx.textAlign = 'right';
        
        // Chain number
        ctx.font = "bold 24px 'Press Start 2P'";
        ctx.fillStyle = multiplier >= 6 ? `hsl(${this.feverHue}, 100%, 60%)` : '#fff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = multiplier >= 3 ? 10 : 0;
        ctx.fillText(`${chain}`, x, y);
        
        // "CHAIN" label
        ctx.font = "8px 'Press Start 2P'";
        ctx.fillStyle = '#888';
        ctx.shadowBlur = 0;
        ctx.fillText('CHAIN', x, y + 15);
        
        // Progress bar to next multiplier
        const barWidth = 80;
        const barHeight = 6;
        const barX = x - barWidth;
        const barY = y + 25;
        
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const progressColor = multiplier >= 6 ? `hsl(${this.feverHue}, 100%, 50%)` : '#44ff88';
        ctx.fillStyle = progressColor;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        ctx.restore();
    }
    
    _drawChainCounterPortrait(ctx, chain, multiplier, progress) {
        // Draw chain on the right side of bottom UI
        const x = this.viewW - 20;
        const y = this.scoreY + 25;
        
        ctx.save();
        ctx.textAlign = 'right';
        
        // "CHAIN" label
        ctx.font = "8px 'Press Start 2P'";
        ctx.fillStyle = '#888';
        ctx.fillText('CHAIN', x, y - 5);
        
        // Chain number - big and glowy
        ctx.font = "bold 28px 'Press Start 2P'";
        ctx.fillStyle = multiplier >= 6 ? `hsl(${this.feverHue}, 100%, 60%)` : '#44ff88';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = multiplier >= 3 ? 15 : 8;
        ctx.fillText(`x${chain}`, x, y + 25);
        
        // Progress bar
        const barWidth = 70;
        const barHeight = 8;
        const barX = x - barWidth;
        const barY = y + 35;
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const progressColor = multiplier >= 6 ? `hsl(${this.feverHue}, 100%, 50%)` : '#44ff88';
        ctx.fillStyle = progressColor;
        ctx.shadowColor = progressColor;
        ctx.shadowBlur = 5;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // SCORE DISPLAY
    // --------------------------------------------------------
    drawScore(score, round) {
        const ctx = this.ctx;
        
        // On portrait mobile, draw below game area
        if (this.isPortrait) {
            this._drawScorePortrait(ctx, score, round);
            return;
        }
        
        // Landscape: draw inside game area (top left)
        ctx.save();
        ctx.font = "16px 'Press Start 2P'";
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffff44';
        ctx.shadowColor = '#ffff44';
        ctx.shadowBlur = 5;
        ctx.fillText(`${score.toLocaleString()}`, 20, this.offsetY + 25);
        
        ctx.font = "8px 'Press Start 2P'";
        ctx.fillStyle = '#888';
        ctx.shadowBlur = 0;
        ctx.fillText(`ROUND ${round}`, 20, this.offsetY + 40);
        
        ctx.restore();
    }
    
    _drawScorePortrait(ctx, score, round) {
        // Draw score on the left side of bottom UI
        const x = 20;
        const y = this.scoreY + 25;
        
        ctx.save();
        ctx.textAlign = 'left';
        
        // Round label
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = '#4a9fff';
        ctx.shadowColor = '#4a9fff';
        ctx.shadowBlur = 5;
        ctx.fillText(`ROUND ${round}`, x, y - 5);
        
        // Score - LED style big numbers
        ctx.font = "bold 24px 'Press Start 2P'";
        ctx.fillStyle = '#ffff44';
        ctx.shadowColor = '#ffff44';
        ctx.shadowBlur = 10;
        ctx.fillText(`${score.toLocaleString()}`, x, y + 25);
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // FRUITS ON BOARD
    // --------------------------------------------------------
    drawFruits(fruits, targetType) {
        const ctx = this.ctx;
        
        for (const fruit of fruits) {
            const x = this.offsetX + fruit.x * this.cell + this.screenShakeX;
            const y = this.offsetY + fruit.y * this.cell + this.screenShakeY;
            
            // Draw fruit (no highlight - player must check the queue!)
            this._drawFruit(ctx, fruit.type, x, y, this.cell, false);
        }
    }

    _drawFruit(ctx, type, x, y, size, highlight) {
        ctx.save();
        ctx.translate(x + size/2, y + size/2);
        
        const scale = highlight ? 1.1 + Math.sin(this.time * 8) * 0.05 : 1;
        ctx.scale(scale, scale);
        
        const r = size * 0.4;
        
        switch(type) {
            case 'apple':
                ctx.fillStyle = "#e53935";
                ctx.beginPath();
                ctx.arc(0, 2, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ff6659";
                ctx.beginPath();
                ctx.arc(-r * 0.3, -r * 0.1, r * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-1, -r - 3, 3, 5);
                ctx.fillStyle = "#4caf50";
                ctx.beginPath();
                ctx.ellipse(4, -r - 1, 4, 2, 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'cherry':
                ctx.strokeStyle = "#5d4037";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -r * 1.5);
                ctx.quadraticCurveTo(-r, -r, -r * 0.8, r * 0.3);
                ctx.moveTo(0, -r * 1.5);
                ctx.quadraticCurveTo(r, -r, r * 0.8, r * 0.3);
                ctx.stroke();
                ctx.fillStyle = "#c62828";
                ctx.beginPath();
                ctx.arc(-r * 0.7, r * 0.5, r * 0.6, 0, Math.PI * 2);
                ctx.arc(r * 0.7, r * 0.5, r * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ef5350";
                ctx.beginPath();
                ctx.arc(-r * 0.9, r * 0.3, r * 0.2, 0, Math.PI * 2);
                ctx.arc(r * 0.5, r * 0.3, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'orange':
                ctx.fillStyle = "#ff9800";
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffb74d";
                ctx.beginPath();
                ctx.arc(-r * 0.3, -r * 0.3, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#4caf50";
                ctx.beginPath();
                ctx.ellipse(0, -r - 2, 3, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'grape':
                ctx.fillStyle = "#7b1fa2";
                const positions = [
                    [0, -r * 0.5], [-r * 0.5, 0], [r * 0.5, 0],
                    [-r * 0.25, r * 0.5], [r * 0.25, r * 0.5], [0, r]
                ];
                for (const [gx, gy] of positions) {
                    ctx.beginPath();
                    ctx.arc(gx, gy, r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = "#ab47bc";
                for (const [gx, gy] of positions) {
                    ctx.beginPath();
                    ctx.arc(gx - r * 0.15, gy - r * 0.15, r * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-1, -r - 3, 2, 4);
                break;
                
            case 'banana':
                ctx.rotate(-0.3);
                ctx.fillStyle = "#ffeb3b";
                ctx.beginPath();
                ctx.moveTo(-r, 0);
                ctx.quadraticCurveTo(-r, -r * 1.2, 0, -r * 1.2);
                ctx.quadraticCurveTo(r, -r * 1.2, r, 0);
                ctx.quadraticCurveTo(r * 0.8, r * 0.3, 0, r * 0.3);
                ctx.quadraticCurveTo(-r * 0.8, r * 0.3, -r, 0);
                ctx.fill();
                ctx.fillStyle = "#fff59d";
                ctx.beginPath();
                ctx.moveTo(-r * 0.7, -r * 0.2);
                ctx.quadraticCurveTo(0, -r * 0.9, r * 0.5, -r * 0.5);
                ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.7, -r * 0.2);
                ctx.fill();
                ctx.fillStyle = "#8d6e63";
                ctx.beginPath();
                ctx.arc(-r, 0, 3, 0, Math.PI * 2);
                ctx.arc(r, -r * 0.2, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // SNAKE (Optimized for older hardware - no shadows)
    // --------------------------------------------------------
    drawSnake(snake, isFever) {
        const ctx = this.ctx;
        const s = this.cell;
        
        // Fewer subdivisions = better performance on older hardware
        const sub = Math.max(3, Math.min(5, Math.ceil(s / 8)));
        const splinePoints = snake.getSmoothSplinePoints ? snake.getSmoothSplinePoints(sub, s) : null;
        
        if (!splinePoints || splinePoints.length < 2) {
            // Fallback
            this._drawCellBasedSnake(ctx, snake, s, isFever);
            return;
        }

        ctx.save();
        ctx.translate(this.screenShakeX, this.screenShakeY);

        const n = splinePoints.length;
        
        // Draw body as overlapping circles
        // NO shadowBlur - extremely expensive on older GPUs!
        
        // Skip some points on large screens for performance
        const step = s > 30 ? 2 : 1;

        for (let i = n - 1; i >= 0; i -= step) {
            const p = splinePoints[i];
            const t = i / (n - 1); // 0 = head area, 1 = tail
            
            // Position in pixels
            const px = this.offsetX + (p.x - 0.5) * s + s / 2;
            const py = this.offsetY + (p.y - 0.5) * s + s / 2;
            
            // Radius: larger at head, smaller at tail
            const radius = s * (0.45 - 0.2 * t);
            if (radius <= 1) continue;
            
            // Color gradient along body (no alpha for performance)
            let r, g, b;
            if (isFever) {
                const hue = (this.feverHue + i * 2) % 360;
                const rgb = this._hslToRgb(hue / 360, 0.8, 0.5);
                r = rgb[0]; g = rgb[1]; b = rgb[2];
            } else {
                r = Math.floor(80 + (1 - t) * 50);
                g = Math.floor(180 + (1 - t) * 75);
                b = Math.floor(60 + (1 - t) * 40);
            }
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw head on top with details
        if (splinePoints.length > 0) {
            const headPt = splinePoints[0];
            const headX = this.offsetX + (headPt.x - 0.5) * s;
            const headY = this.offsetY + (headPt.y - 0.5) * s;
            
            let baseR, baseG, baseB;
            if (isFever) {
                const rgb = this._hslToRgb(this.feverHue / 360, 0.8, 0.55);
                baseR = rgb[0]; baseG = rgb[1]; baseB = rgb[2];
            } else {
                baseR = 130; baseG = 255; baseB = 100;
            }
            
            const baseColor = `rgb(${baseR},${baseG},${baseB})`;
            const lightColor = `rgb(${Math.min(255, baseR + 60)},${Math.min(255, baseG + 40)},${Math.min(255, baseB + 40)})`;
            const darkColor = `rgb(${Math.floor(baseR * 0.5)},${Math.floor(baseG * 0.5)},${Math.floor(baseB * 0.5)})`;
            
            this._drawSnakeHead(ctx, headX, headY, s, snake, baseColor, lightColor, darkColor, isFever);
        }
        
        ctx.restore();
    }

    _drawCellBasedSnake(ctx, snake, s, isFever) {
        const cells = snake.smoothCells || snake.gridCells;
        if (!cells || cells.length === 0) return;
        
        for (let i = cells.length - 1; i >= 1; i--) {
            const c = cells[i];
            const x = this.offsetX + c.x * s;
            const y = this.offsetY + c.y * s;
            
            const t = i / Math.max(cells.length - 1, 1);
            
            let r, g, b;
            if (isFever) {
                const hue = (this.feverHue + i * 10) % 360;
                const rgb = this._hslToRgb(hue / 360, 0.8, 0.5);
                r = rgb[0]; g = rgb[1]; b = rgb[2];
            } else {
                r = Math.floor(80 + (1 - t) * 50);
                g = Math.floor(180 + (1 - t) * 75);
                b = Math.floor(60 + (1 - t) * 40);
            }
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.roundRect(x + 2, y + 2, s - 4, s - 4, s * 0.3);
            ctx.fill();
        }
    }

    _drawSnakeHead(ctx, x, y, s, snake, baseColor, lightColor, darkColor, isFever) {
        const headSize = s * 1.15;
        const headX = x + (s - headSize) / 2;
        const headY = y + (s - headSize) / 2;
        
        // Glow in fever
        if (isFever) {
            ctx.shadowColor = `hsl(${this.feverHue}, 100%, 50%)`;
            ctx.shadowBlur = 15;
        }
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(headX + 1, headY + 1, headSize - 2, headSize - 2, headSize * 0.35);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.roundRect(headX + 2, headY + 2, headSize * 0.5, headSize * 0.3, 3);
        ctx.fill();
        
        // Eyes
        const eyeSize = Math.max(3, s / 5);
        const eyeOffset = headSize * 0.25;
        const eyeFromEdge = headSize * 0.22;
        
        let eye1X, eye1Y, eye2X, eye2Y;
        
        if (snake.dir === "right") {
            eye1X = headX + headSize - eyeFromEdge - eyeSize/2;
            eye2X = eye1X;
            eye1Y = headY + eyeOffset;
            eye2Y = headY + headSize - eyeOffset - eyeSize;
        } else if (snake.dir === "left") {
            eye1X = headX + eyeFromEdge - eyeSize/2;
            eye2X = eye1X;
            eye1Y = headY + eyeOffset;
            eye2Y = headY + headSize - eyeOffset - eyeSize;
        } else if (snake.dir === "up") {
            eye1Y = headY + eyeFromEdge - eyeSize/2;
            eye2Y = eye1Y;
            eye1X = headX + eyeOffset;
            eye2X = headX + headSize - eyeOffset - eyeSize;
        } else {
            eye1Y = headY + headSize - eyeFromEdge - eyeSize/2;
            eye2Y = eye1Y;
            eye1X = headX + eyeOffset;
            eye2X = headX + headSize - eyeOffset - eyeSize;
        }
        
        if (!snake.isBlinking) {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(eye1X + eyeSize/2, eye1Y + eyeSize/2, eyeSize/2, 0, Math.PI * 2);
            ctx.arc(eye2X + eyeSize/2, eye2Y + eyeSize/2, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#222";
            ctx.beginPath();
            ctx.arc(eye1X + eyeSize/2 + 1, eye1Y + eyeSize/2, eyeSize/3, 0, Math.PI * 2);
            ctx.arc(eye2X + eyeSize/2 + 1, eye2Y + eyeSize/2, eyeSize/3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = "#222";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(eye1X + eyeSize/2, eye1Y + eyeSize/2, eyeSize/3, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(eye2X + eyeSize/2, eye2Y + eyeSize/2, eyeSize/3, 0, Math.PI);
            ctx.stroke();
        }
        
        // Mouth
        const mouthOpen = snake.mouthOpen || 0;
        if (mouthOpen > 0.1) {
            ctx.fillStyle = "#c44";
            const mouthSize = s * 0.3 * mouthOpen;
            let mouthX = headX + headSize/2 - mouthSize/2;
            let mouthY = headY + headSize/2 - mouthSize/2;
            
            if (snake.dir === "right") mouthX = headX + headSize - mouthSize;
            if (snake.dir === "left") mouthX = headX;
            if (snake.dir === "up") mouthY = headY;
            if (snake.dir === "down") mouthY = headY + headSize - mouthSize;
            
            ctx.beginPath();
            ctx.arc(mouthX + mouthSize/2, mouthY + mouthSize/2, mouthSize/2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            
            let smileX = headX + headSize/2;
            let smileY = headY + headSize * 0.7;
            
            ctx.beginPath();
            ctx.arc(smileX, smileY - 2, headSize * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }
        
        // Cheeks
        ctx.fillStyle = "rgba(255, 150, 150, 0.4)";
        ctx.beginPath();
        ctx.arc(headX + headSize * 0.2, headY + headSize * 0.65, headSize * 0.08, 0, Math.PI * 2);
        ctx.arc(headX + headSize * 0.8, headY + headSize * 0.65, headSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // --------------------------------------------------------
    // PARTICLES
    // --------------------------------------------------------
    drawParticles() {
        const ctx = this.ctx;
        
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    // --------------------------------------------------------
    // FLOATING MESSAGES
    // --------------------------------------------------------
    drawFloatingMessages() {
        const ctx = this.ctx;
        
        for (const m of this.floatingMessages) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, m.life * 2);
            ctx.font = "bold 16px 'Press Start 2P'";
            ctx.textAlign = 'center';
            ctx.fillStyle = m.color;
            ctx.shadowColor = m.color;
            ctx.shadowBlur = 10;
            ctx.fillText(m.text, m.x, m.y);
            ctx.restore();
        }
    }

    // --------------------------------------------------------
    // CRT EFFECT (Optimized with cached scanlines)
    // --------------------------------------------------------
    applyCRTEffect(isFever) {
        if (!this.crtEnabled) return;
        
        const ctx = this.ctx;
        const w = this.viewW;
        const h = this.viewH;
        
        // Create cached scanline pattern if needed (HUGE performance boost)
        if (!this._scanlinePattern || this._scanlinePatternHeight !== h) {
            this._createScanlinePattern(w, h);
        }
        
        // Draw cached scanlines in one operation
        if (this._scanlinePattern) {
            ctx.fillStyle = this._scanlinePattern;
            ctx.fillRect(0, 0, w, h);
        }
        
        // Vignette - darker edges (single gradient, not expensive)
        const vignetteGrad = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.9);
        vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
        vignetteGrad.addColorStop(0.7, "rgba(0,0,0,0.1)");
        vignetteGrad.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, w, h);
        
        // Screen flash
        if (this.screenFlash > 0) {
            ctx.fillStyle = this.screenFlashColor;
            ctx.globalAlpha = this.screenFlash * 0.5;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }
    }
    
    _createScanlinePattern(w, h) {
        // Create a small repeating pattern for scanlines
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 4;
        patternCanvas.height = 4;
        const pctx = patternCanvas.getContext('2d');
        
        // Draw scanline pattern (every other row)
        pctx.fillStyle = `rgba(0,0,0,${this.scanlineOpacity})`;
        pctx.fillRect(0, 0, 4, 1);
        pctx.fillRect(0, 2, 4, 1);
        
        this._scanlinePattern = this.ctx.createPattern(patternCanvas, 'repeat');
        this._scanlinePatternHeight = h;
        
        console.log('[16BIT] Created optimized scanline pattern');
    }

    // --------------------------------------------------------
    // MAIN RENDER
    // --------------------------------------------------------
    render(game, dt = 0.016) {
        this.time += dt;
        this._updateEffects(dt);
        
        const ctx = this.ctx;
        const scoring = game.scoring;
        const food = game.food;
        const isFever = scoring?.isFeverMode?.() || false;
        
        // Clear
        ctx.clearRect(0, 0, this.viewW, this.viewH);

        // Background
        this.drawBackground(isFever);
        
        // Queue
        if (food?.getQueue) {
            this.drawQueue(food.getQueue(), food.getCurrentTarget());
        }
        
        // Lock-in zone
        if (food?.getLockInZone && scoring) {
            const zone = food.getLockInZone();
            const canLockIn = scoring.canLockIn();
            const multiplier = scoring.getMultiplier();
            this.drawLockInZone(zone, canLockIn, multiplier, scoring.chain);
        }
        
        // Fruits
        if (food?.getAllFruits) {
            this.drawFruits(food.getAllFruits(), food.getCurrentTarget());
        }
        
        // Snake
        if (game.snake) {
            this.drawSnake(game.snake, isFever);
        }
        
        // UI
        if (scoring) {
            this.drawScore(scoring.score, scoring.currentRound);
            this.drawChainCounter(scoring.chain, scoring.getMultiplier(), scoring.getProgressToNext());
        }
        
        // Effects
        this.drawParticles();
        this.drawFloatingMessages();
        
        // CRT on top
        this.applyCRTEffect(isFever);
        
        // Audio icons (drawn LAST so they're always visible on top)
        this.drawAudioIcons();
    }
    
    // --------------------------------------------------------
    // AUDIO & PAUSE ICONS
    // --------------------------------------------------------
    drawAudioIcons() {
        const ctx = this.ctx;
        
        // Responsive icon size
        const isMobile = this.isMobile || this.viewW < 600;
        const iconSize = isMobile ? 26 : 32;
        const padding = isMobile ? 6 : 10;
        const spacing = isMobile ? 5 : 8;
        
        // Position in top-right of screen (above fruit queue)
        const y = this.iconY || 5;
        const pauseX = this.viewW - padding - iconSize;
        const musicX = pauseX - iconSize - spacing;
        const sfxX = musicX - iconSize - spacing;
        
        // Store bounds for click detection
        this.pauseIconBounds = { x: pauseX, y: y, w: iconSize, h: iconSize };
        this.musicIconBounds = { x: musicX, y: y, w: iconSize, h: iconSize };
        this.sfxIconBounds = { x: sfxX, y: y, w: iconSize, h: iconSize };
        
        // Draw pause icon (rightmost)
        this._drawPauseIcon(ctx, pauseX, y, iconSize);
        
        // Draw music icon (note symbol)
        this._drawMusicIcon(ctx, musicX, y, iconSize, this.musicEnabled);
        
        // Draw SFX icon (speaker)
        this._drawSFXIcon(ctx, sfxX, y, iconSize, this.sfxEnabled);
    }
    
    _drawPauseIcon(ctx, x, y, size) {
        ctx.save();
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const color = '#ffcc00'; // Yellow/gold for pause
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        
        // Draw two pause bars
        const barW = size * 0.15;
        const barH = size * 0.5;
        const gap = size * 0.12;
        
        ctx.fillRect(centerX - gap - barW, centerY - barH/2, barW, barH);
        ctx.fillRect(centerX + gap, centerY - barH/2, barW, barH);
        
        ctx.restore();
    }
    
    _drawMusicIcon(ctx, x, y, size, enabled) {
        ctx.save();
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const color = enabled ? '#4fc3f7' : '#666';
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (enabled) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
        }
        
        // Draw music note
        const noteSize = size * 0.35;
        
        // Note head (ellipse)
        ctx.beginPath();
        ctx.ellipse(centerX - noteSize * 0.3, centerY + noteSize * 0.5, noteSize * 0.45, noteSize * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Note stem
        ctx.beginPath();
        ctx.moveTo(centerX + noteSize * 0.1, centerY + noteSize * 0.4);
        ctx.lineTo(centerX + noteSize * 0.1, centerY - noteSize * 0.8);
        ctx.stroke();
        
        // Note flag
        ctx.beginPath();
        ctx.moveTo(centerX + noteSize * 0.1, centerY - noteSize * 0.8);
        ctx.quadraticCurveTo(centerX + noteSize * 0.6, centerY - noteSize * 0.4, centerX + noteSize * 0.1, centerY - noteSize * 0.1);
        ctx.stroke();
        
        // Strike-through if disabled
        if (!enabled) {
            ctx.strokeStyle = '#e53935';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(x + size * 0.15, y + size * 0.85);
            ctx.lineTo(x + size * 0.85, y + size * 0.15);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    _drawSFXIcon(ctx, x, y, size, enabled) {
        ctx.save();
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const color = enabled ? '#81c784' : '#666';
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (enabled) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
        }
        
        const s = size * 0.3;
        
        // Speaker body
        ctx.beginPath();
        ctx.moveTo(centerX - s * 0.8, centerY - s * 0.4);
        ctx.lineTo(centerX - s * 0.3, centerY - s * 0.4);
        ctx.lineTo(centerX + s * 0.3, centerY - s * 0.9);
        ctx.lineTo(centerX + s * 0.3, centerY + s * 0.9);
        ctx.lineTo(centerX - s * 0.3, centerY + s * 0.4);
        ctx.lineTo(centerX - s * 0.8, centerY + s * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // Sound waves (only if enabled)
        if (enabled) {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            // Wave 1
            ctx.beginPath();
            ctx.arc(centerX + s * 0.4, centerY, s * 0.5, -0.6, 0.6);
            ctx.stroke();
            
            // Wave 2
            ctx.beginPath();
            ctx.arc(centerX + s * 0.4, centerY, s * 0.9, -0.5, 0.5);
            ctx.stroke();
        }
        
        // Strike-through if disabled
        if (!enabled) {
            ctx.strokeStyle = '#e53935';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(x + size * 0.15, y + size * 0.85);
            ctx.lineTo(x + size * 0.85, y + size * 0.15);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    _setupAudioIconListeners() {
        const handleClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width / (window.devicePixelRatio || 1);
            const scaleY = this.canvas.height / rect.height / (window.devicePixelRatio || 1);
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Check pause icon
            if (this._isInBounds(x, y, this.pauseIconBounds)) {
                this.triggerPause();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // Check music icon
            if (this._isInBounds(x, y, this.musicIconBounds)) {
                this.toggleMusic();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // Check SFX icon
            if (this._isInBounds(x, y, this.sfxIconBounds)) {
                this.toggleSFX();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        };
        
        // Track if we just handled a touch to prevent double-trigger
        let lastTouchTime = 0;
        
        this.canvas.addEventListener('click', (e) => {
            // Ignore click if it came right after a touch (within 300ms)
            if (Date.now() - lastTouchTime < 300) {
                console.log('🚫 Ignoring click after touch');
                return;
            }
            handleClick(e);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            lastTouchTime = Date.now();
            if (e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                handleClick({ 
                    clientX: touch.clientX, 
                    clientY: touch.clientY, 
                    preventDefault: () => e.preventDefault(), 
                    stopPropagation: () => e.stopPropagation() 
                });
            }
        });
    }
    
    _isInBounds(x, y, bounds) {
        return x >= bounds.x && x <= bounds.x + bounds.w &&
               y >= bounds.y && y <= bounds.y + bounds.h;
    }
    
    triggerPause() {
        if (window.audioNeoSFX) window.audioNeoSFX.click();
        window.dispatchEvent(new CustomEvent('pause16bit'));
        console.log('⏸️ Pause triggered');
    }
    
    toggleMusic() {
        // Just dispatch event - main.js will update our state via setMusicEnabled
        window.dispatchEvent(new CustomEvent('toggleMusic16bit'));
        console.log(`🎵 Music toggle requested`);
    }
    
    toggleSFX() {
        // Just dispatch event - main.js will update our state via setSFXEnabled
        window.dispatchEvent(new CustomEvent('toggleSFX16bit'));
        console.log(`🔊 SFX toggle requested`);
    }
    
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
    }
    
    setSFXEnabled(enabled) {
        this.sfxEnabled = enabled;
    }
}