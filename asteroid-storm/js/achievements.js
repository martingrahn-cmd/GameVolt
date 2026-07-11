// Achievement / Trophy system — 31 trophies (15 bronze, 10 silver, 5 gold, 1 platinum)
// Persisted in localStorage. Integrates with GameVolt SDK when available.

const TROPHIES = [
    // ── Bronze (15) — Natural gameplay ──
    { id: 'first_kill',      name: 'First Blood',       desc: 'Destroy your first asteroid',              icon: '☄️', tier: 'bronze' },
    { id: 'score_1000',      name: 'Getting Started',    desc: 'Reach 1,000 points',                       icon: '🎯', tier: 'bronze' },
    { id: 'score_5000',      name: 'Marksman',           desc: 'Reach 5,000 points',                       icon: '🎯', tier: 'bronze' },
    { id: 'combo_5',         name: 'Combo Rookie',       desc: 'Reach a 5× combo',                         icon: '🔥', tier: 'bronze' },
    { id: 'first_teleport',  name: 'Blink',              desc: 'Use teleport for the first time',          icon: '⚡', tier: 'bronze' },
    { id: 'first_powerup',   name: 'Power Up',           desc: 'Pick up your first power-up',              icon: '⬆️', tier: 'bronze' },
    { id: 'survive_60',      name: 'Survivor',           desc: 'Survive 60 seconds in campaign',           icon: '🛡️', tier: 'bronze' },
    { id: 'ufo_kill',        name: 'UFO Down',           desc: 'Destroy your first hostile UFO',           icon: '🛸', tier: 'bronze' },
    { id: 'shield_save',     name: 'Close Call',         desc: 'Shield absorbs a hit',                     icon: '💠', tier: 'bronze' },
    { id: 'bomb_5',          name: 'Blast Zone',         desc: 'Destroy 5+ asteroids with one bomb',       icon: '💣', tier: 'bronze' },
    { id: 'mission_1',       name: 'Enlisted',           desc: 'Complete your first challenge mission',    icon: '📋', tier: 'bronze' },
    { id: 'mission_5',       name: 'Recruit',            desc: 'Complete 5 challenge missions',            icon: '📋', tier: 'bronze' },
    { id: 'spread_kills_10', name: 'Fan Favorite',       desc: 'Destroy 10 asteroids with spread shot',   icon: '🔫', tier: 'bronze' },
    { id: 'homing_kills_10', name: 'Lock On',            desc: 'Destroy 10 asteroids with homing',        icon: '🔫', tier: 'bronze' },
    { id: 'railgun_kills_10',name: 'Railgunner',         desc: 'Destroy 10 asteroids with railgun',       icon: '🔫', tier: 'bronze' },

    // ── Silver (10) — Requires skill ──
    { id: 'score_25000',     name: 'Sharpshooter',       desc: 'Reach 25,000 points',                      icon: '⭐', tier: 'silver' },
    { id: 'combo_15',        name: 'Combo Master',       desc: 'Reach a 20× combo',                        icon: '🔥', tier: 'silver' },
    { id: 'survive_180',     name: 'Iron Will',          desc: 'Survive 5 minutes in campaign',            icon: '🛡️', tier: 'silver' },
    { id: 'ufo_kills_10',    name: 'Saucer Slayer',      desc: 'Destroy 10 hostile UFOs (career)',         icon: '🛸', tier: 'silver' },
    { id: 'boss_kill',       name: 'Titan Slayer',       desc: 'Defeat a boss asteroid',                   icon: '👑', tier: 'silver' },
    { id: 'mission_15',      name: 'Veteran',            desc: 'Complete 15 challenge missions',           icon: '🎖️', tier: 'silver' },
    { id: 'no_damage_60',    name: 'Untouchable',        desc: 'Survive 90s without taking damage',        icon: '✨', tier: 'silver' },
    { id: 'asteroids_500',   name: 'Rock Crusher',       desc: 'Destroy 1,000 asteroids (career)',         icon: '💎', tier: 'silver' },
    { id: 'all_ships',       name: 'Fleet Commander',    desc: 'Play campaign with all 6 ships',           icon: '🚀', tier: 'silver' },
    { id: 'speed_run',       name: 'Speed Demon',        desc: 'Reach 10,000 points in under 60 seconds', icon: '⏱️', tier: 'silver' },

    // ── Gold (5) — Hard achievements ──
    { id: 'score_100000',    name: 'Legend',              desc: 'Reach 200,000 points',                     icon: '🏆', tier: 'gold' },
    { id: 'combo_25',        name: 'Combo God',           desc: 'Reach a 35× combo',                        icon: '🔥', tier: 'gold' },
    { id: 'mission_30',      name: 'Mission Complete',    desc: 'Complete all 30 challenge missions',       icon: '🏅', tier: 'gold' },
    { id: 'survive_300',     name: 'Endurance',           desc: 'Survive 8 minutes in campaign',            icon: '🛡️', tier: 'gold' },
    { id: 'asteroids_2000',  name: 'Asteroid Annihilator',desc: 'Destroy 5,000 asteroids (career)',        icon: '💎', tier: 'gold' },

    // ── Platinum (1) ──
    { id: 'platinum',        name: 'Storm Chaser',        desc: 'Unlock all 30 trophies',                   icon: '🌟', tier: 'platinum' }
];

