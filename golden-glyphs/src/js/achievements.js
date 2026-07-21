// src/js/achievements.js — Achievement tracking, unlock logic, screen rendering
import { ACHIEVEMENTS, TIER_COLORS } from "./config.js";

const STORAGE_KEY = 'goldenGlyphsAchievements';
const GOLD_EARNED_KEY = 'goldenGlyphsGoldEarned';
const GOLD_SPENT_KEY = 'goldenGlyphsGoldSpent';
const DAILY_COUNT_KEY = 'goldenGlyphsDailyCount';
const LEVELS_WON_KEY = 'goldenGlyphsLevelsWon';

export class AchievementSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.unlocked = {};        // { id: timestamp }
        this.goldEarned = 0;
        this.goldSpent = 0;
        this.dailyCount = 0;
        this.levelsWon = 0;

        // Notification queue
        this.notifQueue = [];
        this.activeNotif = null;
        this.notifTimer = 0;
        this.notifPhase = 'idle'; // idle, slideIn, show, slideOut

        // Screen state
        this.scrollY = 0;
        this.targetScrollY = 0;
        this.isDragging = false;
        this.lastY = 0;
        this.velocity = 0;

        this.load();
    }

    // --- Save / Load ---
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlocked));
            localStorage.setItem(GOLD_EARNED_KEY, this.goldEarned.toString());
            localStorage.setItem(GOLD_SPENT_KEY, this.goldSpent.toString());
            localStorage.setItem(DAILY_COUNT_KEY, this.dailyCount.toString());
            localStorage.setItem(LEVELS_WON_KEY, this.levelsWon.toString());
        } catch (e) {}
    }

    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) this.unlocked = JSON.parse(saved);
            this.goldEarned = parseInt(localStorage.getItem(GOLD_EARNED_KEY) || '0');
            this.goldSpent = parseInt(localStorage.getItem(GOLD_SPENT_KEY) || '0');
            this.dailyCount = parseInt(localStorage.getItem(DAILY_COUNT_KEY) || '0');
            this.levelsWon = parseInt(localStorage.getItem(LEVELS_WON_KEY) || '0');
        } catch (e) {}
    }

    isUnlocked(id) {
        return !!this.unlocked[id];
    }

    unlock(id) {
        if (this.isUnlocked(id) || (window.GameVolt && GameVolt.achievements.isUnlocked && GameVolt.achievements.isUnlocked(id))) return false;
        if (!ACHIEVEMENTS[id]) return false;
        this.unlocked[id] = Date.now();
        this.save();
        this.notifQueue.push(id);

        // Sync to GameVolt SDK
        if (window.GameVolt) GameVolt.achievements.unlock(id);
        // Notify portal via postMessage
        const ach = ACHIEVEMENTS[id];
        if (typeof gvPost === 'function') gvPost('achievement', { id: id, name: ach.name, tier: ach.tier });

        return true;
    }

    getUnlockedCount() {
        return Object.keys(this.unlocked).length;
    }

    getTotalCount() {
        return Object.keys(ACHIEVEMENTS).length;
    }

    // --- Check all conditions (called after game events) ---
    check(context) {
        // context: { totalStars, totalGold, ownedItems, activeItems,
        //            getStarsForSet, timeAttackScore, usedHint,
        //            visitedShop, completedDaily, completedLevel, awardedStars,
        //            dailyStreak }

        const { totalStars, ownedItems, getStarsForSet, timeAttackScore,
                dailyStreak } = context;

        // Track cumulative stats
        if (context.goldEarned) {
            this.goldEarned += context.goldEarned;
        }
        if (context.goldSpent) {
            this.goldSpent += context.goldSpent;
        }
        if (context.completedLevel) {
            this.levelsWon++;
        }
        if (context.completedDaily) {
            this.dailyCount++;
        }

        // --- BRONZE ---
        if (context.completedLevel)          this.unlock('ach_first_win');
        if (this.levelsWon >= 5)             this.unlock('ach_win_5');
        if (this.levelsWon >= 10)            this.unlock('ach_win_10');
        if (totalStars >= 10)                this.unlock('ach_stars_10');
        if (totalStars >= 30)                this.unlock('ach_stars_30');
        if (context.visitedShop)             this.unlock('ach_visit_shop');
        if (context.boughtCosmetic)          this.unlock('ach_first_cosmetic');
        if (this.goldEarned >= 500)          this.unlock('ach_gold_500');
        if (this.goldEarned >= 2000)         this.unlock('ach_gold_2000');
        if (context.completedDaily)          this.unlock('ach_daily_1');
        if (context.awardedStars >= 3)       this.unlock('ach_3star_1');

        // Count 3-star levels
        if (getStarsForSet) {
            let threeStarCount = 0;
            const sets = ['LEVELS_EASY', 'LEVELS_MEDIUM', 'LEVELS_HARD', 'LEVELS_ARCANE'];
            for (const set of sets) {
                for (let i = 0; i < 25; i++) {
                    if (getStarsForSet(set, i) === 3) threeStarCount++;
                }
            }
            if (threeStarCount >= 10) this.unlock('ach_3star_10');
        }

        if (context.playedTimeAttack)        this.unlock('ach_time_attack');
        if (context.usedHint)                this.unlock('ach_use_hint');
        if (context.equippedTrail)           this.unlock('ach_change_trail');

        // --- SILVER ---
        if (this.levelsWon >= 50)            this.unlock('ach_win_50');
        if (totalStars >= 100)               this.unlock('ach_stars_100');
        if (this.goldEarned >= 5000)         this.unlock('ach_gold_5000');
        if (dailyStreak >= 7)                this.unlock('ach_streak_7');

        if (getStarsForSet) {
            const easyPerfect = Array.from({length: 25}, (_, i) => getStarsForSet('LEVELS_EASY', i)).every(s => s === 3);
            const medPerfect = Array.from({length: 25}, (_, i) => getStarsForSet('LEVELS_MEDIUM', i)).every(s => s === 3);
            const hardPerfect = Array.from({length: 25}, (_, i) => getStarsForSet('LEVELS_HARD', i)).every(s => s === 3);
            const arcanePerfect = Array.from({length: 25}, (_, i) => getStarsForSet('LEVELS_ARCANE', i)).every(s => s === 3);

            if (easyPerfect)   this.unlock('ach_easy_perfect');
            if (medPerfect)    this.unlock('ach_medium_perfect');
            if (hardPerfect)   this.unlock('ach_hard_perfect');
            if (arcanePerfect) this.unlock('ach_arcane_perfect');
        }

        if (timeAttackScore >= 2000)         this.unlock('ach_ta_2000');

        // Count owned cosmetics (exclude defaults)
        const defaults = ['trail_default', 'skin_default', 'glow_none', 'default'];
        const cosmeticCount = ownedItems ? ownedItems.filter(id => !defaults.includes(id)).length : 0;
        if (cosmeticCount >= 10)             this.unlock('ach_own_10');

        if (context.equippedTheme)           this.unlock('ach_change_theme');
        if (this.goldSpent >= 5000)          this.unlock('ach_spend_5000');

        // --- GOLD ---
        // hard_perfect and arcane_perfect checked above

        // Count completed levels (any stars > 0)
        if (getStarsForSet) {
            let completedCount = 0;
            const sets = ['LEVELS_EASY', 'LEVELS_MEDIUM', 'LEVELS_HARD', 'LEVELS_ARCANE'];
            for (const set of sets) {
                for (let i = 0; i < 25; i++) {
                    if (getStarsForSet(set, i) > 0) completedCount++;
                }
            }
            if (completedCount >= 100) this.unlock('ach_win_100');
        }

        if (timeAttackScore >= 10000)        this.unlock('ach_ta_10000');
        if (this.dailyCount >= 30)           this.unlock('ach_daily_30');

        // --- PLATINUM ---
        const allOthers = Object.keys(ACHIEVEMENTS).filter(id => id !== 'ach_platinum');
        if (allOthers.every(id => this.isUnlocked(id))) {
            this.unlock('ach_platinum');
        }

        this.save();
    }

    // --- Daily streak calculator ---
    getDailyStreak() {
        let streak = 0;
        const now = new Date();
        const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        for (let i = 0; i < 365; i++) {
            const d = new Date(todayUtc.getTime() - i * 86400000);
            const key = `daily_complete_${d.toISOString().slice(0, 10)}`;
            if (localStorage.getItem(key) === 'true') {
                streak++;
            } else {
                if (i === 0) continue;
                break;
            }
        }
        return streak;
    }

    // --- Notification system ---
    updateNotification(dt) {
        if (this.notifPhase === 'idle') {
            if (this.notifQueue.length > 0) {
                this.activeNotif = this.notifQueue.shift();
                this.notifPhase = 'slideIn';
                this.notifTimer = 0;
            }
            return;
        }

        this.notifTimer += dt;

        if (this.notifPhase === 'slideIn' && this.notifTimer > 0.4) {
            this.notifPhase = 'show';
            this.notifTimer = 0;
        } else if (this.notifPhase === 'show' && this.notifTimer > 2.5) {
            this.notifPhase = 'slideOut';
            this.notifTimer = 0;
        } else if (this.notifPhase === 'slideOut' && this.notifTimer > 0.4) {
            this.notifPhase = 'idle';
            this.activeNotif = null;
            this.notifTimer = 0;
        }
    }

    drawNotification(ctx) {
        if (!this.activeNotif || this.notifPhase === 'idle') return;

        const ach = ACHIEVEMENTS[this.activeNotif];
        if (!ach) return;

        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const tierColor = TIER_COLORS[ach.tier] || TIER_COLORS.bronze;

        const boxW = Math.min(320, w * 0.85);
        const boxH = 70;
        const boxX = (w - boxW) / 2;

        // Slide animation
        let progress = 0;
        if (this.notifPhase === 'slideIn') {
            progress = Math.min(1, this.notifTimer / 0.4);
            progress = 1 - Math.pow(1 - progress, 3); // ease out
        } else if (this.notifPhase === 'show') {
            progress = 1;
        } else if (this.notifPhase === 'slideOut') {
            progress = 1 - Math.min(1, this.notifTimer / 0.4);
            progress = Math.pow(progress, 3); // ease in
        }

        const boxY = -boxH + (boxH + 20) * progress;

        ctx.save();

        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 3;

        // Background
        const grad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
        grad.addColorStop(0, "rgba(20, 30, 50, 0.95)");
        grad.addColorStop(1, "rgba(10, 15, 30, 0.98)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 12);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Tier accent border
        ctx.strokeStyle = tierColor.bg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 12);
        ctx.stroke();

        // Tier badge (left)
        const badgeSize = 40;
        const badgeX = boxX + 15;
        const badgeY = boxY + (boxH - badgeSize) / 2;
        ctx.fillStyle = tierColor.bg;
        ctx.beginPath();
        ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.font = `${badgeSize * 0.55}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ach.icon, badgeX + badgeSize/2, badgeY + badgeSize/2);

        // "ACHIEVEMENT UNLOCKED"
        ctx.fillStyle = tierColor.bg;
        ctx.font = `600 11px 'Cinzel', serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("ACHIEVEMENT UNLOCKED", badgeX + badgeSize + 12, boxY + 14);

        // Name
        ctx.fillStyle = "#FFF";
        ctx.font = `700 16px 'Cinzel', serif`;
        ctx.fillText(ach.name, badgeX + badgeSize + 12, boxY + 32);

        // Desc
        ctx.fillStyle = "#999";
        ctx.font = `400 11px sans-serif`;
        ctx.fillText(ach.desc, badgeX + badgeSize + 12, boxY + 52);

        ctx.restore();
    }

    // --- Achievements Screen ---
    handleInput(type, x, y) {
        const dpr = window.devicePixelRatio || 1;
        const h = this.canvas.height / dpr;

        if (type === 'down') {
            this.isDragging = true;
            this.lastY = y;
            this.velocity = 0;
        } else if (type === 'move' && this.isDragging) {
            const dy = y - this.lastY;
            this.targetScrollY += dy;
            this.velocity = dy;
            this.lastY = y;
        } else if (type === 'up') {
            this.isDragging = false;
        }

        // Clamp scroll
        this._clampScroll();
    }

    handleWheel(deltaY) {
        this.targetScrollY -= deltaY * 0.5;
        this._clampScroll();
    }

    _clampScroll() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        const metrics = this._getGridMetrics(w);
        const maxScroll = 0;
        const minScroll = Math.min(0, h - metrics.headerH - metrics.contentH - 28);
        this.targetScrollY = Math.max(minScroll, Math.min(maxScroll, this.targetScrollY));
    }

    _getGridMetrics(w) {
        const padding = w < 700 ? 14 : 24;
        const columns = w < 700 ? 2 : 3;
        const gap = w < 700 ? 9 : 12;
        const headerH = 112;
        const cardH = w < 700 ? 112 : 122;
        const sectionHeadH = 34;
        const sectionGap = 13;
        const ids = Object.keys(ACHIEVEMENTS);
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const contentH = tiers.reduce((height, tier) => {
            const count = ids.filter(id => ACHIEVEMENTS[id].tier === tier).length;
            return height + sectionHeadH + Math.ceil(count / columns) * (cardH + gap) + sectionGap;
        }, 8);
        return { padding, columns, gap, headerH, cardH, sectionHeadH, sectionGap, contentH };
    }

    _drawMedal(ctx, x, y, radius, tier, unlocked, id) {
        const color = TIER_COLORS[tier].bg;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = unlocked ? 1 : 0.32;

        ctx.fillStyle = unlocked ? color : '#3c4248';
        ctx.beginPath();
        ctx.moveTo(-radius * .55, radius * .55);
        ctx.lineTo(-radius * .18, radius * 1.05);
        ctx.lineTo(0, radius * .62);
        ctx.lineTo(radius * .18, radius * 1.05);
        ctx.lineTo(radius * .55, radius * .55);
        ctx.closePath();
        ctx.fill();

        if (unlocked) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
        }
        const metal = ctx.createRadialGradient(-radius * .25, -radius * .3, 1, 0, 0, radius);
        metal.addColorStop(0, unlocked ? '#fff6cf' : '#687078');
        metal.addColorStop(.35, unlocked ? color : '#424950');
        metal.addColorStop(1, unlocked ? TIER_COLORS[tier].border : '#20262b');
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = unlocked ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Stable rune gives every trophy its own mark without platform emoji.
        const rune = (Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6) + 1;
        ctx.strokeStyle = unlocked ? 'rgba(18,20,22,.78)' : 'rgba(10,12,14,.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -radius * .48);
        ctx.lineTo(0, radius * .48);
        ctx.moveTo(-radius * .38, radius * (rune % 2 ? -.12 : .15));
        ctx.lineTo(0, radius * (rune % 3 ? .05 : -.18));
        ctx.lineTo(radius * .38, radius * (rune % 2 ? .22 : -.08));
        ctx.stroke();
        ctx.restore();
    }

    _drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
        const words = text.split(/\s+/);
        let line = '';
        let lineNo = 0;
        for (let i = 0; i < words.length && lineNo < maxLines; i++) {
            const test = line ? `${line} ${words[i]}` : words[i];
            if (ctx.measureText(test).width > maxWidth && line) {
                ctx.fillText(line, x, y + lineNo * lineHeight);
                line = words[i];
                lineNo++;
            } else {
                line = test;
            }
        }
        if (line && lineNo < maxLines) ctx.fillText(line, x, y + lineNo * lineHeight);
    }

    draw(ctx) {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        const isMobile = w < 700;
        const metrics = this._getGridMetrics(w);

        this.scrollY += (this.targetScrollY - this.scrollY) * 0.15;
        if (!this.isDragging) {
            this.targetScrollY += this.velocity * 0.92;
            this.velocity *= 0.92;
            if (Math.abs(this.velocity) < 0.1) this.velocity = 0;
            this._clampScroll();
        }

        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#10181d');
        bg.addColorStop(.55, '#071014');
        bg.addColorStop(1, '#020608');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Quiet carved-glyph field behind the collection.
        ctx.save();
        ctx.strokeStyle = 'rgba(215,180,82,.035)';
        ctx.lineWidth = 1;
        for (let gy = 130; gy < h + 40; gy += 58) {
            for (let gx = 24 + ((gy / 58) % 2) * 25; gx < w; gx += 52) {
                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(Math.PI / 4);
                ctx.strokeRect(-7, -7, 14, 14);
                ctx.restore();
            }
        }
        ctx.restore();

        // Scrollable tier grid.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, metrics.headerH, w, h - metrics.headerH);
        ctx.clip();
        const usableW = Math.min(680, w - metrics.padding * 2);
        const gridX = (w - usableW) / 2;
        const cardW = (usableW - metrics.gap * (metrics.columns - 1)) / metrics.columns;
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const labels = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD', platinum: 'PLATINUM' };
        let y = metrics.headerH + this.scrollY + 8;

        tiers.forEach(tier => {
            const entries = Object.entries(ACHIEVEMENTS).filter(([, ach]) => ach.tier === tier);
            const tierColor = TIER_COLORS[tier].bg;
            const got = entries.filter(([id]) => this.isUnlocked(id)).length;

            ctx.fillStyle = tierColor;
            ctx.font = `700 ${isMobile ? 11 : 12}px 'Cinzel', serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[tier], gridX + 3, y + 14);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(225,231,235,.62)';
            ctx.font = `700 ${isMobile ? 9 : 10}px sans-serif`;
            ctx.fillText(`${got}/${entries.length} UNLOCKED`, gridX + usableW - 3, y + 14);
            ctx.strokeStyle = `${tierColor}55`;
            ctx.beginPath();
            ctx.moveTo(gridX, y + 28);
            ctx.lineTo(gridX + usableW, y + 28);
            ctx.stroke();
            y += metrics.sectionHeadH;

            entries.forEach(([id, ach], index) => {
                const col = index % metrics.columns;
                const row = Math.floor(index / metrics.columns);
                const entryW = tier === 'platinum' ? usableW : cardW;
                const x = tier === 'platinum' ? gridX : gridX + col * (cardW + metrics.gap);
                const cy = y + row * (metrics.cardH + metrics.gap);
                const unlocked = this.isUnlocked(id);

                ctx.save();
                const card = ctx.createLinearGradient(x, cy, x, cy + metrics.cardH);
                card.addColorStop(0, unlocked ? 'rgba(31,39,42,.98)' : 'rgba(19,25,28,.9)');
                card.addColorStop(1, unlocked ? 'rgba(8,13,16,.98)' : 'rgba(5,9,11,.92)');
                ctx.fillStyle = card;
                ctx.beginPath();
                ctx.roundRect(x, cy, entryW, metrics.cardH, 9);
                ctx.fill();
                ctx.strokeStyle = unlocked ? `${tierColor}66` : 'rgba(255,255,255,.08)';
                ctx.lineWidth = unlocked ? 1.4 : 1;
                ctx.stroke();

                ctx.fillStyle = unlocked ? tierColor : 'rgba(255,255,255,.12)';
                ctx.fillRect(x, cy + 9, 3, metrics.cardH - 18);
                this._drawMedal(ctx, x + 27, cy + 29, isMobile ? 15 : 17, tier, unlocked, id);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = unlocked ? '#f3f0e6' : '#697177';
                ctx.font = `700 ${isMobile ? 10 : 11}px 'Cinzel', serif`;
                this._drawWrappedText(ctx, ach.name.toUpperCase(), x + 51, cy + 15, entryW - 59, 13, 2);

                ctx.fillStyle = unlocked ? 'rgba(219,224,226,.64)' : 'rgba(135,145,150,.42)';
                ctx.font = `${isMobile ? 9 : 10}px sans-serif`;
                this._drawWrappedText(ctx, ach.desc, x + 12, cy + 60, entryW - 24, 13, 2);

                ctx.fillStyle = unlocked ? tierColor : '#50585e';
                ctx.font = `700 8px sans-serif`;
                ctx.fillText(unlocked ? 'UNLOCKED' : 'LOCKED', x + 12, cy + metrics.cardH - 18);
                ctx.restore();
            });

            y += Math.ceil(entries.length / metrics.columns) * (metrics.cardH + metrics.gap) + metrics.sectionGap;
        });
        ctx.restore();

        // Fixed header follows the common GameVolt information hierarchy.
        const headFade = ctx.createLinearGradient(0, 0, 0, metrics.headerH);
        headFade.addColorStop(0, 'rgba(3,7,10,1)');
        headFade.addColorStop(.82, 'rgba(5,11,14,.98)');
        headFade.addColorStop(1, 'rgba(5,11,14,.75)');
        ctx.fillStyle = headFade;
        ctx.fillRect(0, 0, w, metrics.headerH);
        ctx.fillStyle = '#d8b64f';
        ctx.font = `900 ${isMobile ? 24 : 32}px 'Cinzel', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TROPHIES', w / 2, 30);

        const unlocked = this.getUnlockedCount();
        const total = this.getTotalCount();
        ctx.fillStyle = 'rgba(225,231,235,.66)';
        ctx.font = '700 10px sans-serif';
        ctx.fillText(`${unlocked} / ${total} UNLOCKED`, w / 2, 53);
        const barW = Math.min(300, w * .68);
        const barX = (w - barW) / 2;
        ctx.fillStyle = 'rgba(255,255,255,.09)';
        ctx.beginPath();
        ctx.roundRect(barX, 68, barW, 7, 4);
        ctx.fill();
        if (unlocked) {
            const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            fill.addColorStop(0, '#a96f2d');
            fill.addColorStop(.65, '#ffd75b');
            fill.addColorStop(1, '#dffcff');
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.roundRect(barX, 68, barW * unlocked / total, 7, 4);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(216,182,79,.22)';
        ctx.beginPath();
        ctx.moveTo(0, metrics.headerH - 1);
        ctx.lineTo(w, metrics.headerH - 1);
        ctx.stroke();

        ctx.fillStyle = '#d8b64f';
        ctx.font = '700 28px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('‹', 22, 31);
        this._backBtn = { x: 0, y: 0, w: 60, h: 62 };
    }

    drawLegacy(ctx) {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        const isMobile = window.innerWidth < 700;

        // Smooth scroll
        this.scrollY += (this.targetScrollY - this.scrollY) * 0.15;
        if (!this.isDragging) {
            this.targetScrollY += this.velocity * 0.92;
            this.velocity *= 0.92;
            if (Math.abs(this.velocity) < 0.1) this.velocity = 0;
            this._clampScroll();
        }

        // Dark background
        ctx.fillStyle = "rgba(5, 5, 15, 0.95)";
        ctx.fillRect(0, 0, w, h);

        // Header area
        const headerH = 100;

        // Back button
        ctx.save();
        ctx.fillStyle = "#888";
        ctx.font = `700 28px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("←", 20, 35);
        this._backBtn = { x: 0, y: 0, w: 60, h: 60 };
        ctx.restore();

        // Title
        ctx.save();
        ctx.fillStyle = "#FFD700";
        ctx.font = `900 ${isMobile ? 26 : 36}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 20;
        ctx.fillText("ACHIEVEMENTS", w / 2, 35);
        ctx.shadowBlur = 0;

        // Progress
        const unlocked = this.getUnlockedCount();
        const total = this.getTotalCount();
        const pct = total > 0 ? unlocked / total : 0;

        // Progress bar
        const barW = Math.min(300, w * 0.7);
        const barH = 12;
        const barX = (w - barW) / 2;
        const barY = 62;

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 6);
        ctx.fill();

        if (pct > 0) {
            const grad = ctx.createLinearGradient(barX, barY, barX + barW * pct, barY);
            grad.addColorStop(0, "#FFD700");
            grad.addColorStop(1, "#FFA000");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * pct, barH, 6);
            ctx.fill();
        }

        ctx.fillStyle = "#AAA";
        ctx.font = `600 13px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${unlocked} / ${total}`, w / 2, barY + barH + 16);
        ctx.restore();

        // Clip content area
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, headerH, w, h - headerH);
        ctx.clip();

        // Draw achievement rows
        const ids = Object.keys(ACHIEVEMENTS);
        const rowH = 80;
        const padding = 15;
        const cardW = Math.min(400, w - padding * 2);
        const cardX = (w - cardW) / 2;

        // Group by tier
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const tierLabels = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD', platinum: 'PLATINUM' };
        let yPos = headerH + this.scrollY + 10;

        for (const tier of tiers) {
            const tierAchs = ids.filter(id => ACHIEVEMENTS[id].tier === tier);
            if (tierAchs.length === 0) continue;

            const tierColor = TIER_COLORS[tier];

            // Tier header
            ctx.save();
            ctx.fillStyle = tierColor.bg;
            ctx.font = `700 14px 'Cinzel', serif`;
            ctx.textAlign = "left";
            ctx.fillText(tierLabels[tier], cardX + 5, yPos + 16);

            // Count
            const tierUnlocked = tierAchs.filter(id => this.isUnlocked(id)).length;
            ctx.fillStyle = "#666";
            ctx.font = `600 12px sans-serif`;
            ctx.textAlign = "right";
            ctx.fillText(`${tierUnlocked}/${tierAchs.length}`, cardX + cardW - 5, yPos + 16);
            ctx.restore();

            yPos += 28;

            for (const id of tierAchs) {
                const ach = ACHIEVEMENTS[id];
                const unlocked = this.isUnlocked(id);

                // Card background
                ctx.save();
                if (unlocked) {
                    ctx.fillStyle = "rgba(255,255,255,0.07)";
                } else {
                    ctx.fillStyle = "rgba(255,255,255,0.02)";
                }
                ctx.beginPath();
                ctx.roundRect(cardX, yPos, cardW, rowH - 8, 10);
                ctx.fill();

                // Left accent bar
                ctx.fillStyle = unlocked ? tierColor.bg : "rgba(255,255,255,0.1)";
                ctx.beginPath();
                ctx.roundRect(cardX, yPos, 4, rowH - 8, [10, 0, 0, 10]);
                ctx.fill();

                // Icon circle
                const iconSize = 42;
                const iconX = cardX + 22;
                const iconY = yPos + (rowH - 8) / 2 - iconSize / 2;

                if (unlocked) {
                    ctx.fillStyle = tierColor.bg;
                    ctx.globalAlpha = 0.25;
                    ctx.beginPath();
                    ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                // Icon / lock
                ctx.font = `${iconSize * 0.6}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                if (unlocked) {
                    ctx.fillText(ach.icon, iconX + iconSize/2, iconY + iconSize/2);
                } else {
                    ctx.fillStyle = "#555";
                    ctx.fillText("🔒", iconX + iconSize/2, iconY + iconSize/2);
                }

                // Name
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillStyle = unlocked ? "#FFF" : "#666";
                ctx.font = `700 ${isMobile ? 14 : 16}px 'Cinzel', serif`;
                ctx.fillText(ach.name, iconX + iconSize + 14, yPos + 14);

                // Description
                ctx.fillStyle = unlocked ? "#AAA" : "#555";
                ctx.font = `400 ${isMobile ? 11 : 12}px sans-serif`;
                ctx.fillText(ach.desc, iconX + iconSize + 14, yPos + 36);

                // Tier badge (right side)
                if (unlocked) {
                    ctx.fillStyle = tierColor.bg;
                    ctx.font = `600 10px sans-serif`;
                    ctx.textAlign = "right";
                    ctx.fillText("✓", cardX + cardW - 15, yPos + (rowH - 8) / 2);
                }

                ctx.restore();
                yPos += rowH;
            }

            yPos += 10; // Gap between tiers
        }

        ctx.restore(); // Unclip
    }

    checkBackButton(x, y) {
        return this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
               y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h;
    }

    resetScroll() {
        this.scrollY = 0;
        this.targetScrollY = 0;
        this.velocity = 0;
    }
}
