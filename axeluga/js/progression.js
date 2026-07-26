export const AXELUGA_SAVE_KEY = 'axeluga_save_v2';
export const AXELUGA_SAVE_VERSION = 2;
export const RUN_TYPES = Object.freeze({
    CAMPAIGN: 'campaign',
    PRACTICE: 'practice',
    CONTINUE: 'continue',
    DAILY: 'daily',
    WEEKLY: 'weekly',
});

const DIFFICULTY_NAMES = ['easy', 'medium', 'hard'];

function finiteInt(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function safeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function difficultyName(index) {
    return DIFFICULTY_NAMES[index] || DIFFICULTY_NAMES[1];
}

export function dailyChallengeId(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export function weeklyChallengeId(date = new Date()) {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function seedFromString(value) {
    return String(value).split('').reduce((hash, char) => (
        ((hash * 31) + char.charCodeAt(0)) >>> 0
    ), 2166136261) || 1;
}

export function challengeWorld(challengeId, worldCount = 5) {
    const hash = String(challengeId).split('').reduce((value, char) => (
        ((value * 31) + char.charCodeAt(0)) >>> 0
    ), 7);
    return hash % Math.max(1, worldCount);
}

export function leaderboardMode(runType, difficulty, challengeId = '') {
    if (runType === RUN_TYPES.CAMPAIGN) return `campaign-${difficultyName(difficulty)}`;
    if (runType === RUN_TYPES.DAILY && challengeId) return `daily-${challengeId}`;
    if (runType === RUN_TYPES.WEEKLY && challengeId) return `weekly-${challengeId}`;
    return null;
}

export function createDefaultSave() {
    return {
        version: AXELUGA_SAVE_VERSION,
        campaign: {
            highestUnlockedWorld: 0,
            checkpointWorld: 0,
            clearsByDifficulty: {
                easy: [],
                medium: [],
                hard: [],
            },
        },
        records: {
            campaignEasy: 0,
            campaignMedium: 0,
            campaignHard: 0,
        },
        settings: {
            musicVol: 0.7,
            sfxVol: 0.8,
            difficulty: 1,
            autofire: true,
            leftHanded: false,
            reducedMotion: false,
            colorblindMode: false,
        },
        stats: {},
        updatedAt: 0,
    };
}

function normalizeWorldList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(v => finiteInt(v, -1)).filter(v => v >= 0 && v < 5))]
        .sort((a, b) => a - b);
}

export function normalizeSave(value) {
    const input = safeObject(value);
    const defaults = createDefaultSave();
    const campaign = safeObject(input.campaign);
    const clears = safeObject(campaign.clearsByDifficulty);
    const settings = safeObject(input.settings);
    const records = safeObject(input.records);

    return {
        version: AXELUGA_SAVE_VERSION,
        campaign: {
            highestUnlockedWorld: Math.min(4, finiteInt(campaign.highestUnlockedWorld, 0)),
            checkpointWorld: Math.min(4, finiteInt(campaign.checkpointWorld, campaign.highestUnlockedWorld)),
            clearsByDifficulty: {
                easy: normalizeWorldList(clears.easy),
                medium: normalizeWorldList(clears.medium),
                hard: normalizeWorldList(clears.hard),
            },
        },
        records: {
            campaignEasy: finiteInt(records.campaignEasy),
            campaignMedium: finiteInt(records.campaignMedium),
            campaignHard: finiteInt(records.campaignHard),
        },
        settings: {
            musicVol: Number.isFinite(Number(settings.musicVol)) ? Math.max(0, Math.min(1, Number(settings.musicVol))) : defaults.settings.musicVol,
            sfxVol: Number.isFinite(Number(settings.sfxVol)) ? Math.max(0, Math.min(1, Number(settings.sfxVol))) : defaults.settings.sfxVol,
            difficulty: Math.min(2, finiteInt(settings.difficulty, defaults.settings.difficulty)),
            autofire: typeof settings.autofire === 'boolean' ? settings.autofire : defaults.settings.autofire,
            leftHanded: typeof settings.leftHanded === 'boolean' ? settings.leftHanded : defaults.settings.leftHanded,
            reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : defaults.settings.reducedMotion,
            colorblindMode: typeof settings.colorblindMode === 'boolean' ? settings.colorblindMode : defaults.settings.colorblindMode,
        },
        stats: safeObject(input.stats),
        updatedAt: finiteInt(input.updatedAt),
    };
}

