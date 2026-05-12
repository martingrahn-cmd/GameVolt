// UFO types
// Supply Drone: flies through, drops power-up when destroyed (pink/glowing)
// Hostile UFO: shoots at player, dangerous (red/orange)

class SupplyDrone {
    constructor(scene) {
        this.scene = scene;
        this.radius = 3.75;
        this.alive = true;

        // Spawn from random edge, fly across
        const side = Math.floor(Math.random() * 4);
        const b = BOUNDS;
        let x, z, vx, vz;

        switch (side) {
            case 0: x = b.minX - 5; z = (Math.random() - 0.5) * 150; vx = 12 + Math.random() * 8; vz = (Math.random() - 0.5) * 6; break;
            case 1: x = b.maxX + 5; z = (Math.random() - 0.5) * 150; vx = -(12 + Math.random() * 8); vz = (Math.random() - 0.5) * 6; break;
            case 2: x = (Math.random() - 0.5) * 150; z = b.minZ - 5; vx = (Math.random() - 0.5) * 6; vz = 12 + Math.random() * 8; break;
            case 3: x = (Math.random() - 0.5) * 150; z = b.maxZ + 5; vx = (Math.random() - 0.5) * 6; vz = -(12 + Math.random() * 8); break;
        }

        this.position = new Vector2D(x, z);
        this.velocity = new Vector2D(vx, vz);
        this.age = 0;
        this.mesh = this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Main body — flattened sphere (saucer shape)
        const bodyGeo = new THREE.SphereGeometry(3.4, 12, 8);
        bodyGeo.scale(1, 0.4, 1);
        const bodyMat = new THREE.MeshBasicMaterial({
            color: 0xaa2266,
            transparent: true,
            opacity: 0.55
        });
        group.add(new THREE.Mesh(bodyGeo, bodyMat));

        // Dome on top
        const domeGeo = new THREE.SphereGeometry(1.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshBasicMaterial({
            color: 0xcc5599,
            transparent: true,
            opacity: 0.35
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.3;
        group.add(dome);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(3.75, 4.4, 20);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xaa2266,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        // Wireframe edge
        const wireGeo = new THREE.EdgesGeometry(bodyGeo, 15);
        const wireMat = new THREE.LineBasicMaterial({
            color: 0xcc4499,
            transparent: true,
            opacity: 0.3
        });
        group.add(new THREE.LineSegments(wireGeo, wireMat));

        group.position.set(this.position.x, 2, this.position.z);
        return group;
    }

    update(dt) {
        this.age += dt;
        this.position.add(this.velocity.clone().scale(dt));

        // Bob and rotate
        this.mesh.position.set(this.position.x, 2 + Math.sin(this.age * 3) * 0.5, this.position.z);
        this.mesh.rotation.y += 1.5 * dt;

        // Pulse glow ring
        const ring = this.mesh.children[2];
        if (ring) ring.material.opacity = 0.2 + Math.sin(this.age * 5) * 0.15;

        // Out of bounds? (not wrapping — flies off screen)
        const margin = 20;
        const b = BOUNDS;
        if (this.position.x < b.minX - margin || this.position.x > b.maxX + margin ||
            this.position.z < b.minZ - margin || this.position.z > b.maxZ + margin) {
            this.alive = false;
        }
    }

    isAlive() { return this.alive; }

    destroy() {
        this.alive = false;
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}

class HostileUFO {
    constructor(scene, playerRef) {
        this.scene = scene;
        this.playerRef = playerRef;
        this.radius = 2.75;     // 25% bigger than before (was 2.2)
        this.alive = true;
        this.health = 3;
        this.shootCooldown = 0;
        this.shootRate = 3.0; // seconds between shots
        this.projectiles = [];

        // Spawn from random edge
        const side = Math.floor(Math.random() * 4);
        const b = BOUNDS;
        let x, z;

        switch (side) {
            case 0: x = b.minX - 5; z = (Math.random() - 0.5) * 150; break;
            case 1: x = b.maxX + 5; z = (Math.random() - 0.5) * 150; break;
            case 2: x = (Math.random() - 0.5) * 150; z = b.minZ - 5; break;
            case 3: x = (Math.random() - 0.5) * 150; z = b.maxZ + 5; break;
        }

        this.position = new Vector2D(x, z);
        this.velocity = new Vector2D(0, 0);
        this.age = 0;
        this.warpDuration = 1.2;          // visual warp-in lasts 1.2s
        this.mesh = this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Faint placeholder so the UFO isn't invisible while the GLB loads.
        // Replaced once `_loadModel` finishes.
        const phMat = new THREE.MeshBasicMaterial({
            color: 0xff4422, transparent: true, opacity: 0.35
        });
        const phGeo = new THREE.SphereGeometry(2, 8, 6);
        phGeo.scale(1, 0.4, 1);
        const placeholder = new THREE.Mesh(phGeo, phMat);
        group.add(placeholder);
        this._placeholder = placeholder;

        // Warp-in beam — vertical hyperspace tunnel that collapses on arrival
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xff4422,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.2, 35, 8, 1, true),
            beamMat
        );
        beam.position.y = 18;
        group.add(beam);
        this._warpBeam = beam;

        // Ground ring that expands when warp completes
        const groundRingMat = new THREE.MeshBasicMaterial({
            color: 0xff5522,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const groundRing = new THREE.Mesh(
            new THREE.RingGeometry(0.9, 1.0, 32),
            groundRingMat
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = -1.5;
        group.add(groundRing);
        this._warpRing = groundRing;

        // GLB model loads asynchronously and replaces the placeholder
        this._matRefs = [];
        this._loadModel(group);

        group.position.set(this.position.x, 2, this.position.z);
        return group;
    }

    _loadModel(group) {
        if (!THREE.GLTFLoader) return;
        const loader = new THREE.GLTFLoader();
        if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load('assets/ufo/flying_saucer.glb', (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            // Visual size — 25% bigger than the old procedural saucer
            const targetSize = 6.0;
            const scale = targetSize / maxDim;
            model.scale.set(scale, scale, scale);
            model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

            // Keep the model's authored colors (windows, lights) intact.
            // Only flag transparent so the warp fade can ramp opacity, and
            // collect material refs so takeDamage() can flash all of them.
            model.traverse(child => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const m of mats) {
                        m.transparent = true;
                        if (m.opacity == null || m.opacity === 0) m.opacity = 1.0;
                        m.needsUpdate = true;
                        this._matRefs.push(m);
                    }
                }
            });

            // Red glow halo around the model so the UFO reads as a threat
            // without erasing its surface detail. Sits just outside the
            // model's bounding sphere, additive blended.
            const haloRadius = (targetSize / 2) * 1.18;
            const haloGeo = new THREE.SphereGeometry(haloRadius, 16, 12);
            const haloMat = new THREE.MeshBasicMaterial({
                color: 0xff4422,
                transparent: true,
                opacity: 0.18,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            model.add(halo);
            this._hostileHalo = halo;

            // Swap out the placeholder
            if (this._placeholder) {
                group.remove(this._placeholder);
                this._placeholder.geometry.dispose();
                this._placeholder.material.dispose();
                this._placeholder = null;
            }
            group.add(model);
            this._loadedModel = model;
        }, undefined, (err) => {
            console.warn('Failed to load UFO model:', err);
        });
    }

    update(dt) {
        this.age += dt;

        // Death animation — spin + descend + smoke trail, then big crash boom
        if (this._dying) {
            this._dyingTimer -= dt;
            const t = 1 - Math.max(0, this._dyingTimer / this._dyingTotal);
            // Spin out + tilt
            this.mesh.rotation.y += this._dyingSpin * dt;
            this.mesh.rotation.z += this._dyingTilt * dt;
            // Lose altitude
            this._dyingDescent += 14 * dt;
            // Slight horizontal wobble for crash drama
            const wobbleX = Math.sin(this.age * 30) * 0.6 * t;
            this.mesh.position.set(
                this.position.x + wobbleX,
                2 - this._dyingDescent,
                this.position.z
            );
            // Halo cranks brighter as it spirals
            if (this._hostileHalo) {
                this._hostileHalo.material.opacity = 0.18 + t * 0.65;
            }
            // Smoke + sparks trail
            if (window.game && window.game.particles && Math.random() < 0.7) {
                window.game.particles.createThrust(
                    new Vector2D(
                        this.position.x + (Math.random() - 0.5) * 2.5,
                        this.position.z + (Math.random() - 0.5) * 2.5
                    ),
                    new Vector2D(0, 0.4),
                    Math.random() < 0.4 ? 0xffaa44 : 0xff4422
                );
            }
            // Crash beat
            if (this._dyingTimer <= 0 && !this._dyingExploded) {
                this._dyingExploded = true;
                if (window.game && window.game.particles) {
                    window.game.particles.createExplosion(this.position.clone(), 0xff4400, 30);
                    window.game.particles.createExplosion(this.position.clone(), 0xffaa44, 18);
                    window.game.particles.createDebris(this.position.clone(), 10, 3);
                    window.game.particles.createScorch(this.position.clone(), 5);
                }
                if (window.game && window.game.audio) {
                    window.game.audio.playUFOExplosion();
                    if (window.game.audio.duckMusic) window.game.audio.duckMusic(0.18, 0.2, 0.5);
                }
                if (window.game && window.game.addScreenShake) window.game.addScreenShake(0.8, 3);
                if (window.game && window.game.triggerHitStop) window.game.triggerHitStop(0.07);
                this.alive = false;
            }
            return;
        }

        // Warp-in animation — scale + fade in, beam collapses, ground ring
        // pulses outward when arrival completes. UFO is frozen and harmless
        // during this window so the player has a clear "here it comes" tell.
        const warping = this.age < this.warpDuration;
        const warpT = Math.min(1, this.age / this.warpDuration);
        if (this._matRefs) {
            for (const m of this._matRefs) {
                if (!m) continue;
                if (m._origOpacity === undefined) m._origOpacity = m.opacity;
                m.opacity = m._origOpacity * warpT;
            }
        }
        if (warping) {
            const scl = 0.15 + warpT * 0.85;
            this.mesh.scale.set(scl, scl, scl);
            if (this._warpBeam) {
                this._warpBeam.material.opacity = (1 - warpT) * 0.95;
                this._warpBeam.scale.set(1 + warpT * 0.6, 1, 1 + warpT * 0.6);
            }
            if (this._warpRing) {
                // Ring expands during the second half of the warp
                const rT = Math.max(0, (warpT - 0.5) * 2);
                this._warpRing.scale.set(2 + rT * 6, 1, 2 + rT * 6);
                this._warpRing.material.opacity = (1 - rT) * 0.85;
            }
            // Hold position, no shooting yet
            this.mesh.position.set(this.position.x, 2, this.position.z);
            this.mesh.rotation.y += 6 * dt;   // fast spin during warp
            return;
        }
        // Warp finished — keep beam + ring hidden
        if (this._warpBeam && this._warpBeam.material.opacity > 0) {
            this._warpBeam.material.opacity = 0;
            this._warpBeam.visible = false;
        }
        if (this._warpRing && this._warpRing.material.opacity > 0) {
            this._warpRing.material.opacity = 0;
            this._warpRing.visible = false;
        }
        if (this.mesh.scale.x !== 1) this.mesh.scale.set(1, 1, 1);

        // Move towards player with some weaving
        if (this.playerRef) {
            const toPlayer = new Vector2D(
                this.playerRef.position.x - this.position.x,
                this.playerRef.position.z - this.position.z
            );
            const dist = toPlayer.length();

            if (dist > 1) {
                toPlayer.normalize();
                // Weave perpendicular to direction
                const weave = Math.sin(this.age * 2) * 8;
                const perpX = -toPlayer.z;
                const perpZ = toPlayer.x;

                // Keep distance (~45 units) — more passive
                let approach = dist > 50 ? 1 : dist < 35 ? -0.5 : 0;
                const speed = 10;

                this.velocity.x = (toPlayer.x * approach + perpX * Math.sin(this.age * 1.5)) * speed;
                this.velocity.z = (toPlayer.z * approach + perpZ * Math.sin(this.age * 1.5)) * speed;
            }
        }

        this.position.add(this.velocity.clone().scale(dt));
        updateWrapAround(this);

        this.mesh.position.set(this.position.x, 2 + Math.sin(this.age * 2) * 0.3, this.position.z);
        this.mesh.rotation.y += 1.0 * dt;

        // Shooting
        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0 && this.playerRef && this.age > 3.0) {
            this.shoot();
            this.shootCooldown = this.shootRate;
        }

        // Update projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.update(dt);
            if (!p.isAlive()) {
                p.destroy();
                return false;
            }
            return true;
        });
    }

    shoot() {
        const dx = this.playerRef.position.x - this.position.x;
        const dz = this.playerRef.position.z - this.position.z;
        const angle = Math.atan2(dx, dz);

        // Poor aim — gives player time to dodge
        const spread = 0.5;
        const a = angle + (Math.random() - 0.5) * spread;

        const speed = 22;
        const vel = new Vector2D(Math.sin(a) * speed, Math.cos(a) * speed);
        const pos = new Vector2D(this.position.x, this.position.z);

        const proj = new Projectile(pos, vel, this.scene);
        proj.lifetime = 3;
        // Hostile color/halo treatment so it never gets mistaken for player fire
        proj.markHostile();

        this.projectiles.push(proj);
        this.scene.add(proj.mesh);

        if (window.game && window.game.audio) {
            window.game.audio.playUFOShot();
        }
    }

    takeDamage() {
        this.health -= 1;
        // Flash the hostile glow halo brightly for 100ms — keeps the
        // model's authored emissive values (windows, lights) intact.
        if (this._hostileHalo) {
            this._hostileHalo.material.opacity = 0.95;
            setTimeout(() => {
                if (this._hostileHalo && !this._dying) this._hostileHalo.material.opacity = 0.18;
            }, 100);
        }
        return this.health <= 0;
    }

    // Begin death animation — UFO stays in the scene and is animated by
    // its own update() until it crashes and triggers the big explosion.
    startDying() {
        if (this._dying) return;
        this._dying = true;
        this._dyingTimer = 0.55;
        this._dyingTotal = 0.55;
        this._dyingSpin = 6 + Math.random() * 6;
        this._dyingTilt = (Math.random() < 0.5 ? 1 : -1) * (3 + Math.random() * 2);
        this._dyingDescent = 0;
        this._dyingExploded = false;
        // Remove all projectiles immediately so they don't linger in the air
        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];
    }

