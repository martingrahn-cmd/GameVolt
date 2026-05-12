// Shared radial gradient texture for powerup glow sprites
const _powerupGlowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
})();

// Power-up types and their properties
const POWERUP_TYPES = {
    spreadshot: {
        color: 0xff6600,
        label: 'SPREAD',
        duration: 10,
        dropWeight: 3
    },
    homing: {
        color: 0xff00ff,
        label: 'HOMING',
        duration: 8,
        dropWeight: 2
    },
    shield: {
        color: 0x00ff00,
        label: 'SHIELD',
        duration: 0, // one-time use
        dropWeight: 3
    },
    extralife: {
        color: 0xff4444,
        label: '+1 LIFE',
        duration: 0,
        dropWeight: 0  // not in normal drop pool — only from hostile UFOs
    },
    bomb: {
        color: 0xffff00,
        label: 'BOMB',
        duration: 0,
        dropWeight: 2
    },
    railgun: {
        color: 0xff2200,
        label: 'RAILGUN',
        duration: 8,
        dropWeight: 1  // rare in normal pool
    }
};

class PowerUp {
    constructor(position, type, scene) {
        this.position = position.clone();
        this.type = type;
        this.config = POWERUP_TYPES[type];
        this.scene = scene;
        this.radius = 2;
        this.age = 0;
        this.lifetime = 10; // disappears after 10 seconds
        this.mesh = this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();
        const color = this.config.color;
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        const wireMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.6 });

        const symbol = new THREE.Group();

        if (this.type === 'spreadshot') {
            // Three lines in a fan pattern
            const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
            const angles = [-0.4, 0, 0.4];
            for (const a of angles) {
                const points = [
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(Math.sin(a) * 1.8, Math.cos(a) * 1.8, 0)
                ];
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                symbol.add(new THREE.Line(lineGeo, lineMat));
                // Dot at end
                const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), mat);
                dot.position.set(Math.sin(a) * 1.8, Math.cos(a) * 1.8, 0);
                symbol.add(dot);
            }
        } else if (this.type === 'homing') {
            // Arrow/chevron pointing up
            const shape = new THREE.Shape();
            shape.moveTo(0, 1.5);
            shape.lineTo(-1.2, -0.8);
            shape.lineTo(-0.4, -0.3);
            shape.lineTo(0, -0.8);
            shape.lineTo(0.4, -0.3);
            shape.lineTo(1.2, -0.8);
            shape.closePath();
            const geo = new THREE.ShapeGeometry(shape);
            symbol.add(new THREE.Mesh(geo, mat));
        } else if (this.type === 'shield') {
            // Sphere/bubble outline
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), wireMat);
            symbol.add(sphere);
            // Inner solid core
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 8, 8),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
            );
            symbol.add(core);
        } else if (this.type === 'extralife') {
            // Heart shape — reads instantly as "extra life"
            const heartShape = new THREE.Shape();
            const s = 0.28;
            heartShape.moveTo(0, -2 * s);
            heartShape.bezierCurveTo(0, -1.2 * s, -3.5 * s, -1.2 * s, -3.5 * s, 1.2 * s);
            heartShape.bezierCurveTo(-3.5 * s, 3.6 * s, 0, 4.8 * s, 0, 6.4 * s);
            heartShape.bezierCurveTo(0, 4.8 * s, 3.5 * s, 3.6 * s, 3.5 * s, 1.2 * s);
            heartShape.bezierCurveTo(3.5 * s, -1.2 * s, 0, -1.2 * s, 0, -2 * s);
            const heartGeo = new THREE.ShapeGeometry(heartShape);
            // Center the heart vertically
            heartGeo.translate(0, -0.3, 0);
            const heartMesh = new THREE.Mesh(heartGeo, mat);
            symbol.add(heartMesh);
            // White-hot inner core for extra punch
            const coreShape = heartShape.clone();
            const coreGeo = new THREE.ShapeGeometry(coreShape);
            coreGeo.translate(0, -0.3, 0);
            coreGeo.scale(0.6, 0.6, 1);
            const coreMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0.9
            });
            symbol.add(new THREE.Mesh(coreGeo, coreMat));
        } else if (this.type === 'bomb') {
            // Star burst shape
            const starShape = new THREE.Shape();
            const spikes = 6;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? 1.5 : 0.7;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) starShape.moveTo(x, y);
                else starShape.lineTo(x, y);
            }
            starShape.closePath();
            symbol.add(new THREE.Mesh(new THREE.ShapeGeometry(starShape), mat));
        } else if (this.type === 'railgun') {
            // Long horizontal bar — piercing beam
            const barGeo = new THREE.BoxGeometry(3, 0.4, 0.3);
            symbol.add(new THREE.Mesh(barGeo, mat));
            // Arrowhead at tip
            const tipGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
            const tip = new THREE.Mesh(tipGeo, mat);
            tip.rotation.z = -Math.PI / 2;
            tip.position.x = 1.9;
            symbol.add(tip);
        }

        // Lay symbol flat on XZ plane
        symbol.rotation.x = -Math.PI / 2;
        group.add(symbol);

        // Outer glow ring — additive so it pops against dark backgrounds
        const ringGeo = new THREE.RingGeometry(1.8, 2.2, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        // Soft glow sprite underneath — visible from far away
        const isRare = this.type === 'extralife';
        const glowSize = isRare ? 10 : 7;
        const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: _powerupGlowTex,
            color,
            transparent: true,
            opacity: isRare ? 0.35 : 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        glowSprite.scale.set(glowSize, glowSize, 1);
        glowSprite.position.y = 0.5;
        group.add(glowSprite);
        this._glowSprite = glowSprite;

        // Second outer ring for extra-life — bigger, warmer, counter-rotating
        if (isRare) {
            this.radius = 2.8;
            const haloGeo = new THREE.RingGeometry(2.8, 3.5, 24);
            const haloMat = new THREE.MeshBasicMaterial({
                color: 0xff8888,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.rotation.x = -Math.PI / 2;
            group.add(halo);
            this._extraLifeHalo = halo;
        }

        group.position.set(this.position.x, 1.5, this.position.z);
        return group;
    }

    update(dt, players) {
        this.age += dt;

        // Find closest player for proximity-based effects + magnetic pull
        let closestDist = Infinity;
        let closestPlayer = null;
        if (players) {
            for (const p of players) {
                if (!p || p.isGhost) continue;
                const d = this.position.distance(p.position);
                if (d < closestDist) { closestDist = d; closestPlayer = p; }
            }
        }
        const magnetRadius = 14;
        const proximity = Math.max(0, 1 - closestDist / magnetRadius);

        // Magnetic pull — once player is close enough, drift toward them
        if (closestPlayer && closestDist < magnetRadius && closestDist > 0.1) {
            const pullSpeed = 6 + proximity * 28;
            const dx = closestPlayer.position.x - this.position.x;
            const dz = closestPlayer.position.z - this.position.z;
            const inv = 1 / closestDist;
            this.position.x += dx * inv * pullSpeed * dt;
            this.position.z += dz * inv * pullSpeed * dt;
        }

        // Symbol spins — faster when player is close
        const symbol = this.mesh.children[0];
        symbol.rotation.z += (2 + proximity * 4) * dt;

        // Symbol scale-breathe — pulses bigger/smaller for energy feel
        const isRare = this.type === 'extralife';
        const breathe = 1 + Math.sin(this.age * (isRare ? 5 : 3.5)) * (isRare ? 0.18 : 0.1);
        symbol.scale.set(breathe, breathe, breathe);

        // Bob — keep group centered on its world position
        this.mesh.position.set(
            this.position.x,
            1.5 + Math.sin(this.age * 3) * 0.5,
            this.position.z
        );

        // Ring pulse — proximity makes it brighter and tighter
        const ring = this.mesh.children[1];
        const pulse = 0.4 + Math.sin(this.age * 4) * 0.3 + proximity * 0.5;
        ring.material.opacity = Math.min(1, pulse);
        const ringScale = 1 + Math.sin(this.age * 3) * 0.06 - proximity * 0.15;
        ring.scale.set(ringScale, ringScale, ringScale);

        // Glow sprite breathe — visible from far away
        if (this._glowSprite) {
            const baseGlow = isRare ? 0.35 : 0.2;
            const glowPulse = baseGlow + Math.sin(this.age * 3) * (isRare ? 0.15 : 0.08) + proximity * 0.2;
            this._glowSprite.material.opacity = Math.min(0.7, glowPulse);
            const baseSize = isRare ? 10 : 7;
            const glowScale = baseSize * (1 + Math.sin(this.age * 2) * 0.12);
            this._glowSprite.scale.set(glowScale, glowScale, 1);
        }

        // Rising energy particles — spawn small upward-drifting specks
        if (window.game && window.game.particles && Math.random() < (isRare ? 0.4 : 0.18)) {
            const px = this.position.x + (Math.random() - 0.5) * 3;
            const pz = this.position.z + (Math.random() - 0.5) * 3;
            const color = this.config.color;
            window.game.particles.spawnParticle(
                px, pz,
                (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3,
                0.6 + Math.random() * 0.4,
                color,
                0.2 + Math.random() * 0.3
            );
        }

        // Extra-life halo: counter-rotate + breathe wider than main ring
        if (this._extraLifeHalo) {
            this._extraLifeHalo.rotation.z -= 1.5 * dt;
            const haloPulse = 0.35 + Math.sin(this.age * 3) * 0.25 + proximity * 0.4;
            this._extraLifeHalo.material.opacity = Math.min(0.85, haloPulse);
            const haloScale = 1 + Math.sin(this.age * 2.5) * 0.1;
            this._extraLifeHalo.scale.set(haloScale, haloScale, haloScale);
        }

        // Blink when about to expire
        if (this.age > this.lifetime - 3) {
            const blink = Math.sin(this.age * 10) > 0;
            this.mesh.visible = blink;
        }
    }

    isAlive() {
        return this.age < this.lifetime;
    }

    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}

class PowerUpManager {
    constructor(scene) {
        this.scene = scene;
        this.powerups = [];
        this.dropChance = 0.20; // 20% chance per asteroid destroyed
    }

    trySpawn(position) {
        if (Math.random() > this.dropChance) return;
        this.trySpawnAt(position);
    }

    trySpawnAt(position) {
        const type = this.weightedRandom();
        this.spawnSpecific(position, type);
    }

    spawnSpecific(position, type) {
        const powerup = new PowerUp(position, type, this.scene);
        this.scene.add(powerup.mesh);
        this.powerups.push(powerup);
    }

    weightedRandom() {
        const types = Object.keys(POWERUP_TYPES);
        const totalWeight = types.reduce((sum, t) => sum + POWERUP_TYPES[t].dropWeight, 0);
        let roll = Math.random() * totalWeight;

        for (const type of types) {
            roll -= POWERUP_TYPES[type].dropWeight;
            if (roll <= 0) return type;
        }
        return types[0];
    }

    update(dt, players) {
        this.powerups = this.powerups.filter(p => {
            p.update(dt, players);
            if (!p.isAlive()) {
                p.destroy();
                return false;
            }
            return true;
        });
    }

    checkCollision(playerPos, playerRadius) {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            if (checkCollision(playerPos, playerRadius, p.position, p.radius)) {
                const type = p.type;
                p.destroy();
                this.powerups.splice(i, 1);
                return type;
            }
        }
        return null;
    }

    clear() {
        this.powerups.forEach(p => p.destroy());
        this.powerups = [];
    }
}
