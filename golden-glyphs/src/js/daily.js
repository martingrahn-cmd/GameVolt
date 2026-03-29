import { LEVELS_DAILY } from "./levels_daily.js";

export class DailySystem {
    constructor() {
        this.levels = LEVELS_DAILY;
    }

    // Hämtar dagens datum (1-31)
    getCurrentDay() {
        return new Date().getDate();
    }

    // Returnerar index för dagens nivå (0-30)
    getTodayIndex() {
        if (!this.levels || this.levels.length === 0) return 0;
        // Använd modulo (%) så att det funkar även om vi har färre än 31 banor
        return (this.getCurrentDay() - 1) % this.levels.length;
    }

    // Hämtar dagens unika ID (t.ex. "daily_complete_2025-02-05")
    getDailyId() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `daily_complete_${d.getFullYear()}-${m}-${day}`;
    }

    // Kollar om dagens bana är klar
    isCompleted() {
        const id = this.getDailyId();
        return localStorage.getItem(id) === 'true';
    }

    // Markerar dagens bana som klar
    markCompleted() {
        const id = this.getDailyId();
        localStorage.setItem(id, 'true');
    }
}