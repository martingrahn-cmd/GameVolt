// ============================================================
// RendererNokia.js  –  Fake 3310 shell + LCD + Pixel HUD
// ============================================================

console.log(">>> LOADED RENDERER_NOKIA v1.1 (fake 3310 shell)");

export class RendererNokia {
    constructor(canvas, grid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.grid = grid;
        this.cell = 1;

        this.viewW = 0;
        this.viewH = 0;

        // shell
        this.phoneX = 0;
        this.phoneY = 0;
        this.phoneW = 0;
        this.phoneH = 0;

        // lcd
        this.lcdX = 0;
        this.lcdY = 0;
        this.lcdW = 0;
        this.lcdH = 0;

        // playfield
        this.playX = 0;
        this.playY = 0;
        this.playW = 0;
        this.playH = 0;
        
        // Audio state (for icons) - Nokia only has SFX, no music
        this.sfxEnabled = true;
        
        // Icon touch areas
        this.pauseIconBounds = { x: 0, y: 0, w: 40, h: 40 };
        this.sfxIconBounds = { x: 0, y: 0, w: 40, h: 40 };
        
        // Setup touch/click listeners for icons
        this._setupAudioIconListeners();
    }

    // --------------------------------------------------------
    // RESIZE
    // --------------------------------------------------------
resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.viewW = vw;
    this.viewH = vh;

    // Canvas DPI setup
    this.canvas.width  = vw * dpr;
    this.canvas.height = vh * dpr;
    this.canvas.style.width  = vw + "px";
    this.canvas.style.height = vh + "px";

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // =====================================================
    // 📱 PHONE SIZE — Maximize the phone without clipping
    // =====================================================
    const RATIO = 1.82;  // height / width (close to Nokia 3310)

    // Start by assuming phone width is 92% of view width
    let phoneW = vw * 0.92;
    let phoneH = phoneW * RATIO;

    // If phone is too tall → scale by height instead
    if (phoneH > vh * 0.92) {
        phoneH = vh * 0.92;
        phoneW = phoneH / RATIO;
    }

    this.phoneW = phoneW;
    this.phoneH = phoneH;
    this.phoneX = (vw - phoneW) / 2;
    this.phoneY = (vh - phoneH) / 2;

    // =====================================================
    // 📺 LCD AREA
    // =====================================================
    const lcdW = phoneW * 0.70;
    const lcdH = phoneH * 0.42;

    this.lcdW = lcdW;
    this.lcdH = lcdH;
    this.lcdX = this.phoneX + (phoneW - lcdW) / 2;
    this.lcdY = this.phoneY + phoneH * 0.15;

    // =====================================================
    // 🎮 PLAYFIELD inside LCD
    // =====================================================
    const marginX = lcdW * 0.06;
    const marginY = lcdH * 0.12;

    let playW = lcdW - marginX * 2;
    let playH = lcdH - marginY * 2;

    const cell = Math.floor(
        Math.min(playW / this.grid.w, playH / this.grid.h)
    );
    this.cell = Math.max(cell, 1);

    this.playW = this.cell * this.grid.w;
    this.playH = this.cell * this.grid.h;

    this.playX = this.lcdX + (lcdW - this.playW) / 2;
    this.playY = this.lcdY + (lcdH - this.playH) / 2;

