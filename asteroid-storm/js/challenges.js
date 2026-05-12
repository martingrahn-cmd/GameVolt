// Challenge mode — mission definitions + ChallengeManager that wraps
// WaveManager with objective tracking.

// ── Mission definitions ─────────────────────────────────────────
const MISSIONS = [
    // ── Difficulty 1 — Intro (1-6) ──
    {
        id: 1,
        title: 'FIRST BLOOD',
        type: 'destroy',
        description: 'Destroy 15 asteroids',
        objective: { count: 15 },
        timeLimit: 0,
        difficulty: 1,
        modifiers: {}
    },
    {
        id: 2,
        title: 'ENDURANCE',
        type: 'survive',
        description: 'Survive 45 seconds',
        objective: { seconds: 45 },
        timeLimit: 0,
        difficulty: 1,
        modifiers: {}
    },
    {
        id: 3,
        title: 'SHARPSHOOTER',
        type: 'score',
        description: 'Reach 2000 points',
        objective: { score: 2000 },
        timeLimit: 0,
        difficulty: 1,
        modifiers: {}
    },
    {
        id: 4,
        title: 'SPEED DEMON',
        type: 'destroy',
        description: 'Destroy 20 asteroids in 40s',
        objective: { count: 20 },
        timeLimit: 40,
        difficulty: 1,
        modifiers: {}
    },
    {
        id: 5,
        title: 'HOMING 101',
        type: 'restricted',
        description: 'Destroy 15 — homing only',
        objective: { count: 15 },
        timeLimit: 0,
        difficulty: 1,
        modifiers: { weaponLock: 'homing' }
    },
    {
        id: 6,
        title: 'COMBO STARTER',
        type: 'combo',
        description: 'Reach 5× combo',
        objective: { combo: 5 },
        timeLimit: 0,
        difficulty: 1,
        modifiers: {}
    },

    // ── Difficulty 2 — Medium (7-12) ──
    {
        id: 7,
        title: 'HUNTER',
        type: 'hunt',
        description: 'Kill 2 hostile UFOs',
        objective: { count: 2 },
        timeLimit: 90,
        difficulty: 2,
        modifiers: { guaranteedHostiles: true, hostileInterval: 10 }
    },
    {
        id: 8,
        title: 'TITAN',
        type: 'boss',
        description: 'Defeat the Mega-Asteroid',
        objective: { bossDefeated: true },
        timeLimit: 0,
        difficulty: 2,
        modifiers: { spawnBoss: true, bossHP: 30 }
    },
    {
        id: 9,
        title: 'SPREAD FRENZY',
        type: 'restricted',
        description: 'Destroy 20 asteroids — spread only',
        objective: { count: 20 },
        timeLimit: 0,
        difficulty: 2,
        modifiers: { weaponLock: 'spreadshot' }
    },
    {
        id: 10,
        title: 'DODGEBALL',
        type: 'survive',
        description: 'Survive 40s — no weapons',
        objective: { seconds: 40 },
        timeLimit: 0,
        difficulty: 2,
        modifiers: { noWeapon: true }
    },
    {
        id: 11,
        title: 'SNIPER',
        type: 'destroy',
        description: 'Destroy 15 — only 30 shots',
        objective: { count: 15 },
        timeLimit: 0,
        difficulty: 2,
        modifiers: { ammoLimit: 30 }
    },
    {
        id: 12,
        title: 'RISING TIDE',
        type: 'destroy',
        description: 'Destroy 30 — spawn escalates',
        objective: { count: 30 },
        timeLimit: 0,
        difficulty: 2,
        modifiers: { escalation: true }
    },

    // ── Difficulty 3 — Hard (13-18) ──
    {
        id: 13,
        title: 'THE GAUNTLET',
        type: 'survive',
        description: 'Survive 75 seconds — fast spawn',
        objective: { seconds: 75 },
        timeLimit: 0,
        difficulty: 3,
        modifiers: { spawnRate: 0.8 }
    },
    {
        id: 14,
        title: 'BOUNTY HUNTER',
        type: 'hunt',
        description: 'Kill 4 hostile UFOs',
        objective: { count: 4 },
        timeLimit: 120,
        difficulty: 3,
        modifiers: { guaranteedHostiles: true, hostileInterval: 8 }
    },
    {
        id: 15,
        title: 'RAILGUN TEST',
        type: 'restricted',
        description: 'Destroy 50 asteroids — railgun only',
        objective: { count: 50 },
        timeLimit: 0,
        difficulty: 3,
        modifiers: { weaponLock: 'railgun' }
    },
    {
        id: 16,
        title: 'COMBO KING',
        type: 'combo',
        description: 'Reach 12× combo',
        objective: { combo: 12 },
        timeLimit: 0,
        difficulty: 3,
        modifiers: {}
    },
    {
        id: 17,
        title: 'SAUCER HUNT',
        type: 'hunt',
        description: 'Kill 3 UFOs — no asteroids',
        objective: { count: 3 },
        timeLimit: 90,
        difficulty: 3,
        modifiers: { guaranteedHostiles: true, hostileInterval: 8, noAsteroids: true }
    },
    {
        id: 18,
        title: 'SPEED FREAK',
        type: 'destroy',
        description: 'Destroy 40 in 50s',
        objective: { count: 40 },
        timeLimit: 50,
        difficulty: 3,
        modifiers: {}
    },

    // ── Difficulty 4 — Very hard (19-24) ──
    {
        id: 19,
        title: 'TITAN II',
        type: 'boss',
        description: 'Defeat the Mega-Boss',
        objective: { bossDefeated: true },
        timeLimit: 0,
        difficulty: 4,
        modifiers: { spawnBoss: true, bossHP: 50 }
    },
    {
        id: 20,
        title: 'SWARM',
        type: 'survive',
        description: 'Survive 60s — extreme spawn',
        objective: { seconds: 60 },
        timeLimit: 0,
        difficulty: 4,
        modifiers: { spawnRate: 0.5, maxAsteroids: 35 }
    },
    {
        id: 21,
        title: 'SHARPSHOOTER PRO',
        type: 'score',
        description: 'Reach 8000 points',
        objective: { score: 8000 },
        timeLimit: 0,
        difficulty: 4,
        modifiers: {}
    },
    {
        id: 22,
        title: 'GLASS SNIPER',
        type: 'destroy',
        description: 'Destroy 25 — 20 shots, railgun',
        objective: { count: 25 },
        timeLimit: 0,
        difficulty: 4,
        modifiers: { weaponLock: 'railgun', ammoLimit: 20 }
    },
    {
        id: 23,
        title: 'STORM SURGE',
        type: 'destroy',
        description: 'Destroy 60 — escalating spawn',
        objective: { count: 60 },
        timeLimit: 0,
        difficulty: 4,
        modifiers: { escalation: true }
    },
    {
        id: 24,
        title: 'DODGE MASTER',
        type: 'survive',
        description: 'Survive 60s — no weapons, fast spawn',
        objective: { seconds: 60 },
        timeLimit: 0,
        difficulty: 4,
        modifiers: { noWeapon: true, spawnRate: 0.8 }
    },

    // ── Difficulty 5 — Nightmare (25-30) ──
    {
        id: 25,
        title: 'TWIN TITANS',
        type: 'boss',
        description: 'Defeat 2 bosses (30 HP each)',
        objective: { bossDefeated: true },
        timeLimit: 0,
        difficulty: 5,
        modifiers: { spawnBoss: true, bossHP: 30, bossCount: 2 }
    },
    {
        id: 26,
        title: 'UFO GAUNTLET',
        type: 'hunt',
        description: 'Kill 6 UFOs — no asteroids',
        objective: { count: 6 },
        timeLimit: 90,
        difficulty: 5,
        modifiers: { guaranteedHostiles: true, hostileInterval: 6, noAsteroids: true }
    },
    {
        id: 27,
        title: 'COMBO GOD',
        type: 'combo',
        description: 'Reach 20× combo',
        objective: { combo: 20 },
        timeLimit: 0,
        difficulty: 5,
        modifiers: {}
    },
    {
        id: 28,
        title: 'HELL SWARM',
        type: 'survive',
        description: 'Survive 90s — extreme spawn',
        objective: { seconds: 90 },
        timeLimit: 0,
        difficulty: 5,
        modifiers: { spawnRate: 0.4, maxAsteroids: 40 }
    },
    {
        id: 29,
        title: 'IMPOSSIBLE RUN',
        type: 'destroy',
        description: 'Destroy 80 — escalating, 120s',
        objective: { count: 80 },
        timeLimit: 120,
        difficulty: 5,
        modifiers: { escalation: true }
    },
    {
        id: 30,
        title: 'TITAN III',
        type: 'boss',
        description: 'Defeat 3 bosses (40 HP each)',
        objective: { bossDefeated: true },
        timeLimit: 0,
        difficulty: 5,
        modifiers: { spawnBoss: true, bossHP: 40, bossCount: 3 }
    }
];