// ── Persistence ──
const Achievements = {
    KEY: 'astroidStorm.achievements',
    STATS_KEY: 'astroidStorm.achievementStats',

    _readUnlocked() {
        try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { return {}; }
    },
    _writeUnlocked(data) {
        try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
    },
    _readStats() {
        try { return JSON.parse(localStorage.getItem(this.STATS_KEY) || '{}'); } catch (e) { return {}; }
    },
    _writeStats(data) {
        try { localStorage.setItem(this.STATS_KEY, JSON.stringify(data)); } catch (e) {}
    },

    isUnlocked(id) {
        return !!this._readUnlocked()[id];
    },

    getUnlockedCount() {
        const data = this._readUnlocked();
        return Object.keys(data).length;
    },

    getAll() {
        const unlocked = this._readUnlocked();
        return TROPHIES.map(t => ({
            ...t,
            unlocked: !!unlocked[t.id],
            unlockedAt: unlocked[t.id] || null
        }));
    },

    // Unlock a trophy — returns the trophy object if newly unlocked, null if already had it
    unlock(id) {
        if (this.isUnlocked(id) || (window.GameVolt && GameVolt.achievements.isUnlocked && GameVolt.achievements.isUnlocked(id))) return null;
        const trophy = TROPHIES.find(t => t.id === id);
        if (!trophy) return null;

        const data = this._readUnlocked();
        data[id] = Date.now();
        this._writeUnlocked(data);

        // GameVolt SDK integration
        if (window.GameVolt) {
            GameVolt.achievements.unlock(id);
        }

        // Check platinum after every unlock
        if (id !== 'platinum') {
            this._checkPlatinum();
        }

        return trophy;
    },

    _checkPlatinum() {
        if (this.isUnlocked('platinum')) return;
        const nonPlatinum = TROPHIES.filter(t => t.id !== 'platinum');
        const allUnlocked = nonPlatinum.every(t => this.isUnlocked(t.id));
        if (allUnlocked) {
            this.unlock('platinum');
        }
    },

    // ── Career stats (persistent across sessions) ──
    getStat(key) {
        return this._readStats()[key] || 0;
    },

    addStat(key, amount = 1) {
        const stats = this._readStats();
        stats[key] = (stats[key] || 0) + amount;
        this._writeStats(stats);
        return stats[key];
    },

    setStat(key, value) {
        const stats = this._readStats();
        if (value > (stats[key] || 0)) {
            stats[key] = value;
            this._writeStats(stats);
        }
        return stats[key];
    },

    addShipUsed(shipId) {
        const stats = this._readStats();
        if (!stats.shipsUsed) stats.shipsUsed = [];
        if (!stats.shipsUsed.includes(shipId)) {
            stats.shipsUsed.push(shipId);
            this._writeStats(stats);
        }
        return stats.shipsUsed.length;
    },

    getShipsUsed() {
        return this._readStats().shipsUsed || [];
    }
};

// ── Trophy toast (queue-based, one at a time) ──
let _toastQueue = [];
let _toastActive = false;

function showTrophyToast(trophy) {
    _toastQueue.push(trophy);
    if (!_toastActive) _popToast();
}

function _popToast() {
    if (!_toastQueue.length) { _toastActive = false; return; }
    _toastActive = true;
    const trophy = _toastQueue.shift();
    const el = document.getElementById('trophy-toast');
    if (!el) { _toastActive = false; return; }
    document.getElementById('trophy-toast-icon').textContent = trophy.icon;
    document.getElementById('trophy-toast-name').textContent = trophy.name;
    const tierEl = document.getElementById('trophy-toast-tier');
    tierEl.textContent = trophy.tier.toUpperCase();
    tierEl.className = trophy.tier;
    el.classList.add('show');

    // Play trophy SFX
    _trophySfx(trophy.tier);

    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => _popToast(), 400);
    }, 3000);
}