    console.log("[NOKIA] resized → phone:", phoneW, phoneH,
                "lcd:", lcdW, lcdH, "cell:", this.cell);
}


    // --------------------------------------------------------
    // Rounded rectangle helper
    // --------------------------------------------------------
    roundedRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y,     x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x,     y + h, rr);
        ctx.arcTo(x,     y + h, x,     y,     rr);
        ctx.arcTo(x,     y,     x + w, y,     rr);
        ctx.closePath();
    }

    // --------------------------------------------------------
    // Phone Shell (3310-inspired)
    // --------------------------------------------------------
    drawPhoneShell() {
        const ctx = this.ctx;

        // --- Body (dark blue-grey like original 3310) ---
        this.roundedRect(ctx, this.phoneX, this.phoneY, this.phoneW, this.phoneH, this.phoneW * 0.22);

        const bodyGrad = ctx.createLinearGradient(
            this.phoneX, this.phoneY,
            this.phoneX + this.phoneW * 0.3, this.phoneY + this.phoneH
        );
        bodyGrad.addColorStop(0.0, "#3a4a5c");
        bodyGrad.addColorStop(0.3, "#2c3a4a");
        bodyGrad.addColorStop(0.7, "#1e2832");
        bodyGrad.addColorStop(1.0, "#141c24");

        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.stroke();

        // Inner edge highlight
        this.roundedRect(
            ctx,
            this.phoneX + 2,
            this.phoneY + 2,
            this.phoneW - 4,
            this.phoneH - 4,
            this.phoneW * 0.20
        );
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- Top curve/arch above screen (characteristic 3310 feature) ---
        const archY = this.phoneY + this.phoneH * 0.08;
        const archH = this.phoneH * 0.06;
        const archW = this.phoneW * 0.5;
        const archX = this.phoneX + (this.phoneW - archW) / 2;
        
        ctx.beginPath();
        ctx.moveTo(archX, archY + archH);
        ctx.quadraticCurveTo(archX + archW / 2, archY - archH * 0.5, archX + archW, archY + archH);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- Speaker grille (multiple slots like original) ---
        const grillW = this.phoneW * 0.18;
        const grillH = this.phoneH * 0.012;
        const grillX = this.phoneX + (this.phoneW - grillW) / 2;
        const grillY = this.phoneY + this.phoneH * 0.065;
        const grillGap = grillH * 2.2;
        
        ctx.fillStyle = "#080a0c";
        for (let i = 0; i < 4; i++) {
            this.roundedRect(ctx, grillX, grillY + i * grillGap, grillW, grillH, grillH / 2);
            ctx.fill();
        }

        // --- LCD surround (darker bezel) ---
        const bezelPad = this.lcdW * 0.06;
        this.roundedRect(
            ctx, 
            this.lcdX - bezelPad, 
            this.lcdY - bezelPad, 
            this.lcdW + bezelPad * 2, 
            this.lcdH + bezelPad * 2, 
            this.lcdW * 0.08
        );
        ctx.fillStyle = "#0a0e12";
        ctx.fill();

        // --- LCD screen (classic green-yellow) ---
        this.roundedRect(ctx, this.lcdX, this.lcdY, this.lcdW, this.lcdH, this.lcdW * 0.06);
        const lcdGrad = ctx.createLinearGradient(
            this.lcdX, this.lcdY,
            this.lcdX, this.lcdY + this.lcdH
        );
        // More yellow-green like real Nokia 3310
        lcdGrad.addColorStop(0.0, "#9bab6e");
        lcdGrad.addColorStop(0.5, "#8a9960");
        lcdGrad.addColorStop(1.0, "#798850");

        ctx.fillStyle = lcdGrad;
        ctx.fill();

        // LCD inner shadow
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- Navigation button (oval, above keypad) ---
        const navW = this.phoneW * 0.28;
        const navH = this.phoneH * 0.045;
        const navX = this.phoneX + (this.phoneW - navW) / 2;
        const navY = this.phoneY + this.phoneH * 0.575;
        
        this.roundedRect(ctx, navX, navY, navW, navH, navH / 2);
        const navGrad = ctx.createLinearGradient(navX, navY, navX, navY + navH);
        navGrad.addColorStop(0, "#4a5a6a");
        navGrad.addColorStop(0.5, "#3a4a58");
        navGrad.addColorStop(1, "#2a3a46");
        ctx.fillStyle = navGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- Soft keys (two buttons below screen) ---
        const softKeyW = this.phoneW * 0.18;
        const softKeyH = this.phoneH * 0.032;
        const softKeyY = this.phoneY + this.phoneH * 0.545;
        const softKeyGap = this.phoneW * 0.24;
        
        // Left soft key
        this.roundedRect(
            ctx,
            this.phoneX + (this.phoneW - softKeyGap) / 2 - softKeyW,
            softKeyY,
            softKeyW,
            softKeyH,
            softKeyH / 2
        );
        ctx.fillStyle = "#3a4a58";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.stroke();
        
        // Right soft key
        this.roundedRect(
            ctx,
            this.phoneX + (this.phoneW + softKeyGap) / 2,
            softKeyY,
            softKeyW,
            softKeyH,
            softKeyH / 2
        );
        ctx.fill();
        ctx.stroke();

        // --- Keypad area ---
        const keyAreaTop = this.phoneY + this.phoneH * 0.64;
        const keyAreaH = this.phoneH * 0.26;
        const keyAreaW = this.phoneW * 0.72;
        const keyAreaX = this.phoneX + (this.phoneW - keyAreaW) / 2;

        // Numeric buttons (4 rows x 3 cols, classic layout)
        const rows = 4;
        const cols = 3;
        const btnW = keyAreaW / cols * 0.75;
        const btnH = keyAreaH / rows * 0.70;
        const spacingX = keyAreaW / cols;
        const spacingY = keyAreaH / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = keyAreaX + spacingX * (c + 0.5);
                const cy = keyAreaTop + spacingY * (r + 0.5);

                this.roundedRect(
                    ctx, 
                    cx - btnW / 2, 
                    cy - btnH / 2, 
                    btnW, 
                    btnH, 
                    btnH * 0.25
                );

                const btnGrad = ctx.createLinearGradient(cx, cy - btnH/2, cx, cy + btnH/2);
                btnGrad.addColorStop(0.0, "#e8eaee");
                btnGrad.addColorStop(0.4, "#d0d4da");
                btnGrad.addColorStop(1.0, "#b8bcc4");

                ctx.fillStyle = btnGrad;
                ctx.fill();
                ctx.strokeStyle = "rgba(0,0,0,0.4)";
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // --------------------------------------------------------
    // Playfield frame
    // --------------------------------------------------------
    drawPlayfieldFrame() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(20,60,10,0.9)";
        ctx.lineWidth = 1.2;

        ctx.strokeRect(
            this.playX + 0.5,
            this.playY + 0.5,
            this.playW - 1,
            this.playH - 1
        );

        ctx.restore();
    }

    // --------------------------------------------------------
    // Snake (pixel blocks)
    // --------------------------------------------------------
    drawSnake(snake) {
        const ctx = this.ctx;
        const s = this.cell;

        const cells = snake.gridCells;
        if (!cells) return;

        // outer dark
        ctx.fillStyle = "#213d08";
        for (const c of cells) {
            const x = this.playX + c.x * s;
            const y = this.playY + c.y * s;
            ctx.fillRect(x, y, s, s);
        }

        // inner bright
        ctx.fillStyle = "#4bff2a";
        for (const c of cells) {
            const x = this.playX + c.x * s + 1;
            const y = this.playY + c.y * s + 1;
            const inner = s - 2;
            if (inner > 0) ctx.fillRect(x, y, inner, inner);
        }
    }

    // --------------------------------------------------------
    // Food
    // --------------------------------------------------------
    drawFood(food) {
        const ctx = this.ctx;
        const s = this.cell;

        const px = this.playX + food.x * s;
        const py = this.playY + food.y * s;

        ctx.fillStyle = "#102004";
        ctx.fillRect(px, py, s, s);

        ctx.fillStyle = "#000000";
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
    }

    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------
    render(game) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.viewW, this.viewH);

        // 1. Phone shell
        this.drawPhoneShell();

        // 2. HUD inside LCD
        if (game.hud && game.hud.setPosition) {
            game.hud.setPosition(this.lcdX, this.lcdY, this.lcdW, this.lcdH);
            // Use scoring system score, not game.score
            const score = game.scoring?.score || 0;
            game.hud.update(score);
            game.hud.draw();
        }

        // 3. Playfield
        this.drawPlayfieldFrame();
        this.drawFood(game.food);
        this.drawSnake(game.snake);
        
        // 4. Audio & pause icons (outside phone, top-right corner)
        this.drawAudioIcons();
    }
    
    // --------------------------------------------------------
    // AUDIO & PAUSE ICONS
    // --------------------------------------------------------
    drawAudioIcons() {
        const ctx = this.ctx;
        
        // Responsive icon size
        const isMobile = this.viewW < 600;
        const iconSize = isMobile ? 28 : 36;
        const padding = isMobile ? 8 : 12;
        const spacing = isMobile ? 6 : 10;
        
        // Position in top-right of screen (outside phone)
        // Nokia only has SFX and Pause (no music)
        const y = padding;
        const pauseX = this.viewW - padding - iconSize;
        const sfxX = pauseX - iconSize - spacing;
        
        // Store bounds for click detection
        this.pauseIconBounds = { x: pauseX, y: y, w: iconSize, h: iconSize };
        this.sfxIconBounds = { x: sfxX, y: y, w: iconSize, h: iconSize };
        
        // Draw pause icon (rightmost)
        this._drawPauseIcon(ctx, pauseX, y, iconSize);
        
        // Draw SFX icon (speaker)
        this._drawSFXIcon(ctx, sfxX, y, iconSize, this.sfxEnabled);
    }
    
    _drawPauseIcon(ctx, x, y, size) {
        ctx.save();
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const color = '#67a868'; // Nokia green
        
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
    
    _drawSFXIcon(ctx, x, y, size, enabled) {
        ctx.save();
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const color = enabled ? '#67a868' : '#555'; // Nokia green-ish
        
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
            ctx.strokeStyle = '#c62828';
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
        window.dispatchEvent(new CustomEvent('pauseNokia'));
        console.log('⏸️ Nokia Pause triggered');
    }
    
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        window.dispatchEvent(new CustomEvent('toggleSFXNokia', { detail: this.sfxEnabled }));
        console.log(`🔊 Nokia SFX: ${this.sfxEnabled ? 'ON' : 'OFF'}`);
    }
    
    setSFXEnabled(enabled) {
        this.sfxEnabled = enabled;
    }
}