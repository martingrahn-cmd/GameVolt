// Boss asteroid — large multi-hit asteroid with staged splitting.
// Added to waves.asteroids[] so existing collision code works.
class BossAsteroid {
    constructor(scene, maxHealth = 30) {
        this.scene = scene;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.radius = 9;
        this.size = 'large'; // so score lookup works

        // Spawn from a random edge, drifting slowly toward center
        const b = BOUNDS;
        const side = Math.floor(Math.random() * 4);
        let x, z, vx, vz;
        switch (side) {
            case 0: x = b.minX; z = 0; vx = 3; vz = (Math.random() - 0.5) * 2; break;
            case 1: x = b.maxX; z = 0; vx = -3; vz = (Math.random() - 0.5) * 2; break;
            case 2: x = 0; z = b.minZ; vx = (Math.random() - 0.5) * 2; vz = 3; break;
            case 3: x = 0; z = b.maxZ; vx = (Math.random() - 0.5) * 2; vz = -3; break;
        }
        this.position = new Vector2D(x, z);
        this.velocity = new Vector2D(vx, vz);

        this.rotation = {
            x: Math.random() * 0.5,
            y: Math.random() * 0.8,
            z: Math.random() * 0.3
        };

        this.mesh = this.createMesh();
        this._flashTimer = 0;
        this._frenzyTriggered = false;
    }

    createMesh() {
        const group = new THREE.Group();
        const geo = new THREE.IcosahedronGeometry(this.radius, 3);

        // Distort vertices for rocky look
        const pos = geo.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const len = Math.sqrt(x*x + y*y + z*z);
            const nx = x/len, ny = y/len, nz = z/len;
            const noise = Math.sin(nx*5 + ny*3) * Math.cos(nz*4 + nx*2) * this.radius * 0.15;
            pos.setXYZ(i, x + nx*noise, y + ny*noise, z + nz*noise);
        }
        geo.computeVertexNormals();

        // Dark red/brown body
        const mat = new THREE.MeshStandardMaterial({
            color: 0x662222,
            emissive: 0x331111,
            emissiveIntensity: 0.4,
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true
        });
        const body = new THREE.Mesh(geo, mat);
        body.castShadow = true;
        group.add(body);
        this._bodyMat = mat;