// ── Challenge progress persistence ──────────────────────────────
const ChallengeProgress = {
    KEY: 'astroidStorm.challengeProgress',

    _read() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '{}');
        } catch (e) { return {}; }
    },

    _write(data) {
        try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
    },

    get(missionId) {
        return this._read()[missionId] || { completed: false, best: 0 };
    },

    save(missionId, score) {
        const data = this._read();
        const prev = data[missionId] || { completed: false, best: 0 };
        data[missionId] = {
            completed: true,
            best: Math.max(prev.best, score)
        };
        this._write(data);
    }
};

// ── ChallengeManager ────────────────────────────────────────────
// Wraps the existing WaveManager with mission objective tracking.
// Does NOT replace WaveManager — it sits on top.
class ChallengeManager {
    constructor(missionId) {
        this.mission = MISSIONS.find(m => m.id === missionId);
        if (!this.mission) {
            console.warn('Unknown mission:', missionId);
            this.mission = MISSIONS[0];
        }

        this.progress = 0;          // destroyed count / ufo kills / etc
        this.elapsed = 0;           // seconds since mission start
        this.completed = false;
        this.failed = false;
        this.bossAlive = false;
        this.bossCount = 0;         // total bosses spawned (for multi-boss)
        this.bossesDefeated = 0;    // how many killed so far
        this.hostileSpawnTimer = 0;
        this.ammoRemaining = -1;    // -1 = unlimited

        // Snapshot destroyed count at start so we track delta
        this._initialDestroyed = 0;
        // Escalation state
        this._escalationTimer = 0;
    }