    isAlive() { return this.alive; }

    destroy() {
        this.alive = false;
        // Clean up projectiles
        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}

// UFO Spawner — manages spawning supply drones and hostile UFOs
class UFOManager {
    constructor(scene) {
        this.scene = scene;
        this.supplyDrones = [];
        this.hostileUFOs = [];

        this.droneTimer = 15 + Math.random() * 10; // first drone after 15-25s
        this.droneInterval = 20; // base seconds between drones
        this.hostileTimer = 100 + Math.random() * 20; // first hostile after 100-120s
        this.hostileInterval = 90; // base seconds between hostiles
        this.elapsed = 0;
    }

    update(dt, player, difficulty) {
        this.elapsed += dt;

        // Spawn supply drones
        this.droneTimer -= dt;
        if (this.droneTimer <= 0) {
            const drone = new SupplyDrone(this.scene);
            this.scene.add(drone.mesh);
            this.supplyDrones.push(drone);
            // Interval decreases with difficulty
            this.droneTimer = Math.max(10, this.droneInterval - difficulty * 1.5) + Math.random() * 8;
        }

        // Spawn hostile UFOs (after some time)
        this.hostileTimer -= dt;
        if (this.hostileTimer <= 0 && difficulty >= 2) {
            const ufo = new HostileUFO(this.scene, player);
            this.scene.add(ufo.mesh);
            this.hostileUFOs.push(ufo);
            this.hostileTimer = Math.max(40, this.hostileInterval - difficulty * 3) + Math.random() * 15;
        }

        // Update drones
        this.supplyDrones = this.supplyDrones.filter(d => {
            d.update(dt);
            if (!d.isAlive()) {
                d.destroy();
                return false;
            }
            return true;
        });

        // Update hostile UFOs
        this.hostileUFOs = this.hostileUFOs.filter(u => {
            u.update(dt);
            if (!u.isAlive()) {
                u.destroy();
                return false;
            }
            return true;
        });
    }