function _trophySfx(tier) {
    if (!window.game || !window.game.audio || !window.game.audio.audioContext) return;
    const ctx = window.game.audio.audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes = (tier === 'gold' || tier === 'platinum') ? [784, 988, 1318] : [784, 1047];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(window.game.audio.sfxBus || window.game.audio.masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
    });
}

// ── Check helpers (called from game code) ──
function checkAchievements(game) {
    if (!game || !game.ui) return;
    const score = game.ui.score;
    const combo = game.ui.combo;
    const elapsed = game.waves ? game.waves.elapsed : 0;
    const mode = game.gameMode;

    // Score milestones
    if (score >= 1000)   _tryUnlock('score_1000');
    if (score >= 5000)   _tryUnlock('score_5000');
    if (score >= 25000)  _tryUnlock('score_25000');
    if (score >= 200000) _tryUnlock('score_100000');

    // Combo milestones
    if (combo >= 5)  _tryUnlock('combo_5');
    if (combo >= 20) _tryUnlock('combo_15');
    if (combo >= 35) _tryUnlock('combo_25');

    // Survival milestones (campaign/coop only)
    if (mode === 'campaign' || mode === 'coop') {
        if (elapsed >= 60)  _tryUnlock('survive_60');
        if (elapsed >= 300) _tryUnlock('survive_180');
        if (elapsed >= 480) _tryUnlock('survive_300');
    }

    // Speed run: 10k in under 60s
    if (score >= 10000 && elapsed < 60) _tryUnlock('speed_run');

    // No-damage tracking
    if (game._noDamageTimer >= 90) _tryUnlock('no_damage_60');

    // Career stat milestones
    const totalAsteroids = Achievements.getStat('asteroidsDestroyed');
    if (totalAsteroids >= 1000) _tryUnlock('asteroids_500');
    if (totalAsteroids >= 5000) _tryUnlock('asteroids_2000');

    const totalUFOs = Achievements.getStat('ufosKilled');
    if (totalUFOs >= 10) _tryUnlock('ufo_kills_10');

    // Weapon-specific kills
    if (Achievements.getStat('spreadKills') >= 10)  _tryUnlock('spread_kills_10');
    if (Achievements.getStat('homingKills') >= 10)   _tryUnlock('homing_kills_10');
    if (Achievements.getStat('railgunKills') >= 10)  _tryUnlock('railgun_kills_10');

    // Mission milestones
    const completedMissions = _countCompletedMissions();
    if (completedMissions >= 1)  _tryUnlock('mission_1');
    if (completedMissions >= 5)  _tryUnlock('mission_5');
    if (completedMissions >= 15) _tryUnlock('mission_15');
    if (completedMissions >= 30) _tryUnlock('mission_30');

    // All ships
    if (Achievements.getShipsUsed().length >= 6) _tryUnlock('all_ships');
}

function _tryUnlock(id) {
    const trophy = Achievements.unlock(id);
    if (trophy) showTrophyToast(trophy);
}

function _countCompletedMissions() {
    if (typeof ChallengeProgress === 'undefined') return 0;
    let count = 0;
    for (let i = 1; i <= 30; i++) {
        if (ChallengeProgress.get(i).completed) count++;
    }
    return count;
}

// One-shot event triggers (called from specific game events)
function onAsteroidDestroyed(weaponType) {
    Achievements.addStat('asteroidsDestroyed');
    const total = Achievements.getStat('asteroidsDestroyed');
    if (total === 1) _tryUnlock('first_kill');

    if (weaponType === 'spreadshot') Achievements.addStat('spreadKills');
    if (weaponType === 'homing')     Achievements.addStat('homingKills');
    if (weaponType === 'railgun')    Achievements.addStat('railgunKills');
}

function onUFOKilled() {
    const total = Achievements.addStat('ufosKilled');
    if (total === 1) _tryUnlock('ufo_kill');
}

function onBossDefeated() {
    _tryUnlock('boss_kill');
}

function onTeleportUsed() {
    _tryUnlock('first_teleport');
}

function onPowerupCollected() {
    _tryUnlock('first_powerup');
}

function onShieldBroken() {
    _tryUnlock('shield_save');
}

function onBombUsed(killCount) {
    if (killCount >= 5) _tryUnlock('bomb_5');
}

function onMissionComplete() {
    // Defer to next frame so ChallengeProgress.save() has written
    setTimeout(() => checkAchievements(window.game), 100);
}
