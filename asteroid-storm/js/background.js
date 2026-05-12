// Background — big planets + moons + atmospheres that sit far beneath the
// play plane so the player always flies "above" them.
//
// Each variant is a composed *scene*: one main planet, any number of moons,
// plus optional atmosphere halo, ring, and distant far-planets for depth.
// Planets and moons can be either procedural spheres or imported GLB meshes.

// ── Model registry (planets and moons, all lazily loaded + cached) ──
const PLANET_MODELS = {
    quaternius: {
        path: 'assets/planets/planet-quaternius.glb',
        credit: 'Planet by Quaternius (poly.pizza / CC0)',
        // This model has a white baseColor — its detail lives in a texture atlas,
        // so tinting material.color shifts the whole palette.
        tintable: true
    },
    mars: {
        path: 'assets/planets/Mars.glb',
        credit: 'Mars by Poly by Google (poly.pizza / CC-BY 3.0)'
    },
    earth: {
        path: 'assets/planets/Earth.glb',
        credit: 'Earth by Poly by Google (poly.pizza / CC-BY 3.0)'
    },
    moon: {
        path: 'assets/planets/Moon.glb',
        credit: 'Moon by Poly by Google (poly.pizza / CC-BY 3.0)'
    },
    saturnus: {
        path: 'assets/planets/saturnus.glb',
        credit: 'Planet with rings (poly.pizza)'
    },
    pinkplanet: {
        path: 'assets/planets/pinkplanet.glb',
        credit: 'Pink planet (poly.pizza)'
    },
    lavaplanet: {
        path: 'assets/planets/lavaplanet.glb',
        credit: 'Lava planet (poly.pizza)'
    },
    ringedplanet: {
        path: 'assets/planets/planet_with_rings.glb',
        credit: 'Planet with Rings by Liz Reddington (poly.pizza / CC-BY 3.0)'
    }
};

// Cache: modelId → loaded Three.js scene
const _planetModelCache = {};