    // Called from Game.startMode() after WaveManager is created
    start(game) {
        const m = this.mission;
        const mods = m.modifiers;

        this._initialDestroyed = game.waves ? game.waves.destroyed : 0;

        // Challenge mode = 1 life — all missions, no exceptions
        if (game.player) game.player.lives = 1;

        // Apply difficulty to wave system. Use the base WaveManager interval
        // (3.0s) as the anchor so seamless mission transitions don't stack
        // multipliers on top of each other.
        if (game.waves) {
            const diffMultiplier = 1 - (m.difficulty - 1) * 0.1;
            game.waves.spawnInterval = 3.0 * Math.max(0.5, diffMultiplier);
            if (mods.spawnRate) game.waves.spawnInterval = mods.spawnRate;
            if (mods.maxAsteroids) game.waves.maxAsteroids = mods.maxAsteroids;
        }

        // No asteroids — stop wave spawning entirely
        if (mods.noAsteroids && game.waves) {
            game.waves.spawnInterval = 99999;
            game.waves.maxAsteroids = 0;
            // Clear any that already spawned
            for (const ast of game.waves.asteroids) ast.destroy();
            game.waves.asteroids = [];
        }

        // Weapon lock — give the player the locked weapon permanently
        if (mods.weaponLock && game.player) {
            game.player.activePowerup = mods.weaponLock;
            game.player.powerupTimer = 99999; // effectively permanent
            game.player.powerupLocked = true;
        }

        // No weapon — disable shooting entirely
        if (mods.noWeapon && game.player) {
            game.player.shootRate = 99999;
            game.player.powerupLocked = true;
        }

        // Ammo limit
        if (mods.ammoLimit) {
            this.ammoRemaining = mods.ammoLimit;
        }

        // Guaranteed hostile UFO spawns
        if (mods.guaranteedHostiles) {
            this.hostileSpawnTimer = 3; // first one spawns quickly
        }

        // Boss spawn (supports multiple via bossCount)
        if (mods.spawnBoss && typeof BossAsteroid !== 'undefined') {
            const hp = mods.bossHP || 30;
            const count = mods.bossCount || 1;
            this.bossCount = count;
            this.bossesDefeated = 0;
            for (let i = 0; i < count; i++) {
                const boss = new BossAsteroid(game.scene, hp);
                // Offset multiple bosses so they don't stack
                if (count > 1) {
                    const angle = (i / count) * Math.PI * 2;
                    const dist = 30;
                    boss.position.x = Math.cos(angle) * dist;
                    boss.position.z = Math.sin(angle) * dist;
                    boss.mesh.position.set(boss.position.x, 0.5, boss.position.z);
                }
                game.waves.asteroids.push(boss);
                game.scene.add(boss.mesh);
            }
            this.bossAlive = true;
        }
    }

