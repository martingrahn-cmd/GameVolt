// ============================================================
// Visualizer.js — Audio-reactive background effects
// ============================================================
// Renders behind the game area, responds to music

export class Visualizer {
    constructor(audio) {
        this.audio = audio;
        this.enabled = true;
        
        // Effect states
        this.beatPulse = 0;
        this.hueShift = 0;
        this.gridPulse = 0;
        
        // Particles
        this.particles = [];
        this.maxParticles = 50;
        
        // Spectrum bars config
        this.barCount = 32;
    }

    update(dt) {
        if (!this.enabled || !this.audio) return;
        
        // Update audio analysis
        this.audio.update();
        
        // Decay effects
        this.beatPulse *= 0.92;
        this.gridPulse *= 0.95;
        
        // Beat triggers
        if (this.audio.hasBeat()) {
            this.beatPulse = 1;
            this.gridPulse = 1;
            this._spawnBeatParticles();
        }
        
        // Hue shift follows music energy
        this.hueShift += dt * 20 * (1 + this.audio.getOverall() * 2);
        if (this.hueShift > 360) this.hueShift -= 360;
        
        // Update particles
        this._updateParticles(dt);
    }

    // --------------------------------------------------------
    // RENDER - Called before game rendering
    // --------------------------------------------------------
    render(ctx, width, height, offsetX, offsetY, gameSize) {
        if (!this.enabled) return;
        
        ctx.save();
        
        // Reset transform for full canvas access
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);
        
        const vw = width / dpr;
        const vh = height / dpr;
        
        // Draw effects around game area
        this._drawSpectrumBars(ctx, vw, vh, offsetX, offsetY, gameSize);
        this._drawCornerGlow(ctx, offsetX, offsetY, gameSize);
        this._drawParticles(ctx, vw, vh);
        
        ctx.restore();
    }

    // --------------------------------------------------------
    // SPECTRUM BARS - Left and right of game area
    // --------------------------------------------------------
    _drawSpectrumBars(ctx, vw, vh, offsetX, offsetY, gameSize) {
        const freqData = this.audio.getFrequencyData();
        if (!freqData) return;
        
        const barCount = this.barCount;
        const barWidth = 4;
        const maxHeight = gameSize * 0.4;
        const spacing = gameSize / barCount;
        
        // Colors
        const bassColor = `hsla(${320 + this.hueShift % 60}, 100%, 60%, 0.8)`;
        const midColor = `hsla(${180 + this.hueShift % 60}, 100%, 60%, 0.7)`;
        
        ctx.shadowBlur = 10;
        
        for (let i = 0; i < barCount; i++) {
            // Map to frequency data
            const freqIdx = Math.floor((i / barCount) * freqData.length * 0.7);
            const value = freqData[freqIdx] / 255;
            const height = value * maxHeight * (1 + this.beatPulse * 0.3);
            
            // Color gradient based on frequency
            const hue = 280 + (i / barCount) * 80 + this.hueShift;
            ctx.fillStyle = `hsla(${hue % 360}, 100%, 60%, ${0.5 + value * 0.4})`;
            ctx.shadowColor = `hsla(${hue % 360}, 100%, 60%, 0.8)`;
            
            const y = offsetY + spacing * i + spacing / 2;
            
            // Left side bars (pointing left)
            const leftX = offsetX - 10;
            ctx.fillRect(leftX - height, y - barWidth / 2, height, barWidth);
            
            // Right side bars (pointing right)
            const rightX = offsetX + gameSize + 10;
            ctx.fillRect(rightX, y - barWidth / 2, height, barWidth);
        }
        
        ctx.shadowBlur = 0;
    }

    // --------------------------------------------------------
    // CORNER GLOW - Pulsing glow at corners on beat
    // --------------------------------------------------------
    _drawCornerGlow(ctx, offsetX, offsetY, gameSize) {
        if (this.beatPulse < 0.1) return;
        
        const corners = [
            { x: offsetX, y: offsetY },
            { x: offsetX + gameSize, y: offsetY },
            { x: offsetX, y: offsetY + gameSize },
            { x: offsetX + gameSize, y: offsetY + gameSize }
        ];
        
        const radius = 50 + this.beatPulse * 100;
        const alpha = this.beatPulse * 0.6;
        
        for (const corner of corners) {
            const gradient = ctx.createRadialGradient(
                corner.x, corner.y, 0,
                corner.x, corner.y, radius
            );
            
            const hue = 300 + this.hueShift;
            gradient.addColorStop(0, `hsla(${hue % 360}, 100%, 70%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 100%, 50%, ${alpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${hue % 360}, 100%, 50%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(corner.x - radius, corner.y - radius, radius * 2, radius * 2);
        }
    }

    // --------------------------------------------------------
    // PARTICLES - Spawn on beats
    // --------------------------------------------------------
    _spawnBeatParticles() {
        const count = 3 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            
            this.particles.push({
                x: 0.5, // Relative to viewport
                y: 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 4,
                hue: 280 + Math.random() * 80
            });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Move
            p.x += (p.vx * dt) / 1000; // Convert to relative coords
            p.y += (p.vy * dt) / 1000;
            
            // Decay
            p.life -= p.decay * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    _drawParticles(ctx, vw, vh) {
        ctx.shadowBlur = 8;
        
        for (const p of this.particles) {
            const x = p.x * vw;
            const y = p.y * vh;
            const alpha = p.life;
            const hue = (p.hue + this.hueShift) % 360;
            
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha})`;
            
            ctx.beginPath();
            ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }

    // --------------------------------------------------------
    // PUBLIC API
    // --------------------------------------------------------
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    // Get beat pulse for other effects (like grid glow)
    getBeatPulse() {
        return this.beatPulse;
    }

    getGridPulse() {
        return this.gridPulse;
    }

    getHueShift() {
        return this.hueShift;
    }
}