// ── Scene variants ──
// Each variant describes a full background scene. `main` is the big planet.
// `moons` is an array of moon configs. `far` are tiny distant planets.
const PLANET_VARIANTS = [
    // Mars with two tiny moons (Phobos + Deimos vibes)
    {
        id: 'mars', name: 'MARS', description: 'Red planet with two moons',
        main:  { model: 'mars', size: 70 },
        moons: [
            { model: 'moon', size: 5, orbit: 95,  speed: 0.18, tiltZ: 0.4, tiltX: -0.2 },
            { model: 'moon', size: 7, orbit: 125, speed: 0.06, tiltZ: -0.3, tiltX: 0.15 }
        ],
        far: [ { color: 0x223355, size: 11, x: -85, y: -115, z: -155 } ],
        grade: { r: 1.35, g: 0.95, b: 0.70, strength: 0.65 }
    },

    // Saturn-style ringed gas giant with a family of moons
    {
        id: 'saturn', name: 'SATURN', description: 'Ringed gas giant with three moons',
        main:  { model: 'saturnus', size: 75 },
        moons: [
            { model: 'moon', size: 4, orbit: 110, speed: 0.22, tiltZ: 0.0, tiltX: 0.05 },
            { model: 'moon', size: 6, orbit: 150, speed: 0.1,  tiltZ: 0.15, tiltX: -0.1 },
            { model: 'moon', size: 3, orbit: 135, speed: 0.28, tiltZ: -0.2, tiltX: 0.2 }
        ],
        far: [ { color: 0x335577, size: 8, x: -90, y: -100, z: -130 } ],
        grade: { r: 1.20, g: 1.08, b: 0.78, strength: 0.55 }
    },

    // Pink alien planet with a moon
    {
        id: 'nebula', name: 'NEBULA', description: 'Pink alien world with atmosphere',
        main:  { model: 'pinkplanet', size: 65 },
        moons: [
            { model: 'moon', size: 6, orbit: 95, speed: 0.14, tiltZ: 0.3, tiltX: -0.1 }
        ],
        atmo:  { color: 0xff66cc, opacity: 0.12 },
        far: [ { color: 0x442266, size: 10, x: 85, y: -100, z: -145 } ],
        grade: { r: 1.25, g: 0.85, b: 1.20, strength: 0.65 }
    },

    // Lava world — hot + menacing, no moons, glowing
    {
        id: 'inferno', name: 'INFERNO', description: 'Lava world, menacing glow',
        main:  { model: 'lavaplanet', size: 70 },
        atmo:  { color: 0xff3300, opacity: 0.22 },
        far: [ { color: 0x332211, size: 9, x: 80, y: -110, z: -150 },
               { color: 0x223344, size: 6, x: -95, y: -125, z: -140 } ],
        grade: { r: 1.45, g: 0.78, b: 0.55, strength: 0.75 }
    },

    // Ringed fantasy planet by Liz Reddington
    {
        id: 'ringed', name: 'RINGED WORLD', description: 'Fantasy planet with rings',
        main:  { model: 'ringedplanet', size: 80 },
        moons: [
            { model: 'moon', size: 5, orbit: 140, speed: 0.12, tiltZ: 0.25, tiltX: 0.15 }
        ],
        far: [ { color: 0x443366, size: 10, x: -85, y: -115, z: -145 } ],
        grade: { r: 0.98, g: 0.92, b: 1.32, strength: 0.55 }
    },

    // Tinted Quaternius — Mars red variant
    {
        id: 'crimson', name: 'CRIMSON', description: 'Deep red desert world',
        main:  { model: 'quaternius', size: 72 },
        tint:  0xcc4422,
        moons: [
            { model: 'moon', size: 6, orbit: 105, speed: 0.1, tiltZ: 0.2, tiltX: -0.15 }
        ],
        far: [ { color: 0x335577, size: 8, x: -90, y: -100, z: -130 } ],
        grade: { r: 1.40, g: 0.82, b: 0.72, strength: 0.65 }
    },

    // Tinted Quaternius — icy blue variant
    {
        id: 'frozen', name: 'FROZEN', description: 'Icy blue giant with twin moons',
        main:  { model: 'quaternius', size: 85 },
        tint:  0x3388cc,
        moons: [
            { model: 'moon', size: 7, orbit: 115, speed: 0.09, tiltZ: 0.1, tiltX: 0.05 },
            { model: 'moon', size: 4, orbit: 140, speed: 0.2,  tiltZ: -0.4, tiltX: 0.3 }
        ],
        far: [ { color: 0x441133, size: 12, x: -70, y: -110, z: -160 } ],
        grade: { r: 0.75, g: 1.00, b: 1.40, strength: 0.70 }
    },

    // Tinted Quaternius — alien purple
    {
        id: 'void', name: 'THE VOID', description: 'Alien purple world, three moons',
        main:  { model: 'quaternius', size: 65 },
        tint:  0x8844cc,
        moons: [
            { model: 'moon', size: 5, orbit: 95,  speed: 0.15, tiltZ: 0.3, tiltX: 0.1 },
            { model: 'moon', size: 3, orbit: 115, speed: 0.3,  tiltZ: -0.5, tiltX: -0.2 },
            { model: 'moon', size: 4, orbit: 130, speed: 0.05, tiltZ: 0.2, tiltX: 0.3 }
        ],
        far: [ { color: 0x224466, size: 10, x: 85, y: -100, z: -145 } ],
        grade: { r: 1.10, g: 0.78, b: 1.38, strength: 0.65 }
    },

    // Spiral galaxy — procedural, no GLB needed
    {
        id: 'galaxy', name: 'GALAXY', description: 'Deep space spiral galaxy',
        galaxy: true,
        grade: { r: 1.05, g: 0.92, b: 1.18, strength: 0.40 }
    }
];

class Background {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.planet = null;
        this.moonOrbits = [];   // array of { pivot, mesh, speed, selfSpin }
        this.ring = null;
        this.farPlanets = [];
        this.time = 0;

