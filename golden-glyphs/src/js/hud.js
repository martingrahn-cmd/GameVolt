// src/js/hud.js
export class HUD {
    constructor(layout) {
        this.layout = layout;
        this.time = 0;
        this.currency = 0;
        this.currentLevelName = "1";
        this.ownedHints = 0;
        this.earnedStars = 0; // Stjärnor spelaren redan har på denna bana
        
        // Time Attack stats
        this.isTimeAttack = false;
        this.highScore = 0; 
        this.currentScore = 0;

        // Hitboxar
        this.btnMenu = { x:0, y:0, w:0, h:0 };
        this.btnHint = { x:0, y:0, w:0, h:0 };
        
        this.pulseTimer = 0;
        this.textScale = 1;
        this.theme = 'jungle';
    }

    setTheme(theme) { this.theme = theme || 'jungle'; }

    getPalette() {
        return {
            jungle: { line:'#E8C45B', glow:'rgba(232,196,91,.55)', panel:'rgba(4,10,7,.88)', soft:'rgba(84,105,70,.22)' },
            frozen: { line:'#9DE7FF', glow:'rgba(100,218,255,.52)', panel:'rgba(3,13,23,.9)', soft:'rgba(96,178,211,.2)' },
            inferno: { line:'#FF9A4D', glow:'rgba(255,97,35,.55)', panel:'rgba(18,5,6,.9)', soft:'rgba(176,62,30,.22)' },
            neon: { line:'#52E5FF', glow:'rgba(211,64,255,.52)', panel:'rgba(2,4,17,.91)', soft:'rgba(62,80,180,.22)' },
            zen: { line:'#8FD6BF', glow:'rgba(94,203,170,.45)', panel:'rgba(4,14,13,.88)', soft:'rgba(90,143,126,.2)' }
        }[this.theme] || { line:'#E8C45B', glow:'rgba(232,196,91,.55)', panel:'rgba(4,10,7,.88)', soft:'rgba(84,105,70,.22)' };
    }

    resize() {}

