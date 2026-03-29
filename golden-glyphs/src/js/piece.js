// src/js/piece.js
import { SHAPES, SKINS, SHAPE_COLORS } from "./config.js";

export class Piece {
    constructor(grid, shapeKey, skinId = 'skin_default', glowId = 'glow_none') {
        this.grid = grid;
        this.shapeKey = shapeKey;
        
        // Hämta formen EXAKT som den är i config
        this.originalShape = SHAPES[shapeKey] || [[0,0]];
        this.shape = this.originalShape.map(p => [...p]); 
        
        const skin = SKINS[skinId] || SKINS['skin_default'];
        if (skin && skin.COLORS) {
            this.color = skin.COLORS[String(shapeKey)] || SHAPE_COLORS[String(shapeKey)] || "#999";
        } else {
            this.color = SHAPE_COLORS[String(shapeKey)] || "#999"; 
        }

        this.glowId = glowId;
        this.col = 0; this.row = 0;
        this.x = 0; this.y = 0;
        this.targetX = 0; this.targetY = 0;
        this.visualX = 0; this.visualY = 0;
        this.targetScale = 1.0; this.scale = 1.0; 
        
        // Animation för rotation/flip - VISUELL OFFSET som animeras mot 0
        this.animRotation = 0;    // Offset i radianer, animeras mot 0
        this.animFlipX = 1;       // ScaleX för flip, animeras 1 -> -1 -> 1
        this.isFlipping = false;  // Mitt i flip-animation?
        
        // Pulse-animation vid rotate/flip
        this.pulseScale = 1.0;
        this.pulseTarget = 1.0;
        this.flashIntensity = 0; // Separat flash som tonar ut
        
        // Viktigt för game.js logik
        this.width = 0; 
        this.height = 0;
        this.minC = 0; 
        this.minR = 0;
        
        // Centrum för bättre positionering
        this.centerOffsetX = 0;
        this.centerOffsetY = 0;

        this.isPlaced = false;
        this.inTray = true;
        this.dragging = false;
        
        // Rotation och flip tracking för tutorial
        this.rotation = 0;  // 0-3, ökar med varje rotate()
        this.flipped = false;

        this.updateMetrics();
    }

    updateMetrics() {
        this.cells = this.shape.map(([c, r]) => ({ c, r }));
        
        let minC = Infinity, maxC = -Infinity;
        let minR = Infinity, maxR = -Infinity;
        
        this.shape.forEach(([c, r]) => {
            if (c < minC) minC = c; if (c > maxC) maxC = c;
            if (r < minR) minR = r; if (r > maxR) maxR = r;
        });

        this.minC = minC;
        this.minR = minR;
        this.widthCells = maxC - minC + 1;
        this.heightCells = maxR - minR + 1;

        const currentPitch = this.grid.pitch * (this.scale || 1);
        this.width = this.widthCells * currentPitch;
        this.height = this.heightCells * currentPitch;
        
        // Beräkna verkligt centrum av pjäsen
        this.centerOffsetX = (minC + (this.widthCells / 2)) * currentPitch;
        this.centerOffsetY = (minR + (this.heightCells / 2)) * currentPitch;
    }

    rotate() {
        this.shape = this.shape.map(([c, r]) => [-r, c]);
        // Starta visuell rotation från -90° som animeras mot 0
        this.animRotation = -Math.PI / 2;
        this.flashIntensity = 1.0;
        // Track rotation (0-3)
        this.rotation = (this.rotation + 1) % 4;
        this.updateMetrics();
    }
    
    flip() {
        this.shape = this.shape.map(([c, r]) => [-c, r]);
        // Starta flip-animation
        this.isFlipping = true;
        this.animFlipX = -1; // Börja utklämd, animeras till 1
        this.flashIntensity = 1.0;
        // Track flip state
        this.flipped = !this.flipped;
        this.updateMetrics();
    }

    contains(x, y) { return this.containsPoint(x, y); }

