// src/js/worldmap.js
import { SYSTEM_IMAGES } from "./config.js";

export class WorldMap {
    // NYTT: getGoldFn i slutet av konstruktorn
    constructor(canvas, onLevelSelect, onBack, getStarsFn, onShop, getGoldFn) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.onLevelSelect = onLevelSelect;
        this.onBack = onBack; 
        this.getStarsFn = getStarsFn;
        this.onShop = onShop;
        this.getGoldFn = getGoldFn || (() => 0); // Fallback om man glömmer uppdatera game.js

        // --- 1. LADDA BILDER ---
        this.images = {};
        if (SYSTEM_IMAGES) {
            for (const [key, data] of Object.entries(SYSTEM_IMAGES)) {
                this.loadImage(key, data.src);
            }
        }
        this.loadImage('bg_galaxy', 'assets/gfx/bg_galaxy.webp');

        // --- 2. DATA ---
        this.worlds = [
            { id: 'jungle', name: "JUNGLE RUINS", start: 0, count: 25, bg: "map_jungle", color: "#4CAF50", starsRequired: 0 },
            { id: 'ice',    name: "FROZEN PEAKS", start: 25, count: 25, bg: "map_ice",    color: "#00BCD4", starsRequired: 25 },
            { id: 'lava',   name: "INFERNO CORE", start: 50, count: 25, bg: "map_lava",   color: "#FF5722", starsRequired: 50 },
            { id: 'arcane', name: "NEON NEXUS",   start: 75, count: 25, bg: "map_arcane", color: "#E040FB", starsRequired: 100 }
        ];

        this.mode = 'WORLD_SELECT'; 
        this.activeWorldIndex = -1; 

        // Scroll
        this.scrollX = 0;
        this.targetScrollX = 0;
        this.minScroll = 0;
        this.maxScroll = 1000;
        this.isDragging = false;
        this.lastX = 0;
        
        // Layout
        this.cardWidth = 320;
        this.cardHeight = 450;
        this.cardGap = 60;
        this.levelNodes = [];
        this.lastHoveredNode = -1;
        this.pressedNode = -1;