        // Glowing edge wireframe
        const edgeGeo = new THREE.EdgesGeometry(geo, 12);
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.4
        });
        group.add(new THREE.LineSegments(edgeGeo, edgeMat));
        this._edgeMat = edgeMat;

        // Outer glow
        const glowGeo = geo.clone();
        const glowPos = glowGeo.getAttribute('position');
        for (let i = 0; i < glowPos.count; i++) {
            glowPos.setXYZ(i,
                pos.getX(i) * 1.05,
                pos.getY(i) * 1.05,
                pos.getZ(i) * 1.05
            );
        }
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));
        this._glowMat = glowMat;

        group.position.set(this.position.x, 1, this.position.z);
        return group;
    }

    update(dt) {
        // Movement
        this.position.add(this.velocity.clone().scale(dt));
        updateWrapAround(this);
        this.mesh.position.set(this.position.x, 1, this.position.z);

        const healthPct = this.health / this.maxHealth;
        const damage = 1 - healthPct;          // 0 → 1 as boss takes hits
        const inFrenzy = damage > 0.75;

        // Rotation — spins ~2× faster once frenzy kicks in
        const spinMult = inFrenzy ? 2.2 : 1.0;
        this.mesh.rotation.x += this.rotation.x * dt * spinMult;
        this.mesh.rotation.y += this.rotation.y * dt * spinMult;
        this.mesh.rotation.z += this.rotation.z * dt * spinMult;

        // Pulsing glow shell — opacity + hue shift hotter as HP drops
        const pulseSpeed = 2 + damage * 6;
        const pulse = 0.06 + Math.sin(Date.now() * 0.001 * pulseSpeed) * 0.04;
        if (this._glowMat) {
            this._glowMat.opacity = pulse * (0.7 + damage * 1.3);
            this._glowMat.color.setRGB(1.0, 0.13 + damage * 0.45, damage * 0.2);
        }

        // Edge wireframe — brighter + warmer (orange → yellow) with damage
        if (this._edgeMat) {
            this._edgeMat.opacity = 0.3 + damage * 0.55;
            this._edgeMat.color.setRGB(1.0, 0.27 + damage * 0.55, damage * 0.35);
        }

        // Body emissive damage state — molten cracks read brighter as HP drops.
        // Skipped while a hit-flash is playing so the flash still pops cleanly.
        if (this._bodyMat && this._flashTimer <= 0) {
            let hex, intensity;
            if (inFrenzy) {
                // Frenzy mode — angry rapid pulse with hot orange emissive
                const fp = 0.5 + Math.sin(Date.now() * 0.013) * 0.5;
                hex = 0xff5511;
                intensity = 1.4 + fp * 1.4;
            } else if (damage > 0.5) {
                hex = 0x882511;
                intensity = 0.8 + damage * 1.0;
            } else {
                hex = 0x441511;
                intensity = 0.4 + damage * 0.7;
            }
            this._bodyMat.emissive.setHex(hex);
            this._bodyMat.emissiveIntensity = intensity;
        }

        // Hit flash overrides everything for ~150ms after each shot
        if (this._flashTimer > 0) {
            this._flashTimer -= dt;
            if (this._bodyMat) {
                if (this._flashTimer > 0) {
                    this._bodyMat.emissive.setHex(0xff8822);
                    this._bodyMat.emissiveIntensity = 2.5;
                }
                // When flash expires, the damage-state branch above takes over next frame
            }
        }

        // Frenzy entry beat — fires once when boss crosses below 25% HP
        if (inFrenzy && !this._frenzyTriggered) {
            this._frenzyTriggered = true;
            this._enterFrenzy();
        }
    }

    _enterFrenzy() {
        const game = window.game;
        if (!game) return;
        // Burst shed of 4 mediums + heavy beat
        this._shedAsteroids(game, 4, 'medium');
        if (game.particles) {
            game.particles.createShockwave(this.position.clone(), 0xff4400, 32, 0.8);
            game.particles.createExplosion(this.position.clone(), 0xff8822, 30);
        }
        if (game.addScreenShake) game.addScreenShake(1.1, 4);
        if (game.audio) {
            if (game.audio.playUFOExplosion) game.audio.playUFOExplosion();
            if (game.audio.duckMusic) game.audio.duckMusic(0.10, 0.3, 0.9);
        }
        if (game.triggerHitStop) game.triggerHitStop(0.10);
    }

    // Called when projectile hits — returns true if boss destroyed
    hit() {
        this.health--;
        this._flashTimer = 0.15;

        // Speed up as health drops
        const speedMult = 1 + (1 - this.health / this.maxHealth) * 1.5;
        const baseSpeed = this.velocity.length() || 3;
        if (baseSpeed > 0) {
            const norm = this.velocity.clone().scale(1 / baseSpeed);
            this.velocity = norm.scale(3 * speedMult);
        }

        // Staged splitting
        const game = window.game;
        if (game && game.waves) {
            // At 2/3 HP: shed 2 medium asteroids
            if (this.health === Math.floor(this.maxHealth * 2/3)) {
                this._shedAsteroids(game, 2, 'medium');
                this.radius *= 0.9;
            }
            // At 1/3 HP: shed 3 medium asteroids
            if (this.health === Math.floor(this.maxHealth * 1/3)) {
                this._shedAsteroids(game, 3, 'medium');
                this.radius *= 0.9;
            }
        }

        return this.health <= 0;
    }

    _shedAsteroids(game, count, size) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 8 + Math.random() * 6;
            const vel = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const pos = new Vector2D(
                this.position.x + Math.cos(angle) * this.radius,
                this.position.z + Math.sin(angle) * this.radius
            );
            const ast = new Asteroid(pos, size, vel, null, game.scene);
            game.waves.asteroids.push(ast);
            game.scene.add(ast.mesh);
        }
        // Screen shake + particles
        if (game.particles) {
            game.particles.createExplosion(this.position.clone(), 0xff4400, 20);
        }
        if (game.addScreenShake) game.addScreenShake(0.8, 3);
    }

    // Compatibility with Asteroid interface
    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    split() {
        // Boss doesn't use normal split — handled by hit()
        // Return medium asteroids as "children" for the final explosion
        const children = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const speed = 6 + Math.random() * 8;
            const vel = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const pos = this.position.clone();
            const child = new Asteroid(pos, 'medium', vel, null, this.scene);
            children.push(child);
        }
        return children;
    }
}
