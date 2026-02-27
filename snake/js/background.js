// ============================================================
// Background.js — Jeff Minter-style psychedelic backgrounds
// ============================================================
// Lightweight effects that run smoothly on older hardware
// Renders BEHIND the game grid, inside the game area

export class Background {
    constructor() {
        // Performance mode: "lite" (default) or "full"
        this.mode = "lite";
        
        // Current effect (0-5) - only used in full mode
        this.effectIndex = 0;
        this.effectTime = 0;
        this.effectDuration = 30; // Seconds before switching
        
        // Global animation time
        this.time = 0;
        
        // Color cycling (used by both modes)
        this.hue = 0;
        this.hueSpeed = 15; // degrees per second
        
        // Lite mode: subtle pulse
        this.pulse = 0;
        this.pulseDir = 1;
        
        // Effect-specific state (full mode only)
        this.stars = [];
        
        // Performance: pre-calculate some values
        this.sinTable = [];
        this.cosTable = [];
        for (let i = 0; i < 360; i++) {
            this.sinTable[i] = Math.sin(i * Math.PI / 180);
            this.cosTable[i] = Math.cos(i * Math.PI / 180);
        }
        
        // Effect list (full mode)
        this.effects = [
            this._drawPlasma.bind(this),
            this._drawSpiral.bind(this),
            this._drawRings.bind(this),
            this._drawStarfield.bind(this),
            this._drawAurora.bind(this),
            this._drawGridWarp.bind(this)
        ];
    }