        this.resize();
    }

    loadImage(key, src) {
        const img = new Image();
        img.src = src;
        this.images[key] = img;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        const isPortrait = h > w;

        // --- WORLD SELECT LAYOUT ---
        if (isPortrait) {
            this.cardWidth = w * 0.75;
            this.cardGap = w * 0.05;
        } else {
            this.cardWidth = Math.min(360, w * 0.35); 
            this.cardGap = 60;
        }
        this.cardHeight = this.cardWidth * 1.4;
        this.startX = w / 2 - this.cardWidth / 2;
        
        this.minScroll = 0;
        const lastCardIndex = this.worlds.length - 1;
        this.maxScroll = lastCardIndex * (this.cardWidth + this.cardGap);
        if (this.scrollX > this.maxScroll) this.scrollX = this.maxScroll;

        // --- KNAPPAR ---
        const isSmall = isPortrait && w < 400;
        const btnW = isSmall ? w * 0.22 : isPortrait ? w * 0.25 : w * 0.18;
        const btnH = isSmall ? 36 : isPortrait ? h * 0.06 : 50;
        const margin = w * 0.03;
        const topY = h * 0.015;

        this.btnBack = { x: margin, y: topY, w: btnW, h: btnH, text: "BACK", icon: "↩" };
        this.btnShop = { x: w - btnW - margin, y: topY, w: btnW, h: btnH, text: "SHOP", icon: "🛒" };
    }

    // --- RITA HJÄLPFUNKTIONER ---
    drawRoundedRect(x, y, w, h, r) {
        const ctx = this.ctx;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return;
        }
        if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    drawGlassButton(btn) {
        if (!btn) return;
        const ctx = this.ctx;
        const x = btn.x, y = btn.y, w = btn.w, h = btn.h, r = 8; 

        ctx.save();
        // Skugga (Diskretare nu)
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;

        // Glas-bakgrund
        ctx.fillStyle = "rgba(10, 20, 30, 0.85)";
        this.drawRoundedRect(x, y, w, h, r); ctx.fill();

        // Border (Ljusare uppe, mörkare nere)
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "rgba(255,255,255,0.3)"); grad.addColorStop(1, "rgba(255,255,255,0.05)");
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();

        // Text och ikon
        ctx.fillStyle = "#FFF";
        const fontSize = Math.max(14, Math.min(28, h * 0.5));
        ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        
        const centerY = y + h/2;
        const iconSize = fontSize * 0.6;
        
        if (btn.text === "BACK") {
            // Rita egen bakåtpil (chevron)
            const iconX = x + w * 0.28;
            const textX = x + w * 0.62;
            
            this.drawBackArrow(ctx, iconX, centerY, iconSize);
            ctx.fillText(btn.text, textX, centerY + 1);
        } else {
            // Använd emoji för andra knappar (t.ex. SHOP 🛒)
            ctx.fillText(`${btn.icon} ${btn.text}`, x + w/2, y + h/2 + 1);
        }
        ctx.restore();
    }
    
    // Rita en snygg bakåtpil (enkel chevron)
    drawBackArrow(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = "#FFF";
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

    getTotalStars() {
        let total = 0;
        for (let i = 0; i < 100; i++) total += this.getStarsFn(i);
        return total;
    }

    isWorldUnlocked(world) {
        return this.getTotalStars() >= world.starsRequired;
    }

    update(dt) {
        const diff = this.targetScrollX - this.scrollX;
        if (Math.abs(diff) > 0.5) this.scrollX += diff * 0.15;
        else this.scrollX = this.targetScrollX;
    }

    draw() {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;

        // 1. RITA BAKGRUND (Logik för att separera Galaxy och World BG)
        ctx.fillStyle = "#0b0f16"; 
        ctx.fillRect(0, 0, w, h);

        if (this.mode === 'WORLD_SELECT') {
            // Visa Galaxy BG
            const bgImg = this.images['bg_galaxy'];
            if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
                ctx.save();
                const ratio = Math.max(w / bgImg.width, h / bgImg.height);
                const bw = bgImg.width * ratio; const bh = bgImg.height * ratio;
                ctx.globalAlpha = 0.8; // Ganska synlig
                try { ctx.drawImage(bgImg, (w - bw) / 2, (h - bh) / 2, bw, bh); } catch(e){}
                ctx.restore();
            }
        } else {
            // Visa Specifik Värld BG (Utan Galaxy bakom/över)
            const world = this.worlds[this.activeWorldIndex];
            const bgImg = this.images[world.bg];
            if (bgImg && bgImg.complete) {
                ctx.save();
                const ratio = Math.max(w / bgImg.width, h / bgImg.height);
                const bw = bgImg.width * ratio; const bh = bgImg.height * ratio;
                ctx.globalAlpha = 0.5; // Lagom mörkt för att banorna ska synas
                try { ctx.drawImage(bgImg, (w - bw) / 2, (h - bh) / 2, bw, bh); } catch(e){}
                ctx.restore();
            }
        }

        ctx.save();
        if (this.mode === 'WORLD_SELECT') this.drawWorldSelect();
        else this.drawLevelSelect();
        ctx.restore();

        // RITA UI (Alltid synligt)
        this.drawGlassButton(this.btnBack);
        this.drawGlassButton(this.btnShop);
        this.drawStats(); // NYTT: Rita guld och stjärnor
    }

    // NY FUNKTION: Visar Guld och Totala Stjärnor