    // Called every frame from Game.update()
    update(dt, game) {
        if (this.completed || this.failed) return;

        this.elapsed += dt;
        const m = this.mission;
        const obj = m.objective;
        const mods = m.modifiers;

        // Check time limit
        if (m.timeLimit > 0 && this.elapsed >= m.timeLimit) {
            this.failed = true;
            return;
        }

        // Escalation — decrease spawn interval every 10 seconds
        if (mods.escalation && game.waves) {
            this._escalationTimer += dt;
            if (this._escalationTimer >= 10) {
                this._escalationTimer -= 10;
                game.waves.spawnInterval = Math.max(0.4, game.waves.spawnInterval * 0.75);
            }
        }

        // Ammo limit — disable shooting when out
        if (this.ammoRemaining === 0 && game.player) {
            game.player.shootRate = 99999;
        }

        // Guaranteed hostile UFO spawns for HUNT missions
        if (mods.guaranteedHostiles && game.ufoManager) {
            this.hostileSpawnTimer -= dt;
            if (this.hostileSpawnTimer <= 0) {
                if (game.ufoManager.forceSpawnHostile) {
                    game.ufoManager.forceSpawnHostile(game.player);
                }
                this.hostileSpawnTimer = mods.hostileInterval || 10;
            }
        }

        // Check completion by type
        switch (m.type) {
            case 'destroy':
            case 'restricted':
                if (this.progress >= obj.count) this.completed = true;
                break;

            case 'survive':
                if (this.elapsed >= obj.seconds) this.completed = true;
                break;

            case 'hunt':
                if (this.progress >= obj.count) this.completed = true;
                break;

            case 'score':
                if (game.ui && game.ui.score >= obj.score) this.completed = true;
                break;

            case 'boss':
                if (this.bossCount > 0) {
                    // Multi-boss: complete when all bosses defeated
                    if (this.bossesDefeated >= this.bossCount) {
                        this.bossAlive = false;
                        this.completed = true;
                    }
                } else if (!this.bossAlive) {
                    this.completed = true;
                }
                break;

            case 'combo':
                if (game.ui && game.ui.combo >= obj.combo) this.completed = true;
                break;
        }
    }