    checkHit(x, y) {
        // 1. Meny/Back (Vänster)
        if (x > this.btnMenu.x && x < this.btnMenu.x + this.btnMenu.w &&
            y > this.btnMenu.y && y < this.btnMenu.y + this.btnMenu.h) {
            return 'menu';
        }
        // 2. Hint (Höger)
        if (x > this.btnHint.x && x < this.btnHint.x + this.btnHint.w &&
            y > this.btnHint.y && y < this.btnHint.y + this.btnHint.h) {
            return 'hint';
        }
        return null;
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return;
        }
        if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    draw(ctx) {
        const dpr = window.devicePixelRatio || 1;
        const w = ctx.canvas.width / dpr;
        const palette = this.getPalette();

        this.pulseTimer += 0.03;

        // 1. TOP BAR BAKGRUND
        const barHeight = 95;

        const barGradient = ctx.createLinearGradient(0, 0, 0, barHeight);
        barGradient.addColorStop(0, palette.panel);
        barGradient.addColorStop(1, 'rgba(0,0,0,.78)');
        ctx.fillStyle = barGradient;
        ctx.fillRect(0, 0, w, barHeight);

        // Fine inner bevel keeps the HUD tied to the physical board.
        ctx.fillStyle = palette.soft;
        ctx.fillRect(0, 0, w, 3);

        // Guldlinje
        ctx.beginPath(); ctx.moveTo(0, barHeight); ctx.lineTo(w, barHeight);
        ctx.strokeStyle = palette.line; ctx.lineWidth = 2; ctx.shadowColor = palette.glow; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;

        const centerY = barHeight * 0.5;
        const btnSize = 50;
        const margin = 18;

        // --- VÄNSTER SIDA: PAUSE/BACK-KNAPP ---
        this.btnMenu = { x: margin, y: centerY - btnSize/2, w: btnSize, h: btnSize };
        this.drawSquareButton(ctx, this.btnMenu, window.GameVolt ? "pause" : "back", false, palette);


        // --- HÖGER SIDA: HINT-KNAPP (Symmetrisk) ---
        // Placera knappen längst till höger med samma marginal
        const hintX = w - margin - btnSize;
        this.btnHint = { x: hintX, y: centerY - btnSize/2, w: btnSize, h: btnSize };
        
        // Rita Hint-knappen (Ögat)
        // Vi skickar med 'true' för puls-effekt om man har hints, eller bara för att locka
        this.drawSquareButton(ctx, this.btnHint, "hint", true, palette);
        
        // Badge för antal hints
        if (this.ownedHints > 0) {
            this.drawBadge(ctx, this.btnHint.x + btnSize, this.btnHint.y, this.ownedHints);
        }

        // --- HÖGER SIDA: VALUTA (Bredvid Hint-knappen) ---
        if (!this.isTimeAttack) {
            const currencyGap = 15;
            const currencyX = this.btnHint.x - currencyGap;

            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.font = `bold ${24 * this.textScale}px 'Cinzel', serif`;
            ctx.fillStyle = "#FFD700";
            ctx.fillText(`${this.currency}`, currencyX, centerY);

            // Litet mynt bredvid texten
            const textW = ctx.measureText(`${this.currency}`).width;
            const iconX = currencyX - textW - 15;

            ctx.beginPath(); ctx.arc(iconX, centerY, 10, 0, Math.PI*2);
            ctx.fillStyle = "#FFD700"; ctx.fill();
            ctx.strokeStyle = "#B8860B"; ctx.lineWidth = 2; ctx.stroke();
        }


        // --- MITTEN: TIME & INFO ---
        if (this.isTimeAttack) {
            // Rita klock-ikon till vänster om back-knappen
            const clockX = this.btnMenu.x + this.btnMenu.w + 20 + 22;
            this.drawClockIcon(ctx, clockX, centerY, 22, this.time);

            let timeStr = (this.time).toFixed(1);
            let timeColor = this.time < 10 ? "#FF4444" : "#FFD700";

            ctx.font = `bold ${32 * this.textScale}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = timeColor;
            ctx.shadowColor = "black"; ctx.shadowBlur = 4;
            ctx.fillText(timeStr, w/2, centerY - 8);
            ctx.shadowBlur = 0;

            ctx.font = `bold 16px 'Cinzel', serif`;
            ctx.fillStyle = "#FFD700";
            ctx.fillText(`SCORE: ${this.currentScore || 0}`, w/2, centerY + 18);
        } else {
            // Level Cirkel - visa INTE i Zen Mode eller Daily Challenge
            const isZenMode = this.currentLevelName.startsWith("ZEN");
            const isDailyChallenge = this.currentLevelName === "DAILY CHALLENGE";
            
            if (isZenMode) {
                // ZEN text vänsterställd bredvid back-knappen, samma höjd som guld
                const zenX = this.btnMenu.x + this.btnMenu.w + 15;
                ctx.font = `bold ${24 * this.textScale}px 'Cinzel', serif`;
                ctx.fillStyle = "#FFD700";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                ctx.fillText(this.currentLevelName, zenX, centerY);
                ctx.shadowBlur = 0;
            } else if (isDailyChallenge) {
                // Daily Challenge - kalender-ikon med dagens datum
                const iconX = this.btnMenu.x + this.btnMenu.w + 15;
                const today = new Date().getDate();

                // Rita kalender-ikon
                this.drawCalendarIcon(ctx, iconX + 18, centerY, 20, today);
                
                // Tid i mitten
                let timeStr = "0:00";
                if (this.time !== null && this.time !== undefined && this.time > 0) {
                    const m = Math.floor(this.time / 60);
                    const s = Math.floor(this.time % 60);
                    timeStr = `${m}:${s.toString().padStart(2, '0')}`;
                }
                
                ctx.font = `bold ${28 * this.textScale}px 'Cinzel', serif`;
                ctx.fillStyle = "#FFD700";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                ctx.fillText(timeStr, w/2, centerY);
                ctx.shadowBlur = 0;
            } else {
                // Vanlig level - cirkel med nummer
                const circleRadius = 22;
                const circleX = this.btnMenu.x + this.btnMenu.w + 20 + circleRadius;

                ctx.beginPath(); ctx.arc(circleX, centerY, circleRadius, 0, Math.PI*2);
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fill();
                ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2; ctx.stroke();

                let levelNum = this.currentLevelName.toString().replace(/Level\s?/i, "").replace(/LEVEL\s?/i, "");
                ctx.fillStyle = "#FFD700"; ctx.font = `bold 22px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(levelNum, circleX, centerY + 2);

                // Tid i mitten
                let timeStr = "0:00";
                let timeColor = "#FFD700";
                
                if (this.time !== null && this.time !== undefined) {
                    if (this.time > 0) {
                        const m = Math.floor(this.time / 60);
                        const s = Math.floor(this.time % 60);
                        timeStr = `${m}:${s.toString().padStart(2, '0')}`;
                    } else {
                        timeStr = "0:00";
                    }
                }
                
                ctx.font = `bold ${28 * this.textScale}px 'Cinzel', serif`;
                ctx.fillStyle = timeColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                ctx.fillText(timeStr, w/2, centerY - 8);
                ctx.shadowBlur = 0;

                // Rita stjärnor under tiden (inte i Daily)
                if (this.currentLevelName !== "DAILY CHALLENGE") {
                    this.drawStars(ctx, w/2, centerY + 18, this.earnedStars);
                }
            }
        }
    }
    
    // Rita 3 stjärnor - fyllda eller tomma
    drawStars(ctx, x, y, earned) {
        const starSize = 14;
        const gap = 6;
        const totalWidth = (starSize * 3) + (gap * 2);
        const startX = x - totalWidth / 2 + starSize / 2;
        
        for (let i = 0; i < 3; i++) {
            const sx = startX + i * (starSize + gap);
            const filled = i < earned;
            this.drawStar(ctx, sx, y, starSize, filled);
        }
    }
    
    // Rita en stjärna (fylld eller outline)
    drawStar(ctx, x, y, size, filled) {
        const spikes = 5;
        const outerRadius = size / 2;
        const innerRadius = outerRadius * 0.5;
        
        ctx.save();
        ctx.beginPath();
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / spikes) - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        
        ctx.closePath();
        
        if (filled) {
            // Fylld guldstjärna
            ctx.fillStyle = "#FFD700";
            ctx.fill();
            ctx.strokeStyle = "#B8860B";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Tom stjärna (bara kontur)
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Hjälpfunktion för att rita identiska knappar
    drawSquareButton(ctx, rect, icon, pulse, palette = this.getPalette()) {
        ctx.save();
        
        // Puls-effekt (skala)
        let s = 1.0;
        if (pulse) {
            s = 1.0 + Math.sin(this.pulseTimer) * 0.03;
            // Translatera till mitten av knappen för att skala
            const cx = rect.x + rect.w/2;
            const cy = rect.y + rect.h/2;
            ctx.translate(cx, cy);
            ctx.scale(s, s);
            ctx.translate(-cx, -cy);
        }

        // Bakgrund
        const buttonGrad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
        buttonGrad.addColorStop(0, palette.soft);
        buttonGrad.addColorStop(1, 'rgba(0,0,0,.3)');
        ctx.fillStyle = buttonGrad;
        this.drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
        ctx.fill();
        
        // Ram
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Monochrome canvas glyphs keep the HUD consistent across platforms.
        ctx.fillStyle = palette.line;
        const centerX = rect.x + rect.w/2;
        const centerY = rect.y + rect.h/2;
        
        if (icon === "back") {
            this.drawBackArrow(ctx, centerX, centerY, rect.w * 0.35);
        } else if (icon === "pause") {
            ctx.fillRect(centerX - 8, centerY - 11, 5, 22);
            ctx.fillRect(centerX + 3, centerY - 11, 5, 22);
        } else if (icon === "hint") {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 14, 9, 0, 0, Math.PI * 2);
            ctx.strokeStyle = palette.line;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.font = `bold 28px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(icon, centerX, centerY + 2);
        }

        ctx.restore();
    }
    
    // Rita en snygg bakåtpil (chevron)
    drawBackArrow(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = size * 0.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Enkel chevron <
        ctx.beginPath();
        ctx.moveTo(x + size * 0.3, y - size * 0.4);
        ctx.lineTo(x - size * 0.2, y);
        ctx.lineTo(x + size * 0.3, y + size * 0.4);
        ctx.stroke();
        
        ctx.restore();
    }

    drawBadge(ctx, x, y, number) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI*2);
        ctx.fillStyle = "#FF4444"; ctx.fill();
        ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#FFF";
        ctx.font = `bold 12px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(number, x, y + 1);
        ctx.restore();
    }
    
    // Rita kalender-ikon med dagens datum
    drawCalendarIcon(ctx, x, y, size, day) {
        ctx.save();
        
        // Kalender-kropp (rundad rektangel)
        const w = size * 1.8;
        const h = size * 1.6;
        const cornerRadius = size * 0.15;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, cornerRadius);
        ctx.fill();
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Röd topp (månad-bar)
        ctx.fillStyle = "#E63946";
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h * 0.3, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();
        
        // Dagens datum i mitten
        ctx.fillStyle = "#FFD700";
        ctx.font = `bold ${size * 0.9}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(day.toString(), x, y + h * 0.1);
        
        ctx.restore();
    }
    
    // Rita klock-ikon för Time Attack
    drawClockIcon(ctx, x, y, size, timeLeft) {
        ctx.save();
        
        // Klocka bakgrund
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();
        
        // Klocka ram - röd om lite tid kvar
        const isLowTime = timeLeft < 10;
        ctx.strokeStyle = isLowTime ? "#FF4444" : "#FFD700";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // "Progress" arc som visar hur mycket tid som gått (max 60s)
        const maxTime = 60;
        const progress = Math.min(timeLeft / maxTime, 1);
        
        ctx.beginPath();
        ctx.arc(x, y, size * 0.85, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2));
        ctx.strokeStyle = isLowTime ? "#FF4444" : "#4CAF50";
        ctx.lineWidth = size * 0.15;
        ctx.lineCap = "round";
        ctx.stroke();
        
        // Visare i mitten
        const angle = -Math.PI / 2 + ((1 - progress) * Math.PI * 2);
        const handLength = size * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * handLength, y + Math.sin(angle) * handLength);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = size * 0.1;
        ctx.lineCap = "round";
        ctx.stroke();
        
        // Liten prick i mitten
        ctx.beginPath();
        ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.fill();
        
        ctx.restore();
    }
}