    containsPoint(px, py) {
        const pitch = this.grid.pitch * this.scale;
        
        for (let cell of this.cells) {
            const cx = this.visualX + cell.c * pitch;
            const cy = this.visualY + cell.r * pitch;
            
            const padding = 5; 
            if (px >= cx - padding && px < cx + pitch + padding && 
                py >= cy - padding && py < cy + pitch + padding) {
                return true;
            }
        }
        return false;
    }

    onPickup() {
        this.targetScale = 1.1; 
        this.isPlaced = false;
    }

    returnToTray(tx, ty) {
        this.inTray = true;
        this.isPlaced = false;
        this.targetX = tx;
        this.targetY = ty;
        this.targetScale = 0.6; 
    }

    update(dt) {
        // Clampa dt för att undvika overshoot vid frame-spikes
        const clampedDt = Math.min(dt, 0.05);

        // Position
        const speed = 15 * clampedDt;
        this.visualX += (this.targetX - this.visualX) * speed;
        this.visualY += (this.targetY - this.visualY) * speed;

        // Skala
        const scaleSpeed = 10 * clampedDt;
        this.scale += (this.targetScale - this.scale) * scaleSpeed;

        // Rotation animation - animRotation går mot 0
        const rotSpeed = 8 * clampedDt;
        this.animRotation += (0 - this.animRotation) * rotSpeed;
        // Snäpp till 0 om tillräckligt nära
        if (Math.abs(this.animRotation) < 0.01) this.animRotation = 0;

        // Flip animation - animFlipX går mot 1
        const flipSpeed = 8 * clampedDt;
        this.animFlipX += (1 - this.animFlipX) * flipSpeed;
        if (Math.abs(this.animFlipX - 1) < 0.01) {
            this.animFlipX = 1;
            this.isFlipping = false;
        }
        
        // Flash tonar ut (använd clampedDt för att undvika att flash försvinner vid frame-spikes)
        if (this.flashIntensity > 0) {
            this.flashIntensity -= clampedDt * 4;
            if (this.flashIntensity < 0) this.flashIntensity = 0;
        }

        // Uppdatera pixelstorlek
        const pitch = this.grid.pitch * this.scale;
        this.width = this.widthCells * pitch;
        this.height = this.heightCells * pitch;
    }