// I src/js/worldmap.js

    drawStats() {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;

        const gold = this.getGoldFn();
        let totalStars = 0;
        for (let i = 0; i < 100; i++) totalStars += this.getStarsFn(i);

        const centerX = w / 2;
        const isPortrait = h > w;
        const fontSize = isPortrait ? 16 : 18;
        const iconSize = isPortrait ? 7 : 9;

        // Placera under världskorten
        const cardBottom = h / 2 + this.cardHeight * 0.55;
        const statsY = Math.min(cardBottom + 20, h - 40);

        ctx.save();
        ctx.shadowColor = "black"; ctx.shadowBlur = 3;
        ctx.textBaseline = "middle";

        // Guld (vänster om mitten) och Stjärnor (höger om mitten)
        const spacing = 15;

        // --- GULD ---
        ctx.beginPath();
        ctx.arc(centerX - spacing - 45, statsY, iconSize, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700"; ctx.fill();
        ctx.strokeStyle = "#B8860B"; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "left";
        ctx.fillText(`${gold}`, centerX - spacing - 33, statsY);

        // --- STJÄRNOR ---
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText("⭐", centerX + spacing + 15, statsY);

        ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "left";
        ctx.fillText(`${totalStars}`, centerX + spacing + 30, statsY);

        ctx.restore();
    }
    drawWorldSelect() {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr; const h = this.canvas.height / dpr;
        const centerY = h / 2; const centerX = w / 2;
        const isSmall = h > w && w < 400;

        const totalStars = this.getTotalStars();

        this.worlds.forEach((world, i) => {
            const baseX = this.startX + i * (this.cardWidth + this.cardGap);
            const x = baseX - this.scrollX;
            const cardCenterX = x + this.cardWidth / 2;
            const dist = Math.abs(centerX - cardCenterX);
            const scaleFactor = Math.max(0, 1 - (dist / (w * 0.6)));
            const currentScale = 0.85 + (0.25) * (scaleFactor * scaleFactor);

            const renderW = this.cardWidth * currentScale;
            const renderH = this.cardHeight * currentScale;
            const renderX = cardCenterX - renderW / 2;
            const renderY = centerY - renderH / 2;

            const locked = !this.isWorldUnlocked(world);

            // SKUGGA
            ctx.shadowColor = "black"; ctx.shadowBlur = 20 * currentScale; ctx.shadowOffsetY = 10;

            const img = this.images[world.bg];
            if (img && img.complete) {
                ctx.save(); this.drawRoundedRect(renderX, renderY, renderW, renderH, 20); ctx.clip();
                const iRatio = Math.max(renderW / img.width, renderH / img.height);
                ctx.drawImage(img, renderX + (renderW - img.width*iRatio)/2, renderY + (renderH - img.height*iRatio)/2, img.width*iRatio, img.height*iRatio);

                // Overlay i nederkant för text
                const grad = ctx.createLinearGradient(renderX, renderY + renderH * 0.5, renderX, renderY + renderH);
                grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.8)");
                ctx.fillStyle = grad; ctx.fillRect(renderX, renderY, renderW, renderH);

                // Locked: mörk overlay
                if (locked) {
                    ctx.fillStyle = "rgba(0,0,0,0.6)";
                    ctx.fillRect(renderX, renderY, renderW, renderH);
                }

                ctx.restore();
            } else {
                ctx.fillStyle = "#222"; this.drawRoundedRect(renderX, renderY, renderW, renderH, 20); ctx.fill();
            }

            // RESET SHADOW
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // Kantlinje
            const isFocus = dist < 100;
            ctx.lineWidth = isFocus ? 3 : 1.5;
            ctx.strokeStyle = locked ? "#555" : (isFocus ? "#FFF" : world.color);
            this.drawRoundedRect(renderX, renderY, renderW, renderH, 20); ctx.stroke();

            // Text
            ctx.textAlign = "center";

            if (locked) {
                // Lås-ikon
                ctx.font = `${Math.floor(renderW * 0.18)}px sans-serif`;
                ctx.fillStyle = "#888";
                ctx.fillText("🔒", cardCenterX, renderY + renderH * 0.4);

                // Världsnamn (nedtonat)
                ctx.fillStyle = "#888";
                ctx.font = `900 ${Math.floor(renderW * 0.09)}px 'Cinzel', serif`;
                ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                ctx.fillText(world.name, cardCenterX, renderY + renderH * 0.78);
                ctx.shadowBlur = 0;

                // Progress bar
                const barW = renderW * 0.6;
                const barH = 8;
                const barX = cardCenterX - barW / 2;
                const barY = renderY + renderH * 0.85;
                const progress = Math.min(1, totalStars / world.starsRequired);

                // Bar bakgrund
                ctx.fillStyle = "rgba(255,255,255,0.15)";
                ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();

                // Bar progress
                if (progress > 0) {
                    const grad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
                    grad.addColorStop(0, "#FFD700"); grad.addColorStop(1, "#FFA000");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, barH, 4); ctx.fill();
                }

                // Kravtext
                ctx.font = `600 ${Math.floor(renderW * 0.045)}px sans-serif`;
                ctx.fillStyle = "#AAA";
                ctx.fillText(`⭐ ${totalStars} / ${world.starsRequired}`, cardCenterX, barY + barH + 14);
            } else {
                // Unlocked: vanlig rendering
                ctx.fillStyle = "#FFF";
                ctx.font = `900 ${Math.floor(renderW * 0.1)}px 'Cinzel', serif`;
                ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                ctx.fillText(world.name, cardCenterX, renderY + renderH * 0.85);
                ctx.shadowBlur = 0;

                ctx.font = `600 ${Math.floor(renderW * 0.05)}px sans-serif`;
                ctx.fillStyle = isFocus ? "#FFD700" : "#AAA";
                ctx.fillText(`${world.count} LEVELS`, cardCenterX, renderY + renderH * 0.92);
            }

            world.hitBox = { x: renderX, y: renderY, w: renderW, h: renderH };
        });

        // Scroll-indikatorer (pilar)
        const arrowAlpha = 0.4 + Math.sin(Date.now() / 500) * 0.2; // Pulsera lätt
        const arrowSize = isSmall ? 14 : 18;
        const arrowY = centerY;

        // Vänsterpil (om det finns kort åt vänster)
        if (this.scrollX > 10) {
            ctx.save();
            ctx.globalAlpha = arrowAlpha;
            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            const ax = 18;
            ctx.beginPath();
            ctx.moveTo(ax + arrowSize * 0.5, arrowY - arrowSize);
            ctx.lineTo(ax - arrowSize * 0.2, arrowY);
            ctx.lineTo(ax + arrowSize * 0.5, arrowY + arrowSize);
            ctx.stroke();
            ctx.restore();
        }

        // Högerpil (om det finns kort åt höger)
        if (this.scrollX < this.maxScroll - 10) {
            ctx.save();
            ctx.globalAlpha = arrowAlpha;
            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            const ax = w - 18;
            ctx.beginPath();
            ctx.moveTo(ax - arrowSize * 0.5, arrowY - arrowSize);
            ctx.lineTo(ax + arrowSize * 0.2, arrowY);
            ctx.lineTo(ax - arrowSize * 0.5, arrowY + arrowSize);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawLevelSelect() {
        const ctx = this.ctx;
        const world = this.worlds[this.activeWorldIndex];
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr; const h = this.canvas.height / dpr;
        
        // Rubrik (Lite lägre ner nu när vi har stats högst upp)
        ctx.fillStyle = "#FFF";
        ctx.font = `900 ${Math.min(40, h*0.06)}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = world.color; ctx.shadowBlur = 15;
        ctx.fillText(world.name, w/2, h * 0.13); // Lite mer space för top bar
        ctx.shadowBlur = 0;

        // Grid Logic 5x5
        const startY = h * 0.18;
        const availH = h * 0.75; 
        const availW = w * 0.9;  
        
        const cols = 5; const rows = 5;
        const spacingX = availW / cols;
        const spacingY = availH / rows;
        const startX = (w - availW) / 2 + spacingX/2;
        const radius = Math.min(50, Math.min(spacingX, spacingY) * 0.45); // Mycket större!

        this.levelNodes = [];
        for (let i = 0; i < world.count; i++) {
            const r = Math.floor(i / cols);
            const isEvenRow = (r % 2 === 0);
            const c = isEvenRow ? (i % cols) : (cols - 1 - (i % cols));
            const x = startX + c * spacingX;
            const y = startY + r * spacingY + radius; 
            this.levelNodes.push({ x, y, r: radius, index: i });
        }

        // 3. RITA STIGEN (Path) - Inga skuggor här, bara glow
        ctx.save();
        ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let i = 0; i < this.levelNodes.length - 1; i++) {
            const current = this.levelNodes[i];
            const next = this.levelNodes[i+1];
            const globalIndex = world.start + i;
            const isNextUnlocked = (this.getStarsFn(globalIndex) > 0);

            ctx.beginPath(); ctx.moveTo(current.x, current.y); ctx.lineTo(next.x, next.y);

            if (isNextUnlocked) {
                ctx.strokeStyle = world.color; 
                ctx.shadowColor = world.color; ctx.shadowBlur = 10; // Glow på stigen
                ctx.setLineDash([]); ctx.globalAlpha = 0.8;
            } else {
                ctx.strokeStyle = "#444"; 
                ctx.shadowBlur = 0; // Ingen skugga på låsta vägar
                ctx.setLineDash([8, 8]); ctx.globalAlpha = 0.3;
            }
            ctx.stroke();
        }
        ctx.restore();

        // 4. RITA NODERNA
        this.levelNodes.forEach(node => {
            const i = node.index;
            const globalIndex = world.start + i;
            const stars = this.getStarsFn(globalIndex);
            
            let locked = false;
            if (i > 0) {
                const prevStars = this.getStarsFn(globalIndex - 1);
                if (prevStars === 0) locked = true;
            }

            // Hover/press state
            const isHovered = !locked && this.lastHoveredNode === i;
            const isPressed = !locked && this.pressedNode === i;
            const drawR = isPressed ? node.r * 0.9 : isHovered ? node.r * 1.08 : node.r;

            // Cirkel
            ctx.beginPath(); ctx.arc(node.x, node.y, drawR, 0, Math.PI*2);
            const grad = ctx.createRadialGradient(node.x, node.y, drawR*0.3, node.x, node.y, drawR);
            if (locked) {
                grad.addColorStop(0, "#333"); grad.addColorStop(1, "#111");
            } else if (isHovered) {
                grad.addColorStop(0, "#777"); grad.addColorStop(1, "#333");
            } else {
                grad.addColorStop(0, "#555"); grad.addColorStop(1, "#222");
            }
            ctx.fillStyle = grad; ctx.fill();

            // Kant
            ctx.lineWidth = locked ? 1.5 : isHovered ? 3 : 2.5;
            ctx.strokeStyle = locked ? "#555" : (stars > 0 ? "#FFD700" : world.color);

            // Glow endast på spelbara noder
            if (!locked) {
                ctx.shadowColor = (stars>0) ? "#FFD700" : world.color;
                ctx.shadowBlur = isHovered ? 15 : (stars===0) ? 10 : 5;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Text
            ctx.fillStyle = locked ? "#555" : "#FFF";
            ctx.font = `bold ${node.r * 0.7}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(i + 1, node.x, node.y);

            if (stars > 0) {
                ctx.font = `${node.r * 0.45}px sans-serif`;
                ctx.fillStyle = "#FFD700";
                ctx.fillText("⭐".repeat(stars), node.x, node.y + node.r * 1.5);
            }
        });
    }

