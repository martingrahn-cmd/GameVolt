// Projectiles
class Projectile {
    constructor(position, velocity, scene) {
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.radius = 0.6;
        this.lifetime = 2; // Seconds before disappearing
        this.isSpread = false;
        this.age = 0;
        this.scene = scene;

        this.homing = false;
        this.piercing = false;
        this.hitTargets = new Set(); // for piercing: skip already-hit asteroids

        // Trail history (recent positions)
        this.trailLength = 10;
        this.trailPositions = [];
        // Pre-fill trail with current position so it doesn't draw from origin
        for (let i = 0; i < this.trailLength; i++) {
            this.trailPositions.push({ x: this.position.x, z: this.position.z });
        }

        this.mesh = this.createMesh();
        this.trail = this.createTrail();
        this.scene.add(this.trail);
    }

    createTrail() {
        const positions = new Float32Array(this.trailLength * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        return new THREE.Line(geometry, material);
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff
        });
        
        let mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, 0.5, this.position.z);
        
        // Add a glow layer by creating a larger transparent sphere
        const glowGeometry = new THREE.SphereGeometry(this.radius * 1.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        // glowMesh is a child of mesh — keep local position at origin so it
        // inherits mesh.position instead of being offset by it.
        mesh.add(glowMesh);
        
        return mesh;
    }
    
    // Recolor + boost a projectile to read as a hostile UFO shot. Uses a
    // hot-red core with a magenta halo so it never gets confused with the
    // cyan player bullets, plus a subtle pulse on the halo while alive.
    markHostile() {
        this.isHostile = true;
        this.mesh.material.color.setHex(0xff2244);
        if (this.mesh.children[0]) {
            const halo = this.mesh.children[0];
            halo.material.color.setHex(0xff0066);
            halo.material.opacity = 0.65;
            halo.scale.set(2.0, 2.0, 2.0);
        }
        if (this.trail) this.trail.material.color.setHex(0xff2244);
    }

    update(dt) {
        // Safety — ignore updates after destroy() has been called.
        if (!this.mesh || !this.trail) return;

        this.age += dt;

        // Hostile bullets pulse their halo so they pop visually against
        // both the cyan starfield and any cyan player bullets in flight.
        if (this.isHostile && this.mesh.children[0]) {
            const halo = this.mesh.children[0];
            const pulse = 1 + Math.sin(this.age * 18) * 0.18;
            halo.scale.set(2.0 * pulse, 2.0 * pulse, 2.0 * pulse);
        }

        // Homing: steer towards nearest target (asteroids, UFOs, drones)
        if (this.homing && window.game) {
            let closest = null;
            let closestDist = Infinity;

            // Check asteroids
            if (window.game.waves) {
                for (const ast of window.game.waves.asteroids) {
                    const d = this.position.distance(ast.position);
                    if (d < closestDist) { closestDist = d; closest = ast; }
                }
            }
            // Check hostile UFOs
            if (window.game.ufoManager) {
                for (const ufo of window.game.ufoManager.hostileUFOs) {
                    const d = this.position.distance(ufo.position);
                    if (d < closestDist) { closestDist = d; closest = ufo; }
                }
                // Check supply drones
                for (const drone of window.game.ufoManager.supplyDrones) {
                    const d = this.position.distance(drone.position);
                    if (d < closestDist) { closestDist = d; closest = drone; }
                }
            }
            if (closest) {
                const speed = this.velocity.length();
                const dx = closest.position.x - this.position.x;
                const dz = closest.position.z - this.position.z;
                const targetAngle = Math.atan2(dx, dz);
                const currentAngle = Math.atan2(this.velocity.x, this.velocity.z);
                let diff = targetAngle - currentAngle;
                // Normalize to [-PI, PI]
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const turnRate = 4;
                const turn = Math.sign(diff) * Math.min(Math.abs(diff), turnRate * dt);
                const newAngle = currentAngle + turn;
                this.velocity.x = Math.sin(newAngle) * speed;
                this.velocity.z = Math.cos(newAngle) * speed;
            }
        }

        const beforeX = this.position.x;
        const beforeZ = this.position.z;
        this.position.add(this.velocity.clone().scale(dt));
        updateWrapAround(this);

        // If wrap happened (position jumped >> velocity * dt), reset trail
        const dx = this.position.x - beforeX;
        const dz = this.position.z - beforeZ;
        const expectedStep = this.velocity.length() * dt * 3;
        if (Math.abs(dx) > expectedStep || Math.abs(dz) > expectedStep) {
            this.trailPositions = [];
            for (let i = 0; i < this.trailLength; i++) {
                this.trailPositions.push({ x: this.position.x, z: this.position.z });
            }
        }

        this.mesh.position.set(this.position.x, 0.5, this.position.z);

        // Railgun beam: rotate threads around the core in a helix pattern
        if (this.isRailgun && this._threads) {
            // Orient beam along velocity direction
            const angle = Math.atan2(this.velocity.x, this.velocity.z);
            this.mesh.rotation.y = angle;

            const spinSpeed = 12;
            const helixRadius = 0.9;
            for (const thread of this._threads) {
                const phase = thread._threadPhase + this.age * spinSpeed;
                thread.position.x = Math.cos(phase) * helixRadius;
                thread.position.y = Math.sin(phase) * helixRadius;
            }
        }

        // Update trail
        this.trailPositions.unshift({ x: this.position.x, z: this.position.z });
        if (this.trailPositions.length > this.trailLength) {
            this.trailPositions.pop();
        }
        const posAttr = this.trail.geometry.getAttribute('position');
        for (let i = 0; i < this.trailLength; i++) {
            const p = this.trailPositions[i] || this.trailPositions[this.trailPositions.length - 1] || { x: this.position.x, z: this.position.z };
            posAttr.setXYZ(i, p.x, 0.5, p.z);
        }
        posAttr.needsUpdate = true;
    }
    
    isAlive() {
        return this.age < this.lifetime;
    }
    
    destroy() {
        if (this.scene) {
            if (this.mesh) this.scene.remove(this.mesh);
            if (this.trail) this.scene.remove(this.trail);
        }
        this.mesh = null;
        this.trail = null;
    }
}
