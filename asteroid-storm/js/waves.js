// Continuous asteroid spawning system
class WaveManager {
    constructor() {
        this.asteroids = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0; // seconds between spawns
        this.minSpawnInterval = 0.6; // fastest spawn rate
        this.elapsed = 0; // total time played
        this.maxAsteroids = 25;
        this.destroyed = 0; // total destroyed, used for difficulty
    }

    getAsteroids() {
        return this.asteroids;
    }

    getDifficulty() {
        // Difficulty ramps up over time
        return Math.floor(this.elapsed / 30) + 1; // +1 every 30 seconds
    }

    spawnWave(scene) {
        // Initial asteroids
        for (let i = 0; i < 4; i++) {
            this.spawnOne(scene);
        }
    }

    spawnOne(scene) {
        if (this.asteroids.length >= this.maxAsteroids) return;

        // Spawn from edges
        const side = Math.floor(Math.random() * 4);
        const b = BOUNDS;
        let x, z;

        switch (side) {
            case 0: x = b.minX; z = (Math.random() - 0.5) * 200; break; // left
            case 1: x = b.maxX; z = (Math.random() - 0.5) * 200; break; // right
            case 2: x = (Math.random() - 0.5) * 200; z = b.minZ; break; // top
            case 3: x = (Math.random() - 0.5) * 200; z = b.maxZ; break; // bottom
        }

        const pos = new Vector2D(x, z);

        // Aim roughly towards center with some randomness
        const toCenter = new Vector2D(-x, -z).normalize();
        const spread = 0.6;
        toCenter.x += (Math.random() - 0.5) * spread;
        toCenter.z += (Math.random() - 0.5) * spread;
        toCenter.normalize();

        const speed = 4 + Math.random() * 6 + this.getDifficulty() * 0.8;
        const vel = toCenter.scale(speed);

        // Higher difficulty = more medium asteroids mixed in
        let size = 'large';
        const diff = this.getDifficulty();
        if (diff >= 3 && Math.random() < 0.3) size = 'medium';

        const asteroid = new Asteroid(pos, size, vel, null, scene);
        this.asteroids.push(asteroid);
        scene.add(asteroid.mesh);
    }

    update(dt) {
        this.elapsed += dt;

        // Spawn rate increases over time
        this.spawnInterval = Math.max(
            this.minSpawnInterval,
            2.0 - this.getDifficulty() * 0.15
        );

        // Spawn timer
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnOne(this.scene_ref);
            this.spawnTimer = this.spawnInterval;
        }

        // Update all asteroids
        for (const asteroid of this.asteroids) {
            asteroid.update(dt);
        }

        return false; // never signals wave complete
    }

    nextWave(scene) {
        // No-op in continuous mode
    }

    asteroidHit(scene, asteroidIndex) {
        if (asteroidIndex >= 0 && asteroidIndex < this.asteroids.length) {
            const asteroid = this.asteroids[asteroidIndex];

            // Boss asteroids have a hit() method. Regular asteroids don't.
            if (typeof asteroid.hit === 'function') {
                if (asteroid.health > 0) {
                    const dead = asteroid.hit();
                    if (!dead) {
                        // Boss still alive — small hit-stop so heavy chunks land
                        if (window.game && window.game.triggerHitStop) {
                            window.game.triggerHitStop(0.04);
                        }
                        return 0;
                    }
                    if (window.game && window.game.challengeManager) {
                        window.game.challengeManager.onBossDefeated();
                    }
                    if (typeof onBossDefeated === 'function') onBossDefeated();
                    // Boss defeated — bigger hit-stop for the kill beat,
                    // duck music so the explosion is the headline sound
                    if (window.game && window.game.triggerHitStop) {
                        window.game.triggerHitStop(0.14);
                    }
                    if (window.game && window.game.audio && window.game.audio.duckMusic) {
                        window.game.audio.duckMusic(0.08, 0.3, 1.2);
                    }
                }
                // health <= 0: fall through to destroy/split below
            }

            const children = asteroid.split();

            asteroid.destroy();
            this.asteroids.splice(asteroidIndex, 1);

            for (const child of children) {
                this.asteroids.push(child);
                scene.add(child.mesh);
            }

            this.destroyed += 1;
            return children.length;
        }
        return 0;
    }

    destroy() {
        for (const asteroid of this.asteroids) {
            asteroid.destroy();
        }
        this.asteroids = [];
    }
}