    // Hjälpfunktion för att göra färg ljusare
    lightenColor(color, percent) {
        // Hantera både hex och rgb format
        let r, g, b;
        if (color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            r = (num >> 16) & 255;
            g = (num >> 8) & 255;
            b = num & 255;
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match) {
                r = parseInt(match[0]);
                g = parseInt(match[1]);
                b = parseInt(match[2]);
            } else {
                return color;
            }
        } else {
            return color;
        }
        const amt = Math.round(2.55 * percent);
        r = Math.min(255, r + amt);
        g = Math.min(255, g + amt);
        b = Math.min(255, b + amt);
        return `rgb(${r},${g},${b})`;
    }
    
    // Hjälpfunktion för att göra färg mörkare
    darkenColor(color, percent) {
        let r, g, b;
        if (color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            r = (num >> 16) & 255;
            g = (num >> 8) & 255;
            b = num & 255;
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match) {
                r = parseInt(match[0]);
                g = parseInt(match[1]);
                b = parseInt(match[2]);
            } else {
                return color;
            }
        } else {
            return color;
        }
        const amt = Math.round(2.55 * percent);
        r = Math.max(0, r - amt);
        g = Math.max(0, g - amt);
        b = Math.max(0, b - amt);
        return `rgb(${r},${g},${b})`;
    }

    draw(ctx) {
        const baseScale = this.scale;
        const pitch = this.grid.pitch * baseScale;
        const gap = 2 * baseScale; 
        const radius = 5 * baseScale; 

        ctx.save();
        
        // Translatera till visuell position
        ctx.translate(this.visualX, this.visualY);
        
        // Beräkna centrum av pjäsen för rotation/flip
        const centerX = (this.minC + this.widthCells / 2) * pitch;
        const centerY = (this.minR + this.heightCells / 2) * pitch;
        
        // Applicera rotation runt centrum
        if (this.animRotation !== 0) {
            ctx.translate(centerX, centerY);
            ctx.rotate(this.animRotation);
            ctx.translate(-centerX, -centerY);
        }
        
        // Applicera flip (scaleX) runt centrum
        if (this.animFlipX !== 1) {
            ctx.translate(centerX, centerY);
            ctx.scale(this.animFlipX, 1);
            ctx.translate(-centerX, -centerY);
        }
        
        // Skugga under hela pjäsen när man drar
        if (this.dragging) {
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 8;
        }
        
        // Flash-effekt vid rotation/flip
        const flashAlpha = this.flashIntensity * 0.6;

        // Rita varje cell
        this.cells.forEach(cell => {
            const cx = cell.c * pitch;
            const cy = cell.r * pitch;
            const size = pitch - gap * 2;
            const x = cx + gap;
            const y = cy + gap;
            
            // === BLOCK MED 3D-EFFEKT ===
            
            // 1. Bas-skugga (under blocket)
            if (!this.dragging) {
                ctx.fillStyle = "rgba(0,0,0,0.3)";
                this.drawRoundedRect(ctx, x + 2, y + 3, size, size, radius);
                ctx.fill();
            }
            
            // 2. Huvudfärg med gradient
            const baseColor = this.color;
            const lightColor = this.lightenColor(baseColor, 20);
            const darkColor = this.darkenColor(baseColor, 25);
            
            const grad = ctx.createLinearGradient(x, y, x, y + size);
            grad.addColorStop(0, lightColor);
            grad.addColorStop(0.4, baseColor);
            grad.addColorStop(1, darkColor);
            
            ctx.fillStyle = grad;
            this.drawRoundedRect(ctx, x, y, size, size, radius);
            ctx.fill();
            
            // 3. Övre kant (highlight)
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 2 * baseScale;
            ctx.beginPath();
            ctx.moveTo(x + radius, y + 1);
            ctx.lineTo(x + size - radius, y + 1);
            ctx.stroke();
            
            // 4. Vänster kant (highlight)
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 1.5 * baseScale;
            ctx.beginPath();
            ctx.moveTo(x + 1, y + radius);
            ctx.lineTo(x + 1, y + size - radius);
            ctx.stroke();
            
            // 5. Nedre kant (skugga)
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 2 * baseScale;
            ctx.beginPath();
            ctx.moveTo(x + radius, y + size - 1);
            ctx.lineTo(x + size - radius, y + size - 1);
            ctx.stroke();
            
            // 6. Höger kant (skugga)
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1.5 * baseScale;
            ctx.beginPath();
            ctx.moveTo(x + size - 1, y + radius);
            ctx.lineTo(x + size - 1, y + size - radius);
            ctx.stroke();
            
            // 7. Glans i övre vänstra hörnet
            const shineSize = size * 0.25;
            const shineGrad = ctx.createRadialGradient(
                x + size * 0.25, y + size * 0.25, 0,
                x + size * 0.25, y + size * 0.25, shineSize
            );
            shineGrad.addColorStop(0, "rgba(255,255,255,0.5)");
            shineGrad.addColorStop(0.5, "rgba(255,255,255,0.2)");
            shineGrad.addColorStop(1, "rgba(255,255,255,0)");
            
            ctx.fillStyle = shineGrad;
            ctx.beginPath();
            ctx.arc(x + size * 0.25, y + size * 0.25, shineSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 8. Tunn yttre kant
            ctx.strokeStyle = "rgba(0,0,0,0.4)";
            ctx.lineWidth = 1;
            this.drawRoundedRect(ctx, x, y, size, size, radius);
            ctx.stroke();
            
            // 9. Flash-effekt vid rotation/flip
            if (flashAlpha > 0) {
                ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
                this.drawRoundedRect(ctx, x, y, size, size, radius);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}