// I src/js/worldmap.js

    handleInput(type, x, y) {
        // Hjälpfunktion för att spela ljud (om det inte spelats nyss)
        const playHover = () => {
            if (window.audio && typeof window.audio.playSfx === 'function') {
                // Vi vill inte spamma ljudet, så vi kan kolla en timer om vi vill,
                // men audio.playSfx brukar hantera det okej. 
                // För hover är det bra att tillåta överlappning eller korta ljud.
                window.audio.playSfx('hover');
            }
        };

        if (type === 'down') {
            this.isDragging = true;
            this.lastX = x;
            this.dragStartX = x; 

            const isClicked = (btn) => btn && x >= btn.x && x <= btn.x+btn.w && y >= btn.y && y <= btn.y+btn.h;

            if (isClicked(this.btnBack)) {
                if (window.audio) window.audio.playSfx('click');
                if (this.mode === 'LEVEL_SELECT') { this.mode = 'WORLD_SELECT'; this.activeWorldIndex = -1; this.pressedNode = -1; this.lastHoveredNode = -1; }
                else this.onBack();
                return;
            }
            if (isClicked(this.btnShop)) {
                if (window.audio) window.audio.playSfx('click');
                if (this.onShop) this.onShop();
                return;
            }

            if (this.mode === 'WORLD_SELECT') {
                this.worlds.forEach((world, i) => {
                    if (world.hitBox && x>=world.hitBox.x && x<=world.hitBox.x+world.hitBox.w && y>=world.hitBox.y && y<=world.hitBox.y+world.hitBox.h) {
                        if (this.isWorldUnlocked(world)) {
                            this.clickedWorldIndex = i;
                        } else {
                            if (window.audio) window.audio.playSfx('invalid');
                        }
                    }
                });
            }
            else if (this.mode === 'LEVEL_SELECT') {
                const world = this.worlds[this.activeWorldIndex];
                for (const node of this.levelNodes) {
                    if (Math.hypot(x - node.x, y - node.y) < node.r + 15) {
                        const globalIndex = world.start + node.index;
                        let locked = false;
                        if (node.index > 0 && this.getStarsFn(globalIndex - 1) === 0) locked = true;
                        if (!locked) {
                            this.pressedNode = node.index;
                            if (window.audio) window.audio.playSfx('click');
                            this.onLevelSelect(globalIndex);
                        }
                        break;
                    }
                }
            }
        }
        else if (type === 'move') {
            // --- HOVER LOGIK (NYTT!) ---
            let isHoveringSomething = false;

            if (this.mode === 'LEVEL_SELECT') {
                const world = this.worlds[this.activeWorldIndex];
                for (const node of this.levelNodes) {
                    if (Math.hypot(x - node.x, y - node.y) < node.r + 10) {
                        const globalIndex = world.start + node.index;
                        let locked = false;
                        if (node.index > 0 && this.getStarsFn(globalIndex - 1) === 0) locked = true;
                        if (!locked) {
                            isHoveringSomething = true;
                            if (this.lastHoveredNode !== node.index) {
                                playHover();
                                this.lastHoveredNode = node.index;
                            }
                        }
                        break;
                    }
                }
            }
            
            // Återställ om vi inte hovrar något
            if (!isHoveringSomething) {
                this.lastHoveredNode = -1;
            }
            // ---------------------------

            if (this.mode === 'WORLD_SELECT' && this.isDragging) {
                const dx = x - this.lastX;
                this.targetScrollX -= dx; 
                const limit = 100;
                if (this.targetScrollX < this.minScroll - limit) this.targetScrollX = this.minScroll - limit;
                if (this.targetScrollX > this.maxScroll + limit) this.targetScrollX = this.maxScroll + limit;
                this.lastX = x;
            }
        }
        else if (type === 'up') {
            this.isDragging = false;
            this.pressedNode = -1;
            if (this.targetScrollX < this.minScroll) this.targetScrollX = this.minScroll;
            if (this.targetScrollX > this.maxScroll) this.targetScrollX = this.maxScroll;

            if (this.mode === 'WORLD_SELECT' && this.clickedWorldIndex !== undefined) {
                if (Math.abs(x - this.dragStartX) < 10) {
                    this.activeWorldIndex = this.clickedWorldIndex;
                    this.mode = 'LEVEL_SELECT';
                    // Ljud när man går in i en värld? Kanske 'equip' eller 'click'
                    if (window.audio) window.audio.playSfx('click');
                }
                this.clickedWorldIndex = undefined;
            }
        }
    }
    
    handleScroll(deltaY) {
        if (this.mode === 'WORLD_SELECT') {
            this.targetScrollX += deltaY * 0.5;
            if (this.targetScrollX < this.minScroll) this.targetScrollX = this.minScroll;
            if (this.targetScrollX > this.maxScroll) this.targetScrollX = this.maxScroll;
        }
    }
}