    // Called from collision code when an asteroid is destroyed
    onAsteroidDestroyed() {
        if (this.mission.type === 'destroy' || this.mission.type === 'restricted') {
            this.progress++;
        }
    }

    // Called when a hostile UFO is killed
    onHostileKilled() {
        if (this.mission.type === 'hunt') {
            this.progress++;
        }
    }

    // Called when a boss asteroid reaches 0 HP
    onBossDefeated() {
        this.bossesDefeated++;
        if (this.bossCount > 0) {
            if (this.bossesDefeated >= this.bossCount) {
                this.bossAlive = false;
            }
        } else {
            this.bossAlive = false;
        }
    }

    // Called when the player fires a shot (for ammo tracking)
    onShotFired() {
        if (this.ammoRemaining > 0) {
            this.ammoRemaining--;
        }
    }

    isComplete() { return this.completed; }
    isFailed() { return this.failed; }

    // Returns info for the HUD objective display
    getHUDInfo() {
        const m = this.mission;
        const obj = m.objective;
        const info = {
            title: m.title,
            type: m.type
        };

        switch (m.type) {
            case 'destroy':
            case 'restricted':
                info.text = `DESTROY ${this.progress}/${obj.count}`;
                info.pct = this.progress / obj.count;
                break;
            case 'survive':
                const remaining = Math.max(0, obj.seconds - this.elapsed);
                info.text = `SURVIVE ${Math.ceil(remaining)}s`;
                info.pct = this.elapsed / obj.seconds;
                break;
            case 'hunt':
                info.text = `HUNT ${this.progress}/${obj.count}`;
                info.pct = this.progress / obj.count;
                break;
            case 'score':
                const currentScore = (window.game && window.game.ui) ? window.game.ui.score : 0;
                info.text = `SCORE ${currentScore}/${obj.score}`;
                info.pct = currentScore / obj.score;
                break;
            case 'boss':
                if (this.bossAlive) {
                    // Locate the boss in the live asteroid list and show its HP
                    let totalHP = 0, totalMaxHP = 0;
                    if (window.game && window.game.waves) {
                        for (const a of window.game.waves.asteroids) {
                            if (a.maxHealth !== undefined) {
                                totalHP += a.health;
                                totalMaxHP += a.maxHealth;
                            }
                        }
                    }
                    if (totalMaxHP > 0) {
                        info.text = this.bossCount > 1
                            ? `BOSSES ${totalHP} / ${totalMaxHP}`
                            : `BOSS ${totalHP} / ${totalMaxHP}`;
                        info.pct = 1 - totalHP / totalMaxHP;
                    } else {
                        info.text = 'DEFEAT THE BOSS';
                        info.pct = 0;
                    }
                } else {
                    info.text = this.bossCount > 1 ? 'BOSSES DEFEATED' : 'BOSS DEFEATED';
                    info.pct = 1;
                }
                break;
            case 'combo':
                const currentCombo = (window.game && window.game.ui) ? window.game.ui.combo : 0;
                info.text = `COMBO ${currentCombo}/${obj.combo}`;
                info.pct = Math.min(1, currentCombo / obj.combo);
                break;
        }

        // Ammo remaining
        if (this.ammoRemaining >= 0) {
            info.ammo = this.ammoRemaining;
        }

        // Time limit countdown
        if (m.timeLimit > 0) {
            info.timeRemaining = Math.max(0, m.timeLimit - this.elapsed);
        }

        return info;
    }

    // Get the next mission id (or null if last)
    getNextMissionId() {
        const idx = MISSIONS.findIndex(m => m.id === this.mission.id);
        if (idx >= 0 && idx < MISSIONS.length - 1) {
            return MISSIONS[idx + 1].id;
        }
        return null;
    }
}