    // Check player projectiles vs supply drones — returns power-up position or null
    checkDroneHits(projectiles) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            for (let j = this.supplyDrones.length - 1; j >= 0; j--) {
                const drone = this.supplyDrones[j];
                if (checkCollision(proj.position, proj.radius, drone.position, drone.radius)) {
                    const pos = drone.position.clone();
                    drone.destroy();
                    this.supplyDrones.splice(j, 1);
                    proj.destroy();
                    projectiles.splice(i, 1);
                    return pos; // return position for power-up spawn
                }
            }
        }
        return null;
    }

    // Check player projectiles vs hostile UFOs — returns hit info or null
    checkHostileHits(projectiles) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            for (let j = this.hostileUFOs.length - 1; j >= 0; j--) {
                const ufo = this.hostileUFOs[j];
                // Skip already-dying UFOs so stray bullets don't double-score
                if (ufo._dying) continue;
                if (checkCollision(proj.position, proj.radius, ufo.position, ufo.radius)) {
                    proj.destroy();
                    projectiles.splice(i, 1);

                    const dead = ufo.takeDamage();
                    if (dead) {
                        // Don't remove yet — let the death animation play.
                        // The UFO clears itself from hostileUFOs once its
                        // crash beat fires (alive=false → filter prunes it).
                        const pos = ufo.position.clone();
                        ufo.startDying();
                        return { pos, killed: true };
                    }
                    return { pos: ufo.position.clone(), killed: false };
                }
            }
        }
        return null;
    }

    // Check hostile UFO projectiles vs player
    checkHostileProjectilesVsPlayer(playerPos, playerRadius) {
        for (const ufo of this.hostileUFOs) {
            for (let i = ufo.projectiles.length - 1; i >= 0; i--) {
                const proj = ufo.projectiles[i];
                if (checkCollision(proj.position, proj.radius, playerPos, playerRadius)) {
                    const hitPos = proj.position.clone();
                    proj.destroy();
                    ufo.projectiles.splice(i, 1);
                    return hitPos; // truthy + carries position
                }
            }
        }
        return null;
    }

    // Force-spawn a hostile UFO immediately (used by ChallengeManager for HUNT missions)
    forceSpawnHostile(player) {
        const ufo = new HostileUFO(this.scene, player);
        this.scene.add(ufo.mesh);
        this.hostileUFOs.push(ufo);
    }

    clear() {
        this.supplyDrones.forEach(d => d.destroy());
        this.supplyDrones = [];
        this.hostileUFOs.forEach(u => u.destroy());
        this.hostileUFOs = [];
    }
}