export function mergeSaves(localValue, cloudValue) {
    const local = normalizeSave(localValue);
    const cloud = normalizeSave(cloudValue);
    const merged = createDefaultSave();
    merged.campaign.highestUnlockedWorld = Math.max(
        local.campaign.highestUnlockedWorld,
        cloud.campaign.highestUnlockedWorld,
    );
    merged.campaign.checkpointWorld = Math.max(
        local.campaign.checkpointWorld,
        cloud.campaign.checkpointWorld,
    );
    for (const difficulty of DIFFICULTY_NAMES) {
        merged.campaign.clearsByDifficulty[difficulty] = normalizeWorldList([
            ...local.campaign.clearsByDifficulty[difficulty],
            ...cloud.campaign.clearsByDifficulty[difficulty],
        ]);
    }
    for (const key of Object.keys(merged.records)) {
        merged.records[key] = Math.max(local.records[key], cloud.records[key]);
    }
    merged.settings = (local.updatedAt >= cloud.updatedAt ? local : cloud).settings;
    merged.stats = Object.assign({}, cloud.stats, local.stats);
    const localAttempts = safeObject(local.stats.challengeAttempts);
    const cloudAttempts = safeObject(cloud.stats.challengeAttempts);
    merged.stats.challengeAttempts = Object.assign({}, cloudAttempts, localAttempts);
    merged.updatedAt = Math.max(local.updatedAt, cloud.updatedAt, Date.now());
    return merged;
}

export function legacyToSave(localData) {
    const local = safeObject(localData);
    let settings = {};
    try {
        settings = typeof local.axeluga_settings === 'string'
            ? JSON.parse(local.axeluga_settings)
            : safeObject(local.axeluga_settings);
    } catch (e) {}
    const save = normalizeSave({
        settings,
        records: {
            campaignMedium: finiteInt(local.axeluga_hi),
        },
        updatedAt: Date.now(),
    });
    return mergeSaves(save, local[AXELUGA_SAVE_KEY]);
}

export function recordWorldClear(saveValue, worldIndex, difficulty) {
    const save = normalizeSave(saveValue);
    const world = Math.min(4, finiteInt(worldIndex));
    const key = difficultyName(difficulty);
    save.campaign.clearsByDifficulty[key] = normalizeWorldList([
        ...save.campaign.clearsByDifficulty[key],
        world,
    ]);
    save.campaign.highestUnlockedWorld = Math.max(
        save.campaign.highestUnlockedWorld,
        Math.min(4, world + 1),
    );
    save.campaign.checkpointWorld = Math.max(
        save.campaign.checkpointWorld,
        Math.min(4, world + 1),
    );
    save.updatedAt = Date.now();
    return save;
}

export function isWorldUnlocked(saveValue, worldIndex) {
    return finiteInt(worldIndex) <= normalizeSave(saveValue).campaign.highestUnlockedWorld;
}

export function checkpointWorld(saveValue) {
    return normalizeSave(saveValue).campaign.checkpointWorld;
}

export function hasRankedChallengeAttempt(saveValue, runType, challengeId) {
    const attempts = safeObject(normalizeSave(saveValue).stats.challengeAttempts);
    return !!attempts[`${runType}:${challengeId}`];
}

export function recordChallengeAttempt(saveValue, runType, challengeId) {
    const save = normalizeSave(saveValue);
    const attempts = safeObject(save.stats.challengeAttempts);
    save.stats.challengeAttempts = Object.assign({}, attempts, {
        [`${runType}:${challengeId}`]: Date.now(),
    });
    save.updatedAt = Date.now();
    return save;
}

export function isFullCampaignRun(run) {
    if (!run || run.type !== RUN_TYPES.CAMPAIGN || run.startWorld !== 0) return false;
    const cleared = normalizeWorldList(run.worldsCleared);
    return cleared.length === 5 && cleared.every((world, index) => world === index);
}

export function recordCampaignScore(saveValue, difficulty, score) {
    const save = normalizeSave(saveValue);
    const key = `campaign${difficultyName(difficulty)[0].toUpperCase()}${difficultyName(difficulty).slice(1)}`;
    if (key in save.records) save.records[key] = Math.max(save.records[key], finiteInt(score));
    save.updatedAt = Date.now();
    return save;
}