        this.loader = new THREE.GLTFLoader();
        if (typeof MeshoptDecoder !== 'undefined') this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.buildRandom();
    }

    clear() {
        this.group.traverse(obj => {
            const cached = obj.userData && obj.userData.fromCache;
            if (obj.geometry && !cached) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
        while (this.group.children.length > 0) this.group.remove(this.group.children[0]);

        // Restore nebula background if galaxy replaced it
        if (this._savedBackground && this.scene) {
            this.scene.background = this._savedBackground;
            this._savedBackground = null;
        }
        // Clean up galaxy render target + scene
        if (this._galaxyRT) {
            this._galaxyRT.dispose();
            if (this._galaxyScene) {
                this._galaxyScene.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
            }
            this._galaxyScene = null;
            this._galaxyCam = null;
            this._galaxyGroup = null;
            this._galaxyRT = null;
        }
        this.planet = null;
        this.moonOrbits = [];
        this.ring = null;
        this.farPlanets = [];
        this.galaxyGroup = null;
    }

    buildRandom() {
        this.clear();
        // Check for user-selected world (from Worlds menu)
        const selectedId = (typeof Worlds !== 'undefined') ? Worlds.getSelectedId() : null;
        let variant;
        if (selectedId && selectedId !== 'random') {
            variant = PLANET_VARIANTS.find(v => v.id === selectedId);
        }
        if (!variant) {
            variant = PLANET_VARIANTS[Math.floor(Math.random() * PLANET_VARIANTS.length)];
        }
        console.log('Background: building variant', variant.id || variant.name || 'unknown', 'selectedId:', selectedId);
        this.build(variant);

        // Push the variant's color grade into the renderer pipeline. Falls
        // back to identity (no shift) for variants without a grade entry.
        if (window.game && typeof window.game.applyColorGrade === 'function') {
            window.game.applyColorGrade(variant.grade);
        }
    }

    // Load a GLB model and apply it to the scene at the given position and
    // logical size. Calls `onReady(group)` once the clone is ready (either
    // synchronously if cached, or asynchronously after loading).
    _loadModelInstance(modelId, targetSize, onReady, onPlaceholder, tintHex) {
        const def = PLANET_MODELS[modelId];
        if (!def) { console.warn('Unknown planet model:', modelId); return; }

        const instantiate = (source) => {
            const clone = source.clone(true);

            // Clone materials so per-instance tweaks don't leak into the cache.
            clone.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(m => m.clone());
                    } else {
                        child.material = child.material.clone();
                    }
                }
            });
            clone.traverse(c => { c.userData.fromCache = true; });

            // Normalize size by bounding box so every model fills the same
            // logical volume regardless of its authored scale.
            const box = new THREE.Box3().setFromObject(clone);
            const bsize = new THREE.Vector3();
            box.getSize(bsize);
            const maxDim = Math.max(bsize.x, bsize.y, bsize.z);
            const scale = (targetSize * 2) / maxDim;
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Apply scale + geometry-center-offset to the inner clone, then
            // wrap in a Group so the OUTER node's position acts as the
            // visible planet center. Without this wrapper, callers that do
            // outer.position.set(x,y,z) would lose the centering — that's
            // why Mars was rendering off-screen (its model is authored with
            // an off-center origin, unlike Quaternius/etc).
            clone.scale.set(scale, scale, scale);
            clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

            // Per-material polish — tint (if requested), subtle emissive boost,
            // remove metallic sheen so colors read punchy.
            clone.traverse(child => {
                if (child.isMesh && child.material) {
                    const mat = child.material;
                    if (tintHex !== undefined && def.tintable && mat.color) {
                        mat.color.setHex(tintHex);
                    }
                    if (mat.emissive && mat.color) {
                        mat.emissive.copy(mat.color);
                        mat.emissiveIntensity = 0.25;
                        if (mat.map) {
                            mat.emissiveMap = mat.map;
                            mat.emissive.setHex(0xffffff);
                            mat.emissiveIntensity = 0.2;
                        }
                    }
                    if (mat.roughness !== undefined) mat.roughness = 0.85;
                    if (mat.metalness !== undefined) mat.metalness = 0.0;
                    mat.needsUpdate = true;
                }
            });

            const outer = new THREE.Group();
            outer.add(clone);
            outer.userData.fromCache = true;
            onReady(outer);
        };

        if (_planetModelCache[modelId]) {
            instantiate(_planetModelCache[modelId]);
        } else {
            if (onPlaceholder) onPlaceholder();
            this.loader.load(def.path, (gltf) => {
                _planetModelCache[modelId] = gltf.scene;
                instantiate(gltf.scene);
            }, undefined, (err) => {
                console.warn('Model load failed:', def.path, err);
            });
        }
    }

    build(variant) {
        // ── Galaxy variant (procedural spiral, no GLB) ──
        if (variant.galaxy) {
            console.log('Building galaxy background');
            this._buildGalaxy();
            console.log('Galaxy group children:', this.galaxyGroup ? this.galaxyGroup.children.length : 'none');
            return;
        }

        const m = variant.main;

        // Randomize which corner the planet peeks from
        const side = Math.random() < 0.5 ? -1 : 1;
        const posX = side * 40;
        const posY = -m.size - 10;
        const posZ = -30 + (Math.random() - 0.5) * 40;
        const rotZ = (Math.random() - 0.5) * 0.4;

        // Keep the planet position for dependent layers (moons, atmo, ring)
        this.planetPos = new THREE.Vector3(posX, posY, posZ);

        // ── Main planet ──
        if (m.model) {
            const placeholderGeo = new THREE.SphereGeometry(m.size, 24, 16);
            const placeholderMat = new THREE.MeshBasicMaterial({
                color: variant.tint || 0x222233,
                transparent: true,
                opacity: 0.3
            });
            const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
            placeholder.position.set(posX, posY, posZ);

            this._loadModelInstance(m.model, m.size,
                (planetClone) => {
                    planetClone.position.set(posX, posY, posZ);
                    planetClone.rotation.z = rotZ;
                    if (placeholder.parent) this.group.remove(placeholder);
                    placeholderGeo.dispose();
                    placeholderMat.dispose();
                    this.group.add(planetClone);
                    this.planet = planetClone;
                },
                () => {
                    this.group.add(placeholder);
                    this.planet = placeholder;
                },
                variant.tint
            );
        } else if (m.color !== undefined) {
            // Procedural fallback
            const planetGeo = new THREE.SphereGeometry(m.size, 48, 32);
            const planetMat = new THREE.MeshStandardMaterial({
                color: m.color,
                emissive: m.emissive || 0x000000,
                emissiveIntensity: 0.35,
                roughness: 0.85,
                metalness: 0.1
            });
            this.planet = new THREE.Mesh(planetGeo, planetMat);
            this.planet.position.set(posX, posY, posZ);
            this.planet.rotation.z = rotZ;
            this.group.add(this.planet);
        }

        // ── Atmosphere halo ──
        if (variant.atmo) {
            const atmoGeo = new THREE.SphereGeometry(m.size * 1.08, 32, 24);
            const atmoMat = new THREE.MeshBasicMaterial({
                color: variant.atmo.color,
                transparent: true,
                opacity: variant.atmo.opacity,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const atmo = new THREE.Mesh(atmoGeo, atmoMat);
            atmo.position.copy(this.planetPos);
            this.group.add(atmo);
        }

        // ── Optional ring ──
        if (m.ring) {
            const ringGeo = new THREE.RingGeometry(m.ring.inner, m.ring.outer, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: m.ring.color,
                transparent: true,
                opacity: m.ring.opacity,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 - 0.3 + (Math.random() - 0.5) * 0.15;
            ring.rotation.z = (Math.random() - 0.5) * 0.4;
            ring.position.copy(this.planetPos);
            this.group.add(ring);
            this.ring = ring;
        }

        // ── Moons (array of any length) ──
        if (variant.moons) {
            for (const moonCfg of variant.moons) {
                this._spawnMoon(moonCfg);
            }
        }

        // ── Far background planets ──
        if (variant.far) {
            for (const f of variant.far) {
                const geo = new THREE.SphereGeometry(f.size, 20, 14);
                const mat = new THREE.MeshStandardMaterial({
                    color: f.color,
                    emissive: f.color,
                    emissiveIntensity: 0.25,
                    roughness: 0.95,
                    metalness: 0.05
                });
                const far = new THREE.Mesh(geo, mat);
                far.position.set(f.x, f.y, f.z);
                this.group.add(far);
                this.farPlanets.push(far);
            }
        }
    }

    _spawnMoon(cfg) {
        const orbitPivot = new THREE.Group();
        orbitPivot.position.copy(this.planetPos);
        orbitPivot.rotation.z = cfg.tiltZ || 0;
        orbitPivot.rotation.x = cfg.tiltX || 0;
        orbitPivot.rotation.y = Math.random() * Math.PI * 2; // random start angle
        this.group.add(orbitPivot);

        const orbitRadius = cfg.orbit;
        const orbitSpeed = cfg.speed !== undefined ? cfg.speed : 0.1;
        const selfSpin = 0.1 + Math.random() * 0.15;

        const orbitRecord = {
            pivot: orbitPivot,
            mesh: null,
            speed: orbitSpeed,
            selfSpin: selfSpin
        };
        this.moonOrbits.push(orbitRecord);

        if (cfg.model) {
            this._loadModelInstance(cfg.model, cfg.size,
                (moonClone) => {
                    moonClone.position.set(orbitRadius, (Math.random() - 0.5) * 8, 0);
                    orbitPivot.add(moonClone);
                    orbitRecord.mesh = moonClone;
                },
                null,
                cfg.tint
            );
        } else {
            // Procedural sphere moon
            const moonGeo = new THREE.SphereGeometry(cfg.size, 24, 16);
            const moonMat = new THREE.MeshStandardMaterial({
                color: cfg.color || 0xaaaaaa,
                emissive: cfg.emissive || 0x111111,
                emissiveIntensity: 0.3,
                roughness: 0.9,
                metalness: 0.1
            });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.position.set(orbitRadius, 0, 0);
            orbitPivot.add(moon);
            orbitRecord.mesh = moon;
        }
    }

    // ── Galaxy builder — renders to a texture using a separate perspective
    // camera (same setup as galaxy-background.html) and uses the result as
    // scene.background. This sidesteps the ortho-camera limitations entirely.
    _buildGalaxy() {
        const renderer = window.game && window.game.renderer;
        if (!renderer) return;

        const w = renderer.domElement.width || 1920;
        const h = renderer.domElement.height || 1080;
        const rt = new THREE.WebGLRenderTarget(w, h);

        // Separate scene + perspective camera — matches galaxy-background.html
        const gScene = new THREE.Scene();
        gScene.background = new THREE.Color(0x020208);
        // Show entire galaxy with margin — pulled back enough to see all arms
        const gCam = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
        gCam.position.set(0, -8, 72);
        gCam.lookAt(0, -4, 0);

        const galaxy = new THREE.Group();
        galaxy.rotation.x = 35 * Math.PI / 180;
        // Stretch horizontally to fill widescreen better
        galaxy.scale.set(1.4, 1, 1);
        gScene.add(galaxy);

        const R = 30, CORE = 3.5, ARMS = 2, TIGHTNESS = 4.5, ARM_SPREAD = 0.16;
        const spiralAngle = (r) => Math.log(r + 0.5) * TIGHTNESS;
        const gaussRand = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const ySpread = (r) => {
            const nr = r / R;
            return Math.exp(-nr * nr * 8) * 4.0 + 0.6;
        };

        // Helper — parent defaults to galaxy (rotates), pass gScene for static
        const makePoints = (count, setupFn, vs, fs, blending, order, parent) => {
            const pos = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            const colors = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) setupFn(i, pos, sizes, colors);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const mat = new THREE.ShaderMaterial({
                transparent: true, depthWrite: false,
                blending: blending || THREE.AdditiveBlending,
                vertexShader: vs, fragmentShader: fs
            });
            const pts = new THREE.Points(geo, mat);
            pts.renderOrder = order || 0;
            (parent || galaxy).add(pts);
        };

        // Perspective vertex shader (same as original)
        const pointVS = `
            attribute float size; attribute vec3 color;
            varying vec3 vC;
            void main(){
                vC = color;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (250.0 / (-mv.z));
                gl_Position = projectionMatrix * mv;
            }`;

        // Stars — 22k (core + arm + disk + stray edge stars)
        const SC = 22000;
        makePoints(SC, (i, p, s, c) => {
            let r, a, h;
            if (i < SC * 0.25) {
                // Core
                r = Math.random() * Math.random() * Math.random() * CORE * 4;
                a = Math.random() * Math.PI * 2;
            } else if (i < SC * 0.65) {
                // Arms — with per-star radius jitter for ragged edges
                const arm = Math.floor(Math.random() * ARMS);
                const maxR = R * (0.85 + Math.random() * 0.3); // 85%-115% of R
                r = CORE * 0.3 + Math.pow(Math.random(), 0.5) * (maxR - CORE * 0.3);
                a = spiralAngle(r) + arm * Math.PI + gaussRand() * ARM_SPREAD * (0.3 + (r / R) * 1.0);
            } else if (i < SC * 0.9) {
                // Disk — irregular edge via per-star max radius
                const maxR = R * (0.7 + Math.random() * 0.5); // 70%-120%
                r = Math.pow(Math.random(), 0.45) * maxR;
                a = Math.random() * Math.PI * 2;
            } else {
                // Stray stars beyond the main disk — sparse, dim, irregular halo
                r = R * (0.9 + Math.random() * 0.6); // 90%-150% of R
                a = Math.random() * Math.PI * 2;
            }
            h = ySpread(Math.min(r, R));
            p[i*3] = Math.cos(a) * r;
            p[i*3+1] = gaussRand() * h * 0.3;
            p[i*3+2] = Math.sin(a) * r;
            // Stray stars are dimmer + smaller
            const isStray = i >= SC * 0.9;
            s[i] = isStray ? 0.2 + Math.random() * 0.5 : 0.3 + Math.random() * 1.2;
            const nr = r / R;
            if (nr < 0.15) { c[i*3]=1; c[i*3+1]=0.88; c[i*3+2]=0.5; }
            else if (nr < 0.4) { c[i*3]=0.95; c[i*3+1]=0.85; c[i*3+2]=0.6; }
            else if (nr < 0.6) { c[i*3]=0.7; c[i*3+1]=0.8; c[i*3+2]=1; }
            else { c[i*3]=0.45+Math.random()*0.2; c[i*3+1]=0.55+Math.random()*0.2; c[i*3+2]=0.9; }
            if (isStray) { c[i*3]*=0.5; c[i*3+1]*=0.5; c[i*3+2]*=0.5; }
        }, pointVS, `
            varying vec3 vC;
            void main(){
                float r = length(gl_PointCoord - 0.5);
                if (r > 0.5) discard;
                float b = exp(-r*r*18.0)*0.7 + exp(-r*r*5.0)*0.3;
                gl_FragColor = vec4(vC*b, b*0.9);
            }`, THREE.AdditiveBlending, 2);

        // Nebula clouds
        makePoints(2500, (i, p, s, c) => {
            const arm = Math.floor(Math.random() * ARMS);
            const r = CORE + Math.pow(Math.random(), 0.5) * (R * 0.9 - CORE);
            const a = spiralAngle(r) + arm * Math.PI + gaussRand() * 0.5;
            p[i*3] = Math.cos(a) * r;
            p[i*3+1] = gaussRand() * ySpread(r) * 0.2;
            p[i*3+2] = Math.sin(a) * r;
            s[i] = 2.5 + Math.random() * 5;
            const pick = Math.random();
            if (pick < 0.25) { c[i*3]=0.5; c[i*3+1]=0.12; c[i*3+2]=0.3; }
            else if (pick < 0.5) { c[i*3]=0.12; c[i*3+1]=0.2; c[i*3+2]=0.45; }
            else if (pick < 0.7) { c[i*3]=0.25; c[i*3+1]=0.1; c[i*3+2]=0.35; }
            else { c[i*3]=0.08; c[i*3+1]=0.25; c[i*3+2]=0.3; }
        }, pointVS, `
            varying vec3 vC;
            void main(){
                float r = length(gl_PointCoord - 0.5);
                if (r > 0.5) discard;
                float soft = exp(-r*r*3.0);
                gl_FragColor = vec4(vC*soft, soft*0.18);
            }`, THREE.AdditiveBlending, 1);

        // Arm glow streaks — blue/cyan/pink ribbons tight along spiral arms
        makePoints(6000, (i, p, s, c) => {
            const arm = Math.floor(Math.random() * ARMS);
            const maxR = R * (0.85 + Math.random() * 0.25);
            const r = CORE * 1.2 + Math.pow(Math.random(), 0.4) * (maxR - CORE * 1.2);
            const nr = r / R;
            const base = spiralAngle(r) + arm * Math.PI;
            const scatter = gaussRand() * 0.18 * (0.2 + nr * 0.5);
            const a = base + scatter;
            p[i*3] = Math.cos(a) * r;
            p[i*3+1] = gaussRand() * 0.25;
            p[i*3+2] = Math.sin(a) * r;
            s[i] = 1.0 + Math.random() * 2.0;
            const pick = Math.random();
            if (pick < 0.5) { c[i*3]=0.35+Math.random()*0.2; c[i*3+1]=0.55+Math.random()*0.2; c[i*3+2]=0.9; }
            else if (pick < 0.75) { c[i*3]=0.7; c[i*3+1]=0.8; c[i*3+2]=1.0; }
            else { c[i*3]=0.9; c[i*3+1]=0.3; c[i*3+2]=0.55; }
        }, pointVS, `
            varying vec3 vC;
            void main(){
                float r = length(gl_PointCoord - 0.5);
                if (r > 0.5) discard;
                float soft = exp(-r*r*8.0);
                gl_FragColor = vec4(vC*soft, soft*0.6);
            }`, THREE.AdditiveBlending, 1);

        // HII cluster regions — big bright nebula patches along arms
        makePoints(50, (i, p, s, c) => {
            const arm = Math.floor(Math.random() * ARMS);
            const r = CORE * 1.5 + Math.pow(Math.random(), 0.4) * (R * 0.9 - CORE * 1.5);
            const a = spiralAngle(r) + arm * Math.PI + gaussRand() * 0.12;
            p[i*3] = Math.cos(a) * r;
            p[i*3+1] = gaussRand() * 0.15;
            p[i*3+2] = Math.sin(a) * r;
            s[i] = 10 + Math.random() * 20;
            const pick = Math.random();
            if (pick < 0.6) { c[i*3]=1.0; c[i*3+1]=0.35+Math.random()*0.2; c[i*3+2]=0.55; }
            else if (pick < 0.85) { c[i*3]=0.6; c[i*3+1]=0.75; c[i*3+2]=1.0; }
            else { c[i*3]=0.85; c[i*3+1]=0.25; c[i*3+2]=0.8; }
        }, pointVS, `
            varying vec3 vC;
            void main(){
                float r = length(gl_PointCoord - 0.5);
                if (r > 0.5) discard;
                float core = exp(-r*r*10.0);
                float halo = exp(-r*r*2.0);
                float total = core*0.5 + halo*0.3;
                gl_FragColor = vec4(vC*total, total*0.5);
            }`, THREE.AdditiveBlending, 2);

        // Background field stars (outside galaxy) — added to gScene (static, don't rotate)
        makePoints(800, (i, p, s, c) => {
            p[i*3] = (Math.random()-0.5)*120;
            p[i*3+1] = (Math.random()-0.5)*80;
            p[i*3+2] = -30 + Math.random()*15;
            s[i] = 0.4 + Math.random() * 0.8;
            const w = 0.5 + Math.random() * 0.4;
            c[i*3]=w; c[i*3+1]=w; c[i*3+2]=w;
        }, pointVS, `
            varying vec3 vC;
            void main(){
                float r = length(gl_PointCoord - 0.5);
                if (r > 0.5) discard;
                float soft = exp(-r*r*15.0);
                gl_FragColor = vec4(vC*soft, soft*0.8);
            }`, THREE.AdditiveBlending, 0, gScene);

        // Core glow
        const coreGeo = new THREE.PlaneGeometry(CORE * 8, CORE * 8);
        const coreMat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
            fragmentShader: `
                varying vec2 vUv;
                void main(){
                    vec2 c = vUv - 0.5; float d = length(c) * 2.0;
                    float g1 = exp(-d*d*2.5);
                    float g2 = exp(-d*d*8.0);
                    vec3 warm = vec3(1.0, 0.8, 0.4);
                    vec3 hot = vec3(1.0, 0.95, 0.8);
                    vec3 col = mix(warm, hot, g2) * (g1*0.5 + g2*0.4);
                    gl_FragColor = vec4(col, g1 * 0.5);
                }`
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.renderOrder = 3;
        galaxy.add(coreMesh);

        // Initial render
        renderer.setRenderTarget(rt);
        renderer.render(gScene, gCam);
        renderer.setRenderTarget(null);

        // Use the rendered texture as the game's background
        this._savedBackground = this.scene.background;
        this.scene.background = rt.texture;

        // Keep references alive for per-frame rotation + re-render
        this._galaxyScene = gScene;
        this._galaxyCam = gCam;
        this._galaxyGroup = galaxy;
        this._galaxyRT = rt;
    }

    update(dt) {
        this.time += dt;

        // Galaxy: rotate + re-render to texture each frame
        if (this._galaxyGroup && this._galaxyRT) {
            this._galaxyGroup.rotation.y += dt * 0.03;
            const renderer = window.game && window.game.renderer;
            if (renderer) {
                renderer.setRenderTarget(this._galaxyRT);
                renderer.render(this._galaxyScene, this._galaxyCam);
                renderer.setRenderTarget(null);
            }
        }

        // Planet slow rotation
        if (this.planet) this.planet.rotation.y += dt * 0.02;

        // Moons orbit + spin
        for (const rec of this.moonOrbits) {
            rec.pivot.rotation.y += dt * rec.speed;
            if (rec.mesh) rec.mesh.rotation.y += dt * rec.selfSpin;
        }

        // Ring drift
        if (this.ring) this.ring.rotation.z += dt * 0.01;

        // Far planets
        for (const fp of this.farPlanets) fp.rotation.y += dt * 0.01;
    }
}