    _initStars() {
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() - 0.5,
                y: Math.random() - 0.5,
                z: Math.random(),
                speed: 0.2 + Math.random() * 0.3
            });
        }
    }

    // Fast sin/cos lookup
    _sin(deg) {
        return this.sinTable[Math.floor(((deg % 360) + 360) % 360)];
    }
    
    _cos(deg) {
        return this.cosTable[Math.floor(((deg % 360) + 360) % 360)];
    }

    update(dt) {
        this.time += dt;
        
        // Cycle hue (both modes)
        this.hue = (this.hue + this.hueSpeed * dt) % 360;
        
        // Lite mode: gentle pulse
        this.pulse += this.pulseDir * dt * 0.3;
        if (this.pulse > 1) { this.pulse = 1; this.pulseDir = -1; }
        if (this.pulse < 0) { this.pulse = 0; this.pulseDir = 1; }
        
        // Full mode: effect switching and star updates
        if (this.mode === "full") {
            this.effectTime += dt;
            
            if (this.effectTime > this.effectDuration) {
                this.effectTime = 0;
                this.effectIndex = (this.effectIndex + 1) % this.effects.length;
            }
            
            // Update stars
            for (const star of this.stars) {
                star.z -= star.speed * dt;
                if (star.z <= 0.01) {
                    star.z = 1;
                    star.x = Math.random() - 0.5;
                    star.y = Math.random() - 0.5;
                }
            }
        }
    }

    render(ctx, size) {
        ctx.save();
        
        // Clip to game area
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.clip();
        
        if (this.mode === "lite") {
            this._drawLiteBackground(ctx, size);
        } else {
            this.effects[this.effectIndex](ctx, size);
        }
        
        ctx.restore();
    }

    // ============================================================
    // LITE MODE: Beautiful but super lightweight
    // ============================================================
    _drawLiteBackground(ctx, size) {
        const cx = size / 2;
        const cy = size / 2;
        
        // Animated hue for colors
        const hue1 = this.hue;
        const hue2 = (this.hue + 60) % 360;
        
        // Subtle pulse affects gradient size
        const pulseSize = 0.7 + this.pulse * 0.15;
        
        // Single radial gradient - very cheap to render
        const gradient = ctx.createRadialGradient(
            cx, cy, 0,
            cx, cy, size * pulseSize
        );
        
        // Deep purple/blue center, darker edges
        gradient.addColorStop(0, `hsla(${hue1}, 70%, 20%, 1)`);
        gradient.addColorStop(0.5, `hsla(${hue2}, 80%, 12%, 1)`);
        gradient.addColorStop(1, `hsla(${hue1}, 60%, 5%, 1)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Optional: very subtle vignette (one more gradient, still cheap)
        const vignette = ctx.createRadialGradient(
            cx, cy, size * 0.3,
            cx, cy, size * 0.8
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.4)");
        
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, size, size);
    }

    // ============================================================
    // FULL MODE EFFECTS (heavy)
    // ============================================================
    
    // EFFECT 1: Plasma waves
    _drawPlasma(ctx, size) {
        const cellSize = 24;
        const cols = Math.ceil(size / cellSize);
        const rows = cols;
        const t = this.time * 2;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px = x / cols;
                const py = y / rows;
                
                const v1 = Math.sin(px * 10 + t);
                const v2 = Math.sin(py * 10 + t * 0.7);
                const v3 = Math.sin((px + py) * 8 + t * 0.5);
                
                const value = (v1 + v2 + v3) / 3;
                const hue = (this.hue + value * 60 + 300) % 360;
                const light = 15 + value * 10;
                
                ctx.fillStyle = `hsl(${hue}, 100%, ${light}%)`;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // EFFECT 2: Spiral tunnel
    _drawSpiral(ctx, size) {
        const cx = size / 2;
        const cy = size / 2;
        const arms = 4;
        const t = this.time;
        
        ctx.fillStyle = "#0a0012";
        ctx.fillRect(0, 0, size, size);
        
        ctx.lineWidth = 3;
        
        for (let arm = 0; arm < arms; arm++) {
            const armOffset = (arm / arms) * Math.PI * 2;
            const hue = (this.hue + arm * 40) % 360;
            
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            
            for (let r = 10; r < size * 0.6; r += 4) {
                const angle = armOffset + r * 0.03 + t * 2;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                
                if (r === 10) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
    }

    // EFFECT 3: Concentric rings
    _drawRings(ctx, size) {
        const cx = size / 2;
        const cy = size / 2;
        const maxRadius = size * 0.7;
        const t = this.time;
        
        ctx.fillStyle = "#0a0012";
        ctx.fillRect(0, 0, size, size);
        
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 12; i++) {
            const phase = (t * 50 + i * 30) % maxRadius;
            const alpha = 1 - phase / maxRadius;
            
            if (alpha <= 0) continue;
            
            const hue = (this.hue + i * 25) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 55%, ${alpha * 0.7})`;
            ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            ctx.arc(cx, cy, phase, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
    }

    // EFFECT 4: Starfield
    _drawStarfield(ctx, size) {
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.fillStyle = "#050008";
        ctx.fillRect(0, 0, size, size);
        
        for (const star of this.stars) {
            const scale = 1 / star.z;
            const x = cx + star.x * scale * size * 0.5;
            const y = cy + star.y * scale * size * 0.5;
            
            if (x < 0 || x > size || y < 0 || y > size) continue;
            
            const starSize = Math.max(1, (1 - star.z) * 4);
            const alpha = (1 - star.z) * 0.9;
            
            const hue = (this.hue + star.z * 60) % 360;
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
            
            ctx.beginPath();
            ctx.arc(x, y, starSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // EFFECT 5: Aurora
    _drawAurora(ctx, size) {
        const t = this.time;
        
        ctx.fillStyle = "#050010";
        ctx.fillRect(0, 0, size, size);
        
        const bands = 5;
        
        for (let b = 0; b < bands; b++) {
            const baseY = size * (0.2 + b * 0.15);
            const hue = (this.hue + b * 50) % 360;
            
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            
            for (let x = 0; x <= size; x += 8) {
                const wave1 = Math.sin(x * 0.02 + t + b) * 30;
                const wave2 = Math.sin(x * 0.01 + t * 0.7 + b * 2) * 20;
                const y = baseY + wave1 + wave2;
                ctx.lineTo(x, y);
            }
            
            ctx.lineTo(size, size);
            ctx.lineTo(0, size);
            ctx.closePath();
            
            const gradient = ctx.createLinearGradient(0, baseY - 50, 0, baseY + 100);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
            gradient.addColorStop(0.3, `hsla(${hue}, 100%, 50%, 0.15)`);
            gradient.addColorStop(0.6, `hsla(${hue}, 100%, 40%, 0.1)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    // EFFECT 6: Grid warp
    _drawGridWarp(ctx, size) {
        const t = this.time;
        const gridSize = 12;
        const cellSize = size / gridSize;
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.fillStyle = "#08000f";
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = `hsla(${this.hue}, 100%, 50%, 0.4)`;
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= gridSize; x++) {
            ctx.beginPath();
            
            for (let y = 0; y <= gridSize; y++) {
                const px = x * cellSize;
                const py = y * cellSize;
                
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                const warp = Math.sin(dist * 0.02 - t * 3) * 15;
                const angle = Math.atan2(dy, dx);
                
                const wx = px + Math.cos(angle) * warp;
                const wy = py + Math.sin(angle) * warp;
                
                if (y === 0) ctx.moveTo(wx, wy);
                else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }
        
        for (let y = 0; y <= gridSize; y++) {
            ctx.beginPath();
            
            for (let x = 0; x <= gridSize; x++) {
                const px = x * cellSize;
                const py = y * cellSize;
                
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                const warp = Math.sin(dist * 0.02 - t * 3) * 15;
                const angle = Math.atan2(dy, dx);
                
                const wx = px + Math.cos(angle) * warp;
                const wy = py + Math.sin(angle) * warp;
                
                if (x === 0) ctx.moveTo(wx, wy);
                else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }
        
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.3);
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 60%, 0.2)`);
        gradient.addColorStop(1, `hsla(${this.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    
    // Toggle between lite and full mode
    toggleMode() {
        if (this.mode === "lite") {
            this.mode = "full";
            this._initStars(); // Initialize stars for starfield
        } else {
            this.mode = "lite";
        }
        return this.mode;
    }
    
    // Get current mode
    getMode() {
        return this.mode;
    }
    
    // Set mode directly
    setMode(mode) {
        this.mode = mode === "full" ? "full" : "lite";
        if (this.mode === "full" && this.stars.length === 0) {
            this._initStars();
        }
    }
    
    // Force switch to next effect (full mode only)
    nextEffect() {
        this.effectIndex = (this.effectIndex + 1) % this.effects.length;
        this.effectTime = 0;
    }

    // Force switch to specific effect (0-5)
    setEffect(index) {
        this.effectIndex = index % this.effects.length;
        this.effectTime = 0;
    }

    // Get current effect name
    getEffectName() {
        if (this.mode === "lite") return "Lite";
        const names = ["Plasma", "Spiral", "Rings", "Starfield", "Aurora", "Grid Warp"];
        return names[this.effectIndex];
    }

    // Set how long each effect plays (seconds)
    setDuration(seconds) {
        this.effectDuration = seconds;
    }

    // Set color cycling speed
    setHueSpeed(degreesPerSecond) {
        this.hueSpeed = degreesPerSecond;
    }
}