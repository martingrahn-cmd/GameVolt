// High-score persistence per game mode (localStorage).
// Stores top 10 entries per mode with score, date, and optional stats.
const Highscores = {
    KEY: 'astroidStorm.highscores',
    // Legacy key for migration from old single-best format
    LEGACY_KEY: 'astroidStorm.highscores',
    MAX_ENTRIES: 10,

    _read() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },

    _write(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (e) {}
    },

    // Get the best score for a mode (backward compatible)
    get(mode) {
        if (!mode) return 0;
        const data = this._read();
        const entries = data[mode];
        // Handle legacy format (plain number)
        if (typeof entries === 'number') return entries;
        if (Array.isArray(entries) && entries.length > 0) return entries[0].score;
        return 0;
    },

    // Get full top-10 list for a mode
    getList(mode) {
        if (!mode) return [];
        const data = this._read();
        const entries = data[mode];
        // Migrate legacy single-number format
        if (typeof entries === 'number') {
            return entries > 0 ? [{ score: entries, date: null, stats: null }] : [];
        }
        return Array.isArray(entries) ? entries : [];
    },

    // Submit a score. Returns true if it's a new #1 high.
    // stats is optional: { time, asteroids, maxCombo, rank }
    submit(mode, score, stats = null) {
        if (!mode) return false;
        const data = this._read();
        let entries = data[mode];

        // Migrate legacy format
        if (typeof entries === 'number') {
            entries = entries > 0 ? [{ score: entries, date: null, stats: null }] : [];
        }
        if (!Array.isArray(entries)) entries = [];

        const prevBest = entries.length > 0 ? entries[0].score : 0;

        // Insert new entry in sorted position
        const entry = {
            score,
            date: new Date().toISOString().split('T')[0],
            stats: stats || null
        };

        let inserted = false;
        for (let i = 0; i < entries.length; i++) {
            if (score > entries[i].score) {
                entries.splice(i, 0, entry);
                inserted = true;
                break;
            }
        }
        if (!inserted) entries.push(entry);

        // Trim to max
        if (entries.length > this.MAX_ENTRIES) entries.length = this.MAX_ENTRIES;

        data[mode] = entries;
        this._write(data);

        return score > prevBest;
    }
};
