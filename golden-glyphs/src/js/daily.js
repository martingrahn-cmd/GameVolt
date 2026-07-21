import { LEVELS_DAILY } from "./levels_daily.js?v=3";

export class DailySystem {
    constructor() {
        this.levels = LEVELS_DAILY;
        this.epochUtc = Date.UTC(2026, 0, 1);
    }

    getUtcDate(date = new Date()) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    getDayNumber(date = new Date()) {
        return Math.floor((this.getUtcDate(date).getTime() - this.epochUtc) / 86400000) + 1;
    }

    seededRandom(seed) {
        let value = seed >>> 0;
        return () => {
            value += 0x6D2B79F5;
            let t = value;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Every 31-day cycle uses all daily boards exactly once, in a seeded order.
    // This keeps the challenge deterministic worldwide without repeating the
    // same board on the same day of every month.
    getTodayIndex(date = new Date()) {
        if (!this.levels || this.levels.length === 0) return 0;
        const dayNumber = this.getDayNumber(date);
        const zeroBasedDay = Math.max(0, dayNumber - 1);
        const cycle = Math.floor(zeroBasedDay / this.levels.length);
        const position = zeroBasedDay % this.levels.length;
        const order = Array.from({ length: this.levels.length }, (_, index) => index);
        const random = this.seededRandom(0x47C1F5 ^ cycle);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        return order[position];
    }

    getDateKey(date = new Date()) {
        return this.getUtcDate(date).toISOString().slice(0, 10);
    }

    getDailyId(date = new Date()) {
        return `daily_complete_${this.getDateKey(date)}`;
    }

    getDisplayInfo(date = new Date()) {
        const utcDate = this.getUtcDate(date);
        return {
            number: this.getDayNumber(date),
            dateKey: this.getDateKey(date),
            levelIndex: this.getTodayIndex(date),
            label: utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        };
    }

    // Kollar om dagens bana är klar
    isCompleted() {
        const id = this.getDailyId();
        return localStorage.getItem(id) === 'true';
    }

    // Markerar dagens bana som klar
    markCompleted(result = {}) {
        const id = this.getDailyId();
        localStorage.setItem(id, 'true');
        let results = {};
        try { results = JSON.parse(localStorage.getItem('goldenGlyphsDailyResults') || '{}'); } catch (e) {}
        const key = this.getDateKey();
        const previous = results[key];
        if (!previous || Number(result.time) < Number(previous.time)) {
            results[key] = {
                time: Math.max(0, Number(result.time) || 0),
                stars: Math.max(0, Math.min(3, Number(result.stars) || 0)),
                hints: Math.max(0, Number(result.hints) || 0),
                levelIndex: this.getTodayIndex(),
                completedAt: new Date().toISOString()
            };
            localStorage.setItem('goldenGlyphsDailyResults', JSON.stringify(results));
        }
        return this.getStreak();
    }

    getTodayResult() {
        try {
            const results = JSON.parse(localStorage.getItem('goldenGlyphsDailyResults') || '{}');
            return results[this.getDateKey()] || null;
        } catch (e) { return null; }
    }

    getStreak(date = new Date()) {
        let streak = 0;
        const today = this.getUtcDate(date);
        for (let offset = 0; offset < 365; offset++) {
            const current = new Date(today.getTime() - offset * 86400000);
            if (localStorage.getItem(this.getDailyId(current)) === 'true') streak++;
            else if (offset !== 0) break;
        }
        return streak;
    }
}
