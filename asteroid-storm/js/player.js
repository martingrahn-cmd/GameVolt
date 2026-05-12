// Player ship
class Player {
    constructor(scene, options = {}) {
        this.scene = scene;

        // Player slot (0 = P1, 1 = P2). Used for input routing and HUD color.
        this.slot = options.slot || 0;
        this.colorHex = this.slot === 0 ? 0x00ffff : 0xff44dd;
        // P1 keeps the GLB's original colors. Only P2 gets a slot-color tint
        // applied to its model so the two ships are visually distinct in co-op.
        this.tintShip = this.slot === 1;
        // Input scheme: 'auto' picks first gamepad / keyboard. 'gamepad0','gamepad1','keyboard1','keyboard2'
        this.inputScheme = options.inputScheme || 'auto';

        // Physics — spawn offset for P2
        const spawnX = this.slot === 0 ? 0 : 8;
        this.position = new Vector2D(spawnX, 0);
        this.velocity = new Vector2D(0, 0);
        this.angle = 0;
        this.radius = 2.8;
        
        // Input
        this.input = {
            rotate: 0,
            thrust: 0,
            shoot: false,
            brake: false,
            teleport: false
        };

        // Teleport
        this.teleportCooldown = 0;
        this.teleportCooldownMax = 5;
        this.teleporting = false;
        this.teleportTimer = 0;
        this.teleportDuration = 0.3;
        
        // Ship properties
        this.acceleration = 35;
        this.maxSpeed = 38;
        this.rotationSpeed = 4;
        this.shootCooldown = 0;
        this.shootRate = 0.3;
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.maxInvulnerableTime = 2;

        // Hit wobble (3D tilt animation when struck)
        this.hitWobbleTimer = 0;
        this.hitWobbleDuration = 0.65;

        // Hit emissive flash — ship glows red briefly when struck
        this.hitFlashTimer = 0;
        this.hitFlashDuration = 0.18;
        this._origEmissives = null; // captured lazily after model loads

        // Visual
        this.mesh = this.createMesh();

        // Shield visual
        this.shieldMesh = null;
        this.hasShield = false;

        // Power-up state
        this.activePowerup = null; // 'spreadshot', 'homing', or 'railgun'
        this.powerupTimer = 0;
        this.powerupLocked = false; // when true, weapon powerups can't be swapped

        // Ghost / revive state — when a player loses their last life they
        // become a drifting ghost for `reviveDuration` seconds. The other
        // player can fly close to revive them.
        this.isGhost = false;
        this.permaDead = false;
        this.reviveTimer = 0;
        this.reviveDuration = 8.0;
        this.reviveDwellNeeded = 1.0;
        this.reviveDwellTimer = 0;
        this.reviveRadius = 8;
        this.reviveRingMesh = null;

        // Game reference
        this.projectiles = [];
    }
    
