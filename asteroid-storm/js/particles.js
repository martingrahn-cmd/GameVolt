// Particle system — pooled for zero allocation in hot path

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Shared geometry — one for all particles, scale per-instance
        this._particleGeo = new THREE.SphereGeometry(0.5, 4, 4);
        this._flashGeo = new THREE.SphereGeometry(1, 12, 12);

        // Particle pool
        this.poolSize = 600;
        this.pool = [];
        for (let i = 0; i < this.poolSize; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0
            });
            const mesh = new THREE.Mesh(this._particleGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);

            this.pool.push({
                mesh: mesh,
                material: mat,
                active: false,
                px: 0, pz: 0,    // position
                vx: 0, vz: 0,    // velocity
                life: 0,
                maxLife: 0,
                size: 1
            });
        }

        // Flash pool — pre-allocated lights to avoid shader recompile
        this.flashPoolSize = 20;
        this.flashPool = [];
        for (let i = 0; i < this.flashPoolSize; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0
            });
            const mesh = new THREE.Mesh(this._flashGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);

            const light = new THREE.PointLight(0xffffff, 0, 30);
            light.position.set(0, 3, 0);
            this.scene.add(light);

            this.flashPool.push({
                mesh: mesh,
                material: mat,
                light: light,
                active: false,
                life: 0,
                maxLife: 0.3,
                startIntensity: 0,
                baseRadius: 1
            });
        }

        // Debris pool — angular rocky shards that tumble and fade
        this._debrisGeo = new THREE.TetrahedronGeometry(1, 0);
        this.debrisPoolSize = 80;
        this.debrisPool = [];
        for (let i = 0; i < this.debrisPoolSize; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true,
                transparent: true,
                opacity: 1
            });
            const mesh = new THREE.Mesh(this._debrisGeo, mat);
            mesh.visible = false;
            mesh.castShadow = true;
            this.scene.add(mesh);

            this.debrisPool.push({
                mesh: mesh,
                material: mat,
                active: false,
                px: 0, py: 0, pz: 0,
                vx: 0, vy: 0, vz: 0,
                rx: 0, ry: 0, rz: 0,       // rotation speeds
                life: 0,
                maxLife: 0,
                size: 1
            });
        }

        // Scorch mark pool — procedural smoke-cloud decals on the ground
        this._scorchGeo = new THREE.PlaneGeometry(2, 2);
        this._scorchGeo.rotateX(-Math.PI / 2);
        this._scorchTextures = this._generateSmokeTextures(4);
        this.scorchPoolSize = 30;
        this.scorchPool = [];
        for (let i = 0; i < this.scorchPoolSize; i++) {
            const mat = new THREE.MeshBasicMaterial({
                map: this._scorchTextures[i % this._scorchTextures.length],
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(this._scorchGeo, mat);
            mesh.visible = false;
            mesh.position.y = 0.05;
            this.scene.add(mesh);
            this.scorchPool.push({
                mesh, material: mat,
                active: false,
                life: 0, maxLife: 0
            });
        }

        // Ship shard pool — angular metallic chunks for the player death
        // break-apart effect. Sized so they read as actual ship parts in
        // the viewport, not just dots.
        const shardGeos = [
            new THREE.TetrahedronGeometry(1.6, 0),
            new THREE.BoxGeometry(2.0, 1.2, 0.8),
            new THREE.BoxGeometry(1.2, 1.2, 2.0),
            new THREE.OctahedronGeometry(1.4, 0)
        ];
        this.shipShardPoolSize = 50;
        this.shipShardPool = [];
        for (let i = 0; i < this.shipShardPoolSize; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 1.5,    // glows brightly so shards read against the scene
                roughness: 0.5,
                metalness: 0.2,             // lower so they don't reflect dark
                transparent: true,
                opacity: 0,
                flatShading: true
            });
            const geo = shardGeos[i % shardGeos.length];
            const mesh = new THREE.Mesh(geo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.shipShardPool.push({
                mesh, material: mat,
                active: false,
                px: 0, py: 0, pz: 0,
                vx: 0, vy: 0, vz: 0,
                rx: 0, ry: 0, rz: 0,
                life: 0, maxLife: 0,
                size: 1
            });
        }

        // Warp streaks — short cyan line segments that streak past the
        // player at high thrust, creating a faux hyperspace tunnel effect.
        this.warpStreakPoolSize = 50;
        this.warpStreakPool = [];
        for (let i = 0; i < this.warpStreakPoolSize; i++) {
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(6);
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.LineBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const line = new THREE.Line(geo, mat);
            line.visible = false;
            this.scene.add(line);
            this.warpStreakPool.push({
                line, geometry: geo, material: mat,
                active: false,
                x1: 0, z1: 0, x2: 0, z2: 0,
                vx: 0, vz: 0,
                life: 0, maxLife: 0
            });
        }

        // Heat shimmer — sprite-based soft blobs that follow the player's
        // exhaust. Sprites always face the camera so they read round
        // regardless of zoom; bloom pass turns the bright core into haze.
        const heatCanvas = document.createElement('canvas');
        heatCanvas.width = 64; heatCanvas.height = 64;
        const hctx = heatCanvas.getContext('2d');
        const heatGrad = hctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        heatGrad.addColorStop(0,   'rgba(255,255,255,1.0)');
        heatGrad.addColorStop(0.35,'rgba(255,255,255,0.55)');
        heatGrad.addColorStop(1,   'rgba(255,255,255,0.0)');
        hctx.fillStyle = heatGrad;
        hctx.fillRect(0, 0, 64, 64);
        this._heatTex = new THREE.CanvasTexture(heatCanvas);
        this._heatTex.minFilter = THREE.LinearFilter;
        this.heatPoolSize = 32;
        this.heatPool = [];
        for (let i = 0; i < this.heatPoolSize; i++) {
            const mat = new THREE.SpriteMaterial({
                map: this._heatTex,
                color: 0xffaa44,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.scene.add(sprite);
            this.heatPool.push({
                sprite, material: mat,
                active: false,
                px: 0, pz: 0, vx: 0, vz: 0,
                life: 0, maxLife: 0, size: 1
            });
        }

        // Score floaters — sprite-based "+50 ×3" text that rises from kill spots
        this.scoreFloaterPoolSize = 16;
        this.scoreFloaterPool = [];
        for (let i = 0; i < this.scoreFloaterPoolSize; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 80;
            const tex = new THREE.CanvasTexture(canvas);
            tex.minFilter = THREE.LinearFilter;
            const mat = new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                opacity: 0,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NormalBlending
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(8, 2.5, 1);
            sprite.visible = false;
            sprite.renderOrder = 100;
            this.scene.add(sprite);
            this.scoreFloaterPool.push({
                sprite, material: mat, canvas, texture: tex,
                active: false, life: 0, maxLife: 0
            });
        }

        // Active counters (for stats display)
        this.particles = { length: 0 };
        this.flashes = { length: 0 };
        this.debris = { length: 0 };
    }

    // Generate several unique smoke-cloud textures via canvas so each
    // scorch mark looks different — irregular blobs with soft falloff.
    _generateSmokeTextures(count) {
        const textures = [];
        const size = 128;
        for (let n = 0; n < count; n++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Start with transparent
            ctx.clearRect(0, 0, size, size);

            // Layer several offset radial blobs for irregular cloud shape
            const blobs = 5 + Math.floor(Math.random() * 4);
            for (let i = 0; i < blobs; i++) {
                const cx = size / 2 + (Math.random() - 0.5) * size * 0.4;
                const cy = size / 2 + (Math.random() - 0.5) * size * 0.4;
                const r = size * (0.2 + Math.random() * 0.3);
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                const alpha = 0.15 + Math.random() * 0.15;
                grad.addColorStop(0, `rgba(20, 15, 10, ${alpha})`);
                grad.addColorStop(0.5, `rgba(15, 10, 8, ${alpha * 0.6})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, size, size);
            }

            // Soft outer fade to ensure clean edges
            const edgeGrad = ctx.createRadialGradient(size/2, size/2, size * 0.3, size/2, size/2, size * 0.5);
            edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
            edgeGrad.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.globalCompositeOperation = 'destination-in';
            const fadeGrad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.48);
            fadeGrad.addColorStop(0, 'rgba(255,255,255,1)');
            fadeGrad.addColorStop(0.7, 'rgba(255,255,255,0.8)');
            fadeGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = fadeGrad;
            ctx.fillRect(0, 0, size, size);
            ctx.globalCompositeOperation = 'source-over';

            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            textures.push(tex);
        }
        return textures;
    }

    acquireParticle() {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) return this.pool[i];
        }
        return null; // pool exhausted — drop the particle
    }

    acquireFlash() {
        for (let i = 0; i < this.flashPool.length; i++) {
            if (!this.flashPool[i].active) return this.flashPool[i];
        }
        return null;
    }

    spawnParticle(px, pz, vx, vz, life, color, size) {
        const p = this.acquireParticle();
        if (!p) return;
        p.active = true;
        p.px = px;
        p.pz = pz;
        p.vx = vx;
        p.vz = vz;
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.material.color.setHex(color);
        p.material.opacity = 1.0;
        p.mesh.position.set(px, 0.5, pz);
        p.mesh.scale.set(size, size, size);
        p.mesh.visible = true;
    }

    createExplosion(position, color, count = 20) {
        // Layer 1: bright fast sparks (white-hot core)
        const sparkCount = Math.floor(count * 0.3);
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 50;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const life = 0.2 + Math.random() * 0.3;
            const size = 0.4 + Math.random() * 0.6;
            this.spawnParticle(position.x, position.z, vx, vz, life, 0xffffcc, size);
        }

        // Layer 2: main color body — medium speed
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 35;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const life = 0.4 + Math.random() * 0.5;
            const size = 0.6 + Math.random() * 1.4;
            this.spawnParticle(position.x, position.z, vx, vz, life, color, size);
        }

        // Layer 3: slow dark debris (cooler color, lasts longer, drifts)
        const debrisCount = Math.floor(count * 0.5);
        const debrisColor = this._darkenColor(color, 0.5);
        for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 8 + Math.random() * 18;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const life = 0.8 + Math.random() * 0.7;
            const size = 0.3 + Math.random() * 0.7;
            this.spawnParticle(position.x, position.z, vx, vz, life, debrisColor, size);
        }

        // Layer 4: a few embers — small bright lingering points
        const emberCount = Math.floor(count * 0.2);
        for (let i = 0; i < emberCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 15 + Math.random() * 25;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const life = 1.0 + Math.random() * 0.6;
            const size = 0.25 + Math.random() * 0.35;
            this.spawnParticle(position.x, position.z, vx, vz, life, 0xffaa44, size);
        }

        this.createFlash(position, color, count);
    }

    _darkenColor(hex, factor) {
        const r = ((hex >> 16) & 0xff) * factor;
        const g = ((hex >> 8) & 0xff) * factor;
        const b = (hex & 0xff) * factor;
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    createFlash(position, color, count) {
        const f = this.acquireFlash();
        if (!f) return;
        const intensity = Math.min(2.0, 0.6 + count * 0.04);
        const radius = 1.5 + count * 0.1;
        f.active = true;
        f.life = f.maxLife;
        f.startIntensity = intensity * 3;
        f.baseRadius = radius;
        f.material.color.setHex(color);
        f.material.opacity = 1.0;
        f.mesh.position.set(position.x, 1, position.z);
        f.mesh.scale.set(radius, radius, radius);
        f.mesh.visible = true;
        f.light.color.setHex(color);
        f.light.position.set(position.x, 3, position.z);
        f.light.intensity = f.startIntensity;
    }

    acquireDebris() {
        for (let i = 0; i < this.debrisPool.length; i++) {
            if (!this.debrisPool[i].active) return this.debrisPool[i];
        }
        return null;
    }

    createDebris(position, count = 6, radius = 4) {
        // Rocky shard colors — mix of dark grey, brown, and blue-grey
        const colors = [0x554433, 0x665544, 0x443322, 0x335566, 0x444444, 0x3a3a4a];

        for (let i = 0; i < count; i++) {
            const d = this.acquireDebris();
            if (!d) break;

            const angle = Math.random() * Math.PI * 2;
            const speed = 8 + Math.random() * 20;
            const upSpeed = 5 + Math.random() * 15;

            d.active = true;
            d.px = position.x + (Math.random() - 0.5) * radius * 0.5;
            d.py = 0.5 + Math.random() * 2;
            d.pz = position.z + (Math.random() - 0.5) * radius * 0.5;
            d.vx = Math.cos(angle) * speed;
            d.vy = upSpeed;
            d.vz = Math.sin(angle) * speed;
            d.rx = (Math.random() - 0.5) * 8;
            d.ry = (Math.random() - 0.5) * 8;
            d.rz = (Math.random() - 0.5) * 8;
            d.life = 1.5 + Math.random() * 1.0;
            d.maxLife = d.life;
            d.size = 0.3 + Math.random() * 0.6;

            d.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
            d.material.opacity = 1.0;
            d.mesh.position.set(d.px, d.py, d.pz);
            d.mesh.scale.set(d.size, d.size, d.size);
            d.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            d.mesh.visible = true;
        }
    }

    // Bright white-cyan "crack" flash — fires the moment before an asteroid
    // splits so the impact reads as a punchy beat ahead of the explosion.
    createCrackFlash(position, radius, color = 0xddffff) {
        const f = this.acquireFlash();
        if (!f) return;
        f.active = true;
        f.life = 0.18;
        f.maxLife = 0.18;
        f.startIntensity = 3.4;
        f.baseRadius = radius * 1.2;
        f.material.color.setHex(color);
        f.material.opacity = 1.0;
        f.mesh.position.set(position.x, 1, position.z);
        f.mesh.scale.set(radius * 1.2, radius * 1.2, radius * 1.2);
        f.mesh.visible = true;
        f.light.color.setHex(color);
        f.light.position.set(position.x, 3, position.z);
        f.light.intensity = f.startIntensity;
    }

    // Floating "+50 ×3" text that rises from a kill point — combo riser.
    createScoreFloater(position, score, combo) {
        let f = null;
        for (const item of this.scoreFloaterPool) {
            if (!item.active) { f = item; break; }
        }
        if (!f) {
            // Recycle the one closest to expiring
            let minLife = Infinity;
            for (const item of this.scoreFloaterPool) {
                if (item.life < minLife) { minLife = item.life; f = item; }
            }
        }
        if (!f) return;

        const ctx = f.canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 80);
        const showCombo = combo && combo > 1;
        const text = showCombo ? `+${score} ×${combo}` : `+${score}`;
        // Color escalates with combo so high streaks pop visibly
        let color = '#88ddff';
        if (combo >= 10)      color = '#ff66ff';
        else if (combo >= 5)  color = '#ffcc44';
        else if (combo >= 3)  color = '#88ff88';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Black outline
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        for (const dx of [-2, 0, 2]) {
            for (const dy of [-2, 0, 2]) {
                if (dx === 0 && dy === 0) continue;
                ctx.fillText(text, 128 + dx, 40 + dy);
            }
        }
        ctx.fillStyle = color;
        ctx.fillText(text, 128, 40);
        f.texture.needsUpdate = true;

        f.active = true;
        f.life = 0.85;
        f.maxLife = 0.85;
        f.material.opacity = 1.0;
        // Slight horizontal jitter so simultaneous risers don't stack
        const jitter = (Math.random() - 0.5) * 3;
        f.sprite.position.set(position.x + jitter, 4, position.z);
        // Combo gets bigger text
        const baseScale = showCombo ? 9 + Math.min(3, combo * 0.2) : 7;
        f.sprite.scale.set(baseScale, baseScale * 0.32, 1);
    }

    // Death fireball — single big additive sphere that scales up fast,
    // creating an unmistakable "explosion ball" beat in the death sequence.
    createDeathFireball(position, color = 0xff8822, peakRadius = 22, duration = 0.8) {
        if (!this._fireballMesh) {
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this._fireballMesh = mesh;
            this._fireballMat = mat;
            this._fireballState = { active: false, life: 0, maxLife: 0, peak: 1 };
        }
        this._fireballMat.color.setHex(color);
        this._fireballMat.opacity = 0.9;
        this._fireballMesh.position.set(position.x, 1, position.z);
        this._fireballMesh.scale.set(1, 1, 1);
        this._fireballMesh.visible = true;
        this._fireballState.active = true;
        this._fireballState.life = duration;
        this._fireballState.maxLife = duration;
        this._fireballState.peak = peakRadius;
    }

    // Ship break-apart effect — angular shards in ship + engine colors fly
    // outward, tumble, bounce on the ground, and fade. Used for the player
    // death sequence to replace the old "sustained orange flash" look.
    createShipShatter(position, baseColor = 0x00ffff, accentColor = 0xff8800, count = 16) {
        for (let i = 0; i < count; i++) {
            let s = null;
            for (const item of this.shipShardPool) {
                if (!item.active) { s = item; break; }
            }
            if (!s) {
                let minLife = Infinity;
                for (const item of this.shipShardPool) {
                    if (item.life < minLife) { minLife = item.life; s = item; }
                }
            }
            if (!s) return;

            // Mostly ship-color, ~30% engine-glow accent for "molten chunks"
            const isAccent = Math.random() < 0.3;
            const col = isAccent ? accentColor : baseColor;
            s.material.color.setHex(col);
            s.material.emissive.setHex(col);
            // Boosted so shards glow against dark space and read as fast hot debris
            s.material.emissiveIntensity = isAccent ? 1.4 : 0.85;
            s.material.opacity = 1.0;

            // Radial spread in XZ only — top-down ortho camera makes Y
            // invisible. Speed kept moderate so shards stay in frame
            // long enough to read against the death-cam zoom.
            const angle = Math.random() * Math.PI * 2;
            const speedH = 18 + Math.random() * 25;
            s.vx = Math.cos(angle) * speedH;
            s.vy = 0;
            s.vz = Math.sin(angle) * speedH;
            s.rx = (Math.random() - 0.5) * 18;
            s.ry = (Math.random() - 0.5) * 18;
            s.rz = (Math.random() - 0.5) * 18;
            // Spawn slightly off-center along the velocity vector so shards
            // don't all start inside the explosion's orange core
            const seed = 1.5 + Math.random() * 2.0;
            s.px = position.x + Math.cos(angle) * seed;
            s.py = 1.2;
            s.pz = position.z + Math.sin(angle) * seed;
            const sz = 0.8 + Math.random() * 1.4;
            s.size = sz;
            s.life = 1.8 + Math.random() * 1.0;
            s.maxLife = s.life;
            s.active = true;
            s.mesh.position.set(s.px, s.py, s.pz);
            s.mesh.scale.set(sz, sz, sz);
            s.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            s.mesh.visible = true;
        }
    }

    // Small spark burst at impact points — used for non-kill UFO hits and
    // similar "you hit it but didn't break it" moments.
    createHitSparks(position, color = 0xffcc44, count = 7) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 18 + Math.random() * 22;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const life = 0.28 + Math.random() * 0.18;
            const size = 0.22 + Math.random() * 0.22;
            this.spawnParticle(position.x, position.z, vx, vz, life, color, size);
        }
    }

    // Inward-spiral particle burst — used for power-up pickup confirmation.
    // Particles spiral toward the target position from a circle around it.
    createPickupSpiral(position, color, count = 18) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const r = 4 + Math.random() * 2;
            const px = position.x + Math.cos(angle) * r;
            const pz = position.z + Math.sin(angle) * r;
            // Velocity tangential + slight inward — gives a curved spiral feel
            const inward = -2.5 - Math.random() * 1.0;
            const tangent = 6 + Math.random() * 3;
            const vx = Math.cos(angle) * inward + (-Math.sin(angle)) * tangent;
            const vz = Math.sin(angle) * inward +  Math.cos(angle) * tangent;
            const life = 0.5 + Math.random() * 0.25;
            const size = 0.35 + Math.random() * 0.25;
            this.spawnParticle(px, pz, vx, vz, life, color, size);
        }
    }

    // Expanding shockwave ring — pooled. Used by bombs and other big events.
    createShockwave(position, color = 0xffaa44, maxRadius = 60, duration = 0.7) {
        if (!this.shockwavePool) {
            this._initShockwavePool();
        }
        let s = null;
        for (let i = 0; i < this.shockwavePool.length; i++) {
            if (!this.shockwavePool[i].active) { s = this.shockwavePool[i]; break; }
        }
        if (!s) {
            let oldestLife = Infinity;
            for (const w of this.shockwavePool) {
                if (w.life < oldestLife) { oldestLife = w.life; s = w; }
            }
        }
        if (!s) return;
        s.active = true;
        s.life = duration;
        s.maxLife = duration;
        s.maxRadius = maxRadius;
        s.material.color.setHex(color);
        s.material.opacity = 0.95;
        s.mesh.position.set(position.x, 0.6, position.z);
        s.mesh.scale.set(0.5, 0.5, 0.5);
        s.mesh.visible = true;
    }

    _initShockwavePool() {
        const ringGeo = new THREE.RingGeometry(0.92, 1.0, 64);
        ringGeo.rotateX(-Math.PI / 2);
        this.shockwavePool = [];
        for (let i = 0; i < 4; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffaa44,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(ringGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.shockwavePool.push({
                mesh, material: mat,
                active: false, life: 0, maxLife: 0, maxRadius: 0
            });
        }
    }

    createScorch(position, radius) {
        // Find a free slot, or recycle the oldest (smallest life remaining)
        let s = null;
        let oldestLife = Infinity;
        for (let i = 0; i < this.scorchPool.length; i++) {
            if (!this.scorchPool[i].active) { s = this.scorchPool[i]; break; }
            if (this.scorchPool[i].life < oldestLife) {
                oldestLife = this.scorchPool[i].life;
                s = this.scorchPool[i];
            }
        }
        if (!s) return;
        const size = radius * (1.2 + Math.random() * 0.8);
        s.active = true;
        s.life = 6 + Math.random() * 4; // 6–10 seconds
        s.maxLife = s.life;
        s.mesh.position.set(position.x, 0.05, position.z);
        s.mesh.rotation.y = Math.random() * Math.PI * 2;
        s.mesh.scale.set(size, size, size);
        // Pick a random texture variant for variety
        s.material.map = this._scorchTextures[Math.floor(Math.random() * this._scorchTextures.length)];
        s.material.opacity = 1.0; // texture itself has soft alpha
        s.material.needsUpdate = true;
        s.mesh.visible = true;
    }

    createThrust(position, direction, color = 0xff6600) {
        const speed = 20 + Math.random() * 30;
        const perpX = -direction.z;
        const perpZ = direction.x;
        const vx = direction.x * speed + (Math.random() - 0.5) * 20 + perpX * (Math.random() - 0.5) * 10;
        const vz = direction.z * speed + (Math.random() - 0.5) * 20 + perpZ * (Math.random() - 0.5) * 10;
        const life = 0.3 + Math.random() * 0.2;
        const size = 0.3 + Math.random() * 0.5;
        this.spawnParticle(position.x, position.z, vx, vz, life, color, size);
    }

    // Warp streak — short line segment near the player that drifts past in
    // the opposite direction of motion, creating a "stars elongating" feel.
    createWarpStreak(position, velocity, speedRatio) {
        let s = null;
        for (const item of this.warpStreakPool) {
            if (!item.active) { s = item; break; }
        }
        if (!s) return;

        const speed = velocity.length();
        if (speed < 0.1) return;
        const dirX = velocity.x / speed;
        const dirZ = velocity.z / speed;

        const length = 4 + speedRatio * 10;
        // Ring around the player, biased toward the front and sides
        const baseAngle = Math.atan2(velocity.z, velocity.x);
        const orbitAngle = baseAngle + (Math.random() - 0.5) * Math.PI * 1.4;
        const distFromPlayer = 12 + Math.random() * 35;
        s.x1 = position.x + Math.cos(orbitAngle) * distFromPlayer;
        s.z1 = position.z + Math.sin(orbitAngle) * distFromPlayer;
        // Streak points OPPOSITE the velocity direction
        s.x2 = s.x1 - dirX * length;
        s.z2 = s.z1 - dirZ * length;
        // Drift past the ship (faster than ship so they sweep away)
        s.vx = -velocity.x * 1.3;
        s.vz = -velocity.z * 1.3;
        s.life = 0.35 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.active = true;

        const arr = s.geometry.getAttribute('position').array;
        arr[0] = s.x1; arr[1] = 1.2; arr[2] = s.z1;
        arr[3] = s.x2; arr[4] = 1.2; arr[5] = s.z2;
        s.geometry.getAttribute('position').needsUpdate = true;
        s.material.opacity = 0.85;
        s.line.visible = true;
    }

    // Engine heat shimmer — soft round sprite blobs (no diamond shapes!)
    // that bloom into a haze behind the ship.
    createHeatShimmer(position, direction) {
        let h = null;
        for (const item of this.heatPool) {
            if (!item.active) { h = item; break; }
        }
        if (!h) return;   // pool exhausted, skip silently

        const speed = 8 + Math.random() * 12;
        const perpX = -direction.z;
        const perpZ = direction.x;
        h.vx = direction.x * speed + perpX * (Math.random() - 0.5) * 14;
        h.vz = direction.z * speed + perpZ * (Math.random() - 0.5) * 14;
        h.px = position.x;
        h.pz = position.z;
        h.life = 0.4 + Math.random() * 0.25;
        h.maxLife = h.life;
        h.size = 1.6 + Math.random() * 1.3;

        const hot = Math.random();
        const color = hot > 0.7 ? 0xffeebb : (hot > 0.3 ? 0xffaa44 : 0xff6622);
        h.material.color.setHex(color);
        h.material.opacity = 0.85;
        h.sprite.scale.set(h.size, h.size, 1);
        h.sprite.position.set(h.px, 1, h.pz);
        h.sprite.visible = true;
        h.active = true;
    }

    update(dt) {
        let activeCount = 0;
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (!p.active) continue;
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                p.mesh.visible = false;
                continue;
            }
            p.px += p.vx * dt;
            p.pz += p.vz * dt;
            p.mesh.position.x = p.px;
            p.mesh.position.z = p.pz;
            p.material.opacity = Math.max(0, p.life / p.maxLife);
            activeCount++;
        }
        this.particles.length = activeCount;

        let activeFlashes = 0;
        for (let i = 0; i < this.flashPool.length; i++) {
            const f = this.flashPool[i];
            if (!f.active) continue;
            f.life -= dt;
            if (f.life <= 0) {
                f.active = false;
                f.mesh.visible = false;
                f.light.intensity = 0;
                continue;
            }
            const t = f.life / f.maxLife;
            f.material.opacity = t;
            const s = f.baseRadius * (1 + (1 - t) * 1.5);
            f.mesh.scale.set(s, s, s);
            f.light.intensity = f.startIntensity * t;
            activeFlashes++;
        }
        this.flashes.length = activeFlashes;

        // Update debris — tumbling shards with gravity
        let activeDebris = 0;
        for (let i = 0; i < this.debrisPool.length; i++) {
            const d = this.debrisPool[i];
            if (!d.active) continue;
            d.life -= dt;
            if (d.life <= 0) {
                d.active = false;
                d.mesh.visible = false;
                continue;
            }
            // Gravity pulls shards down
            d.vy -= 20 * dt;
            // Ground bounce at y=0.3
            if (d.py <= 0.3 && d.vy < 0) {
                d.vy *= -0.3; // lose energy on bounce
                d.vx *= 0.7;
                d.vz *= 0.7;
                d.py = 0.3;
            }
            d.px += d.vx * dt;
            d.py += d.vy * dt;
            d.pz += d.vz * dt;
            d.mesh.position.set(d.px, d.py, d.pz);
            // Tumble
            d.mesh.rotation.x += d.rx * dt;
            d.mesh.rotation.y += d.ry * dt;
            d.mesh.rotation.z += d.rz * dt;
            // Fade out in the last 40% of life
            const t = d.life / d.maxLife;
            d.material.opacity = t < 0.4 ? t / 0.4 : 1.0;
            activeDebris++;
        }
        this.debris.length = activeDebris;

        // Update scorch marks — just fade out over time
        for (let i = 0; i < this.scorchPool.length; i++) {
            const s = this.scorchPool[i];
            if (!s.active) continue;
            s.life -= dt;
            if (s.life <= 0) {
                s.active = false;
                s.mesh.visible = false;
                continue;
            }
            s.material.opacity = s.life / s.maxLife;
        }

        // Update death fireball — fast scale-up + opacity fade
        if (this._fireballState && this._fireballState.active) {
            const fb = this._fireballState;
            fb.life -= dt;
            if (fb.life <= 0) {
                fb.active = false;
                this._fireballMesh.visible = false;
            } else {
                const t = 1 - fb.life / fb.maxLife;     // 0 → 1
                const r = 1 + t * fb.peak;
                this._fireballMesh.scale.set(r, r, r);
                // Punchy initial brightness, fade through life
                this._fireballMat.opacity = (1 - t) * (1 - t) * 0.85;
            }
        }

        // Update ship shards — radial XZ drift + tumble + fade
        if (this.shipShardPool) {
            for (let i = 0; i < this.shipShardPool.length; i++) {
                const s = this.shipShardPool[i];
                if (!s.active) continue;
                s.life -= dt;
                if (s.life <= 0) {
                    s.active = false;
                    s.mesh.visible = false;
                    continue;
                }
                s.px += s.vx * dt;
                s.pz += s.vz * dt;
                // Light drag so shards keep spreading outward visibly
                s.vx *= Math.exp(-dt * 0.3);
                s.vz *= Math.exp(-dt * 0.3);
                s.mesh.position.set(s.px, s.py, s.pz);
                s.mesh.rotation.x += s.rx * dt;
                s.mesh.rotation.y += s.ry * dt;
                s.mesh.rotation.z += s.rz * dt;
                const t = s.life / s.maxLife;
                s.material.opacity = t < 0.35 ? t / 0.35 : 1.0;
            }
        }

        // Update warp streaks — drift past the player and fade
        if (this.warpStreakPool) {
            for (let i = 0; i < this.warpStreakPool.length; i++) {
                const s = this.warpStreakPool[i];
                if (!s.active) continue;
                s.life -= dt;
                if (s.life <= 0) {
                    s.active = false;
                    s.line.visible = false;
                    continue;
                }
                s.x1 += s.vx * dt;
                s.z1 += s.vz * dt;
                s.x2 += s.vx * dt;
                s.z2 += s.vz * dt;
                const arr = s.geometry.getAttribute('position').array;
                arr[0] = s.x1; arr[2] = s.z1;
                arr[3] = s.x2; arr[5] = s.z2;
                s.geometry.getAttribute('position').needsUpdate = true;
                s.material.opacity = (s.life / s.maxLife) * 0.85;
            }
        }

        // Update heat shimmer sprites — drift, fade, slight grow
        if (this.heatPool) {
            for (let i = 0; i < this.heatPool.length; i++) {
                const h = this.heatPool[i];
                if (!h.active) continue;
                h.life -= dt;
                if (h.life <= 0) {
                    h.active = false;
                    h.sprite.visible = false;
                    continue;
                }
                h.px += h.vx * dt;
                h.pz += h.vz * dt;
                h.sprite.position.x = h.px;
                h.sprite.position.z = h.pz;
                const t = h.life / h.maxLife;     // 1 → 0
                h.material.opacity = t * 0.85;
                const s = h.size * (1 + (1 - t) * 0.45);
                h.sprite.scale.set(s, s, 1);
            }
        }

        // Update score floaters — rise and fade
        if (this.scoreFloaterPool) {
            for (let i = 0; i < this.scoreFloaterPool.length; i++) {
                const f = this.scoreFloaterPool[i];
                if (!f.active) continue;
                f.life -= dt;
                if (f.life <= 0) {
                    f.active = false;
                    f.sprite.visible = false;
                    continue;
                }
                f.sprite.visible = true;
                f.sprite.position.y += 14 * dt;        // rise speed
                const t = f.life / f.maxLife;          // 1 → 0
                // Fade only in the last third — full opacity until then
                f.material.opacity = t < 0.35 ? t / 0.35 : 1.0;
            }
        }

        // Update shockwaves — expand outward + fade
        if (this.shockwavePool) {
            for (let i = 0; i < this.shockwavePool.length; i++) {
                const w = this.shockwavePool[i];
                if (!w.active) continue;
                w.life -= dt;
                if (w.life <= 0) {
                    w.active = false;
                    w.mesh.visible = false;
                    continue;
                }
                const t = 1 - w.life / w.maxLife;     // 0 → 1
                const radius = 0.5 + t * w.maxRadius;
                w.mesh.scale.set(radius, radius, radius);
                // Quick rise then linear fade
                w.material.opacity = (1 - t) * (1 - t) * 0.95;
            }
        }
    }

    clear() {
        for (const p of this.pool) {
            p.active = false;
            p.mesh.visible = false;
        }
        for (const f of this.flashPool) {
            f.active = false;
            f.mesh.visible = false;
            f.light.intensity = 0;
        }
        for (const d of this.debrisPool) {
            d.active = false;
            d.mesh.visible = false;
        }
        for (const s of this.scorchPool) {
            s.active = false;
            s.mesh.visible = false;
        }
        if (this.shockwavePool) {
            for (const w of this.shockwavePool) {
                w.active = false;
                w.mesh.visible = false;
            }
        }
        if (this.scoreFloaterPool) {
            for (const f of this.scoreFloaterPool) {
                f.active = false;
                f.sprite.visible = false;
                f.material.opacity = 0;
            }
        }
        if (this.heatPool) {
            for (const h of this.heatPool) {
                h.active = false;
                h.sprite.visible = false;
                h.material.opacity = 0;
            }
        }
        if (this.warpStreakPool) {
            for (const s of this.warpStreakPool) {
                s.active = false;
                s.line.visible = false;
                s.material.opacity = 0;
            }
        }
        if (this.shipShardPool) {
            for (const s of this.shipShardPool) {
                s.active = false;
                s.mesh.visible = false;
                s.material.opacity = 0;
            }
        }
        if (this._fireballState) {
            this._fireballState.active = false;
            if (this._fireballMesh) this._fireballMesh.visible = false;
            if (this._fireballMat) this._fireballMat.opacity = 0;
        }
        this.particles.length = 0;
        this.flashes.length = 0;
        this.debris.length = 0;
    }
}