    createMesh() {
        // Fallback cone while GLB loads — colored per slot
        const geometry = new THREE.ConeGeometry(2.25, 6, 8);
        const material = new THREE.MeshStandardMaterial({
            color: this.colorHex,
            emissive: this.colorHex,
            emissiveIntensity: 0.6,
            roughness: 0.3,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
        });

        const cone = new THREE.Mesh(geometry, material);
        cone.castShadow = true;
        cone.rotation.x = Math.PI / 2;

        const group = new THREE.Group();
        group.add(cone);
        group.position.set(this.position.x, 0.5, this.position.z);

        // Invulnerability ring — pulsing cyan/magenta torus shown while
        // the ship is invulnerable (post-respawn or freshly damaged).
        // Hidden by default; opacity is animated in update().
        const invulnRingGeo = new THREE.RingGeometry(2.7, 3.3, 36);
        const invulnRingMat = new THREE.MeshBasicMaterial({
            color: this.colorHex,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const invulnRing = new THREE.Mesh(invulnRingGeo, invulnRingMat);
        invulnRing.rotation.x = -Math.PI / 2;
        invulnRing.position.y = 0.2;
        group.add(invulnRing);
        this.invulnRing = invulnRing;

        // Load GLB model asynchronously
        this.loadShipModel(group);

        return group;
    }

    // Re-read the equipped ship from the catalog and reload the GLB model.
    // Called when starting a game mode to pick up any hangar changes.
    reloadShipModel() {
        const ship = (typeof Ships !== 'undefined') ? Ships.getEquipped() : null;
        const newId = ship ? ship.id : null;
        // Skip if the same ship is already loaded (avoids flicker on restart)
        if (newId && newId === this._loadedShipId) return;

        // Detach shield before we wipe the mesh group — it's parented to this.mesh
        // and we don't want to destroy it, just re-parent it after the swap.
        const savedShield = this.shieldMesh;
        if (savedShield && savedShield.parent) {
            savedShield.parent.remove(savedShield);
        }

        // Wipe EVERYTHING in the mesh group immediately so the old ship can't
        // linger on screen while the new GLB is loading asynchronously. This
        // includes the old ship model, engine flames, and fallback cone.
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }

        // Clear cached state so the new model's materials/emissives are captured fresh.
        this.shipModel = null;
        this.shipMaterials = [];
        this._origEmissives = null;
        this.engineFlames = null;
        this._loadedShipId = null;

        // Invalidate any in-flight load so its callback won't overwrite
        // the new load with the old ship.
        this._shipLoadGen = (this._shipLoadGen || 0) + 1;

        this.loadShipModel(this.mesh);

        // Re-attach the shield so it still protects the new ship
        if (savedShield) {
            this.mesh.add(savedShield);
        }
    }

    loadShipModel(group) {
        if (!THREE.GLTFLoader) {
            console.warn('GLTFLoader not available, using fallback cone');
            return;
        }

        // Pick the equipped ship from the catalog (falls back to scout)
        const ship = (typeof Ships !== 'undefined') ? Ships.getEquipped() : null;
        const path = ship ? ship.path : 'assets/ships/scout.glb';

        // Generation counter — ignore stale async callbacks if a newer load
        // was triggered while this one was in flight.
        this._shipLoadGen = (this._shipLoadGen || 0) + 1;
        const myGen = this._shipLoadGen;

        const loader = new THREE.GLTFLoader();
        if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(path, (gltf) => {
            // Stale callback — a newer load superseded this one.
            if (this._shipLoadGen !== myGen) return;

            const model = gltf.scene;

            // Some external models (e.g. Poly Pizza) have their nose at -Z
            // instead of +Z. We fix this by baking the rotation directly into
            // the vertex data so it never compounds with the game's
            // mesh.rotation.y at runtime.
            if (ship && ship.rotateY) {
                const rotMat = new THREE.Matrix4().makeRotationY(ship.rotateY);
                model.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.geometry.applyMatrix4(rotMat);
                    }
                });
            }

            // Calculate bounding box to normalize size
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 10.5 * ((ship && ship.gameScale) || 1.0);
            const scale = targetSize / maxDim;

            model.scale.set(scale, scale, scale);
            model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

            // Calculate where back of ship is in group coordinates.
            this.shipBackZ = (box.min.z - center.z) * scale;
            this.shipFrontZ = (box.max.z - center.z) * scale;

            // Enable shadows on all meshes. Leave material.transparent alone —
            // forcing it true on opaque PBR materials disables depth writes and
            // makes the ship render differently than a standard glTF viewer.
            // Transparency is only enabled on demand during the invulnerability
            // flash (see setShipOpacity).
            // Detect vertex colors before we traverse materials — if the
            // geometry has a color attribute, the artist baked multi-color
            // detail per-vertex (common in Poly Pizza low-poly models). We
            // must enable vertexColors on the material and NOT overwrite
            // material.color, or we destroy the multi-color look.
            let hasVertexColors = false;
            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    const colorAttr = child.geometry.getAttribute('color');
                    if (colorAttr) {
                        hasVertexColors = true;
                        // Mild boost — tone mapping is disabled on the material
                        // so we don't need aggressive multiplication (which
                        // shifts hue when clamped at 1.0).
                        const boost = (ship && ship.vertexColorBoost) || 1.1;
                        const arr = colorAttr.array;
                        for (let i = 0; i < arr.length; i++) {
                            arr[i] = Math.min(1, arr[i] * boost);
                        }
                        colorAttr.needsUpdate = true;
                    }
                }
            });

            this.shipMaterials = [];
            // Strip "glow shell" halo meshes that community GLBs sometimes
            // include (usually BackSide + transparent + near-white) — they
            // produce a washed-out hinna over the real ship.
            if (ship && ship.forceOpaque) {
                const toRemove = [];
                model.traverse((child) => {
                    if (!child.isMesh || !child.material) return;
                    const m = child.material;
                    const isBackSide = m.side === THREE.BackSide;
                    const isTransparentHalo = m.transparent && m.opacity < 0.95;
                    if (isBackSide || isTransparentHalo) {
                        toRemove.push(child);
                    }
                });
                for (const mesh of toRemove) {
                    if (mesh.parent) mesh.parent.remove(mesh);
                }
            }
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    if (child.material) {
                        this.shipMaterials.push(child.material);
                        // Brighten ship — Ship Forge Kit uses no tone mapping so
                        // colors look much more saturated there. Add emissive
                        // self-illumination tinted to the slot color (so P2's
                        // ship glows magenta against the dark scene).
                        const m = child.material;
                        if (this.tintShip) {
                            // Co-op (or anything that explicitly opts in): tint
                            // emissive + base color toward the slot color so the
                            // two players read as cyan vs magenta.
                            const slotColor = new THREE.Color(this.colorHex);
                            if (m.emissive) {
                                m.emissive.copy(slotColor);
                                m.emissiveIntensity = 0.55;
                            }
                            if (m.color) {
                                m.color.lerp(slotColor, 0.4);
                            }
                        } else {
                            // Priority: explicit bodyColor > vertex colors / texture > auto-emissive
                            if (ship && ship.bodyColor !== undefined && m.color) {
                                // Explicit recolor — overrides any texture/vertex colors
                                const hsl = {};
                                m.color.getHSL(hsl);
                                const recolor = new THREE.Color(
                                    hsl.s < 0.15 ? ship.bodyColor : (ship.accentColor ?? ship.bodyColor)
                                );
                                m.color.copy(recolor);
                                if (m.emissive) {
                                    if (ship.noEmissive) {
                                        m.emissive.setHex(0x000000);
                                        m.emissiveIntensity = 0;
                                    } else if (ship.emissive !== undefined) {
                                        m.emissive.setHex(ship.emissive);
                                        m.emissiveIntensity = ship.emissiveIntensity ?? 0.4;
                                    } else {
                                        m.emissive.copy(recolor);
                                        m.emissiveIntensity = 0.5;
                                    }
                                }
                            } else if (hasVertexColors || m.map) {
                                // Preserve baked-in texture / vertex colors
                                if (hasVertexColors) m.vertexColors = true;
                                m.color.setHex(0xffffff);
                                m.toneMapped = false;
                                if (m.emissive) {
                                    if (m.map) {
                                        m.emissiveMap = m.map;
                                        m.emissive.setHex(0xffffff);
                                        m.emissiveIntensity = (ship && ship.emissiveIntensity !== undefined)
                                            ? ship.emissiveIntensity
                                            : 0.4;
                                    } else {
                                        m.emissive.setHex(0x000000);
                                        m.emissiveIntensity = 0;
                                    }
                                }
                            } else if (m.emissive && m.color) {
                                if (ship && ship.noEmissive) {
                                    m.emissive.setHex(0x000000);
                                    m.emissiveIntensity = 0;
                                } else {
                                    m.emissive.copy(m.color).multiplyScalar(0.4);
                                    m.emissiveIntensity = 0.3;
                                }
                            }
                        }
                        // Material surface — allow per-ship override
                        if (m.metalness !== undefined) {
                            m.metalness = (ship && ship.metalness !== undefined) ? ship.metalness : 0.6;
                        }
                        if (m.roughness !== undefined) {
                            m.roughness = (ship && ship.roughness !== undefined) ? ship.roughness : 0.35;
                        }
                        // Render both sides if the ship has thin shell geometry
                        if (ship && ship.doubleSide) {
                            m.side = THREE.DoubleSide;
                        }
                        // Force opaque rendering on materials that should be
                        // solid. Community GLBs often ship with transparent=true
                        // baked in, or have wrapping "glow shell" meshes with
                        // low opacity that produce a white haze. Force opaque
                        // unconditionally when the ship has forceOpaque, else
                        // only when source opacity is high enough.
                        const shouldForce = (ship && ship.forceOpaque) || m.opacity >= 0.9;
                        if (shouldForce) {
                            m.transparent = false;
                            m.depthWrite = true;
                            m.opacity = 1.0;
                            if (m.alphaMap) m.alphaMap = null;
                            m.alphaTest = 0;
                            // MeshPhysicalMaterial extras that can cause haze
                            if (m.transmission !== undefined) m.transmission = 0;
                            if (m.thickness !== undefined) m.thickness = 0;
                            if (m.clearcoat !== undefined) m.clearcoat = 0;
                            if (m.sheen !== undefined) m.sheen = 0;
                            if (m.ior !== undefined) m.ior = 1.5;
                            // Reduce overpowering envMap
                            if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.3;
                        }
                        m.needsUpdate = true;
                    }
                }
            });

            // Remove previous model / fallback cone
            while (group.children.length > 0) {
                group.remove(group.children[0]);
            }
            group.add(model);

            // Store reference for opacity changes (invulnerability flash)
            this.shipModel = model;
            this._loadedShipId = ship ? ship.id : null;

            // Create engine flames (added to the outer group, not the wrapper)
            this.createEngineFlames(group, box, scale);

            // Dump full material + mesh info for debugging
            this.shipMeshes = [];
            model.traverse((child) => {
                if (child.isMesh) this.shipMeshes.push(child);
            });
            console.group(`Ship ${ship ? ship.id : '?'} — ${this.shipMeshes.length} mesh(es)`);
            this.shipMeshes.forEach((mesh, i) => {
                const m = mesh.material;
                const g = mesh.geometry;
                const attrs = Object.keys(g.attributes);
                console.log(`[${i}] "${mesh.name || '(unnamed)'}"`, {
                    type: m.type,
                    color: m.color ? `#${m.color.getHexString()}` : null,
                    emissive: m.emissive ? `#${m.emissive.getHexString()}` : null,
                    emissiveIntensity: m.emissiveIntensity,
                    opacity: m.opacity,
                    transparent: m.transparent,
                    side: m.side === THREE.DoubleSide ? 'Double' : m.side === THREE.BackSide ? 'Back' : 'Front',
                    depthWrite: m.depthWrite,
                    alphaTest: m.alphaTest,
                    map: m.map ? (m.map.image ? `${m.map.image.width}x${m.map.image.height}` : 'yes') : null,
                    emissiveMap: !!m.emissiveMap,
                    alphaMap: !!m.alphaMap,
                    transmission: m.transmission,
                    thickness: m.thickness,
                    clearcoat: m.clearcoat,
                    sheen: m.sheen,
                    envMapIntensity: m.envMapIntensity,
                    metalness: m.metalness,
                    roughness: m.roughness,
                    geomAttributes: attrs,
                    geomGroups: g.groups ? g.groups.length : 0,
                    vertexCount: g.attributes.position.count,
                    isMultiMaterial: Array.isArray(mesh.material),
                    scale: `${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)}`
                });
            });
            console.groupEnd();

            // Expose for the live debug panel
            if (window.game) window.game._shipMeshes = this.shipMeshes;
        }, undefined, (error) => {
            console.warn('Failed to load ship GLB, keeping fallback:', error);
        });
    }

    createEngineFlames(group, box, scale) {
        // Position flames at the back of the ship (computed in loadShipModel).
        // backZ is at the -Z extreme (the engines), and the cones extend further -Z (out the back).
        const backZ = this.shipBackZ !== undefined ? this.shipBackZ : box.min.z * scale;

        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.6
        });
        const flameGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.4
        });

        // Two engine flames (left and right)
        this.engineFlames = [];
        const offsets = [-0.8, 0.8]; // left/right spread

        for (const xOff of offsets) {
            const flameGroup = new THREE.Group();

            // Inner bright core — base at flame group origin, tip points -Z (away from ship)
            const coreLen = 1.5;
            const coreGeo = new THREE.ConeGeometry(0.25, coreLen, 6);
            const core = new THREE.Mesh(coreGeo, flameMat.clone());
            core.rotation.x = -Math.PI / 2;
            core.position.z = -coreLen / 2; // shift so base is at origin, extending -Z
            flameGroup.add(core);

            // Outer glow
            const glowLen = 2.0;
            const glowGeo = new THREE.ConeGeometry(0.45, glowLen, 6);
            const glow = new THREE.Mesh(glowGeo, flameGlowMat.clone());
            glow.rotation.x = -Math.PI / 2;
            glow.position.z = -glowLen / 2;
            flameGroup.add(glow);

            // Position flame group at the back of the ship
            flameGroup.position.set(xOff, 0, backZ);
            group.add(flameGroup);
            this.engineFlames.push(flameGroup);
        }
    }

    createShieldMesh() {
        const group = new THREE.Group();
        const radius = 6.5; // covers full ship (8.75 / 2 + margin)

        // Inner fresnel-style glow sphere (BackSide gives outer rim glow)
        const innerGeo = new THREE.SphereGeometry(radius, 24, 24);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.18,
            side: THREE.BackSide,
            depthWrite: false
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        group.add(inner);

        // Front-side faint hex-like wireframe overlay
        const wireGeo = new THREE.IcosahedronGeometry(radius, 2);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
        });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        group.add(wire);

        // Equatorial energy ring
        const ringGeo = new THREE.TorusGeometry(radius * 1.02, 0.15, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x88ffcc,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Store refs for animation
        this._shieldInner = inner;
        this._shieldWire = wire;
        this._shieldRing = ring;
        this._shieldAge = 0;

        return group;
    }

    updateShield(dt) {
        if (!this.shieldMesh || !this.shieldMesh.visible) return;
        this._shieldAge = (this._shieldAge || 0) + dt;
        const t = this._shieldAge;

        // Slow rotation on different axes for shimmering effect
        if (this._shieldWire) {
            this._shieldWire.rotation.y += 0.5 * dt;
            this._shieldWire.rotation.x += 0.2 * dt;
        }
        if (this._shieldRing) {
            this._shieldRing.rotation.z += 1.5 * dt;
            // Pulse opacity
            this._shieldRing.material.opacity = 0.4 + Math.sin(t * 4) * 0.25;
        }
        if (this._shieldInner) {
            this._shieldInner.material.opacity = 0.15 + Math.sin(t * 2.5) * 0.06;
        }
    }

    captureOriginalEmissives() {
        // Walk the ship model and remember each material's starting emissive color
        // and intensity so we can restore them after the hit flash.
        this._origEmissives = [];
        if (!this.shipModel) return;
        this.shipModel.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                this._origEmissives.push({
                    material: child.material,
                    color: child.material.emissive.clone(),
                    intensity: child.material.emissiveIntensity ?? 1
                });
            }
        });
    }

    updateHitFlash(dt) {
        if (this.hitFlashTimer <= 0) {
            // Restore once after timer expires
            if (this._wasFlashing && this._origEmissives) {
                for (const o of this._origEmissives) {
                    o.material.emissive.copy(o.color);
                    o.material.emissiveIntensity = o.intensity;
                }
                this._wasFlashing = false;
            }
            return;
        }

        // Lazy capture on first hit (after model has loaded)
        if (!this._origEmissives) this.captureOriginalEmissives();
        if (this._origEmissives.length === 0) return;

        this.hitFlashTimer -= dt;
        const t = Math.max(0, this.hitFlashTimer / this.hitFlashDuration); // 1 → 0
        const flashColor = Player._flashColor || (Player._flashColor = new THREE.Color(0xff1500));

        for (const o of this._origEmissives) {
            // Lerp from original color toward flash red, weighted by remaining time
            o.material.emissive.copy(o.color).lerp(flashColor, t);
            o.material.emissiveIntensity = o.intensity * (1 - t) + 2.5 * t;
        }
        this._wasFlashing = true;
    }

    updateEngineFlames(thrusting) {
        if (!this.engineFlames) return;

        for (const flame of this.engineFlames) {
            if (thrusting) {
                // Boost mode — large flickering blue core + orange glow
                flame.visible = true;
                const flicker = 0.8 + Math.random() * 0.4;
                flame.scale.set(1.2, 1.2, 1.5 + Math.random() * 0.8);
                flame.children[0].material.color.setHex(0x44ccff);
                flame.children[0].material.opacity = 0.85 * flicker;
                flame.children[1].material.color.setHex(0xff6600);
                flame.children[1].material.opacity = 0.6 * flicker;
            } else {
                // Idle — small steady cyan pilot flame (clearly visible, no orange)
                flame.visible = true;
                const flicker = 0.9 + Math.random() * 0.1;
                flame.scale.set(0.7, 0.7, 0.6 + Math.random() * 0.1);
                flame.children[0].material.color.setHex(0x99eeff);
                flame.children[0].material.opacity = 0.95 * flicker;
                flame.children[1].material.color.setHex(0x3399ff);
                flame.children[1].material.opacity = 0.55 * flicker;
            }
        }
    }
    
    handleInput(keys, mouseX, mouseY) {
        this.input.rotate = 0;
        this.input.thrust = 0;
        this.input.shoot = false;
        this.input.brake = false;
        this.input.teleport = false;

        // Ghost players don't accept normal control input — they just drift
        if (this.isGhost || this.permaDead) return;

        const scheme = this.inputScheme;

        // ── Keyboard schemes (configurable via KeyboardBindings) ──
        if (typeof KeyboardBindings !== 'undefined') {
            const kbSlot = (scheme === 'keyboard2') ? 'keyboard2'
                         : (scheme === 'auto' || scheme === 'keyboard1') ? 'keyboard1'
                         : null;
            if (kbSlot) {
                if (KeyboardBindings.isPressed(keys, kbSlot, 'rotateLeft'))  this.input.rotate = 1;
                if (KeyboardBindings.isPressed(keys, kbSlot, 'rotateRight')) this.input.rotate = -1;
                if (KeyboardBindings.isPressed(keys, kbSlot, 'thrust'))      this.input.thrust = 1;
                if (KeyboardBindings.isPressed(keys, kbSlot, 'brake'))       this.input.brake = true;
                if (KeyboardBindings.isPressed(keys, kbSlot, 'shoot'))       this.input.shoot = true;
                if (KeyboardBindings.isPressed(keys, kbSlot, 'teleport'))    this.input.teleport = true;
            }
        }

        // ── Touch controls ──
        if (window.game && window.game.touchControls && window.game.touchControls.active) {
            window.game.touchControls.applyTo(this.input);
        }

        // ── Gamepad schemes ──
        if (typeof GamepadBindings === 'undefined') return;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        // Pick a specific gamepad slot for this player
        let gpIdx = -1;
        if (scheme === 'gamepad0') gpIdx = this._findNthGamepad(gamepads, 0);
        else if (scheme === 'gamepad1') gpIdx = this._findNthGamepad(gamepads, 1);
        else if (scheme === 'auto') gpIdx = this._findNthGamepad(gamepads, 0);

        const gp = gpIdx >= 0 ? gamepads[gpIdx] : null;
        if (!gp) return;

        const leftAmount = GamepadBindings.getValue(gp, 'rotateLeft');
        const rightAmount = GamepadBindings.getValue(gp, 'rotateRight');
        if (leftAmount > 0.15 || rightAmount > 0.15) {
            this.input.rotate = leftAmount - rightAmount;
        }

        if (GamepadBindings.isPressed(gp, 'thrust')) this.input.thrust = 1;
        if (GamepadBindings.isPressed(gp, 'brake'))  this.input.brake = true;
        if (GamepadBindings.isPressed(gp, 'shoot'))  this.input.shoot = true;
        if (GamepadBindings.isPressed(gp, 'teleport')) this.input.teleport = true;
    }

    // Returns the index of the Nth connected gamepad (0-based), or -1.
    _findNthGamepad(gamepads, n) {
        let count = 0;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                if (count === n) return i;
                count++;
            }
        }
        return -1;
    }
    
    update(dt) {
        // Permadead — completely inert
        if (this.permaDead) return;

        // Ghost — drift only, no shoot/teleport, no thrust
        if (this.isGhost) {
            // Slow drift physics
            this.position.add(this.velocity.clone().scale(dt));
            this.velocity.scale(Math.pow(0.985, dt * 60));
            updateWrapAround(this);
            this.mesh.position.set(this.position.x, 0.5, this.position.z);
            this.mesh.rotation.y = this.angle + Math.sin(performance.now() * 0.002) * 0.5;
            return;
        }

        // Teleport cooldown
        if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

        // Teleport sequence
        if (this.teleporting) {
            this.teleportTimer -= dt;
            // Flickering during teleport
            this.mesh.visible = Math.sin(this.teleportTimer * 40) > 0;
            if (this.teleportTimer <= 0) {
                this.finishTeleport();
            }
            return; // skip all other updates while teleporting
        }

        // Trigger teleport
        if (this.input.teleport && this.teleportCooldown <= 0 && !this.teleporting) {
            this.startTeleport();
            return;
        }

        // Rotation
        this.angle += this.input.rotate * this.rotationSpeed * dt;
        
        // Thrust
        if (this.input.thrust) {
            const ax = Math.sin(this.angle) * this.acceleration;
            const az = Math.cos(this.angle) * this.acceleration;
            
            this.velocity.x += ax * dt;
            this.velocity.z += az * dt;
            
            const speed = this.velocity.length();
            if (speed > this.maxSpeed) {
                this.velocity.scale(this.maxSpeed / speed);
            }
            
            // Thrust particles — emit backward from the engines
            if (window.game && window.game.particles) {
                const thrustPos = new Vector2D(
                    this.position.x - Math.sin(this.angle) * 3,
                    this.position.z - Math.cos(this.angle) * 3
                );
                // Direction is OPPOSITE of ship facing (away from the back)
                const thrustDir = new Vector2D(-Math.sin(this.angle), -Math.cos(this.angle));
                window.game.particles.createThrust(thrustPos, thrustDir);
                // Heat shimmer — fewer but larger soft blobs behind the ship
                if (Math.random() < 0.55) {
                    window.game.particles.createHeatShimmer(thrustPos, thrustDir);
                }
                // High-speed warp feel is now driven by the radial speed-blur
                // shader pass in main.js — no per-streak geometry needed.
            }
        }
        
        // Friction / braking
        const friction = this.input.brake ? 0.92 : 0.995;
        this.velocity.scale(Math.pow(friction, dt * 60));

        // Position update
        this.position.add(this.velocity.clone().scale(dt));
        updateWrapAround(this);
        
        // Update mesh
        this.mesh.position.set(this.position.x, 0.5, this.position.z);
        this.mesh.rotation.y = this.angle;

        // Hit wobble — damped 3D tilt on x/z axes after a damaging hit.
        // Slow oscillation (~1-1.5 cycles total) so it reads as a tilt, not a blink.
        if (this.hitWobbleTimer > 0) {
            this.hitWobbleTimer -= dt;
            const elapsed = this.hitWobbleDuration - this.hitWobbleTimer;
            const decay = Math.max(0, this.hitWobbleTimer / this.hitWobbleDuration);
            this.mesh.rotation.x = Math.sin(elapsed * 13) * 0.6 * decay;
            this.mesh.rotation.z = Math.sin(elapsed * 9) * 0.45 * decay;
        } else {
            this.mesh.rotation.x = 0;
            this.mesh.rotation.z = 0;
        }

        // Hit emissive flash — ship glows red briefly when struck
        this.updateHitFlash(dt);

        // Power-up timer
        this.updatePowerup(dt);

        // Engine flames
        this.updateEngineFlames(this.input.thrust > 0);

        // Shield animation
        this.updateShield(dt);

        // Shooting
        this.shootCooldown = Math.max(0, this.shootCooldown - dt);
        if (this.input.shoot && this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = this.shootRate;
            // Track ammo for challenge missions with ammoLimit
            if (window.game && window.game.challengeManager && window.game.challengeManager.onShotFired) {
                window.game.challengeManager.onShotFired();
            }
        }
        
        // Invulnerability
        if (this.invulnerable) {
            this.invulnerableTime -= dt;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
                this.mesh.visible = true;
                this.setShipOpacity(1.0); // restore opaque rendering
                if (this.invulnRing) this.invulnRing.material.opacity = 0;
            } else {
                // Flash effect — but stay fully solid during the wobble so the tilt is readable
                const opacity = this.hitWobbleTimer > 0
                    ? 1.0
                    : (((this.invulnerableTime * 10) % 1) > 0.5 ? 1.0 : 0.3);
                this.setShipOpacity(opacity);
                // Pulse the invuln ring while the window is active
                if (this.invulnRing) {
                    const t = Date.now() * 0.012;
                    const pulse = 0.45 + Math.sin(t) * 0.4;
                    this.invulnRing.material.opacity = pulse;
                    const s = 1 + Math.sin(t * 0.7) * 0.12;
                    this.invulnRing.scale.set(s, s, s);
                }
            }
        } else if (this.invulnRing && this.invulnRing.material.opacity > 0) {
            this.invulnRing.material.opacity = 0;
        }
    }

    setShipOpacity(opacity) {
        // Toggle transparency only when actually fading. When fully opaque we
        // restore transparent=false so the GLB renders with normal depth-writes.
        const mats = this.shipMaterials;
        if (!mats || mats.length === 0) return;
        const wantTransparent = opacity < 1.0;
        for (const m of mats) {
            m.transparent = wantTransparent;
            m.opacity = opacity;
            m.depthWrite = !wantTransparent;
            m.needsUpdate = true;
        }
    }
    
    shoot() {
        const speed = 60;
        const spawnDist = 4;

        if (this.activePowerup === 'spreadshot') {
            // 3 shots in a fan (-15, 0, +15 degrees)
            const angles = [-0.25, 0, 0.25];
            for (const offset of angles) {
                const a = this.angle + offset;
                const vel = new Vector2D(Math.sin(a) * speed, Math.cos(a) * speed);
                const pos = new Vector2D(
                    this.position.x + Math.sin(a) * spawnDist,
                    this.position.z + Math.cos(a) * spawnDist
                );
                const p = new Projectile(pos, vel, this.scene);
                p.lifetime = 0.8;
                p.isSpread = true;
                // Orange hot spread rounds
                p.mesh.children[0].material.color.setHex(0xff6600);
                if (p.mesh.children[1]) p.mesh.children[1].material.color.setHex(0xff8833);
                p.trail.material.color.setHex(0xff6600);
                this.projectiles.push(p);
                this.scene.add(p.mesh);
            }
            if (window.game && window.game.audio) window.game.audio.playSpreadShoot();
        } else if (this.activePowerup === 'railgun') {
            // Piercing laser beam with rotating energy threads
            const railSpeed = 80;
            const pos = new Vector2D(
                this.position.x + Math.sin(this.angle) * spawnDist,
                this.position.z + Math.cos(this.angle) * spawnDist
            );
            const vel = new Vector2D(Math.sin(this.angle) * railSpeed, Math.cos(this.angle) * railSpeed);
            const p = new Projectile(pos, vel, this.scene);
            p.piercing = true;
            p.lifetime = 1.8;
            p.radius = 1.5;
            p.isRailgun = true;

            // Replace default mesh with laser beam group
            this.scene.remove(p.mesh);
            const beamGroup = new THREE.Group();

            // Central core beam — bright hot center
            const coreGeo = new THREE.CylinderGeometry(0.35, 0.35, 10, 8);
            coreGeo.rotateX(Math.PI / 2);
            const coreMat = new THREE.MeshBasicMaterial({
                color: 0xff6622,
                transparent: true,
                opacity: 0.95
            });
            beamGroup.add(new THREE.Mesh(coreGeo, coreMat));

            // Bright inner glow — wide soft halo
            const glowGeo = new THREE.CylinderGeometry(0.8, 0.8, 10, 8);
            glowGeo.rotateX(Math.PI / 2);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xff2200,
                transparent: true,
                opacity: 0.25
            });
            beamGroup.add(new THREE.Mesh(glowGeo, glowMat));

            // Outer electric haze
            const hazeGeo = new THREE.CylinderGeometry(1.4, 1.4, 10, 8);
            hazeGeo.rotateX(Math.PI / 2);
            const hazeMat = new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.08
            });
            beamGroup.add(new THREE.Mesh(hazeGeo, hazeMat));

            // 3 rotating energy threads
            p._threads = [];
            for (let t = 0; t < 3; t++) {
                const threadGeo = new THREE.CylinderGeometry(0.12, 0.12, 10, 4);
                threadGeo.rotateX(Math.PI / 2);
                const threadMat = new THREE.MeshBasicMaterial({
                    color: t === 0 ? 0xff6600 : t === 1 ? 0xff0044 : 0xffaa00,
                    transparent: true,
                    opacity: 0.7
                });
                const thread = new THREE.Mesh(threadGeo, threadMat);
                thread._threadIndex = t;
                thread._threadPhase = (t / 3) * Math.PI * 2;
                beamGroup.add(thread);
                p._threads.push(thread);
            }

            beamGroup.position.set(pos.x, 0.5, pos.z);
            p.mesh = beamGroup;
            this.scene.add(beamGroup);

            // Replace trail with brighter color
            p.trail.material.color.setHex(0xff2200);
            p.trail.material.opacity = 0.9;

            this.projectiles.push(p);
            this.scene.add(p.mesh);
            if (window.game && window.game.audio) window.game.audio.playRailgun();
        } else if (this.activePowerup === 'homing') {
            const pos = new Vector2D(
                this.position.x + Math.sin(this.angle) * spawnDist,
                this.position.z + Math.cos(this.angle) * spawnDist
            );
            const vel = new Vector2D(Math.sin(this.angle) * speed, Math.cos(this.angle) * speed);
            const p = new Projectile(pos, vel, this.scene);
            p.homing = true;
            p.mesh.material.color.setHex(0xff00ff);
            p.mesh.children[0].material.color.setHex(0xff00ff);
            p.trail.material.color.setHex(0xff00ff);
            this.projectiles.push(p);
            this.scene.add(p.mesh);
            if (window.game && window.game.audio) window.game.audio.playHomingShoot();
        } else {
            const vel = new Vector2D(Math.sin(this.angle) * speed, Math.cos(this.angle) * speed);
            const pos = new Vector2D(
                this.position.x + Math.sin(this.angle) * spawnDist,
                this.position.z + Math.cos(this.angle) * spawnDist
            );
            const p = new Projectile(pos, vel, this.scene);
            this.projectiles.push(p);
            this.scene.add(p.mesh);
            if (window.game && window.game.audio) window.game.audio.playShoot();
        }

    }

    applyPowerup(type) {
        const config = POWERUP_TYPES[type];

        // Weapon-locked missions: reject weapon swaps (shield/bomb/extralife still OK)
        if (this.powerupLocked && config.duration > 0 && type !== this.activePowerup) {
            return;
        }

        if (type === 'shield') {
            this.hasShield = true;
            if (!this.shieldMesh) {
                this.shieldMesh = this.createShieldMesh();
                this.mesh.add(this.shieldMesh);
            }
            this.shieldMesh.visible = true;
            if (window.game && window.game.audio) window.game.audio.playShieldActivate();
        } else if (type === 'extralife') {
            this.lives += 1;
            // Force immediate HUD refresh so the new pip appears this frame
            if (window.game && window.game.ui && window.game.ui.updateHUD) {
                window.game.ui.updateHUD();
            }
        } else if (type === 'bomb') {
            this.triggerBomb();
        } else {
            // Timed power-ups (spreadshot, homing)
            this.activePowerup = type;
            this.powerupTimer = config.duration;
        }

        if (typeof onPowerupCollected === 'function') onPowerupCollected();

        if (window.game && window.game.audio) {
            window.game.audio.playPickup();
        }

        // Spiral particle burst at the player's location
        if (window.game && window.game.particles) {
            window.game.particles.createPickupSpiral(this.position, config.color, 22);
        }

        // Show pickup notification
        if (window.game && window.game.ui) {
            const colorHex = '#' + config.color.toString(16).padStart(6, '0');
            window.game.ui.showPickupNotify(config.label, colorHex);
        }
    }

    triggerBomb() {
        const game = window.game;
        if (!game) return;

        let bombKillCount = 0;
        const bombRadius = 40;
        for (let i = game.waves.asteroids.length - 1; i >= 0; i--) {
            const ast = game.waves.asteroids[i];
            const dist = this.position.distance(ast.position);
            if (dist < bombRadius) {
                // Boss asteroids: deal 5 HP damage instead of instant kill
                if (typeof ast.hit === 'function') {
                    for (let h = 0; h < 5; h++) {
                        if (ast.health <= 0) break;
                        const dead = ast.hit();
                        if (dead) {
                            if (game.challengeManager) game.challengeManager.onBossDefeated();
                            game.particles.createExplosion(ast.position.clone(), 0xffff00, 25);
                            game.particles.createDebris(ast.position.clone(), 8, ast.radius);
                            game.particles.createScorch(ast.position.clone(), ast.radius);
                            const children = ast.split();
                            ast.destroy();
                            game.waves.asteroids.splice(i, 1);
                            for (const child of children) {
                                game.waves.asteroids.push(child);
                                game.scene.add(child.mesh);
                            }
                            if (game.challengeManager) game.challengeManager.onAsteroidDestroyed();
                            break;
                        }
                    }
                    game.particles.createExplosion(ast.position.clone(), 0xffff00, 15);
                    game.addScreenShake(0.5, 2);
                    continue;
                }
                // Normal asteroids: instant destroy
                bombKillCount++;
                game.particles.createCrackFlash(ast.position.clone(), ast.radius);
                game.particles.createExplosion(ast.position.clone(), 0xffff00, 20);
                game.particles.createExplosion(ast.position.clone(), 0xff8822, 8);
                game.particles.createDebris(ast.position.clone(), { 'large': 10, 'medium': 6, 'small': 3 }[ast.size], ast.radius);
                game.particles.createScorch(ast.position.clone(), ast.radius);
                game.ui.addScore({ 'large': 25, 'medium': 50, 'small': 100 }[ast.size], 1, ast.position);
                ast.destroy();
                game.waves.asteroids.splice(i, 1);
                if (game.challengeManager) game.challengeManager.onAsteroidDestroyed();
            }
        }
        // Big central explosion — layered for drama
        const bombPos = this.position.clone();
        game.particles.createCrackFlash(bombPos, 12, 0xffffff);
        game.particles.createExplosion(bombPos, 0xffffcc, 30);
        game.particles.createExplosion(bombPos, 0xff7722, 60);
        game.particles.createExplosion(bombPos, 0xffcc44, 25);
        game.particles.createDebris(bombPos, 12, 8);
        // Three shockwave rings — staggered for rolling wave effect
        game.particles.createShockwave(bombPos, 0xffffff, 25, 0.35);
        game.particles.createShockwave(bombPos, 0xffe088, 60, 0.75);
        game.particles.createShockwave(bombPos, 0xff5522, 42, 0.55);
        // Heavy screen shake (longer than asteroid kills)
        game.addScreenShake(3.0, 5);
        // White-out screen flash
        const flashEl = document.getElementById('bombFlash');
        if (flashEl) {
            flashEl.classList.remove('flash');
            void flashEl.offsetWidth;     // force reflow to restart animation
            flashEl.classList.add('flash');
        }
        game.audio.playBombDetonation();
        if (game.audio.duckMusic) game.audio.duckMusic(0.10, 0.25, 0.7);
        if (typeof onBombUsed === 'function') onBombUsed(bombKillCount);
    }

    startTeleport() {
        this.teleporting = true;
        this.teleportTimer = this.teleportDuration;
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.invulnerable = true;
        this.invulnerableTime = 99; // will be reset in finishTeleport
        if (typeof onTeleportUsed === 'function') onTeleportUsed();

        // Departure particles
        if (window.game && window.game.particles) {
            window.game.particles.createExplosion(this.position.clone(), 0x00ffff, 15);
        }
        if (window.game && window.game.audio) {
            window.game.audio.playTeleportOut();
        }
    }

    finishTeleport() {
        this.teleporting = false;
        this.mesh.visible = true;

        // Find safe destination
        const dest = this.findSafeTeleportSpot();
        this.position.x = dest.x;
        this.position.z = dest.z;
        this.mesh.position.set(dest.x, 0.5, dest.z);

        // Arrival particles
        if (window.game && window.game.particles) {
            window.game.particles.createExplosion(this.position.clone(), 0x00ffff, 15);
        }
        if (window.game && window.game.audio) {
            window.game.audio.playTeleportIn();
        }

        // Brief invulnerability after teleport
        this.invulnerable = true;
        this.invulnerableTime = 0.5;
        this.teleportCooldown = this.teleportCooldownMax;
    }

    findSafeTeleportSpot() {
        const game = window.game;
        const b = BOUNDS;
        const margin = 15; // stay away from edges

        let bestSpot = { x: 0, z: 0 };
        let bestMinDist = 0;

        // Try 30 random spots, pick the one furthest from all dangers
        for (let i = 0; i < 30; i++) {
            const x = (b.minX + margin) + Math.random() * (b.maxX - b.minX - margin * 2);
            const z = (b.minZ + margin) + Math.random() * (b.maxZ - b.minZ - margin * 2);

            // Also skip spots too close to current position
            const fromSelf = Math.sqrt((x - this.position.x) ** 2 + (z - this.position.z) ** 2);
            if (fromSelf < 20) continue;

            let minDist = Infinity;

            // Check distance to all asteroids
            if (game && game.waves) {
                for (const ast of game.waves.asteroids) {
                    const d = Math.sqrt((x - ast.position.x) ** 2 + (z - ast.position.z) ** 2);
                    minDist = Math.min(minDist, d - ast.radius);
                }
            }

            // Check distance to hostile UFOs
            if (game && game.ufoManager) {
                for (const ufo of game.ufoManager.hostileUFOs) {
                    const d = Math.sqrt((x - ufo.position.x) ** 2 + (z - ufo.position.z) ** 2);
                    minDist = Math.min(minDist, d);
                }
                // Check UFO projectiles
                for (const ufo of game.ufoManager.hostileUFOs) {
                    for (const proj of ufo.projectiles) {
                        const d = Math.sqrt((x - proj.position.x) ** 2 + (z - proj.position.z) ** 2);
                        minDist = Math.min(minDist, d);
                    }
                }
            }

            if (minDist > bestMinDist) {
                bestMinDist = minDist;
                bestSpot = { x, z };
            }
        }

        return bestSpot;
    }

    updatePowerup(dt) {
        if (this.activePowerup && this.powerupTimer > 0) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) {
                this.activePowerup = null;
                this.powerupTimer = 0;
            }
        }
    }

    takeDamage(sourcePos = null, sourceRadius = 0) {
        // Permadead or ghost players can't take more damage
        if (this.permaDead || this.isGhost) return true;

        if (!this.invulnerable) {
            // Shield absorbs the hit
            if (this.hasShield) {
                this.hasShield = false;
                if (this.shieldMesh) this.shieldMesh.visible = false;
                if (typeof onShieldBroken === 'function') onShieldBroken();
                if (window.game && window.game.audio) {
                    window.game.audio.playShieldBreak();
                }
                this.invulnerable = true;
                this.invulnerableTime = 0.5;
                this.applyKnockback(sourcePos, sourceRadius);
                return true;
            }

            this.lives -= 1;
            this.invulnerable = true;
            this.invulnerableTime = this.maxInvulnerableTime;
            this.mesh.visible = true;

            this.hitWobbleTimer = this.hitWobbleDuration;
            this.hitFlashTimer = this.hitFlashDuration;

            this.applyKnockback(sourcePos, sourceRadius);

            if (window.game && window.game.audio) {
                window.game.audio.playHit();
            }

            // Out of lives
            if (this.lives <= 0) {
                // In co-op: enter ghost state (partner can revive).
                // In singleplayer: signal immediate death for game over.
                const isCoop = window.game && window.game.coopMode;
                if (isCoop) {
                    this.enterGhostState();
                    return false; // "down" but not perma-dead yet
                }
                return false; // singleplayer — game over
            }

            return true;
        }
        return true;
    }

    enterGhostState() {
        this.isGhost = true;
        this.reviveTimer = this.reviveDuration;
        this.reviveDwellTimer = 0;
        this.invulnerable = true;
        this.invulnerableTime = 999; // stays invuln through ghost period
        this.activePowerup = null;
        this.powerupTimer = 0;
        // Slow drift instead of stop
        this.velocity.x *= 0.3;
        this.velocity.z *= 0.3;

        // Visual: dim the ship and create a revive radius ring
        if (this.shipMaterials) {
            for (const m of this.shipMaterials) {
                m.transparent = true;
                m.opacity = 0.3;
                m.depthWrite = false;
                m.needsUpdate = true;
            }
        }

        if (!this.reviveRingMesh) {
            const geo = new THREE.RingGeometry(this.reviveRadius - 0.3, this.reviveRadius, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: this.colorHex,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            this.reviveRingMesh = new THREE.Mesh(geo, mat);
            this.reviveRingMesh.rotation.x = -Math.PI / 2;
            this.mesh.add(this.reviveRingMesh);
        }
        this.reviveRingMesh.visible = true;
    }

    updateGhost(dt, otherPlayer) {
        if (!this.isGhost) return;

        this.reviveTimer -= dt;

        // Visual: pulse opacity based on time remaining
        const t = Math.max(0, this.reviveTimer / this.reviveDuration);
        if (this.shipMaterials) {
            const blink = Math.sin(performance.now() * 0.012) * 0.5 + 0.5;
            const op = 0.15 + t * 0.25 + blink * 0.1;
            for (const m of this.shipMaterials) {
                m.opacity = op;
            }
        }

        // Pulse the revive ring
        if (this.reviveRingMesh) {
            const ringPulse = 0.3 + Math.sin(performance.now() * 0.008) * 0.2;
            this.reviveRingMesh.material.opacity = ringPulse * (0.5 + t * 0.5);
            const scale = 1 + Math.sin(performance.now() * 0.005) * 0.05;
            this.reviveRingMesh.scale.set(scale, scale, scale);
        }

        // Check for nearby live partner — accumulate dwell time
        if (otherPlayer && !otherPlayer.isGhost && !otherPlayer.permaDead) {
            const dx = otherPlayer.position.x - this.position.x;
            const dz = otherPlayer.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < this.reviveRadius) {
                this.reviveDwellTimer += dt;
                if (this.reviveDwellTimer >= this.reviveDwellNeeded) {
                    this.revive();
                    return;
                }
            } else {
                this.reviveDwellTimer = Math.max(0, this.reviveDwellTimer - dt * 0.5);
            }
        }

        // Time ran out — permanent death
        if (this.reviveTimer <= 0) {
            this.becomePermaDead();
        }
    }

    revive() {
        this.isGhost = false;
        this.lives = 1; // back from the dead with one life
        this.invulnerable = true;
        this.invulnerableTime = 3.0;
        this.reviveTimer = 0;
        this.reviveDwellTimer = 0;

        // Restore opacity
        if (this.shipMaterials) {
            for (const m of this.shipMaterials) {
                m.opacity = 1.0;
                m.transparent = false;
                m.depthWrite = true;
                m.needsUpdate = true;
            }
        }
        if (this.reviveRingMesh) this.reviveRingMesh.visible = false;

        // Audio + particles
        if (window.game) {
            if (window.game.particles) {
                window.game.particles.createExplosion(this.position.clone(), this.colorHex, 25);
            }
            if (window.game.audio) {
                window.game.audio.playPickup();
            }
        }
    }

    becomePermaDead() {
        this.isGhost = false;
        this.permaDead = true;
        if (this.mesh) this.mesh.visible = false;
        if (this.reviveRingMesh) this.reviveRingMesh.visible = false;
    }

    applyKnockback(sourcePos, sourceRadius = 0) {
        if (!sourcePos) return;
        let dx = this.position.x - sourcePos.x;
        let dz = this.position.z - sourcePos.z;
        let dist = Math.sqrt(dx * dx + dz * dz);

        // Degenerate case: ship perfectly centered on source. Use ship velocity
        // direction (or a random direction if stationary) so we still get a push.
        if (dist < 0.01) {
            const v = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (v > 0.01) {
                dx = -this.velocity.x / v; // away from movement direction
                dz = -this.velocity.z / v;
            } else {
                const a = Math.random() * Math.PI * 2;
                dx = Math.cos(a);
                dz = Math.sin(a);
            }
            dist = 1;
        }

        const nx = dx / dist;
        const nz = dz / dist;

        // Hard position teleport: push the ship strictly outside the source radius
        // plus a safety margin so the next collision check sees us as clear.
        const safeDist = sourceRadius + this.radius + 2;
        this.position.x = sourcePos.x + nx * safeDist;
        this.position.z = sourcePos.z + nz * safeDist;

        // Replace velocity with strong push away from impact source
        const force = 40;
        this.velocity.x = nx * force;
        this.velocity.z = nz * force;
    }
    
    // In-place reset for restart without page reload. Returns the ship to a
    // fresh state without disposing the mesh / GLB / shield.
    reset() {
        // Physics — spawn offset based on slot so P1 and P2 don't overlap
        this.position.x = this.slot === 0 ? 0 : 8;
        this.position.z = 0;
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.angle = 0;

        // Ghost / death state
        this.isGhost = false;
        this.permaDead = false;
        this.reviveTimer = 0;
        this.reviveDwellTimer = 0;
        if (this.reviveRingMesh) this.reviveRingMesh.visible = false;

        // Lives + invulnerability
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTime = 0;

        // Hit feedback timers
        this.hitWobbleTimer = 0;
        this.hitFlashTimer = 0;

        // Cooldowns
        this.shootCooldown = 0;
        this.teleportCooldown = 0;
        this.teleporting = false;
        this.teleportTimer = 0;

        // Power-ups
        this.activePowerup = null;
        this.powerupTimer = 0;
        this.powerupLocked = false;
        this.hasShield = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;

        // Clear projectiles
        for (const p of this.projectiles) p.destroy();
        this.projectiles = [];

        // Reset input state
        this.input.rotate = 0;
        this.input.thrust = 0;
        this.input.shoot = false;
        this.input.brake = false;
        this.input.teleport = false;

        // Restore mesh visibility, position, rotation, and full opacity
        if (this.mesh) {
            this.mesh.visible = true;
            this.mesh.position.set(this.position.x, 0.5, this.position.z);
            this.mesh.rotation.set(0, 0, 0);
        }
        if (this.setShipOpacity) this.setShipOpacity(1.0);

        // Restore any in-flight emissive flash to original colors immediately
        if (this._wasFlashing && this._origEmissives) {
            for (const o of this._origEmissives) {
                o.material.emissive.copy(o.color);
                o.material.emissiveIntensity = o.intensity;
            }
            this._wasFlashing = false;
        }
    }

    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        for (let p of this.projectiles) {
            p.destroy();
        }
    }
}
