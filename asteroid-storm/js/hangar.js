// Hangar — full-screen 3D ship dock with glowing ceiling grid, reflective
// floor, volumetric light shafts, and a rotating ship platform in the centre.

class Hangar {
    constructor() {
        this.canvas = document.getElementById('hangarCanvas');
        if (!this.canvas) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010306);
        this.scene.fog = new THREE.Fog(0x010306, 30, 110);

        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
        // Camera placed back + elevated so the full pit, podium, catwalks
        // and ship read clearly in one shot.
        this.camera.position.set(0, 16, 48);
        this.camera.lookAt(0, 4, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(w, h, false);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.buildEnvironment();

        // Ship rotates on its own group so we can swap models in/out cleanly
        this.shipGroup = new THREE.Group();
        // Ship floats just above the pit platform (pit floor is at y=-2.5,
        // platform top at y≈-2, ship hovers ~2m above that)
        this.shipGroup.position.set(0, 0, 0);
        this.scene.add(this.shipGroup);

        // Slide animation state (legacy — kept for compatibility)
        this.slideOffset = 0;
        this.slideTarget = 0;
        this.slideDirection = 0;
        this.pendingShipId = null;

        // Floor-door ship cycle state
        this._shipState = 'idle';     // 'idle' | 'cycle'
        this._shipCycleT = 0;         // ms elapsed in cycle
        this._shipSwapped = false;    // whether the model swap has occurred
        this._doorOpenAmount = 0;     // 0 = closed, 1 = fully open

        this.currentId = Ships.getEquippedId();
        this.previewId = this.currentId;
        this.spinAngle = 0;

        this.loader = new THREE.GLTFLoader();
        if (typeof MeshoptDecoder !== 'undefined') this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.loadedModels = {};
        this.active = false;

        this.loadCurrent();
        this.tick();

        // Resize handler — kept on the prototype so we can rebind cleanly
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        const canvas = this.renderer.domElement;
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        if (!w || !h) return;
        this.camera.aspect = w / h;
        // Small canvas = mobile — zoom in tight on just the ship
        if (w > 0 && h > 0 && (w < 800 || h < 400)) {
            this.camera.fov = 40;
            this.camera.position.set(0, 4, 14);
            this.camera.lookAt(0, 0.5, 0);
        } else {
            this.camera.fov = 50;
            this.camera.position.set(0, 16, 48);
            this.camera.lookAt(0, 4, 0);
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    // Redraw all console screens. Each type has its own layout: status
    // lines, scanner blip, telemetry bars, diagnostic scrolling text.
    _updateConsoleScreens() {
        if (!this.consoleScreens) return;
        const now = performance.now();
        const dotOn = Math.floor(now / 400) % 2 === 0;

        for (const s of this.consoleScreens) {
            const ctx = s.ctx;
            const W = s.canvas.width, H = s.canvas.height;

            // Background
            ctx.fillStyle = '#001828';
            ctx.fillRect(0, 0, W, H);

            // Thin scan line overlay (retro CRT feel)
            ctx.fillStyle = 'rgba(0, 40, 60, 0.4)';
            for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

            ctx.font = '10px monospace';
            const t = (now + s.offset) * 0.001;

            if (s.type === 'status') {
                ctx.fillStyle = '#44ffaa';
                ctx.fillText('SYSTEM STATUS', 8, 14);
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(8, 18, W - 16, 1);

                const lines = [
                    ['HULL',       'NOMINAL',   '#44ffaa'],
                    ['SHIELD',     'ONLINE',    '#44ffaa'],
                    ['ENGINE',     'IDLE',      '#66ccff'],
                    ['WEAPONS',    'STANDBY',   '#ffcc44'],
                    ['DOCK LOCK',  'ENGAGED',   '#44ffaa']
                ];
                for (let i = 0; i < lines.length; i++) {
                    const y = 32 + i * 14;
                    ctx.fillStyle = '#88bbdd';
                    ctx.fillText(lines[i][0], 8, y);
                    ctx.fillStyle = lines[i][2];
                    ctx.fillText(lines[i][1], 120, y);
                    // Blinking indicator dot
                    if (dotOn) {
                        ctx.fillStyle = lines[i][2];
                        ctx.fillRect(W - 18, y - 7, 6, 6);
                    }
                }

            } else if (s.type === 'scanner') {
                ctx.fillStyle = '#44ffaa';
                ctx.fillText('PROX SCAN', 8, 14);
                // Radar circle
                const cx = W / 2, cy = H / 2 + 8, r = 42;
                ctx.strokeStyle = 'rgba(68, 255, 170, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - r, cy);
                ctx.lineTo(cx + r, cy);
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx, cy + r);
                ctx.stroke();
                // Sweeping radar line
                const sweepAngle = t * 1.4;
                ctx.strokeStyle = '#88ffcc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
                ctx.stroke();
                // Blip dots
                const blips = [
                    { a: 1.2, r: 0.6 },
                    { a: 2.9, r: 0.4 },
                    { a: 4.7, r: 0.85 }
                ];
                ctx.fillStyle = '#44ffaa';
                for (const b of blips) {
                    const fade = Math.max(0, 1 - ((sweepAngle - b.a) % (Math.PI * 2)) / 1.2);
                    ctx.globalAlpha = 0.3 + fade * 0.7;
                    const bx = cx + Math.cos(b.a) * r * b.r;
                    const by = cy + Math.sin(b.a) * r * b.r;
                    ctx.fillRect(bx - 2, by - 2, 4, 4);
                }
                ctx.globalAlpha = 1;

            } else if (s.type === 'telemetry') {
                ctx.fillStyle = '#ffcc44';
                ctx.fillText('TELEMETRY', 8, 14);
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(8, 18, W - 16, 1);

                const bars = [
                    { label: 'PWR', value: 0.6 + Math.sin(t * 1.4) * 0.25 },
                    { label: 'FUL', value: 0.8 + Math.sin(t * 0.7) * 0.1 },
                    { label: 'TMP', value: 0.4 + Math.sin(t * 2.1) * 0.15 },
                    { label: 'RAD', value: 0.2 + Math.sin(t * 0.5) * 0.1 }
                ];
                for (let i = 0; i < bars.length; i++) {
                    const y = 32 + i * 18;
                    ctx.fillStyle = '#88bbdd';
                    ctx.fillText(bars[i].label, 8, y + 8);
                    // Bar track
                    ctx.fillStyle = 'rgba(0, 80, 120, 0.5)';
                    ctx.fillRect(40, y, 180, 10);
                    // Bar fill
                    const pct = Math.max(0, Math.min(1, bars[i].value));
                    const color = pct > 0.7 ? '#ff6644' : (pct > 0.4 ? '#ffcc44' : '#44ffaa');
                    ctx.fillStyle = color;
                    ctx.fillRect(40, y, 180 * pct, 10);
                }

            } else if (s.type === 'diagnostic') {
                // Scrolling diagnostic text
                ctx.fillStyle = '#44ffaa';
                ctx.fillText('DIAGNOSTIC FEED', 8, 14);
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(8, 18, W - 16, 1);

                s.scrollY += 0.6;
                const lines = [
                    '> init sys chk [OK]',
                    '> fuel lines 100%',
                    '> warp core stable',
                    '> shield grid sync',
                    '> dock servo idle',
                    '> nav beacon lock',
                    '> telem tx live',
                    '> inertial gyro cal',
                    '> engines primed',
                    '> weapons safed',
                    '> coolant flow nom'
                ];
                ctx.fillStyle = '#66ddaa';
                const startY = 30 - (s.scrollY % (lines.length * 11));
                for (let i = 0; i < lines.length * 2; i++) {
                    const y = startY + i * 11;
                    if (y < 22 || y > H) continue;
                    ctx.fillText(lines[i % lines.length], 8, y);
                }
            }

            s.texture.needsUpdate = true;
        }
    }

    // Render text onto the floor as a transparent decal. Used for the
    // "BAY 07" stencil so it actually reads as text from the camera.
    _addFloorText(text, x, z, size, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 128);
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.font = 'bold 80px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.65;
        ctx.fillText(text, 256, 64);
        // Subtle border underline for industrial feel
        ctx.globalAlpha = 0.4;
        ctx.fillRect(20, 110, 472, 4);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const mat = new THREE.MeshBasicMaterial({
            map: tex, transparent: true, opacity: 0.7, depthWrite: false
        });
        const aspect = 512 / 128;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.04, z);
        this.scene.add(mesh);
    }

    // Painted nebula gradient that sits behind the hangar window. Made on a
    // canvas so we can layer several radial colored blobs over a dark base.
    _makeNebulaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        // Deep space base
        ctx.fillStyle = '#020410';
        ctx.fillRect(0, 0, 1024, 384);

        // Several offset colored nebula blobs
        const blobs = [
            { x: 200, y: 180, r: 280, color: [80, 40, 160, 0.55] },   // purple
            { x: 700, y: 120, r: 320, color: [160, 60, 90, 0.45] },   // crimson
            { x: 500, y: 240, r: 260, color: [40, 120, 180, 0.35] },  // teal
            { x: 850, y: 280, r: 180, color: [200, 110, 60, 0.3] },   // amber
            { x: 100, y: 60, r: 160, color: [40, 60, 140, 0.4] }      // blue
        ];
        for (const b of blobs) {
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.color[3]})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1024, 384);
        }

        // Sprinkle of bright stars baked into the texture for extra depth
        for (let i = 0; i < 250; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 384;
            const a = 0.4 + Math.random() * 0.6;
            const s = Math.random() < 0.05 ? 2.5 : 1.2;
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    // Generate a soft vertical-gradient alpha texture used by the volumetric
    // light shafts. Bright at the top (right under the ceiling panel),
    // smoothly fades to nothing at the bottom — kills the "pointy triangle".
    _makeShaftTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
        grad.addColorStop(0.06, 'rgba(255,255,255,0.85)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
        grad.addColorStop(0.85, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 4, 256);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    // ── Build the static hangar environment ──
    // Layout: sunken docking pit in the middle, catwalks overhead on either
    // side, big window on the back wall showing space, pulsing floor strips,
    // and rotating ventilation fans in the ceiling.
    buildEnvironment() {
        const ceilHeight = 28;          // tall — helps "indie quality" feel
        const wallDist = 55;
        const pitRadius = 14;           // central sunken docking area radius
        const pitDepth = 2.5;           // how far it sinks below floor level
        const catwalkY = 10;            // catwalks sit at mid-height

        // ── Main floor (higher level around the pit) ──
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x141c26,
            roughness: 0.5,
            metalness: 0.6
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Subtle floor grid lines for industrial feel
        const gridHelper = new THREE.GridHelper(160, 32, 0x004466, 0x002233);
        gridHelper.position.y = 0.02;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.35;
        this.scene.add(gridHelper);

        // Warning-stripe hatched ring around the pit (yellow/black)
        const warnMat = new THREE.MeshBasicMaterial({
            color: 0xddaa11,
            transparent: true,
            opacity: 0.55
        });
        const warnRing = new THREE.Mesh(
            new THREE.RingGeometry(pitRadius + 0.5, pitRadius + 2.5, 64, 1),
            warnMat
        );
        warnRing.rotation.x = -Math.PI / 2;
        warnRing.position.y = 0.03;
        this.scene.add(warnRing);

        // ── Pit: recessed docking area where the ship hovers ──
        const pitFloorMat = new THREE.MeshStandardMaterial({
            color: 0x080c14,
            roughness: 0.3,
            metalness: 0.85,
            emissive: 0x001a2a,
            emissiveIntensity: 0.45
        });
        const pitFloor = new THREE.Mesh(
            new THREE.CircleGeometry(pitRadius, 48),
            pitFloorMat
        );
        pitFloor.rotation.x = -Math.PI / 2;
        pitFloor.position.y = -pitDepth + 0.01;
        pitFloor.receiveShadow = true;
        this.scene.add(pitFloor);

        // Pit inner wall (cylinder)
        const pitWallMat = new THREE.MeshStandardMaterial({
            color: 0x0a1420,
            roughness: 0.55,
            metalness: 0.55,
            side: THREE.BackSide
        });
        const pitWall = new THREE.Mesh(
            new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 48, 1, true),
            pitWallMat
        );
        pitWall.position.y = -pitDepth / 2;
        this.scene.add(pitWall);

        // Pulsing docking strips inside the pit — concentric glowing rings
        this.dockingStrips = [];
        const stripMat = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.7
        });
        for (const r of [pitRadius - 2, pitRadius - 5, pitRadius - 8]) {
            const stripRing = new THREE.Mesh(
                new THREE.RingGeometry(r - 0.2, r, 64),
                stripMat.clone()
            );
            stripRing.rotation.x = -Math.PI / 2;
            stripRing.position.y = -pitDepth + 0.04;
            this.scene.add(stripRing);
            this.dockingStrips.push(stripRing);
        }

        // ── Central ship podium — a proper raised column, not a flat pad ──
        // Layered look: wider base step, main tall cylinder, narrower top
        // cap with glowing ring. Podium top lands around y ≈ 0 so the ship
        // floats just above floor level.
        const podiumBaseY = -pitDepth;           // base sits on pit floor
        const podiumTopY = 0.4;                  // top deck just above main floor
        const podiumHeight = podiumTopY - podiumBaseY;

        // Wider lower step
        const stepH = 0.6;
        const stepGeo = new THREE.CylinderGeometry(9.5, 10.2, stepH, 48);
        const stepMat = new THREE.MeshStandardMaterial({
            color: 0x0c1624,
            roughness: 0.45,
            metalness: 0.7,
            emissive: 0x001826,
            emissiveIntensity: 0.2
        });
        const step = new THREE.Mesh(stepGeo, stepMat);
        step.position.set(0, podiumBaseY + stepH / 2, 0);
        step.receiveShadow = true;
        step.castShadow = true;
        this.scene.add(step);

        // Main tall column — slightly tapered inward toward the top
        const colH = podiumHeight - stepH;
        const colGeo = new THREE.CylinderGeometry(7.8, 8.4, colH, 48);
        const colMat = new THREE.MeshStandardMaterial({
            color: 0x0a1822,
            roughness: 0.3,
            metalness: 0.9,
            emissive: 0x00263a,
            emissiveIntensity: 0.3
        });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(0, podiumBaseY + stepH + colH / 2, 0);
        col.receiveShadow = true;
        col.castShadow = true;
        this.scene.add(col);

        // Glowing vertical accent strips running up the podium column
        const accentMat = new THREE.MeshBasicMaterial({
            color: 0x00ddff, transparent: true, opacity: 0.7
        });
        const accentCount = 8;
        for (let i = 0; i < accentCount; i++) {
            const a = (i / accentCount) * Math.PI * 2;
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, colH - 0.4, 0.04),
                accentMat.clone()
            );
            strip.position.set(
                Math.cos(a) * 8.1,
                podiumBaseY + stepH + colH / 2,
                Math.sin(a) * 8.1
            );
            strip.rotation.y = -a;
            this.scene.add(strip);
        }

        // Top deck — annulus (ring) so the elevator shaft is visible below
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x122030,
            roughness: 0.2,
            metalness: 0.95,
            emissive: 0x002844,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide
        });
        const capRingOuter = 8.1;
        const capRingInner = 7.1;   // matches door radius (7.0) + small overlap
        const capGeo = new THREE.RingGeometry(capRingInner, capRingOuter, 64);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(0, podiumTopY + 0.22, 0);
        cap.receiveShadow = true;
        this.scene.add(cap);

        // Elevator shaft inner walls (BackSide cylinder visible from inside)
        const shaftWallMat = new THREE.MeshStandardMaterial({
            color: 0x080c14,
            roughness: 0.35, metalness: 0.85,
            emissive: 0x001a2a, emissiveIntensity: 0.45,
            side: THREE.BackSide
        });
        const shaftWall = new THREE.Mesh(
            new THREE.CylinderGeometry(6.95, 7.1, colH + stepH + 0.2, 48, 1, true),
            shaftWallMat
        );
        shaftWall.position.set(0, podiumBaseY + (colH + stepH) / 2, 0);
        this.scene.add(shaftWall);

        // Shaft bottom plate with glowing rim
        const shaftBottom = new THREE.Mesh(
            new THREE.CircleGeometry(6.9, 48),
            new THREE.MeshStandardMaterial({
                color: 0x060810, roughness: 0.55, metalness: 0.7,
                emissive: 0x002030, emissiveIntensity: 0.5
            })
        );
        shaftBottom.rotation.x = -Math.PI / 2;
        shaftBottom.position.set(0, podiumBaseY + 0.05, 0);
        this.scene.add(shaftBottom);
        const shaftRim = new THREE.Mesh(
            new THREE.RingGeometry(6.4, 6.9, 48),
            new THREE.MeshBasicMaterial({
                color: 0x00ddff, transparent: true, opacity: 0.7
            })
        );
        shaftRim.rotation.x = -Math.PI / 2;
        shaftRim.position.set(0, podiumBaseY + 0.08, 0);
        this.scene.add(shaftRim);

        // Glowing ring on top of the podium
        // Ring sits on the cap, outside the door opening so the hole reads cleanly
        const ringGeo = new THREE.RingGeometry(7.2, 7.9, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = podiumTopY + 0.34;
        this.scene.add(ring);
        this.platformRing = ring;

        // ── Floor doors on top of the podium ──
        // Two semicircular panels that split along the X axis, revealing the
        // elevator shaft below. Driven by the ship-cycle state machine.
        const doorY = podiumTopY + 0.45;
        const doorRadius = 7.0;
        const doorPanelMat = new THREE.MeshStandardMaterial({
            color: 0x1a2230,
            roughness: 0.35, metalness: 0.9,
            emissive: 0x002036, emissiveIntensity: 0.25
        });
        // Split along the X axis — doorA covers x>0 (slides right), doorB covers x<0 (slides left)
        const doorA = new THREE.Mesh(
            new THREE.CircleGeometry(doorRadius, 48, -Math.PI / 2, Math.PI),
            doorPanelMat.clone()
        );
        doorA.rotation.x = -Math.PI / 2;
        doorA.position.set(0, doorY, 0);
        this.scene.add(doorA);
        const doorB = new THREE.Mesh(
            new THREE.CircleGeometry(doorRadius, 48, Math.PI / 2, Math.PI),
            doorPanelMat.clone()
        );
        doorB.rotation.x = -Math.PI / 2;
        doorB.position.set(0, doorY, 0);
        this.scene.add(doorB);
        // Glowing seam along the split line (along Z axis now)
        const seamMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33, transparent: true, opacity: 0.85
        });
        const seamA = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, doorRadius * 1.92), seamMat.clone()
        );
        seamA.position.set(0.04, doorY + 0.04, 0);
        this.scene.add(seamA);
        const seamB = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, doorRadius * 1.92), seamMat.clone()
        );
        seamB.position.set(-0.04, doorY + 0.04, 0);
        this.scene.add(seamB);
        // Elevator shaft glow — visible only when doors are open
        const shaftGlow = new THREE.Mesh(
            new THREE.CircleGeometry(doorRadius * 0.92, 48),
            new THREE.MeshBasicMaterial({
                color: 0x00ddff,
                transparent: true, opacity: 0.0,
                blending: THREE.AdditiveBlending, depthWrite: false
            })
        );
        shaftGlow.rotation.x = -Math.PI / 2;
        shaftGlow.position.set(0, doorY - 0.5, 0);
        this.scene.add(shaftGlow);
        // Cool point-light shining up from inside the shaft
        const shaftLight = new THREE.PointLight(0x00ccff, 0, 14);
        shaftLight.position.set(0, doorY - 1.0, 0);
        this.scene.add(shaftLight);
        this._doorA = doorA;
        this._doorB = doorB;
        this._doorSeamA = seamA;
        this._doorSeamB = seamB;
        this._doorRadius = doorRadius;
        this._shaftGlow = shaftGlow;
        this._shaftLight = shaftLight;

        // ── Catwalks overhead on left and right sides ──
        // Solid walkway planks + glowing railing + support pillars
        const catwalkMat = new THREE.MeshStandardMaterial({
            color: 0x1a2430,
            roughness: 0.6,
            metalness: 0.4
        });
        const railMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33,
            transparent: true,
            opacity: 0.85
        });

        for (const side of [-1, 1]) {
            const walkX = side * (pitRadius + 6);
            // Walkway plank
            const walkway = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.3, 50),
                catwalkMat
            );
            walkway.position.set(walkX, catwalkY, 0);
            this.scene.add(walkway);

            // Support pillars from walkway to ceiling
            for (const pz of [-18, -6, 6, 18]) {
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, ceilHeight - catwalkY, 0.5),
                    catwalkMat
                );
                pillar.position.set(walkX, catwalkY + (ceilHeight - catwalkY) / 2, pz);
                this.scene.add(pillar);
            }
            // Support pillars down to floor
            for (const pz of [-22, -8, 8, 22]) {
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, catwalkY, 0.5),
                    catwalkMat
                );
                pillar.position.set(walkX, catwalkY / 2, pz);
                this.scene.add(pillar);
            }

            // Railing (glowing top strip)
            const railingTop = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.15, 50),
                railMat
            );
            railingTop.position.set(walkX - side * 1.4, catwalkY + 1.2, 0);
            this.scene.add(railingTop);

            // Railing posts
            for (let pz = -22; pz <= 22; pz += 3) {
                const post = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, 1.2, 0.15),
                    catwalkMat
                );
                post.position.set(walkX - side * 1.4, catwalkY + 0.75, pz);
                this.scene.add(post);
            }
        }

        // ── Ceiling (dark, high up) ──
        const ceilGeo = new THREE.PlaneGeometry(160, 160);
        const ceilMat = new THREE.MeshStandardMaterial({
            color: 0x05080c,
            roughness: 0.9,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = ceilHeight;
        this.scene.add(ceiling);

        // ── Ceiling light panels (smaller + fewer than before, cleaner look) ──
        const panelMat = new THREE.MeshBasicMaterial({
            color: 0x55ddff,
            transparent: true,
            opacity: 0.75
        });
        const panelDim = 4;
        const panelGap = 3;
        const cols = 5, rows = 5;
        const totalW = cols * panelDim + (cols - 1) * panelGap;
        const totalD = rows * panelDim + (rows - 1) * panelGap;
        const startX = -totalW / 2 + panelDim / 2;
        const startZ = -totalD / 2 + panelDim / 2;

        this.ceilingPanels = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * (panelDim + panelGap);
                const z = startZ + r * (panelDim + panelGap);
                const panel = new THREE.Mesh(
                    new THREE.PlaneGeometry(panelDim, panelDim),
                    panelMat.clone()
                );
                panel.rotation.x = Math.PI / 2;
                panel.position.set(x, ceilHeight - 0.05, z);
                this.scene.add(panel);
                this.ceilingPanels.push(panel);
            }
        }

        // ── Rotating ventilation fans at 4 spots in the ceiling ──
        this.vents = [];
        const ventHousingMat = new THREE.MeshStandardMaterial({
            color: 0x0c1018,
            roughness: 0.6,
            metalness: 0.7
        });
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x2a3440,
            roughness: 0.5,
            metalness: 0.6,
            side: THREE.DoubleSide
        });
        const ventPositions = [
            { x: -20, z: -20 }, { x:  20, z: -20 },
            { x: -20, z:  20 }, { x:  20, z:  20 }
        ];
        for (const vp of ventPositions) {
            const housing = new THREE.Mesh(
                new THREE.CylinderGeometry(2.2, 2.2, 0.6, 16, 1, true),
                ventHousingMat
            );
            housing.position.set(vp.x, ceilHeight - 0.3, vp.z);
            this.scene.add(housing);

            const fanGroup = new THREE.Group();
            fanGroup.position.set(vp.x, ceilHeight - 0.5, vp.z);
            // Three blades (each a tilted flat box)
            for (let i = 0; i < 3; i++) {
                const blade = new THREE.Mesh(
                    new THREE.BoxGeometry(3.5, 0.1, 0.7),
                    bladeMat
                );
                blade.rotation.y = (i / 3) * Math.PI * 2;
                blade.rotation.x = 0.25;
                fanGroup.add(blade);
            }
            // Hub
            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12),
                ventHousingMat
            );
            fanGroup.add(hub);
            this.scene.add(fanGroup);
            this.vents.push(fanGroup);
        }

        // ── Back wall with a large window showing space ──
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x0a1218,
            roughness: 0.6,
            metalness: 0.5,
            side: THREE.DoubleSide
        });

        // Back wall is split into: bottom strip, window, top strip, side columns
        // so we can show space through the "glass" region.
        const bwBottom = new THREE.Mesh(new THREE.PlaneGeometry(160, 3), wallMat);
        bwBottom.position.set(0, 1.5, -wallDist);
        this.scene.add(bwBottom);

        const bwTop = new THREE.Mesh(new THREE.PlaneGeometry(160, ceilHeight - 18), wallMat);
        bwTop.position.set(0, 18 + (ceilHeight - 18) / 2, -wallDist);
        this.scene.add(bwTop);

        // Side columns so window doesn't extend the full wall width
        const bwSide1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), wallMat);
        bwSide1.position.set(-65, 10.5, -wallDist);
        this.scene.add(bwSide1);
        const bwSide2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), wallMat);
        bwSide2.position.set(65, 10.5, -wallDist);
        this.scene.add(bwSide2);

        // Window frame dividers (vertical mullions)
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a, roughness: 0.5, metalness: 0.6
        });
        for (const fx of [-33, -11, 11, 33]) {
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 15, 0.5),
                frameMat
            );
            frame.position.set(fx, 10.5, -wallDist + 0.1);
            this.scene.add(frame);
        }
        // Horizontal mullion
        const hframe = new THREE.Mesh(
            new THREE.BoxGeometry(100, 0.5, 0.5),
            frameMat
        );
        hframe.position.set(0, 10.5, -wallDist + 0.1);
        this.scene.add(hframe);

        // Very subtle dark tint on the glass — much more transparent now so
        // the space scene behind reads clearly.
        const glassMat = new THREE.MeshBasicMaterial({
            color: 0x001a33,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(100, 15), glassMat);
        glass.position.set(0, 10.5, -wallDist + 0.05);
        this.scene.add(glass);

        // Backdrop plane far behind the window — painted nebula gradient
        // (procedural canvas texture) so the window has actual color through it.
        const nebulaTex = this._makeNebulaTexture();
        const backdropMat = new THREE.MeshBasicMaterial({
            map: nebulaTex,
            depthWrite: false
        });
        const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(220, 80),
            backdropMat
        );
        backdrop.position.set(0, 14, -wallDist - 60);
        this.scene.add(backdrop);

        // Dense star field — kept entirely behind the back wall so it never
        // floats inside the hangar room itself.
        const starGeo = new THREE.BufferGeometry();
        const starCount = 700;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPositions[i * 3]     = (Math.random() - 0.5) * 220;
            starPositions[i * 3 + 1] = Math.random() * 36 - 2;
            // All stars are at least 8 units behind the wall so they don't
            // appear to float in the room when viewed at sharper angles.
            starPositions[i * 3 + 2] = -wallDist - 8 - Math.random() * 50;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.5, transparent: true, opacity: 0.95
        });
        this.scene.add(new THREE.Points(starGeo, starMat));

        // Big hero planet visible through the window — large, well-lit,
        // off-centered toward the right so it reads as "outside the dock"
        const heroGeo = new THREE.SphereGeometry(18, 32, 24);
        const heroMat = new THREE.MeshStandardMaterial({
            color: 0xaa5533,
            emissive: 0x331a0a,
            emissiveIntensity: 0.5,
            roughness: 0.85,
            metalness: 0.05
        });
        const heroPlanet = new THREE.Mesh(heroGeo, heroMat);
        heroPlanet.position.set(28, 14, -wallDist - 40);
        this.scene.add(heroPlanet);
        this.heroPlanet = heroPlanet; // for slow rotation in tick

        // Atmosphere halo around the hero planet
        const atmoGeo = new THREE.SphereGeometry(19, 32, 24);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0xff7744,
            transparent: true,
            opacity: 0.18,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const heroAtmo = new THREE.Mesh(atmoGeo, atmoMat);
        heroAtmo.position.copy(heroPlanet.position);
        this.scene.add(heroAtmo);

        // Smaller far moon
        const moonGeo = new THREE.SphereGeometry(3.5, 16, 12);
        const moonMat = new THREE.MeshStandardMaterial({
            color: 0xaaaa99,
            emissive: 0x443322,
            emissiveIntensity: 0.4,
            roughness: 0.9
        });
        const farMoon = new THREE.Mesh(moonGeo, moonMat);
        farMoon.position.set(-22, 18, -wallDist - 35);
        this.scene.add(farMoon);

        // Sun-like point light to illuminate the hero planet from one side
        const sunLight = new THREE.PointLight(0xffaa66, 1.5, 200);
        sunLight.position.set(60, 30, -wallDist - 20);
        this.scene.add(sunLight);

        // ── Side walls (simpler) ──
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(2 * wallDist, ceilHeight), wallMat);
        leftWall.position.set(-wallDist, ceilHeight / 2, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(2 * wallDist, ceilHeight), wallMat);
        rightWall.position.set(wallDist, ceilHeight / 2, 0);
        rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(rightWall);

        // Horizontal cyan accent strips on side walls
        const wallAccentMat = new THREE.MeshBasicMaterial({
            color: 0x44bbdd, transparent: true, opacity: 0.7
        });
        for (const y of [5, 14, 21]) {
            for (const sx of [-wallDist + 0.06, wallDist - 0.06]) {
                const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 2 * wallDist * 0.7), wallAccentMat);
                strip.position.set(sx, y, 0);
                strip.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
                this.scene.add(strip);
            }
        }

        // ── Front wall ──
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(160, ceilHeight), wallMat);
        frontWall.position.set(0, ceilHeight / 2, wallDist);
        frontWall.rotation.y = Math.PI;
        this.scene.add(frontWall);

        // ── Background crates for scale (procedural stacks in the corners) ──
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a34,
            roughness: 0.7,
            metalness: 0.3
        });
        const crateMarkMat = new THREE.MeshBasicMaterial({
            color: 0xffaa22, transparent: true, opacity: 0.6
        });
        const crateSpots = [
            { x: -22, z:  26, rot:  0.3, count: 3 },
            { x:  22, z:  26, rot: -0.4, count: 4 },
            { x: -32, z: -32, rot:  0.5, count: 2 },
            { x:  32, z: -32, rot: -0.3, count: 3 }
        ];
        for (const spot of crateSpots) {
            for (let i = 0; i < spot.count; i++) {
                const size = 2 + Math.random() * 0.5;
                const crate = new THREE.Mesh(
                    new THREE.BoxGeometry(size, size, size),
                    crateMat
                );
                crate.position.set(
                    spot.x + (Math.random() - 0.5) * 2,
                    size / 2 + i * size,
                    spot.z + (Math.random() - 0.5) * 2
                );
                crate.rotation.y = spot.rot + (Math.random() - 0.5) * 0.3;
                crate.castShadow = true;
                this.scene.add(crate);

                // Glowing accent stripe on crate
                const mark = new THREE.Mesh(
                    new THREE.PlaneGeometry(size * 0.8, 0.2),
                    crateMarkMat
                );
                mark.position.set(
                    crate.position.x,
                    crate.position.y,
                    crate.position.z + size / 2 + 0.01
                );
                mark.rotation.y = crate.rotation.y;
                this.scene.add(mark);
            }
        }

        // ── Volumetric light shafts ──
        // Soft-edged tapered cylinders with a gradient alpha texture so they
        // fade out at the bottom (no pointy tip) and at the top (no hard
        // ceiling line). Two layers per panel — narrow bright core + wide
        // soft halo — give a much more natural light-haze look than raw cones.
        const shaftTex = this._makeShaftTexture();
        const coreMat = new THREE.MeshBasicMaterial({
            map: shaftTex,
            color: 0xaaeeff,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const haloMat = new THREE.MeshBasicMaterial({
            map: shaftTex,
            color: 0x44ccff,
            transparent: true,
            opacity: 0.07,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        for (const panel of this.ceilingPanels) {
            if (Math.random() < 0.4) continue;

            // Narrow bright core — slight taper from top to bottom
            const coreGeo = new THREE.CylinderGeometry(
                panelDim * 0.35,   // top radius (under panel)
                panelDim * 1.1,    // bottom radius (spreading out)
                ceilHeight - 1,    // shorter than the room so its top doesn't poke through ceiling
                12, 1, true
            );
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.set(panel.position.x, (ceilHeight - 1) / 2, panel.position.z);
            this.scene.add(core);

            // Wider, fainter halo — slightly randomized so the bunch isn't uniform
            const haloGeo = new THREE.CylinderGeometry(
                panelDim * 0.6,
                panelDim * 1.8,
                ceilHeight - 1,
                12, 1, true
            );
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.position.set(panel.position.x, (ceilHeight - 1) / 2, panel.position.z);
            this.scene.add(halo);
        }

        // ── Wall pipes & conduits — horizontal runs of metal pipes along
        // the side walls at different heights for industrial texture. ──
        const pipeMat = new THREE.MeshStandardMaterial({
            color: 0x3a4452,
            roughness: 0.4,
            metalness: 0.85
        });
        const pipeAccentMat = new THREE.MeshBasicMaterial({
            color: 0xff6622,
            transparent: true,
            opacity: 0.7
        });
        for (const sx of [-wallDist + 0.4, wallDist - 0.4]) {
            for (const py of [3.5, 6.5, 17, 23]) {
                // Long pipe running along the wall
                const pipe = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.18, 2 * wallDist * 0.85, 8),
                    pipeMat
                );
                pipe.position.set(sx, py, 0);
                pipe.rotation.z = Math.PI / 2;
                this.scene.add(pipe);

                // Periodic mounting brackets
                for (let pz = -wallDist * 0.7; pz <= wallDist * 0.7; pz += 6) {
                    const bracket = new THREE.Mesh(
                        new THREE.BoxGeometry(0.5, 0.5, 0.4),
                        pipeMat
                    );
                    bracket.position.set(sx, py, pz);
                    this.scene.add(bracket);
                }

                // Subtle glowing dots along the pipe (status indicators)
                if (py === 6.5 || py === 17) {
                    for (let pz = -wallDist * 0.6; pz <= wallDist * 0.6; pz += 4) {
                        const dot = new THREE.Mesh(
                            new THREE.SphereGeometry(0.08, 6, 6),
                            pipeAccentMat
                        );
                        dot.position.set(sx + (sx < 0 ? 0.25 : -0.25), py - 0.3, pz);
                        this.scene.add(dot);
                    }
                }
            }
        }

        // Vertical pipes connecting the horizontal runs — corners only
        for (const sx of [-wallDist + 0.4, wallDist - 0.4]) {
            for (const sz of [-wallDist * 0.7, 0, wallDist * 0.7]) {
                const vpipe = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.18, ceilHeight - 1, 8),
                    pipeMat
                );
                vpipe.position.set(sx, ceilHeight / 2, sz);
                this.scene.add(vpipe);
            }
        }

        // ── Hanging cable bundles + warning lamps from the ceiling ──
        const cableMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a22,
            roughness: 0.7,
            metalness: 0.2
        });
        const lampHousingMat = new THREE.MeshStandardMaterial({
            color: 0x222a30,
            roughness: 0.5,
            metalness: 0.7
        });
        const lampGlowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.9
        });
        const hangPoints = [
            { x: -12, z:  18 }, { x:  12, z:  18 },
            { x: -12, z: -18 }, { x:  12, z: -18 },
            { x: -28, z:   0 }, { x:  28, z:   0 }
        ];
        this.warningLamps = [];
        for (const hp of hangPoints) {
            // Cable
            const cable = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 4, 6),
                cableMat
            );
            cable.position.set(hp.x, ceilHeight - 2, hp.z);
            this.scene.add(cable);

            // Warning lamp housing
            const housing = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.4, 0.6, 12),
                lampHousingMat
            );
            housing.position.set(hp.x, ceilHeight - 4.3, hp.z);
            this.scene.add(housing);

            // Glowing bulb
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 12, 8),
                lampGlowMat.clone()
            );
            bulb.position.set(hp.x, ceilHeight - 4.7, hp.z);
            this.scene.add(bulb);
            this.warningLamps.push(bulb);
        }

        // ── Control consoles at each end of both catwalks ──
        const consoleMat = new THREE.MeshStandardMaterial({
            color: 0x1a2230,
            roughness: 0.4,
            metalness: 0.6
        });
        const screenAccentMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.8
        });

        // Each console gets its own canvas-backed animated screen.
        this.consoleScreens = [];
        const screenTypes = ['status', 'scanner', 'telemetry', 'diagnostic'];
        let screenIdx = 0;
        for (const side of [-1, 1]) {
            const walkX = side * (pitRadius + 6);
            for (const cz of [-22, 22]) {
                // Console base (slanted box)
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(2.2, 1.6, 1.2),
                    consoleMat
                );
                base.position.set(walkX, catwalkY + 0.95, cz);
                this.scene.add(base);

                // Animated screen surface (canvas-backed texture)
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 144;
                const ctx = canvas.getContext('2d');
                const tex = new THREE.CanvasTexture(canvas);
                tex.minFilter = THREE.LinearFilter;
                const screenMat = new THREE.MeshBasicMaterial({
                    map: tex, transparent: true, opacity: 0.95
                });
                const screen = new THREE.Mesh(
                    new THREE.PlaneGeometry(1.8, 1.0),
                    screenMat
                );
                screen.position.set(walkX, catwalkY + 1.55, cz);
                screen.rotation.x = -0.5;
                this.scene.add(screen);

                this.consoleScreens.push({
                    canvas, ctx, texture: tex,
                    type: screenTypes[screenIdx % screenTypes.length],
                    offset: Math.random() * 1000,
                    scrollY: Math.random() * 144
                });
                screenIdx++;

                // Small glowing detail bars beside the screen
                for (let i = 0; i < 3; i++) {
                    const bar = new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.15, 0.05),
                        screenAccentMat.clone()
                    );
                    bar.position.set(walkX + 0.7 + i * 0.2, catwalkY + 0.4, cz + 0.65);
                    this.scene.add(bar);
                }
            }
        }

        // ── Service crane — chunky industrial yellow gantry + trolley + hook ──
        // Moved forward (z=-3) and scaled up considerably so it actually reads
        // on camera instead of being a thin dark silhouette against the wall.
        const craneZ = -3;
        const craneMat = new THREE.MeshStandardMaterial({
            color: 0xd8a41e,         // industrial safety yellow
            roughness: 0.5,
            metalness: 0.55
        });
        const craneDarkMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.4
        });
        const craneStripeMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a, transparent: true, opacity: 0.85
        });

        // Vertical rail down from ceiling — thick box beam
        const railH = ceilHeight - 5;
        const craneRail = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, railH, 1.0),
            craneMat
        );
        craneRail.position.set(-11, railH / 2 + 5, craneZ);
        craneRail.castShadow = true;
        this.scene.add(craneRail);

        // Warning-stripe bands wrapped around the rail (visual texture)
        for (const bandY of [8, 14, 20]) {
            const band = new THREE.Mesh(
                new THREE.BoxGeometry(1.04, 0.5, 1.04),
                craneStripeMat
            );
            band.position.set(-11, bandY, craneZ);
            this.scene.add(band);
        }

        // Ceiling mount plate
        const railMount = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.6, 2.2),
            craneDarkMat
        );
        railMount.position.set(-11, ceilHeight - 0.3, craneZ);
        this.scene.add(railMount);

        // ── Crane arm pivot group — rotates around the vertical rail ──
        // Pivot is at the rail position so rotation swings the arm over the ship.
        const cranePivot = new THREE.Group();
        cranePivot.position.set(-11, 0, craneZ);
        this.scene.add(cranePivot);
        this._cranePivot = cranePivot;
        this._cranePivotHomeAngle = 0;

        // Motor/trolley housing mid-rail (relative to pivot)
        const motorHousing = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.8, 1.6),
            craneDarkMat
        );
        motorHousing.position.set(0, ceilHeight - 6, 0);
        motorHousing.castShadow = true;
        cranePivot.add(motorHousing);

        // Horizontal arm (relative to pivot — extends in +X from rail)
        const armLen = 14;
        const craneArm = new THREE.Mesh(
            new THREE.BoxGeometry(armLen, 0.8, 0.8),
            craneMat
        );
        craneArm.position.set(armLen / 2, ceilHeight - 6, 0);
        craneArm.castShadow = true;
        cranePivot.add(craneArm);

        // Black warning stripes on the arm
        for (let sx = 1; sx < armLen - 1; sx += 1.2) {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.84, 0.84),
                craneStripeMat
            );
            stripe.position.set(sx, ceilHeight - 6, 0);
            cranePivot.add(stripe);
        }

        // Trolley block riding the arm near the end (local to pivot)
        const trolleyLocalX = armLen - 1.5;
        const trolley = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 1.4),
            craneDarkMat
        );
        trolley.position.set(trolleyLocalX, ceilHeight - 6.8, 0);
        trolley.castShadow = true;
        cranePivot.add(trolley);
        this._craneTrolley = trolley;

        // Hanging cable from the trolley
        const cableDropLen = 6;
        const cableDrop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, cableDropLen, 8),
            cableMat
        );
        cableDrop.position.set(trolleyLocalX, ceilHeight - 7.4 - cableDropLen / 2, 0);
        cranePivot.add(cableDrop);
        this._craneCable = cableDrop;
        this._craneCableHomeY = ceilHeight - 7.4 - cableDropLen / 2;
        this._craneCableLen = cableDropLen;

        // Hook + grabber assembly
        const hookMat = new THREE.MeshStandardMaterial({
            color: 0x666a72,
            roughness: 0.4,
            metalness: 0.9
        });
        const hookBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.55, 0.9, 12),
            hookMat
        );
        hookBody.position.set(trolleyLocalX, ceilHeight - 14, 0);
        hookBody.castShadow = true;
        cranePivot.add(hookBody);
        this._craneHookBody = hookBody;
        this._craneHookHomeY = ceilHeight - 14;

        const hookCurve = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.12, 8, 16, Math.PI),
            hookMat
        );
        hookCurve.position.set(trolleyLocalX, ceilHeight - 14.8, 0);
        hookCurve.rotation.x = Math.PI / 2;
        hookCurve.rotation.z = Math.PI;
        cranePivot.add(hookCurve);
        this._craneHookCurve = hookCurve;
        this._craneHookCurveHomeY = ceilHeight - 14.8;
        this._craneCeilHeight = ceilHeight;

        // Warning lights
        const armLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 10, 8),
            lampGlowMat.clone()
        );
        armLight.material.color.setHex(0xff3322);
        armLight.position.set(trolleyLocalX, ceilHeight - 5.9, 0.75);
        cranePivot.add(armLight);
        this.craneLight = armLight;

        // Exact swing angle so trolley ends up over the ship at world (0,0).
        // Pivot at world (-11, y, -3). Ship in local = (11, y, 3).
        // Arm extends in +X. rotation.y positive = CCW from above.
        // atan2(localZ, localX) gives the angle from +X to the ship.
        this._craneLaunchAngle = -Math.atan2(3, 11);
        this._craneTrolleyDist = trolleyLocalX;

        const railLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 10, 8),
            lampGlowMat.clone()
        );
        railLight.material.color.setHex(0xffaa22);
        railLight.position.set(-11, ceilHeight - 4.9, craneZ + 0.85);
        this.scene.add(railLight);

        // ── Floor markings: text / arrow decals ──
        // "BAY 07" stenciled on the floor near the front of the pit
        this._addFloorText('BAY 07', 0, pitRadius + 5, 4, 0xddaa11);

        // Arrow chevrons leading toward the pit
        const chevronMat = new THREE.MeshBasicMaterial({
            color: 0xddaa11, transparent: true, opacity: 0.45
        });
        for (let i = 0; i < 3; i++) {
            const z = pitRadius + 8 + i * 2.5;
            const chevGeo = new THREE.BufferGeometry();
            const verts = new Float32Array([
                -2, 0, 0,    0, 0, -1,    2, 0, 0,
                -2, 0, 0.5,  0, 0, -0.5,  2, 0, 0.5
            ]);
            const idx = [0, 1, 2, 0, 3, 1, 1, 3, 4, 1, 4, 5, 5, 4, 2];
            chevGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
            chevGeo.setIndex(idx);
            chevGeo.computeVertexNormals();
            const chev = new THREE.Mesh(chevGeo, chevronMat);
            chev.position.set(0, 0.05, z);
            this.scene.add(chev);
        }

        // ── Drifting dust particles in the light shafts ──
        // Small additive points slowly floating within the hangar volume.
        // They pick up the light shafts by sheer virtue of being in the same
        // space and rendered additively, so they glow when crossing a shaft.
        const dustCount = 180;
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(dustCount * 3);
        this.dustVelocities = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            // Spread across the full hangar volume (not just the pit)
            dustPos[i * 3]     = (Math.random() - 0.5) * 60;
            dustPos[i * 3 + 1] = 1 + Math.random() * (ceilHeight - 3);
            dustPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
            // Very slow random drift — mostly vertical, tiny horizontal sway
            this.dustVelocities[i * 3]     = (Math.random() - 0.5) * 0.08;
            this.dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
            this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0xaaddff,
            size: 0.18,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.dustParticles = new THREE.Points(dustGeo, dustMat);
        this.dustBounds = { minY: 1, maxY: ceilHeight - 2, xz: 30 };
        this.scene.add(this.dustParticles);

        // ── Background depth: mezzanine, ship silhouettes, bay doors ──
        this._buildBackgroundDepth(ceilHeight, wallDist, pitRadius);

        // ── Fleet display: 4 smaller podiums around the main pad showing
        //    the other ships in the catalog. Sells "fleet command" feel. ──
        this._buildFleetPodiums();
        this._buildShipInfoHologram();

        // ── Extra props: drums, ladders, cones, spare engine, grates, cart ──
        this._buildExtraProps(ceilHeight, wallDist, pitRadius);

        // ── Ambient events scheduler (sparks, steam, panel flicker, lamp surge) ──
        this._buildAmbientEvents(ceilHeight, wallDist);

        // ── Lighting ──
        // Lifted ambient so the back of the hangar isn't near-black
        const hemi = new THREE.HemisphereLight(0x445c80, 0x1a1a2a, 1.6);
        this.scene.add(hemi);

        const keyLight = new THREE.SpotLight(0x66ddff, 6, 60, Math.PI * 0.18, 0.8, 1.5);
        keyLight.position.set(0, ceilHeight - 1, 0);
        keyLight.target.position.set(0, -pitDepth, 0);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);
        this.scene.add(keyLight.target);

        const fill = new THREE.PointLight(0x5599dd, 1.0, 35);
        fill.position.set(0, 4, 14);
        this.scene.add(fill);

        // Stronger rim + additional back fills to light the far wall
        const rim = new THREE.PointLight(0x00ffff, 2.0, 45);
        rim.position.set(0, 6, -12);
        this.scene.add(rim);

        // Dedicated back-corner lights to lift the deep shadows
        const backFillLeft = new THREE.PointLight(0x5588bb, 2.2, 55);
        backFillLeft.position.set(-wallDist * 0.85, 4, -wallDist * 0.85);
        this.scene.add(backFillLeft);

        const backFillRight = new THREE.PointLight(0x5588bb, 2.2, 55);
        backFillRight.position.set(wallDist * 0.85, 4, -wallDist * 0.85);
        this.scene.add(backFillRight);

        // Low bounce light from the floor toward the back to soften deep shadows
        const backBounce = new THREE.PointLight(0x334466, 1.6, 60);
        backBounce.position.set(0, 2, -wallDist * 0.8);
        this.scene.add(backBounce);

        // Warm light coming from the window for contrast
        const windowLight = new THREE.PointLight(0x8899cc, 1.4, 80);
        windowLight.position.set(0, 10, -wallDist + 3);
        this.scene.add(windowLight);
    }

    // ── Background depth layers ──
    _buildBackgroundDepth(ceilHeight, wallDist, pitRadius) {
        // Mezzanine office windows on the back wall's upper strip
        const mezCanvas = document.createElement('canvas');
        mezCanvas.width = 1024; mezCanvas.height = 256;
        const mctx = mezCanvas.getContext('2d');
        mctx.fillStyle = '#0a1018';
        mctx.fillRect(0, 0, 1024, 256);
        mctx.strokeStyle = '#1a2028';
        mctx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
            mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(1024, y); mctx.stroke();
        }
        const officeColors = ['#ffcc66', '#eebb55', '#ffaa44', '#ddaa66'];
        for (let i = 0; i < 8; i++) {
            const wx = 50 + i * 120;
            const wy = 80, ww = 90, wh = 110;
            mctx.fillStyle = officeColors[i % officeColors.length];
            mctx.fillRect(wx, wy, ww, wh);
            const grad = mctx.createLinearGradient(wx, wy, wx, wy + wh);
            grad.addColorStop(0, 'rgba(255,230,150,0.3)');
            grad.addColorStop(1, 'rgba(200,120,80,0.2)');
            mctx.fillStyle = grad;
            mctx.fillRect(wx, wy, ww, wh);
            // Silhouetted operator in ~half of the windows
            if (i % 2 === 0) {
                mctx.fillStyle = '#1a0c04';
                mctx.fillRect(wx + ww * 0.3, wy + wh * 0.35, ww * 0.4, wh * 0.55);
                mctx.beginPath();
                mctx.arc(wx + ww * 0.5, wy + wh * 0.3, ww * 0.13, 0, Math.PI * 2);
                mctx.fill();
            }
            mctx.strokeStyle = '#2a3040';
            mctx.lineWidth = 3;
            mctx.strokeRect(wx - 1, wy - 1, ww + 2, wh + 2);
            mctx.beginPath();
            mctx.moveTo(wx, wy + wh / 2);
            mctx.lineTo(wx + ww, wy + wh / 2);
            mctx.stroke();
        }
        mctx.fillStyle = '#66aadd';
        mctx.font = 'bold 16px monospace';
        mctx.fillText('MEZZANINE OPS — LEVEL 2', 14, 20);
        const mezTex = new THREE.CanvasTexture(mezCanvas);
        const mezPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(90, 9),
            new THREE.MeshBasicMaterial({ map: mezTex })
        );
        mezPlane.position.set(0, 22.5, -wallDist + 0.15);
        this.scene.add(mezPlane);
        const mezLight = new THREE.PointLight(0xffbb66, 0.35, 35);
        mezLight.position.set(0, 22, -wallDist + 2);
        this.scene.add(mezLight);

        // Docked ship silhouettes visible through the back window
        const silMat = new THREE.MeshStandardMaterial({
            color: 0x0a0c14, roughness: 0.8, metalness: 0.5,
            emissive: 0x0f1218, emissiveIntensity: 0.25
        });
        const silDefs = [
            { x: -30, y:  8, z: -wallDist - 26, s: 2.5, rotY:  0.4 },
            { x:  32, y: 11, z: -wallDist - 42, s: 3.2, rotY: -0.5 },
            { x: -42, y: 16, z: -wallDist - 62, s: 4.0, rotY:  1.1 }
        ];
        for (const s of silDefs) {
            const g = new THREE.Group();
            g.position.set(s.x, s.y, s.z);
            g.rotation.y = s.rotY;
            g.scale.setScalar(s.s);
            this.scene.add(g);
            g.add(new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.35, 2.0), silMat
            ));
            const wings = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 0.12, 0.7), silMat
            );
            wings.position.z = 0.1;
            g.add(wings);
            const nose = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 0.6, 6), silMat
            );
            nose.rotation.x = Math.PI / 2;
            nose.position.z = 1.3;
            g.add(nose);
            const eng = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 6),
                new THREE.MeshBasicMaterial({
                    color: 0x66aadd, transparent: true, opacity: 0.85
                })
            );
            eng.position.z = -1.0;
            g.add(eng);
        }

        // Freestanding bay doors at back corners
        const bayDoorMat = new THREE.MeshStandardMaterial({
            color: 0x1a2028, roughness: 0.5, metalness: 0.6
        });
        const bayDoorSlatMat = new THREE.MeshStandardMaterial({
            color: 0x252d38, roughness: 0.45, metalness: 0.65
        });
        const bayEdgeMat = new THREE.MeshBasicMaterial({
            color: 0xddaa11, transparent: true, opacity: 0.8
        });
        const bayLockedMat = new THREE.MeshBasicMaterial({
            color: 0xff3322, transparent: true, opacity: 0.9
        });
        this._bayLockedLamps = [];
        this._bayDoors = [];
        const bayDoorSpots = [
            { x: -30, z: -40, rotY:  0.6, label: 'BAY 04' },
            { x:  30, z: -40, rotY: -0.6, label: 'BAY 05' }
        ];
        for (const bs of bayDoorSpots) {
            const g = new THREE.Group();
            g.position.set(bs.x, 0, bs.z);
            g.rotation.y = bs.rotY;
            this.scene.add(g);
            // Frame
            for (const [fx, fw, fh, fy] of [
                [-2.8, 0.45, 13, 6.5], [2.8, 0.45, 13, 6.5]
            ]) {
                const f = new THREE.Mesh(
                    new THREE.BoxGeometry(fw, fh, 0.6), bayDoorMat
                );
                f.position.set(fx, fy, 0);
                g.add(f);
            }
            const frameTop = new THREE.Mesh(
                new THREE.BoxGeometry(6, 0.45, 0.6), bayDoorMat
            );
            frameTop.position.set(0, 13, 0);
            g.add(frameTop);
            const edge = new THREE.Mesh(
                new THREE.PlaneGeometry(5.4, 0.1), bayEdgeMat
            );
            edge.position.set(0, 12.6, 0.31);
            g.add(edge);
            // 6 slats (saved for animation)
            const slats = [];
            for (let i = 0; i < 6; i++) {
                const slat = new THREE.Mesh(
                    new THREE.BoxGeometry(5.4, 1.8, 0.25), bayDoorSlatMat.clone()
                );
                slat.position.set(0, 1.2 + i * 2, 0);
                slat._homeY = 1.2 + i * 2;
                g.add(slat);
                slats.push(slat);
                const gap = new THREE.Mesh(
                    new THREE.PlaneGeometry(5.4, 0.05),
                    new THREE.MeshBasicMaterial({ color: 0x000000 })
                );
                gap.position.set(0, 2.2 + i * 2, 0.13);
                g.add(gap);
            }
            // Inner glow behind the door (visible when open)
            const innerGlow = new THREE.Mesh(
                new THREE.PlaneGeometry(5, 11),
                new THREE.MeshBasicMaterial({
                    color: 0xffaa44,
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide
                })
            );
            innerGlow.position.set(0, 6, -0.3);
            g.add(innerGlow);
            // Bay label plaque
            const lCanvas = document.createElement('canvas');
            lCanvas.width = 256; lCanvas.height = 64;
            const lctx = lCanvas.getContext('2d');
            lctx.fillStyle = '#1a1408';
            lctx.fillRect(0, 0, 256, 64);
            lctx.fillStyle = '#ffcc33';
            lctx.font = 'bold 38px monospace';
            lctx.textAlign = 'center';
            lctx.fillText(bs.label, 128, 46);
            const lTex = new THREE.CanvasTexture(lCanvas);
            const lMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(3, 0.75),
                new THREE.MeshBasicMaterial({ map: lTex })
            );
            lMesh.position.set(0, 13.3, 0.31);
            g.add(lMesh);
            // Red LOCKED lamp
            const housing = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.4, 0.3), bayDoorMat
            );
            housing.position.set(0, 14, 0.25);
            g.add(housing);
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 10, 8), bayLockedMat.clone()
            );
            bulb.position.set(0, 14, 0.5);
            g.add(bulb);
            this._bayLockedLamps.push(bulb);
            this._bayDoors.push({
                group: g,
                slats,
                bulb,
                innerGlow,
                state: 'closed', // 'closed' | 'opening' | 'open' | 'closing'
                timer: 0,
                nextEvent: 15000 + Math.random() * 25000 // 15-40s until first open
            });
        }
    }

    // ── Fleet display ──
    // Four smaller podiums in a diamond around the main pad, each holding
    // one of the other catalog ships. Updates when previewId changes so
    // the "fleet" reflects which ship is currently focused on the main pad.
    _buildFleetPodiums() {
        const positions = [
            { x: -16, z:  18 },
            { x:  16, z:  18 },
            { x: -16, z: -18 },
            { x:  16, z: -18 }
        ];

        const stepMat = new THREE.MeshStandardMaterial({
            color: 0x0c1624, roughness: 0.45, metalness: 0.7,
            emissive: 0x001826, emissiveIntensity: 0.2
        });
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x122030, roughness: 0.2, metalness: 0.95,
            emissive: 0x002844, emissiveIntensity: 0.35
        });
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ddff, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const accentMat = new THREE.MeshBasicMaterial({
            color: 0x00ddff, transparent: true, opacity: 0.6
        });

        this.fleetPodiums = [];          // visual rings (for tick animation)
        this.fleetShipGroups = [];       // groups holding the actual ships
        this.fleetShipIds = [];          // catalog ids loaded per slot
        this.fleetBeams = [];            // vertical beam columns for swap transitions
        this.fleetSlotState = [];        // per-slot transition state machine
        this.fleetLoadFlags = [];        // true when an async ship load has resolved

        for (const p of positions) {
            const podGroup = new THREE.Group();
            podGroup.position.set(p.x, 0, p.z);

            const step = new THREE.Mesh(
                new THREE.CylinderGeometry(3.4, 3.7, 0.45, 32),
                stepMat
            );
            step.position.y = 0.225;
            step.receiveShadow = true;
            step.castShadow = true;
            podGroup.add(step);

            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(2.9, 3.1, 0.18, 32),
                capMat
            );
            cap.position.y = 0.54;
            cap.receiveShadow = true;
            podGroup.add(cap);

            // Glowing ring on top — pulses with the main podium ring
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(2.55, 2.95, 48),
                ringMat.clone()
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.64;
            podGroup.add(ring);

            // 6 accent strips around the column for visual interest
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const strip = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.32, 0.04),
                    accentMat.clone()
                );
                strip.position.set(
                    Math.cos(a) * 3.05,
                    0.225,
                    Math.sin(a) * 3.05
                );
                strip.rotation.y = -a;
                podGroup.add(strip);
            }

            this.scene.add(podGroup);
            this.fleetPodiums.push({ ring });

            // Separate group for the ship so it can rotate/bob without
            // affecting the podium itself.
            const shipGroup = new THREE.Group();
            shipGroup.position.set(p.x, 0, p.z);
            this.scene.add(shipGroup);
            this.fleetShipGroups.push(shipGroup);
            this.fleetShipIds.push(null);

            // Vertical beam column used to mask swap transitions
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0x88eeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            const beam = new THREE.Mesh(
                new THREE.CylinderGeometry(1.7, 0.7, 14, 24, 1, true),
                beamMat
            );
            beam.position.set(p.x, 7, p.z);
            this.scene.add(beam);
            this.fleetBeams.push(beam);
            this.fleetSlotState.push({ phase: 'idle', t: 0, pendingShip: null });
            this.fleetLoadFlags.push(false);
        }
    }

    // Schedule fleet podiums to display the OTHER ships. Each slot that
    // needs to change runs a beam-column transition (shrink-out → load →
    // grow-in) so the swap reads as a deliberate beam-up effect rather
    // than the model just popping. Called from loadCurrent().
    _loadFleetShips() {
        if (!this.fleetShipGroups || typeof Ships === 'undefined') return;

        const eqId = this.previewId;
        const catalog = Ships.CATALOG || [];
        const others = catalog.filter(s => s.id !== eqId).slice(0, this.fleetShipGroups.length);

        for (let i = 0; i < this.fleetShipGroups.length; i++) {
            const ship = others[i];
            const desiredId = ship ? ship.id : null;
            const currentId = this.fleetShipIds[i];

            // Already showing the right ship in this slot? Skip.
            if (currentId === desiredId) continue;

            const state = this.fleetSlotState[i];
            const slotIsEmpty = !this.fleetShipGroups[i] ||
                this.fleetShipGroups[i].children.length === 0;

            // Track desired id immediately so any in-flight load that
            // resolves with a stale id can self-cancel.
            this.fleetShipIds[i] = desiredId;
            state.pendingShip = ship;

            if (slotIsEmpty && state.phase === 'idle') {
                // First-time fill — skip the shrink-out and go straight
                // to load + grow so initial open feels instant.
                state.phase = 'loading';
                state.t = 0;
                this._kickFleetSlotLoad(i, ship);
            } else {
                // Restart from shrink-out so the user sees the beam pulse.
                state.phase = 'shrink';
                state.t = 0;
            }
        }
    }

    // Kick off async GLB load for a given fleet slot. The result is
    // dropped on the floor if the slot has been reassigned in the
    // meantime, so rapid cycling stays consistent.
    _kickFleetSlotLoad(slotIndex, ship) {
        const group = this.fleetShipGroups[slotIndex];
        if (!group) return;
        // Clear any leftover children before fading the new one in.
        while (group.children.length > 0) group.remove(group.children[0]);
        if (!ship) {
            this.fleetLoadFlags[slotIndex] = true;
            return;
        }
        this.fleetLoadFlags[slotIndex] = false;

        this.loader.load(ship.path, (gltf) => {
            // If the slot was reassigned while we were loading, drop it
            if (this.fleetShipIds[slotIndex] !== ship.id) return;

            const model = gltf.scene;
            if (ship.rotateY) {
                const rotMat = new THREE.Matrix4().makeRotationY(ship.rotateY);
                model.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.geometry.applyMatrix4(rotMat);
                    }
                });
            }
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            // Smaller than main pad ship — about half size
            const targetSize = 5.0;
            const baseScale = targetSize / maxDim;
            const scale = baseScale * (ship.hangarScale || 1.0);
            model.scale.set(scale, scale, scale);
            // Anchor the BOTTOM of the bbox just above the podium cap
            // so tall ships (CORSAIR, INTERCEPTOR…) don't clip in.
            const halfHeight = (size.y * scale) / 2;
            const podiumTopY = 0.85;
            const yOff = (ship.hangarYOffset || 0) * scale * maxDim;
            model.position.set(
                -center.x * scale,
                -center.y * scale + podiumTopY + halfHeight + yOff,
                -center.z * scale
            );

            // Light material treatment — preserve authored colors,
            // just force-opaque if catalog says so + apply recolor.
            model.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const m = child.material;
                if (ship.forceOpaque) {
                    m.transparent = false;
                    m.depthWrite = true;
                    m.opacity = 1.0;
                }
                if (ship.bodyColor !== undefined && m.color) {
                    const hsl = {};
                    m.color.getHSL(hsl);
                    const recolor = new THREE.Color(
                        hsl.s < 0.15 ? ship.bodyColor : (ship.accentColor ?? ship.bodyColor)
                    );
                    m.color.copy(recolor);
                }
                child.castShadow = true;
                m.needsUpdate = true;
            });

            group.add(model);
            this.fleetLoadFlags[slotIndex] = true;
        }, undefined, (err) => {
            console.warn('Hangar fleet failed to load', ship.path, err);
            this.fleetLoadFlags[slotIndex] = true;
        });
    }

    // Holographic ship info-panel that floats above the main pad —
    // two wireframe rings orbiting at different axes plus a canvas-textured
    // name plate. The name canvas is repainted via _updateShipHoloName()
    // whenever the equipped ship changes.
    _buildShipInfoHologram() {
        const group = new THREE.Group();
        group.position.set(0, 9.0, 0);
        this.scene.add(group);
        this._holoInfoGroup = group;

        const ringMatA = new THREE.MeshBasicMaterial({
            color: 0x55ddff, transparent: true, opacity: 0.55,
            blending: THREE.AdditiveBlending, depthWrite: false,
            wireframe: true
        });
        const ringMatB = new THREE.MeshBasicMaterial({
            color: 0x88eeff, transparent: true, opacity: 0.4,
            blending: THREE.AdditiveBlending, depthWrite: false,
            wireframe: true
        });

        const outerRing = new THREE.Mesh(
            new THREE.TorusGeometry(3.6, 0.045, 6, 64),
            ringMatA
        );
        outerRing.rotation.x = Math.PI / 2;
        group.add(outerRing);
        this._holoRingOuter = outerRing;

        const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.7, 0.04, 6, 48),
            ringMatB
        );
        innerRing.rotation.x = Math.PI / 2;
        innerRing.rotation.z = Math.PI / 5;
        group.add(innerRing);
        this._holoRingInner = innerRing;

        // 4 small pip markers around the outer ring for that "scanner" feel
        const pipMat = new THREE.MeshBasicMaterial({
            color: 0x99eeff, transparent: true, opacity: 0.85
        });
        this._holoPips = [];
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const pip = new THREE.Mesh(
                new THREE.SphereGeometry(0.09, 8, 8), pipMat.clone()
            );
            pip.position.set(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6);
            group.add(pip);
            this._holoPips.push(pip);
        }

        // Canvas-textured name plate above the rings
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 512;
        nameCanvas.height = 192;
        this._holoNameCanvas = nameCanvas;
        const nameTex = new THREE.CanvasTexture(nameCanvas);
        nameTex.minFilter = THREE.LinearFilter;
        this._holoNameTex = nameTex;
        const nameMat = new THREE.MeshBasicMaterial({
            map: nameTex, transparent: true, opacity: 0.85,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        const namePlate = new THREE.Mesh(
            new THREE.PlaneGeometry(5.0, 1.875),
            nameMat
        );
        namePlate.position.set(0, 2.6, 0);
        group.add(namePlate);
        this._holoNamePlate = namePlate;

        this._drawHoloNameCanvas('');
    }

    _drawHoloNameCanvas(name) {
        const c = this._holoNameCanvas;
        if (!c) return;
        const ctx = c.getContext('2d');
        const W = c.width, H = c.height;
        ctx.clearRect(0, 0, W, H);

        // Faint grid background
        ctx.strokeStyle = '#3a8fbf';
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= W; gx += 32) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (let gy = 0; gy <= H; gy += 32) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Bracket frame
        ctx.strokeStyle = '#88eeff';
        ctx.lineWidth = 3;
        const m = 18, bw = 38;
        ctx.beginPath();
        ctx.moveTo(m, m + bw); ctx.lineTo(m, m); ctx.lineTo(m + bw, m);
        ctx.moveTo(W - m - bw, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + bw);
        ctx.moveTo(m, H - m - bw); ctx.lineTo(m, H - m); ctx.lineTo(m + bw, H - m);
        ctx.moveTo(W - m - bw, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - bw);
        ctx.stroke();

        // Subheader strip
        ctx.fillStyle = '#aaeeff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('// ACTIVE LOADOUT', 36, 44);
        ctx.textAlign = 'right';
        ctx.fillText('SIG.OK', W - 36, 44);

        // Ship name (large)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e6faff';
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 14;
        ctx.font = 'bold 64px monospace';
        ctx.fillText((name || '----').toUpperCase(), W / 2, 122);
        ctx.shadowBlur = 0;

        // Bottom data strip
        ctx.fillStyle = '#88ccdd';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('CL/STRIKE', 36, H - 32);
        ctx.textAlign = 'right';
        ctx.fillText('STATUS · READY', W - 36, H - 32);

        if (this._holoNameTex) this._holoNameTex.needsUpdate = true;
    }

    _updateShipHoloName(name) {
        if (!this._holoNameCanvas) return;
        this._drawHoloNameCanvas(name);
    }

    // ── Extra scene props for visual density ──
    _buildExtraProps(ceilHeight, wallDist, pitRadius) {
        // Fuel drums — red cylinders with yellow warning band
        const drumBodyMat = new THREE.MeshStandardMaterial({
            color: 0x882222, roughness: 0.55, metalness: 0.6
        });
        const drumBandMat = new THREE.MeshBasicMaterial({
            color: 0xddaa22, transparent: true, opacity: 0.9
        });
        const drumSpots = [
            { x: -36, z:  12, n: 3 },
            { x:  34, z: -14, n: 2 },
            { x: -14, z:  34, n: 2 }
        ];
        for (const spot of drumSpots) {
            for (let i = 0; i < spot.n; i++) {
                const ox = (Math.random() - 0.5) * 3;
                const oz = (Math.random() - 0.5) * 3;
                const drum = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16),
                    drumBodyMat
                );
                drum.position.set(spot.x + ox, 0.9, spot.z + oz);
                drum.rotation.y = Math.random() * Math.PI;
                drum.castShadow = true;
                drum.receiveShadow = true;
                this.scene.add(drum);
                const band = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.72, 0.72, 0.22, 16),
                    drumBandMat
                );
                band.position.set(drum.position.x, 1.4, drum.position.z);
                this.scene.add(band);
                // Cap line on top
                const cap = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.65, 0.65, 0.08, 16),
                    new THREE.MeshStandardMaterial({
                        color: 0x441111, roughness: 0.6, metalness: 0.5
                    })
                );
                cap.position.set(drum.position.x, 1.82, drum.position.z);
                this.scene.add(cap);
            }
        }

        // Wall-mounted ladders on each side wall
        const ladderMat = new THREE.MeshStandardMaterial({
            color: 0x5a6270, roughness: 0.5, metalness: 0.75
        });
        const ladderSpots = [
            { side: -1, z: -30 },
            { side:  1, z:  28 }
        ];
        for (const ls of ladderSpots) {
            const lx = ls.side * (wallDist - 0.5);
            const topY = ceilHeight - 2;
            // Two vertical rails
            for (const dz of [-0.4, 0.4]) {
                const rail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.08, topY - 1, 8),
                    ladderMat
                );
                rail.position.set(lx, (topY + 1) / 2, ls.z + dz);
                this.scene.add(rail);
            }
            // Rungs
            for (let ry = 1.3; ry < topY; ry += 0.8) {
                const rung = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6),
                    ladderMat
                );
                rung.position.set(lx, ry, ls.z);
                rung.rotation.x = Math.PI / 2;
                this.scene.add(rung);
            }
        }

        // Traffic cones near the pit edge (outside the warning ring)
        const coneMat = new THREE.MeshStandardMaterial({
            color: 0xee6622, roughness: 0.6, metalness: 0.1
        });
        const coneStripeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.85
        });
        // Diagonal placement on a tighter radius (~18 from origin) so the
        // cones sit between the pit warning ring and the fleet podiums
        // at (±16, ±18) without intersecting either.
        const conePositions = [
            { x:  12.7, z:  12.7 },
            { x: -12.7, z:  12.7 },
            { x:  12.7, z: -12.7 },
            { x: -12.7, z: -12.7 }
        ];
        for (const cp of conePositions) {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 1.3, 14),
                coneMat
            );
            cone.position.set(cp.x, 0.7, cp.z);
            cone.castShadow = true;
            this.scene.add(cone);
            const stripe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.34, 0.42, 0.12, 14, 1, true),
                coneStripeMat
            );
            stripe.position.set(cp.x, 0.55, cp.z);
            this.scene.add(stripe);
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(0.95, 0.08, 0.95),
                coneMat
            );
            plate.position.set(cp.x, 0.04, cp.z);
            this.scene.add(plate);
        }

        // Spare engine on a display stand (back-left corner)
        const standMat = new THREE.MeshStandardMaterial({
            color: 0x2a2f3a, roughness: 0.45, metalness: 0.75
        });
        const engineMat = new THREE.MeshStandardMaterial({
            color: 0x4a5868, roughness: 0.3, metalness: 0.85,
            emissive: 0x003344, emissiveIntensity: 0.35
        });
        const engineGlowMat = new THREE.MeshBasicMaterial({
            color: 0x66ccff, transparent: true, opacity: 0.9
        });
        const engineX = -40, engineZ = -18;
        const stand = new THREE.Mesh(
            new THREE.CylinderGeometry(1.15, 1.35, 0.6, 18),
            standMat
        );
        stand.position.set(engineX, 0.3, engineZ);
        stand.castShadow = true;
        stand.receiveShadow = true;
        this.scene.add(stand);
        const engine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.82, 2.6, 18),
            engineMat
        );
        engine.position.set(engineX, 1.9, engineZ);
        engine.castShadow = true;
        this.scene.add(engine);
        // Ring detail near the top of the nacelle
        const engineRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.7, 0.08, 8, 20),
            standMat
        );
        engineRing.position.set(engineX, 2.8, engineZ);
        engineRing.rotation.x = Math.PI / 2;
        this.scene.add(engineRing);
        // Emissive intake at the bottom
        const engineGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.55, 18),
            engineGlowMat
        );
        engineGlow.rotation.x = Math.PI / 2;
        engineGlow.position.set(engineX, 0.62, engineZ);
        this.scene.add(engineGlow);
        // Small floor sign beside the stand
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.9, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x226688, transparent: true, opacity: 0.9 })
        );
        sign.position.set(engineX + 1.4, 1.1, engineZ + 1.1);
        sign.rotation.y = -Math.PI / 4;
        this.scene.add(sign);

        // Floor grate panels (darker patterned squares)
        const grateMat = new THREE.MeshStandardMaterial({
            color: 0x08111a, roughness: 0.8, metalness: 0.5,
            emissive: 0x001018, emissiveIntensity: 0.25
        });
        const grateLineMat = new THREE.MeshBasicMaterial({
            color: 0x334455, transparent: true, opacity: 0.55
        });
        const gratePositions = [
            { x: -22, z:  -6 },
            { x:  24, z:  12 },
            { x:   2, z:  36 }
        ];
        for (const gp of gratePositions) {
            const grate = new THREE.Mesh(
                new THREE.PlaneGeometry(3.2, 3.2),
                grateMat
            );
            grate.rotation.x = -Math.PI / 2;
            grate.position.set(gp.x, 0.025, gp.z);
            this.scene.add(grate);
            for (let k = -1; k <= 1; k++) {
                const line = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.08, 3.0),
                    grateLineMat
                );
                line.rotation.x = -Math.PI / 2;
                line.position.set(gp.x + k * 0.8, 0.03, gp.z);
                this.scene.add(line);
            }
        }

        // Hose reels on side walls
        const reelMat = new THREE.MeshStandardMaterial({
            color: 0xcc4422, roughness: 0.5, metalness: 0.4
        });
        for (const side of [-1, 1]) {
            const rx = side * (wallDist - 0.55);
            const rz = side > 0 ? 14 : -12;
            const reel = new THREE.Mesh(
                new THREE.TorusGeometry(0.7, 0.22, 10, 22),
                reelMat
            );
            reel.position.set(rx, 4.5, rz);
            reel.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            this.scene.add(reel);
            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.32, 0.32, 0.45, 12),
                standMat
            );
            hub.position.set(rx, 4.5, rz);
            hub.rotation.z = Math.PI / 2;
            hub.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            this.scene.add(hub);
            // Mounting plate
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 1.6, 1.6),
                standMat
            );
            plate.position.set(rx - side * 0.08, 4.5, rz);
            this.scene.add(plate);
        }

        // Tool cart with toolbox near the podium
        const cartMat = new THREE.MeshStandardMaterial({
            color: 0x3a4450, roughness: 0.5, metalness: 0.55
        });
        const cartAccentMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0.85
        });
        const cartX = 9, cartZ = 9;
        const cart = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.95, 1.05),
            cartMat
        );
        cart.position.set(cartX, 0.7, cartZ);
        cart.rotation.y = 0.35;
        cart.castShadow = true;
        this.scene.add(cart);
        const cartStripe = new THREE.Mesh(
            new THREE.PlaneGeometry(1.72, 0.15),
            cartAccentMat
        );
        cartStripe.position.set(
            cartX + Math.sin(0.35) * 0.53,
            0.92,
            cartZ + Math.cos(0.35) * 0.53
        );
        cartStripe.rotation.y = 0.35;
        this.scene.add(cartStripe);
        const toolbox = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.38, 0.55),
            new THREE.MeshStandardMaterial({
                color: 0x888888, roughness: 0.55, metalness: 0.55
            })
        );
        toolbox.position.set(cartX, 1.4, cartZ);
        toolbox.rotation.y = 0.35;
        toolbox.castShadow = true;
        this.scene.add(toolbox);
        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.8, metalness: 0.2
        });
        for (const wx of [-0.65, 0.65]) {
            for (const wz of [-0.42, 0.42]) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10),
                    wheelMat
                );
                // Rotate offset by cart yaw
                const lx = wx * Math.cos(0.35) - wz * Math.sin(0.35);
                const lz = wx * Math.sin(0.35) + wz * Math.cos(0.35);
                wheel.position.set(cartX + lx, 0.18, cartZ + lz);
                wheel.rotation.z = Math.PI / 2;
                wheel.rotation.y = 0.35;
                this.scene.add(wheel);
            }
        }

        // ── Fuel hose: curved tube from a drum area to the podium edge ──
        const hoseMat = new THREE.MeshStandardMaterial({
            color: 0x26262c, roughness: 0.65, metalness: 0.2
        });
        const hoseConnectorMat = new THREE.MeshStandardMaterial({
            color: 0x444a52, roughness: 0.3, metalness: 0.9,
            emissive: 0x22aa88, emissiveIntensity: 0.6
        });
        const hoseCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-13, 1.9, 34),
            new THREE.Vector3(-10, 3.6, 28),
            new THREE.Vector3(-7,  2.9, 20),
            new THREE.Vector3(-4,  1.6, 12),
            new THREE.Vector3(-2,  0.7, 6.5)
        ]);
        const hoseGeo = new THREE.TubeGeometry(hoseCurve, 48, 0.17, 8, false);
        const hose = new THREE.Mesh(hoseGeo, hoseMat);
        hose.castShadow = true;
        this.scene.add(hose);
        const connA = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.18, 0.5, 12),
            hoseConnectorMat
        );
        connA.position.set(-13, 1.9, 34);
        this.scene.add(connA);
        const connB = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.24, 0.5, 12),
            hoseConnectorMat.clone()
        );
        connB.position.set(-2, 0.7, 6.5);
        this.scene.add(connB);

        // ── Workbench with holographic blueprint ──
        const benchX = -28, benchZ = 20;
        const benchTopMat = new THREE.MeshStandardMaterial({
            color: 0x3a4958, roughness: 0.4, metalness: 0.7
        });
        const benchLegMat = new THREE.MeshStandardMaterial({
            color: 0x1e242e, roughness: 0.55, metalness: 0.6
        });
        const benchTop = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.18, 1.7),
            benchTopMat
        );
        benchTop.position.set(benchX, 1.0, benchZ);
        benchTop.castShadow = true;
        benchTop.receiveShadow = true;
        this.scene.add(benchTop);
        for (const [lx, lz] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]]) {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 1.0, 0.16),
                benchLegMat
            );
            leg.position.set(benchX + lx, 0.5, benchZ + lz);
            this.scene.add(leg);
        }
        // Hologram projector puck
        const projBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.52, 0.25, 16),
            benchLegMat
        );
        projBase.position.set(benchX, 1.22, benchZ);
        this.scene.add(projBase);
        const projGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.38, 16),
            new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0.85
            })
        );
        projGlow.rotation.x = -Math.PI / 2;
        projGlow.position.set(benchX, 1.36, benchZ);
        this.scene.add(projGlow);
        // Blueprint hologram plane
        const holoCanvas = document.createElement('canvas');
        holoCanvas.width = 512;
        holoCanvas.height = 384;
        const hctx = holoCanvas.getContext('2d');
        hctx.clearRect(0, 0, 512, 384);
        hctx.strokeStyle = '#66ccff';
        hctx.lineWidth = 1.2;
        hctx.globalAlpha = 0.55;
        for (let gx = 0; gx < 512; gx += 28) {
            hctx.beginPath(); hctx.moveTo(gx, 0); hctx.lineTo(gx, 384); hctx.stroke();
        }
        for (let gy = 0; gy < 384; gy += 28) {
            hctx.beginPath(); hctx.moveTo(0, gy); hctx.lineTo(512, gy); hctx.stroke();
        }
        hctx.globalAlpha = 1.0;
        hctx.strokeStyle = '#aaddff';
        hctx.lineWidth = 2.4;
        hctx.beginPath();
        hctx.moveTo(256, 60); hctx.lineTo(340, 270);
        hctx.lineTo(300, 310); hctx.lineTo(256, 250);
        hctx.lineTo(212, 310); hctx.lineTo(172, 270);
        hctx.closePath(); hctx.stroke();
        // Inner frame detail
        hctx.strokeStyle = '#77bbee';
        hctx.lineWidth = 1.4;
        hctx.beginPath();
        hctx.moveTo(256, 110); hctx.lineTo(300, 240);
        hctx.lineTo(212, 240); hctx.closePath(); hctx.stroke();
        // Centerline (dashed)
        hctx.setLineDash([5, 7]);
        hctx.strokeStyle = '#55aacc';
        hctx.beginPath(); hctx.moveTo(256, 40); hctx.lineTo(256, 320); hctx.stroke();
        hctx.setLineDash([]);
        // Labels
        hctx.fillStyle = '#aaddff';
        hctx.font = 'bold 14px monospace';
        hctx.fillText('SCHEMATIC  REV.4', 12, 22);
        hctx.font = '12px monospace';
        hctx.fillText('FRAME.01', 40, 160);
        hctx.fillText('HULL.A',   400, 220);
        hctx.fillText('ENG.PORT', 40, 260);
        hctx.fillText('LEN 24.8M', 12, 370);
        const holoTex = new THREE.CanvasTexture(holoCanvas);
        const holoMat = new THREE.MeshBasicMaterial({
            map: holoTex,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const holo = new THREE.Mesh(
            new THREE.PlaneGeometry(2.6, 2.0),
            holoMat
        );
        holo.position.set(benchX, 2.5, benchZ);
        holo.rotation.x = -0.12;
        this.scene.add(holo);
        this._holoPlane = holo;

        // ── Welding station: post, hanging mask, workpiece, flickering arc ──
        const weldX = 22, weldZ = 17;
        const weldPostMat = new THREE.MeshStandardMaterial({
            color: 0x333a44, roughness: 0.5, metalness: 0.65
        });
        const weldPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.2, 2.3, 10),
            weldPostMat
        );
        weldPost.position.set(weldX, 1.15, weldZ);
        weldPost.castShadow = true;
        this.scene.add(weldPost);
        const weldArm = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.08, 0.08),
            weldPostMat
        );
        weldArm.position.set(weldX + 0.45, 2.1, weldZ);
        this.scene.add(weldArm);
        // Mask — half-sphere shell
        const mask = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
            new THREE.MeshStandardMaterial({
                color: 0x1a2430, roughness: 0.45, metalness: 0.55
            })
        );
        mask.position.set(weldX + 0.9, 1.85, weldZ);
        mask.rotation.x = Math.PI;
        this.scene.add(mask);
        // Dark visor strip
        const visor = new THREE.Mesh(
            new THREE.PlaneGeometry(0.48, 0.16),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        visor.position.set(weldX + 0.9, 1.72, weldZ + 0.34);
        this.scene.add(visor);
        // Workpiece below
        const weldTarget = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.2, 0.75),
            new THREE.MeshStandardMaterial({
                color: 0x3a3a3a, roughness: 0.6, metalness: 0.75
            })
        );
        weldTarget.position.set(weldX + 0.65, 0.55, weldZ);
        weldTarget.castShadow = true;
        this.scene.add(weldTarget);
        // Arc (bright additive sphere, opacity flickered in tick)
        const weldArc = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 10, 8),
            new THREE.MeshBasicMaterial({
                color: 0xaaeeff, transparent: true, opacity: 0.0,
                blending: THREE.AdditiveBlending, depthWrite: false
            })
        );
        weldArc.position.set(weldX + 0.65, 0.72, weldZ);
        this.scene.add(weldArc);
        this._weldArc = weldArc;
        // Dynamic light
        const weldLight = new THREE.PointLight(0x88ccff, 0, 9);
        weldLight.position.set(weldX + 0.65, 1.3, weldZ);
        this.scene.add(weldLight);
        this._weldLight = weldLight;

        // ── Supply pallets with foil-wrapped crate stacks ──
        const palletMat = new THREE.MeshStandardMaterial({
            color: 0x5a4a2a, roughness: 0.85, metalness: 0.1
        });
        const foilMat = new THREE.MeshStandardMaterial({
            color: 0xc8ccd2, roughness: 0.32, metalness: 0.95,
            emissive: 0x111418, emissiveIntensity: 0.15
        });
        const palletSpots = [
            { x:  26, z:  5 },
            { x:  26, z: -4 },
            { x: -26, z:  24 }
        ];
        for (const ps of palletSpots) {
            const pallet = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 0.22, 2.5),
                palletMat
            );
            pallet.position.set(ps.x, 0.11, ps.z);
            pallet.receiveShadow = true;
            this.scene.add(pallet);
            const stackH = 2 + Math.floor(Math.random() * 2);
            let yCursor = 0.22;
            for (let i = 0; i < stackH; i++) {
                const w = 2.0 - i * 0.12;
                const h = 0.55 + Math.random() * 0.2;
                const d = 2.0 - i * 0.12;
                const crate = new THREE.Mesh(
                    new THREE.BoxGeometry(w, h, d),
                    foilMat.clone()
                );
                crate.position.set(ps.x, yCursor + h / 2, ps.z);
                crate.rotation.y = (Math.random() - 0.5) * 0.18;
                crate.castShadow = true;
                this.scene.add(crate);
                // Colored strap around each crate
                const strap = new THREE.Mesh(
                    new THREE.BoxGeometry(w + 0.02, 0.08, d + 0.02),
                    new THREE.MeshBasicMaterial({
                        color: i % 2 === 0 ? 0xff6622 : 0x22aaff,
                        transparent: true, opacity: 0.8
                    })
                );
                strap.position.set(ps.x, yCursor + h / 2, ps.z);
                strap.rotation.y = crate.rotation.y;
                this.scene.add(strap);
                yCursor += h + 0.05;
            }
        }

        // ── Junction boxes mounted on the catwalk support pillars ──
        // The existing pillars sit at x = ±(pitRadius + 6) ≈ ±20, at pz values
        // −22, −8, 8, 22 (floor pillars). We mount compact LED panels on the
        // inner face of some pillars so they read clearly from the hangar camera.
        this._ledDots = [];
        const junctionMat = new THREE.MeshStandardMaterial({
            color: 0x1a202a, roughness: 0.55, metalness: 0.5
        });
        const ledColors = [0x44ff66, 0xff6644, 0xffcc44, 0x44aaff];
        const pillarX = pitRadius + 6;
        const junctionSpots = [
            { side: -1, y: 4.5, z: -22 },
            { side: -1, y: 4.5, z:   8 },
            { side:  1, y: 4.5, z: -8  },
            { side:  1, y: 4.5, z:  22 },
            { side: -1, y: 7.5, z:  22 },
            { side:  1, y: 7.5, z: -22 }
        ];
        for (const js of junctionSpots) {
            const jx = js.side * (pillarX - 0.3);      // flush against pillar inner face
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(0.32, 1.3, 1.7),
                junctionMat
            );
            box.position.set(jx, js.y, js.z);
            this.scene.add(box);
            const faceX = jx - js.side * 0.18;         // LEDs sit on the face closer to center
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 5; col++) {
                    const cIdx = (row * 5 + col) % ledColors.length;
                    const led = new THREE.Mesh(
                        new THREE.SphereGeometry(0.06, 6, 5),
                        new THREE.MeshBasicMaterial({
                            color: ledColors[cIdx],
                            transparent: true, opacity: 0.7
                        })
                    );
                    led.position.set(
                        faceX,
                        js.y + 0.35 - row * 0.28,
                        js.z - 0.55 + col * 0.28
                    );
                    this.scene.add(led);
                    this._ledDots.push({
                        mesh: led,
                        phase: Math.random() * 6.28,
                        speed: 1.4 + Math.random() * 3.2
                    });
                }
            }
            // Red warning strip below the LEDs, facing inward
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(1.0, 0.16),
                new THREE.MeshBasicMaterial({
                    color: 0xcc2222, transparent: true, opacity: 0.85
                })
            );
            label.position.set(faceX - js.side * 0.02, js.y - 0.5, js.z);
            label.rotation.y = js.side < 0 ? Math.PI / 2 : -Math.PI / 2;
            this.scene.add(label);
        }

        // ── Cargo tugger / industrial loader parked front-right ──
        const tugX = 14, tugZ = 26;
        const tugBodyMat = new THREE.MeshStandardMaterial({
            color: 0xccaa22, roughness: 0.45, metalness: 0.55
        });
        const tugDarkMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a30, roughness: 0.5, metalness: 0.55
        });
        const tugStripeMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a, transparent: true, opacity: 0.9
        });
        const tugGroup = new THREE.Group();
        tugGroup.position.set(tugX, 0, tugZ);
        // Rotate so the tugger faces back toward the pit/camera
        tugGroup.rotation.y = 2.4;
        this.scene.add(tugGroup);
        // Chassis + bottom strip
        const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 1.3, 3.2), tugBodyMat
        );
        chassis.position.set(0, 0.9, 0);
        chassis.castShadow = true;
        tugGroup.add(chassis);
        const chassisStrip = new THREE.Mesh(
            new THREE.BoxGeometry(2.42, 0.25, 3.22), tugStripeMat
        );
        chassisStrip.position.set(0, 0.4, 0);
        tugGroup.add(chassisStrip);
        // Cab + windshield
        const cab = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.0, 1.3), tugDarkMat
        );
        cab.position.set(0, 2.05, -0.8);
        cab.castShadow = true;
        tugGroup.add(cab);
        const windshield = new THREE.Mesh(
            new THREE.PlaneGeometry(1.7, 0.7),
            new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0.55
            })
        );
        windshield.position.set(0, 2.15, -0.14);
        tugGroup.add(windshield);
        // Wheels
        const wheelMatTug = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.85, metalness: 0.2
        });
        for (const [wx, wz] of [[-1.05, -1.25], [1.05, -1.25], [-1.05, 1.25], [1.05, 1.25]]) {
            const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), wheelMatTug
            );
            wheel.position.set(wx, 0.5, wz);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            tugGroup.add(wheel);
        }
        // Forward gripper arm
        const armBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.5, 0.5), tugDarkMat
        );
        armBase.position.set(0, 1.65, 1.7);
        tugGroup.add(armBase);
        const armSeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 1.6), tugDarkMat
        );
        armSeg.position.set(0, 1.55, 2.7);
        armSeg.rotation.x = -0.22;
        tugGroup.add(armSeg);
        for (const fy of [0.25, -0.25]) {
            const fork = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.1, 1.0), tugDarkMat
            );
            fork.position.set(0, 1.55 + fy, 3.7);
            fork.rotation.x = -0.22;
            tugGroup.add(fork);
        }
        const clawTip = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.3, 0.3),
            new THREE.MeshStandardMaterial({
                color: 0x555a62, roughness: 0.3, metalness: 0.9
            })
        );
        clawTip.position.set(0, 1.55, 3.9);
        clawTip.rotation.x = -0.22;
        tugGroup.add(clawTip);
        // Rotating beacon dome
        const beaconBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 0.12, 10), tugDarkMat
        );
        beaconBase.position.set(0, 2.6, -0.8);
        tugGroup.add(beaconBase);
        const beaconDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 12, 10),
            new THREE.MeshBasicMaterial({
                color: 0xff8822, transparent: true, opacity: 0.9
            })
        );
        beaconDome.position.set(0, 2.8, -0.8);
        tugGroup.add(beaconDome);
        this._tuggerBeacon = beaconDome;
        const beaconLight = new THREE.PointLight(0xff7722, 0.5, 8);
        beaconLight.position.set(tugX, 3.0, tugZ);
        this.scene.add(beaconLight);
        this._tuggerBeaconLight = beaconLight;
        // Headlights
        for (const hx of [-0.7, 0.7]) {
            const hl = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.15, 0.05),
                new THREE.MeshBasicMaterial({
                    color: 0xffffcc, transparent: true, opacity: 0.9
                })
            );
            hl.position.set(hx, 1.3, 1.62);
            tugGroup.add(hl);
        }

        // ── Heat radiators with rising shimmer particles ──
        this._heaters = [];
        const heaterMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a30, roughness: 0.5, metalness: 0.6
        });
        const heaterGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff3311, transparent: true, opacity: 0.9
        });
        const ventSlatMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a20, roughness: 0.6, metalness: 0.5
        });
        const heaterPositions = [
            { x:  17, z:  12 },
            { x: -24, z:   6 }
        ];
        for (const hp of heaterPositions) {
            const unit = new THREE.Mesh(
                new THREE.BoxGeometry(1.9, 1.1, 0.75), heaterMat
            );
            unit.position.set(hp.x, 0.55, hp.z);
            unit.castShadow = true;
            this.scene.add(unit);
            // Inner red glow behind the vents
            const glow = new THREE.Mesh(
                new THREE.PlaneGeometry(1.6, 0.85), heaterGlowMat
            );
            glow.position.set(hp.x, 0.55, hp.z + 0.39);
            this.scene.add(glow);
            // Vent slats
            for (let i = -2; i <= 2; i++) {
                const slat = new THREE.Mesh(
                    new THREE.BoxGeometry(1.65, 0.1, 0.06), ventSlatMat
                );
                slat.position.set(hp.x, 0.55 + i * 0.18, hp.z + 0.41);
                this.scene.add(slat);
            }
            // Top cap
            const cap = new THREE.Mesh(
                new THREE.BoxGeometry(1.95, 0.12, 0.8), ventSlatMat
            );
            cap.position.set(hp.x, 1.15, hp.z);
            this.scene.add(cap);
            // Point light for local warm fill
            const hLight = new THREE.PointLight(0xff4422, 0.5, 5);
            hLight.position.set(hp.x, 0.85, hp.z + 0.5);
            this.scene.add(hLight);
            // Heat shimmer particles
            const partCount = 22;
            const partGeo = new THREE.BufferGeometry();
            const partPos = new Float32Array(partCount * 3);
            for (let i = 0; i < partCount; i++) {
                partPos[i * 3]     = hp.x + (Math.random() - 0.5) * 1.4;
                partPos[i * 3 + 1] = 1.2 + Math.random() * 2.8;
                partPos[i * 3 + 2] = hp.z + 0.42 + (Math.random() - 0.5) * 0.3;
            }
            partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
            const partMat = new THREE.PointsMaterial({
                color: 0xffaa66, size: 0.16, transparent: true, opacity: 0.5,
                blending: THREE.AdditiveBlending, depthWrite: false,
                sizeAttenuation: true
            });
            const particles = new THREE.Points(partGeo, partMat);
            this.scene.add(particles);
            this._heaters.push({
                particles, baseX: hp.x, baseZ: hp.z,
                seedOffset: Math.random() * 100
            });
        }

        // ── Info kiosks: wall clock + bay-status displays ──
        const kioskBodyMat = new THREE.MeshStandardMaterial({
            color: 0x1a2230, roughness: 0.4, metalness: 0.6
        });
        const kioskFrameMat = new THREE.MeshStandardMaterial({
            color: 0x444a58, roughness: 0.35, metalness: 0.75
        });

        // Clock kiosk (back-left)
        const clockCanvas = document.createElement('canvas');
        clockCanvas.width = 512; clockCanvas.height = 256;
        const clockCtx = clockCanvas.getContext('2d');
        const clockTex = new THREE.CanvasTexture(clockCanvas);
        this._clockCanvas = clockCanvas;
        this._clockCtx = clockCtx;
        this._clockTex = clockTex;
        const clockKiosk = new THREE.Group();
        clockKiosk.position.set(22, 0, -32);
        clockKiosk.rotation.y = -0.5;
        this.scene.add(clockKiosk);
        const cBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 2.5, 0.6), kioskBodyMat
        );
        cBase.position.set(0, 1.25, 0);
        cBase.castShadow = true;
        clockKiosk.add(cBase);
        const cFrame = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 1.7, 0.3), kioskFrameMat
        );
        cFrame.position.set(0, 3.3, 0);
        clockKiosk.add(cFrame);
        const cDisplay = new THREE.Mesh(
            new THREE.PlaneGeometry(2.9, 1.4),
            new THREE.MeshBasicMaterial({
                map: clockTex, transparent: true, opacity: 0.95
            })
        );
        cDisplay.position.set(0, 3.3, 0.17);
        clockKiosk.add(cDisplay);

        // Status kiosk (back-right)
        const statusCanvas = document.createElement('canvas');
        statusCanvas.width = 512; statusCanvas.height = 256;
        const statusCtx = statusCanvas.getContext('2d');
        const statusTex = new THREE.CanvasTexture(statusCanvas);
        this._statusCanvas = statusCanvas;
        this._statusCtx = statusCtx;
        this._statusTex = statusTex;
        const statusKiosk = new THREE.Group();
        statusKiosk.position.set(-22, 0, -32);
        statusKiosk.rotation.y = 0.5;
        this.scene.add(statusKiosk);
        const sBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 2.5, 0.6), kioskBodyMat
        );
        sBase.position.set(0, 1.25, 0);
        sBase.castShadow = true;
        statusKiosk.add(sBase);
        const sFrame = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 1.7, 0.3), kioskFrameMat
        );
        sFrame.position.set(0, 3.3, 0);
        statusKiosk.add(sFrame);
        const sDisplay = new THREE.Mesh(
            new THREE.PlaneGeometry(2.9, 1.4),
            new THREE.MeshBasicMaterial({
                map: statusTex, transparent: true, opacity: 0.95
            })
        );
        sDisplay.position.set(0, 3.3, 0.17);
        statusKiosk.add(sDisplay);

        // Initial paint
        this._drawClockCanvas();
        this._drawStatusCanvas();

        // ── Hanging banners from the ceiling (squadron, bay number, safety) ──
        const makeBannerTex = (type) => {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 512;
            const ctx = c.getContext('2d');
            if (type === 'squadron') {
                ctx.fillStyle = '#0a2030';
                ctx.fillRect(0, 0, 256, 512);
                ctx.strokeStyle = '#66ddff';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(128, 210, 75, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(128, 210, 52, 0, Math.PI * 2); ctx.stroke();
                // Wing emblem
                ctx.fillStyle = '#66ddff';
                ctx.beginPath();
                ctx.moveTo(128, 180); ctx.lineTo(170, 230);
                ctx.lineTo(128, 218); ctx.lineTo(86, 230); ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#aaddff';
                ctx.textAlign = 'center';
                ctx.font = 'bold 28px monospace';
                ctx.fillText('SQUADRON', 128, 340);
                ctx.font = 'bold 42px monospace';
                ctx.fillText('VII-C', 128, 390);
                ctx.font = '14px monospace';
                ctx.fillText('AD ASTRA PER ASPERA', 128, 440);
                // Bottom pennant fringe
                ctx.fillStyle = '#66ddff';
                for (let i = 0; i < 256; i += 16) {
                    ctx.beginPath();
                    ctx.moveTo(i, 490); ctx.lineTo(i + 8, 510);
                    ctx.lineTo(i + 16, 490); ctx.fill();
                }
            } else if (type === 'bay') {
                ctx.fillStyle = '#1a1408';
                ctx.fillRect(0, 0, 256, 512);
                for (let i = 0; i < 256; i += 16) {
                    ctx.fillStyle = (i / 16) % 2 === 0 ? '#ddaa11' : '#1a1408';
                    ctx.fillRect(i, 20, 16, 30);
                    ctx.fillRect(i, 462, 16, 30);
                }
                ctx.fillStyle = '#ffcc33';
                ctx.textAlign = 'center';
                ctx.font = 'bold 36px monospace';
                ctx.fillText('BAY', 128, 110);
                ctx.font = 'bold 210px monospace';
                ctx.fillText('07', 128, 330);
                ctx.font = '18px monospace';
                ctx.fillText('DOCKING', 128, 410);
            } else {
                ctx.fillStyle = '#400808';
                ctx.fillRect(0, 0, 256, 512);
                ctx.fillStyle = '#ffcc33';
                ctx.beginPath();
                ctx.moveTo(128, 130); ctx.lineTo(196, 250);
                ctx.lineTo(60, 250); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 70px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!', 128, 235);
                ctx.fillStyle = '#ffcc66';
                ctx.font = 'bold 34px monospace';
                ctx.fillText('SAFETY', 128, 320);
                ctx.fillText('FIRST', 128, 360);
                ctx.fillStyle = '#ffaa22';
                ctx.font = '16px monospace';
                ctx.fillText('REPORT', 128, 410);
                ctx.fillText('ALL DEFECTS', 128, 432);
            }
            const t = new THREE.CanvasTexture(c);
            t.needsUpdate = true;
            return t;
        };

        const bannerBarMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a44, roughness: 0.5, metalness: 0.65
        });
        const bannerCableMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a22, roughness: 0.7
        });
        const bannerDefs = [
            { x: -11, z:  14, type: 'squadron' },
            { x:  11, z:  14, type: 'bay' },
            { x:   0, z: -24, type: 'safety' }
        ];
        for (const b of bannerDefs) {
            const tex = makeBannerTex(b.type);
            const banner = new THREE.Mesh(
                new THREE.PlaneGeometry(3, 6),
                new THREE.MeshBasicMaterial({
                    map: tex, transparent: true, opacity: 0.95,
                    side: THREE.DoubleSide, depthWrite: false
                })
            );
            banner.position.set(b.x, ceilHeight - 7, b.z);
            this.scene.add(banner);
            const bar = new THREE.Mesh(
                new THREE.BoxGeometry(3.3, 0.14, 0.14), bannerBarMat
            );
            bar.position.set(b.x, ceilHeight - 4, b.z);
            this.scene.add(bar);
            // Short cables from ceiling to the bar
            for (const dx of [-1.3, 1.3]) {
                const cbl = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.04, 0.04, 2, 6), bannerCableMat
                );
                cbl.position.set(b.x + dx, ceilHeight - 3, b.z);
                this.scene.add(cbl);
            }
        }

        // ── Arcade-style propaganda posters on catwalk pillars + crate ──
        const makePosterTex = (text, subtitle, bgColor, fgColor) => {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 256;
            const ctx = c.getContext('2d');
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 256, 256);
            // Border
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(8, 8, 240, 240);
            // Starburst rays behind text
            ctx.strokeStyle = fgColor;
            ctx.globalAlpha = 0.18;
            ctx.lineWidth = 2;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
                ctx.beginPath();
                ctx.moveTo(128, 128);
                ctx.lineTo(128 + Math.cos(a) * 200, 128 + Math.sin(a) * 200);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = fgColor;
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px monospace';
            ctx.fillText(text, 128, 130);
            ctx.font = '16px monospace';
            ctx.fillText(subtitle, 128, 200);
            const t = new THREE.CanvasTexture(c);
            t.needsUpdate = true;
            return t;
        };

        const posterDefs = [
            { x: -20, y: 8.5, z:  -8, side: -1,
              text: 'FLY SAFE', sub: 'NO HEROES', bg: '#0a1a30', fg: '#ffcc33' },
            { x:  20, y: 8.5, z:   8, side:  1,
              text: 'REPORT', sub: 'ALL DEFECTS', bg: '#2a0a0a', fg: '#ff6644' }
        ];
        for (const p of posterDefs) {
            const tex = makePosterTex(p.text, p.sub, p.bg, p.fg);
            const poster = new THREE.Mesh(
                new THREE.PlaneGeometry(1.8, 1.8),
                new THREE.MeshBasicMaterial({
                    map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide
                })
            );
            poster.position.set(
                p.x - p.side * 0.28, p.y, p.z
            );
            poster.rotation.y = p.side < 0 ? Math.PI / 2 : -Math.PI / 2;
            this.scene.add(poster);
        }
        // Third poster mounted on the front face of the right-front crate stack
        const posterTex3 = makePosterTex('BE', 'PRECISE', '#1a2a10', '#88ff66');
        const crateFaceposter = new THREE.Mesh(
            new THREE.PlaneGeometry(1.3, 1.3),
            new THREE.MeshBasicMaterial({
                map: posterTex3, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            })
        );
        crateFaceposter.position.set(22, 1.4, 27.1);
        this.scene.add(crateFaceposter);

        // ── Loose overhead cable runs between catwalk pillars (with sag + nodes) ──
        const meshCableMat = new THREE.MeshStandardMaterial({
            color: 0x15161c, roughness: 0.7, metalness: 0.2
        });
        const meshNodeMat = new THREE.MeshBasicMaterial({
            color: 0x44ddff, transparent: true, opacity: 0.85
        });
        const cableRuns = [
            { a: new THREE.Vector3(-20, ceilHeight - 1, -18),
              b: new THREE.Vector3(-20, ceilHeight - 1,  18) },
            { a: new THREE.Vector3( 20, ceilHeight - 1, -18),
              b: new THREE.Vector3( 20, ceilHeight - 1,  18) },
            { a: new THREE.Vector3(-20, ceilHeight - 1,  -6),
              b: new THREE.Vector3( 20, ceilHeight - 1,   6) },
            { a: new THREE.Vector3(-20, ceilHeight - 1,   6),
              b: new THREE.Vector3( 20, ceilHeight - 1,  -6) }
        ];
        for (const cr of cableRuns) {
            const mid = new THREE.Vector3(
                (cr.a.x + cr.b.x) / 2,
                cr.a.y - 2.5 - Math.random() * 1.2,
                (cr.a.z + cr.b.z) / 2
            );
            const curve = new THREE.CatmullRomCurve3([cr.a, mid, cr.b]);
            const geo = new THREE.TubeGeometry(curve, 28, 0.05, 6, false);
            this.scene.add(new THREE.Mesh(geo, meshCableMat));
            for (const pt of [cr.a, cr.b]) {
                const node = new THREE.Mesh(
                    new THREE.SphereGeometry(0.11, 8, 6), meshNodeMat.clone()
                );
                node.position.copy(pt);
                this.scene.add(node);
            }
        }

        // ── Floor decals: NO STEP, CAUTION, and hatched hazard zones ──
        this._addFloorText('NO STEP', 22, 13, 1.6, 0xddaa11);
        this._addFloorText('CAUTION', 14, 31, 1.8, 0xddaa11);
        this._addFloorText('KEEP CLEAR', -24, 11, 1.6, 0xddaa11);

        const hatchCanvas = document.createElement('canvas');
        hatchCanvas.width = 128; hatchCanvas.height = 128;
        const hctx2 = hatchCanvas.getContext('2d');
        hctx2.fillStyle = '#141008';
        hctx2.fillRect(0, 0, 128, 128);
        hctx2.strokeStyle = '#ddaa11';
        hctx2.lineWidth = 18;
        for (let i = -128; i < 256; i += 34) {
            hctx2.beginPath();
            hctx2.moveTo(i, 0); hctx2.lineTo(i + 128, 128);
            hctx2.stroke();
        }
        const hatchTex = new THREE.CanvasTexture(hatchCanvas);
        hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping;
        hatchTex.repeat.set(2, 2);
        const hatchZones = [
            { x:  22, z:  22, w: 4, h: 3 },    // near welding station
            { x: -24, z:  17, w: 3.5, h: 3 }   // near workbench
        ];
        for (const hz of hatchZones) {
            const zone = new THREE.Mesh(
                new THREE.PlaneGeometry(hz.w, hz.h),
                new THREE.MeshBasicMaterial({
                    map: hatchTex, transparent: true, opacity: 0.7, depthWrite: false
                })
            );
            zone.rotation.x = -Math.PI / 2;
            zone.position.set(hz.x, 0.035, hz.z);
            this.scene.add(zone);
        }

        // ── Coffee cup + clipboard on the right-front console ──
        // Consoles sit at (walkX, catwalkY+0.95, ±22); pick (20, 10.95, 22).
        const cupMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8e8, roughness: 0.35, metalness: 0.05
        });
        const cupBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.13, 0.32, 14), cupMat
        );
        cupBody.position.set(19.2, 11.2, 22.4);
        this.scene.add(cupBody);
        const cupHandle = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.035, 6, 12, Math.PI), cupMat
        );
        cupHandle.position.set(19.36, 11.2, 22.4);
        cupHandle.rotation.y = Math.PI / 2;
        cupHandle.rotation.z = Math.PI / 2;
        this.scene.add(cupHandle);
        const coffee = new THREE.Mesh(
            new THREE.CircleGeometry(0.14, 14),
            new THREE.MeshBasicMaterial({ color: 0x150806 })
        );
        coffee.rotation.x = -Math.PI / 2;
        coffee.position.set(19.2, 11.365, 22.4);
        this.scene.add(coffee);
        // Clipboard group
        const clipGroup = new THREE.Group();
        clipGroup.position.set(19.6, 11.05, 21.7);
        clipGroup.rotation.y = 0.35;
        this.scene.add(clipGroup);
        const clipBoard = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.04, 0.85),
            new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.7 })
        );
        clipGroup.add(clipBoard);
        const paper = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.75),
            new THREE.MeshBasicMaterial({
                color: 0xf0ecc8, transparent: true, opacity: 0.95
            })
        );
        paper.rotation.x = -Math.PI / 2;
        paper.position.y = 0.03;
        clipGroup.add(paper);
        const clip = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.06, 0.1),
            new THREE.MeshStandardMaterial({
                color: 0xaaaaaa, roughness: 0.3, metalness: 0.85
            })
        );
        clip.position.set(0, 0.05, 0.37);
        clipGroup.add(clip);

        // ── Helmet on a wall hook (mounted on a free catwalk pillar) ──
        // Pillar at x=-20, z=-8 is free of junction box — mount helmet there.
        const hookPos = new THREE.Vector3(-20, 2.4, -8);
        const hookBracketMat = new THREE.MeshStandardMaterial({
            color: 0x333a44, roughness: 0.5, metalness: 0.75
        });
        // L-bracket base + peg
        const hookBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.25, 0.25), hookBracketMat
        );
        hookBase.position.set(hookPos.x + 0.28, hookPos.y + 0.1, hookPos.z);
        this.scene.add(hookBase);
        const hookPeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), hookBracketMat
        );
        hookPeg.position.set(hookPos.x + 0.48, hookPos.y + 0.08, hookPos.z);
        hookPeg.rotation.z = Math.PI / 2;
        this.scene.add(hookPeg);
        // Helmet — orange half-dome hanging on the peg
        const helmetGroup = new THREE.Group();
        helmetGroup.position.set(hookPos.x + 0.55, hookPos.y - 0.1, hookPos.z);
        helmetGroup.rotation.z = Math.PI;             // open end down
        helmetGroup.rotation.x = 0.1;                 // slight tilt forward
        this.scene.add(helmetGroup);
        const helmetShell = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
            new THREE.MeshStandardMaterial({
                color: 0xee8822, roughness: 0.45, metalness: 0.45,
                emissive: 0x221100, emissiveIntensity: 0.2
            })
        );
        helmetGroup.add(helmetShell);
        // White stripe over the top
        const helmetStripe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.325, 0.325, 0.08, 16, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0xeeeeee, transparent: true, opacity: 0.9,
                side: THREE.DoubleSide
            })
        );
        helmetStripe.rotation.x = Math.PI / 2;
        helmetStripe.position.y = 0.18;
        helmetGroup.add(helmetStripe);
        // Dark visor strip
        const helmetVisor = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.12, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x0a1620 })
        );
        helmetVisor.position.set(0, -0.04, 0.26);
        helmetGroup.add(helmetVisor);

        // ── Squadron / tally decals on visible crate front faces ──
        const makeCrateDecal = () => {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 256;
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, 256, 256);
            ctx.fillStyle = '#aaddff';
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('VII-C', 128, 80);
            ctx.font = '18px monospace';
            ctx.fillText('MISSIONS', 128, 115);
            // Tally marks: 8 groups of 5 = 40
            ctx.strokeStyle = '#aaddff';
            ctx.lineWidth = 4;
            for (let i = 0; i < 8; i++) {
                const x = 36 + (i % 4) * 48;
                const y = 145 + Math.floor(i / 4) * 50;
                for (let j = 0; j < 4; j++) {
                    ctx.beginPath();
                    ctx.moveTo(x + j * 7, y); ctx.lineTo(x + j * 7, y + 32);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(x - 3, y + 28); ctx.lineTo(x + 24, y + 4);
                ctx.stroke();
            }
            ctx.fillStyle = '#88aacc';
            ctx.font = '14px monospace';
            ctx.fillText('SN-14873', 128, 248);
            const t = new THREE.CanvasTexture(c);
            t.needsUpdate = true;
            return t;
        };
        const crateDecalSpots = [
            { x: -22, z:  26, faceZ:  1.25 },   // front face of left-front crate
            { x:  22, z:  26, faceZ:  1.25 }    // right-front crate (already has poster, skip front)
        ];
        // Only add decal to left crate front; right crate already carries BE PRECISE poster
        {
            const dec = new THREE.Mesh(
                new THREE.PlaneGeometry(1.4, 1.4),
                new THREE.MeshBasicMaterial({
                    map: makeCrateDecal(),
                    transparent: true, opacity: 0.9, side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            dec.position.set(-22, 1.8, 27.1);
            this.scene.add(dec);
        }
    }

    // ── Canvas painters for the kiosks ──
    _drawClockCanvas() {
        if (!this._clockCtx) return;
        const ctx = this._clockCtx;
        const W = 512, H = 256;
        ctx.fillStyle = '#020812';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,30,60,0.35)';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = '#44ffaa';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('STATION TIME — UTC', 14, 22);
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(14, 28, W - 28, 1);

        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        const blink = (Math.floor(performance.now() / 500) % 2) === 0;
        const sep = blink ? ':' : ' ';
        const text = `${hh}${sep}${mm}${sep}${ss}`;
        ctx.font = 'bold 88px monospace';
        ctx.fillStyle = '#66ffdd';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, W / 2, H / 2 + 12);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        const date = d.toISOString().slice(0, 10);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#88bbdd';
        ctx.fillText(`CYCLE ${date}`, 14, H - 14);
        ctx.fillText('SHIFT C', W - 110, H - 14);
        this._clockTex.needsUpdate = true;
    }

    _drawStatusCanvas() {
        if (!this._statusCtx) return;
        const ctx = this._statusCtx;
        const W = 512, H = 256;
        ctx.fillStyle = '#020812';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,30,60,0.35)';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('BAY STATUS', 14, 26);
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(14, 32, W - 28, 1);
        const bays = [
            ['BAY 07', 'ACTIVE',  '#44ffaa'],
            ['BAY 04', 'MAINT',   '#ffcc44'],
            ['BAY 02', 'OFFLINE', '#ff6644'],
            ['BAY 11', 'READY',   '#44ffaa'],
            ['BAY 09', 'LOADING', '#66ccff']
        ];
        ctx.font = '18px monospace';
        const dot = (Math.floor(performance.now() / 450) % 2) === 0;
        for (let i = 0; i < bays.length; i++) {
            const y = 62 + i * 32;
            ctx.fillStyle = '#88bbdd';
            ctx.fillText(bays[i][0], 20, y);
            ctx.fillStyle = bays[i][2];
            ctx.fillText(bays[i][1], 170, y);
            if (dot || bays[i][1] === 'OFFLINE') {
                ctx.fillStyle = bays[i][2];
                ctx.fillRect(W - 40, y - 14, 10, 10);
            }
        }
        ctx.fillStyle = '#668899';
        ctx.font = '14px monospace';
        ctx.fillText('OP: MARTIN G. — SHIFT C', 14, H - 14);
        this._statusTex.needsUpdate = true;
    }

    // ── Ambient events setup ──
    _buildAmbientEvents(ceilHeight, wallDist) {
        this.ambientEvents = [];
        this.nextAmbientTime = performance.now() + 1500;

        // Source positions
        this.ambientSparkSources = [
            new THREE.Vector3(-4.5, ceilHeight - 15.1, -3),   // hook tip
            new THREE.Vector3(-4.5, ceilHeight - 7.5, -3),    // trolley underside
            new THREE.Vector3(-8, ceilHeight - 6.2, -3)       // arm mid-section
        ];
        this.ambientSteamSources = [];
        for (const sx of [-wallDist + 0.6, wallDist - 0.6]) {
            for (const py of [6.9, 17.3]) {
                for (let pz = -24; pz <= 24; pz += 6) {
                    this.ambientSteamSources.push(new THREE.Vector3(
                        sx + (sx < 0 ? 0.9 : -0.9), py, pz
                    ));
                }
            }
        }

        // Shared templates — each event clones its own material so fading is independent
        this._sparkMatTpl = new THREE.PointsMaterial({
            color: 0xffcc44, size: 0.28, transparent: true, opacity: 1.0,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        });
        this._steamMatTpl = new THREE.PointsMaterial({
            color: 0xccddee, size: 0.8, transparent: true, opacity: 0.55,
            depthWrite: false, sizeAttenuation: true
        });

        // Track which panels are currently being overridden so the normal
        // pulse loop can skip them.
        this._flickeringPanels = new Set();
        this._surgingLamps = new Set();
    }

    _spawnSparks(pos) {
        const count = 16;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            velocities[i * 3]     = (Math.random() - 0.5) * 5.0;
            velocities[i * 3 + 1] = -1.5 - Math.random() * 3.0;   // mostly downward
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = this._sparkMatTpl.clone();
        const pts = new THREE.Points(geo, mat);
        this.scene.add(pts);
        this.ambientEvents.push({
            type: 'sparks', points: pts, velocities,
            life: 1.1, maxLife: 1.1
        });
        // Brief warm flash light
        const flash = new THREE.PointLight(0xffaa44, 2.5, 10);
        flash.position.copy(pos);
        this.scene.add(flash);
        this.ambientEvents.push({
            type: 'sparkLight', light: flash, life: 0.35, maxLife: 0.35
        });
    }

    _spawnSteam(pos) {
        const count = 14;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = pos.x + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3;
            velocities[i * 3]     = (Math.random() - 0.5) * 0.4;
            velocities[i * 3 + 1] = 0.7 + Math.random() * 0.6;   // rising
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = this._steamMatTpl.clone();
        const pts = new THREE.Points(geo, mat);
        this.scene.add(pts);
        this.ambientEvents.push({
            type: 'steam', points: pts, velocities,
            life: 2.4, maxLife: 2.4
        });
    }

    _spawnPanelFlicker() {
        if (!this.ceilingPanels || this.ceilingPanels.length === 0) return;
        const panel = this.ceilingPanels[
            Math.floor(Math.random() * this.ceilingPanels.length)
        ];
        if (this._flickeringPanels.has(panel)) return;
        this._flickeringPanels.add(panel);
        this.ambientEvents.push({
            type: 'panelFlicker', panel,
            life: 0.9, maxLife: 0.9,
            seed: Math.random() * 1000
        });
    }

    _spawnLampSurge() {
        if (!this.warningLamps || this.warningLamps.length === 0) return;
        const lamp = this.warningLamps[
            Math.floor(Math.random() * this.warningLamps.length)
        ];
        if (this._surgingLamps.has(lamp)) return;
        this._surgingLamps.add(lamp);
        this.ambientEvents.push({
            type: 'lampSurge', lamp,
            life: 0.75, maxLife: 0.75
        });
    }

    _updateAmbientEvents(dtMs) {
        const dt = dtMs / 1000;
        const now = performance.now();

        // Schedule next event
        if (now >= this.nextAmbientTime) {
            const roll = Math.random();
            if (roll < 0.38) {
                const src = this.ambientSparkSources[
                    Math.floor(Math.random() * this.ambientSparkSources.length)
                ];
                this._spawnSparks(src);
                this.nextAmbientTime = now + 1800 + Math.random() * 3200;
            } else if (roll < 0.72) {
                const src = this.ambientSteamSources[
                    Math.floor(Math.random() * this.ambientSteamSources.length)
                ];
                this._spawnSteam(src);
                this.nextAmbientTime = now + 2200 + Math.random() * 4000;
            } else if (roll < 0.9) {
                this._spawnPanelFlicker();
                this.nextAmbientTime = now + 3200 + Math.random() * 4800;
            } else {
                this._spawnLampSurge();
                this.nextAmbientTime = now + 4000 + Math.random() * 5500;
            }
        }

        // Update + cull active events
        for (let i = this.ambientEvents.length - 1; i >= 0; i--) {
            const ev = this.ambientEvents[i];
            ev.life -= dt;
            const alive = Math.max(0, ev.life / ev.maxLife);

            if (ev.type === 'sparks') {
                const arr = ev.points.geometry.getAttribute('position').array;
                for (let j = 0; j < arr.length; j += 3) {
                    arr[j]     += ev.velocities[j]     * dt;
                    arr[j + 1] += ev.velocities[j + 1] * dt;
                    arr[j + 2] += ev.velocities[j + 2] * dt;
                    ev.velocities[j + 1] -= dt * 8.0;   // gravity
                }
                ev.points.geometry.getAttribute('position').needsUpdate = true;
                ev.points.material.opacity = alive;
            } else if (ev.type === 'sparkLight') {
                ev.light.intensity = alive * 2.5;
            } else if (ev.type === 'steam') {
                const arr = ev.points.geometry.getAttribute('position').array;
                for (let j = 0; j < arr.length; j += 3) {
                    arr[j]     += ev.velocities[j]     * dt;
                    arr[j + 1] += ev.velocities[j + 1] * dt;
                    arr[j + 2] += ev.velocities[j + 2] * dt;
                    // Slowing rise + horizontal dispersion
                    ev.velocities[j + 1] *= 0.985;
                    ev.velocities[j]     *= 1.008;
                    ev.velocities[j + 2] *= 1.008;
                }
                ev.points.geometry.getAttribute('position').needsUpdate = true;
                ev.points.material.opacity = alive * 0.55;
                ev.points.material.size = 0.8 + (1 - alive) * 0.9;
            } else if (ev.type === 'panelFlicker') {
                const f = Math.abs(
                    Math.sin(now * 0.05 + ev.seed) *
                    Math.sin(now * 0.021 + ev.seed * 1.3)
                );
                ev.panel.material.opacity = 0.08 + f * 0.9;
            } else if (ev.type === 'lampSurge') {
                // Bright flash, then quick decay
                ev.lamp.material.opacity = alive > 0.6 ? 1.0 : 0.3 + alive * 0.8;
            }

            if (ev.life <= 0) {
                if (ev.points) {
                    this.scene.remove(ev.points);
                    ev.points.geometry.dispose();
                    ev.points.material.dispose();
                }
                if (ev.light) this.scene.remove(ev.light);
                if (ev.type === 'panelFlicker') this._flickeringPanels.delete(ev.panel);
                if (ev.type === 'lampSurge') this._surgingLamps.delete(ev.lamp);
                this.ambientEvents.splice(i, 1);
            }
        }
    }

    // ── Public API ──
    show() {
        this.active = true;
        this.previewId = Ships.getEquippedId();
        this.currentId = this.previewId;
        this.slideOffset = 0;
        this.slideTarget = 0;
        this.slideDirection = 0;
        this.pendingShipId = null;
        this._launching = false;
        this._launchT = 0;
        this.loadCurrent();
        this.updateInfo();
        // Defer resize so CSS has applied the mobile canvas dimensions
        this.onResize();
        requestAnimationFrame(() => this.onResize());
    }

    hide() {
        this.active = false;
    }

    browse(direction) {
        // Ignore input while the cycle or launch animation is running
        if (this._shipState !== 'idle') return;
        if (this._launching) return;
        const next = direction > 0
            ? Ships.next(this.previewId)
            : Ships.prev(this.previewId);
        this.pendingShipId = next.id;
        this._shipState = 'cycle';
        this._shipCycleT = 0;
        this._shipSwapped = false;
        if (window.game && window.game.audio && window.game.audio.playMenuNavigate) {
            window.game.audio.playMenuNavigate();
        }
    }

    completePendingSlide() {
        if (this.pendingShipId) {
            this.previewId = this.pendingShipId;
            this.loadCurrent();
            this.updateInfo();
            this.pendingShipId = null;
        }
        // Place the new ship off-screen on the opposite side, then slide in
        this.slideOffset = -this.slideTarget * 0.7;
        this.slideTarget = 0;
        this.slideDirection = 0;
    }

    equipCurrent() {
        if (this._launching) return;
        Ships.setEquippedId(this.previewId);
        this.updateInfo();

        // Visual confirmation: flash the platform ring brightly
        if (this.platformRing) {
            this._ringFlash = 1.0;
        }

        if (window.game && window.game.audio && window.game.audio.playMenuSelect) {
            window.game.audio.playMenuSelect();
        }
    }

    // Cinematic exit: crane trolley slides to ship, hook lowers,
    // grabs ship, lifts it up and away. Calls onComplete when done.
    playLaunchSequence(onComplete) {
        if (this._launching) return this._launchTotalMs || 0;
        this._launching = true;
        this._launchT = 0;
        this._launchSoundsPlayed = { move: false, grab: false, lift: false };
        this._launchOnComplete = onComplete || null;
        // Cancel any in-flight cycle
        this._shipState = 'idle';
        this._shipCycleT = 0;
        this._shipSwapped = false;
        // Timeline: arm swings (0-600), hook lowers (600-1200),
        // grab (1200-1400), lift ship up (1400-2400), done
        this._launchTotalMs = 2400;
        return this._launchTotalMs;
    }

    loadCurrent() {
        const ship = Ships.getById(this.previewId);
        if (!ship) return;

        // Refresh the fleet podiums with the OTHER catalog ships so the
        // hangar shows the rest of the lineup around the active pad.
        this._loadFleetShips();

        // Update the holographic info-panel above the main pad
        this._updateShipHoloName(ship.name);

        while (this.shipGroup.children.length > 0) {
            this.shipGroup.remove(this.shipGroup.children[0]);
        }

        if (this.loadedModels[ship.id]) {
            this.shipGroup.add(this.loadedModels[ship.id].clone());
            return;
        }

        this.loader.load(ship.path, (gltf) => {
            const model = gltf.scene;

            // Bake orientation fix into vertex data (same as player loader)
            if (ship.rotateY) {
                const rotMat = new THREE.Matrix4().makeRotationY(ship.rotateY);
                model.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.geometry.applyMatrix4(rotMat);
                    }
                });
            }

            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const baseScale = 10.5 / maxDim;
            const scale = baseScale * (ship.hangarScale || 1.0);

            model.scale.set(scale, scale, scale);
            const yOff = (ship.hangarYOffset || 0) * scale * maxDim;
            model.position.set(-center.x * scale, -center.y * scale + yOff, -center.z * scale);

            // Remember half the model's vertical extent so the cycle animation
            // can sink tall ships (like VIPER) deep enough to stay below the cap.
            this._currentShipHalfHeight = (size.y * scale) / 2 + 0.25;

            // Strip "glow shell" halo meshes for forceOpaque ships
            if (ship.forceOpaque) {
                const toRemove = [];
                model.traverse((child) => {
                    if (!child.isMesh || !child.material) return;
                    const m = child.material;
                    if (m.side === THREE.BackSide || (m.transparent && m.opacity < 0.95)) {
                        toRemove.push(child);
                    }
                });
                for (const mesh of toRemove) {
                    if (mesh.parent) mesh.parent.remove(mesh);
                }
            }

            // Detect vertex colors and boost them to survive tone mapping
            let hasVertexColors = false;
            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    const colorAttr = child.geometry.getAttribute('color');
                    if (colorAttr) {
                        hasVertexColors = true;
                        const boost = ship.vertexColorBoost || 1.1;
                        const arr = colorAttr.array;
                        for (let i = 0; i < arr.length; i++) {
                            arr[i] = Math.min(1, arr[i] * boost);
                        }
                        colorAttr.needsUpdate = true;
                    }
                }
            });

            model.traverse(child => {
                if (child.isMesh && child.material) {
                    const m = child.material;
                    if (ship.bodyColor !== undefined && m.color) {
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
                        if (hasVertexColors) m.vertexColors = true;
                        m.color.setHex(0xffffff);
                        m.toneMapped = false;
                        if (m.emissive) {
                            if (m.map) {
                                m.emissiveMap = m.map;
                                m.emissive.setHex(0xffffff);
                                m.emissiveIntensity = (ship.emissiveIntensity !== undefined)
                                    ? ship.emissiveIntensity
                                    : 0.4;
                            } else {
                                m.emissive.setHex(0x000000);
                                m.emissiveIntensity = 0;
                            }
                        }
                    } else if (m.emissive && m.color) {
                        if (ship.noEmissive) {
                            m.emissive.setHex(0x000000);
                            m.emissiveIntensity = 0;
                        } else {
                            m.emissive.copy(m.color).multiplyScalar(0.4);
                            m.emissiveIntensity = 0.3;
                        }
                    }
                    if (m.metalness !== undefined) {
                        m.metalness = (ship.metalness !== undefined) ? ship.metalness : 0.6;
                    }
                    if (m.roughness !== undefined) {
                        m.roughness = (ship.roughness !== undefined) ? ship.roughness : 0.35;
                    }
                    if (ship.doubleSide) m.side = THREE.DoubleSide;
                    // Force opaque on materials that should be solid
                    const shouldForce = (ship.forceOpaque) || m.opacity >= 0.9;
                    if (shouldForce) {
                        m.transparent = false;
                        m.depthWrite = true;
                        m.opacity = 1.0;
                        if (m.alphaMap) m.alphaMap = null;
                        m.alphaTest = 0;
                        if (m.transmission !== undefined) m.transmission = 0;
                        if (m.thickness !== undefined) m.thickness = 0;
                        if (m.clearcoat !== undefined) m.clearcoat = 0;
                        if (m.sheen !== undefined) m.sheen = 0;
                        if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.3;
                    }
                    child.castShadow = true;
                    m.needsUpdate = true;
                }
            });

            this.loadedModels[ship.id] = model;

            if (this.previewId === ship.id) {
                while (this.shipGroup.children.length > 0) {
                    this.shipGroup.remove(this.shipGroup.children[0]);
                }
                this.shipGroup.add(model);
            }
        }, undefined, (err) => {
            console.warn('Hangar failed to load', ship.path, err);
        });
    }

    updateInfo() {
        const ship = Ships.getById(this.previewId);
        if (!ship) return;

        const nameEl = document.getElementById('hangarShipName');
        const descEl = document.getElementById('hangarShipDesc');
        const equippedEl = document.getElementById('hangarEquipped');
        const counterEl = document.getElementById('hangarCounter');

        if (nameEl) nameEl.textContent = ship.name;
        if (descEl) descEl.textContent = ship.description;

        const isEquipped = Ships.getEquippedId() === ship.id;
        if (equippedEl) equippedEl.classList.toggle('show', isEquipped);

        const idx = Ships.getIndex(ship.id);
        if (counterEl) counterEl.textContent = `${idx + 1} / ${Ships.CATALOG.length}`;
    }

    tick() {
        if (this.active) {
            const nowMs = performance.now();
            const dtMs = this._lastTickTime
                ? Math.min(50, nowMs - this._lastTickTime)
                : 16;
            this._lastTickTime = nowMs;

            this.spinAngle += 0.0085;

            // Ship + floor-door cycle state machine (doors stay open throughout)
            // Timeline (ms):
            //   0- 300  doors open
            // 300- 800  ship sinks  (hover → hide)
            // 800-1000  held at bottom (swap at t=900 while deep in shaft)
            //1000-1500  ship rises  (hide → hover)
            //1500-1800  doors close
            this.shipGroup.position.x = 0;
            if (!this._launching) {
                this.shipGroup.rotation.y = this.spinAngle;
            }
            const hoverY = 4.0 + Math.sin(this.spinAngle * 0.7) * 0.25;
            // Per-ship hide depth: keep the ship fully below the cap's inner
            // ring regardless of model height. Fall back to -2 before first load.
            const hideY = -0.8 - (this._currentShipHalfHeight || 1.2);
            let shipY = hoverY;
            let openAmt = 0;
            let launchFlash = 0;
            let launchRingFlash = 0;
            if (this._launching) {
                this._launchT += dtMs;
                const t = this._launchT;
                const easeInOut = (s) => s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
                const hoverBase = 4.0;

                // Phase boundaries
                const T_TROLLEY_END = 600;    // trolley slides over ship
                const T_LOWER_END   = 1200;   // hook lowers to ship
                const T_GRAB_END    = 1400;   // grab pause
                const T_LIFT_END    = 2400;    // lift ship up out of view
                const T_HOLD_END    = 2800;    // hold then complete

                // Crane home positions
                const homeX = this._craneTrolleyHomeX || -4.5;
                const homeZ = this._craneTrolleyHomeZ || -3;
                const targetX = 0;     // ship is at x=0
                const targetZ = 0;     // ship is at z=0
                const hookHomeY = this._craneHookHomeY || 6;
                const hookGrabY = hoverBase + 0.5; // just above ship center
                const liftY = (this._craneCeilHeight || 20) + 5; // above ceiling

                const launchAngle = this._craneLaunchAngle || 0;

                if (t < T_TROLLEY_END) {
                    // Arm swings from home angle to over the ship
                    const k = easeInOut(t / T_TROLLEY_END);
                    if (this._cranePivot) this._cranePivot.rotation.y = launchAngle * k;
                    shipY = hoverBase;
                    if (!this._launchSoundsPlayed.move && t > 50) {
                        if (window.game?.audio?.playMenuNavigate) window.game.audio.playMenuNavigate();
                        this._launchSoundsPlayed.move = true;
                    }
                } else if (t < T_LOWER_END) {
                    // Hook lowers to grab height (local Y in pivot group)
                    if (this._cranePivot) this._cranePivot.rotation.y = launchAngle;
                    const k = easeInOut((t - T_TROLLEY_END) / (T_LOWER_END - T_TROLLEY_END));
                    const hookY = hookHomeY + (hookGrabY - hookHomeY) * k;
                    const cableStretch = (hookHomeY - hookY);
                    if (this._craneCable) {
                        this._craneCable.scale.y = 1 + cableStretch / this._craneCableLen;
                        this._craneCable.position.y = this._craneCableHomeY - cableStretch / 2;
                    }
                    if (this._craneHookBody) { this._craneHookBody.position.y = hookY; }
                    if (this._craneHookCurve) { this._craneHookCurve.position.y = hookY - 0.8; }
                    shipY = hoverBase;
                } else if (t < T_GRAB_END) {
                    // Grab — slight ship jostle
                    const k = (t - T_LOWER_END) / (T_GRAB_END - T_LOWER_END);
                    shipY = hoverBase - Math.sin(k * Math.PI) * 0.3;
                    if (!this._launchSoundsPlayed.grab) {
                        if (window.game?.audio?.playMenuSelect) window.game.audio.playMenuSelect();
                        this._launchSoundsPlayed.grab = true;
                    }
                } else if (t < T_LIFT_END) {
                    // Lift ship + hook up together
                    if (this._cranePivot) this._cranePivot.rotation.y = launchAngle;
                    const k = easeInOut((t - T_GRAB_END) / (T_LIFT_END - T_GRAB_END));
                    const liftedY = hoverBase + (liftY - hoverBase) * k;
                    shipY = liftedY;
                    if (this._craneHookBody) { this._craneHookBody.position.y = liftedY + 2; }
                    if (this._craneHookCurve) { this._craneHookCurve.position.y = liftedY + 1.2; }
                    if (this._craneCable) {
                        const cableTop = this._craneCableHomeY + this._craneCableLen / 2;
                        const cableBot = liftedY + 2.5;
                        const newLen = cableTop - cableBot;
                        this._craneCable.scale.y = Math.max(0.1, newLen / this._craneCableLen);
                        this._craneCable.position.y = (cableTop + cableBot) / 2;
                    }
                    // Hide ship once it's mostly lifted
                    if (k > 0.7) this.shipGroup.visible = false;
                    if (!this._launchSoundsPlayed.lift && k > 0.1) {
                        if (window.game?.audio?.playTeleportOut) window.game.audio.playTeleportOut();
                        this._launchSoundsPlayed.lift = true;
                    }
                } else {
                    // Sequence complete — fire callback immediately, no hold phase
                    this._launching = false;
                    this._launchT = 0;
                    this.shipGroup.visible = true; // restore for next visit
                    // Reset crane pivot + hook/cable to home
                    if (this._cranePivot) this._cranePivot.rotation.y = 0;
                    if (this._craneCable) { this._craneCable.position.y = this._craneCableHomeY; this._craneCable.scale.y = 1; }
                    if (this._craneHookBody) { this._craneHookBody.position.y = this._craneHookHomeY; }
                    if (this._craneHookCurve) { this._craneHookCurve.position.y = this._craneHookCurveHomeY; }
                    if (this._launchOnComplete) {
                        const cb = this._launchOnComplete;
                        this._launchOnComplete = null;
                        try { cb(); } catch (e) { console.warn(e); }
                    }
                }
            } else if (this._shipState === 'cycle') {
                this._shipCycleT += dtMs;
                const t = this._shipCycleT;
                const ease = (s) => s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
                // Door schedule — open through whole cycle, only close at end
                if (t < 300)       openAmt = t / 300;
                else if (t < 1500) openAmt = 1;
                else if (t < 1800) openAmt = 1 - (t - 1500) / 300;
                else               openAmt = 0;
                // Ship Y schedule
                const hoverBase = 4.0;
                if (t < 300)       shipY = hoverBase;
                else if (t < 800)  shipY = hoverBase + (hideY - hoverBase) * ease((t - 300) / 500);
                else if (t < 1000) shipY = hideY;
                else if (t < 1500) shipY = hideY + (hoverBase - hideY) * ease((t - 1000) / 500);
                else               shipY = hoverBase;
                // Swap the model while ship is deep in the shaft
                if (t >= 900 && !this._shipSwapped) {
                    if (this.pendingShipId) {
                        this.previewId = this.pendingShipId;
                        this.loadCurrent();
                        this.updateInfo();
                        this.pendingShipId = null;
                    }
                    this._shipSwapped = true;
                }
                if (t >= 1800) {
                    this._shipState = 'idle';
                    this._shipCycleT = 0;
                    this._shipSwapped = false;
                }
            }
            this.shipGroup.position.y = shipY;
            this._doorOpenAmount = openAmt;
            // Apply door offsets (halves slide apart along X)
            if (this._doorA && this._doorB) {
                const off = openAmt * this._doorRadius;
                this._doorA.position.x = off;
                this._doorB.position.x = -off;
                if (this._doorSeamA) this._doorSeamA.position.x = 0.04 + off;
                if (this._doorSeamB) this._doorSeamB.position.x = -0.04 - off;
                if (this._shaftGlow) this._shaftGlow.material.opacity = Math.min(1, openAmt * 0.65 + launchFlash * 0.95);
                if (this._shaftLight) this._shaftLight.intensity = openAmt * 1.6 + launchFlash * 8.0;
            }

            // Subtle camera parallax
            const t = performance.now() * 0.0003;
            const cw = this.canvas.clientWidth;
            const ch = this.canvas.clientHeight;
            // Only use mobile camera if canvas is actually visible and small
            const mobileHangar = cw > 0 && ch > 0 && (cw < 800 || ch < 400);
            if (mobileHangar) {
                // Tight framing on just the ship
                this.camera.position.x = Math.sin(t) * 0.5;
                this.camera.position.y = 12 + Math.sin(t * 1.3) * 0.15;
                this.camera.position.z = 32 + Math.sin(t * 0.7) * 0.3;
                this.camera.lookAt(0, 4, 0);
            } else {
                this.camera.position.x = Math.sin(t) * 1.4;
                this.camera.position.y = 16 + Math.sin(t * 1.3) * 0.35;
                this.camera.position.z = 48 + Math.sin(t * 0.7) * 0.8;
                this.camera.lookAt(0, 4, 0);
            }

            // Pulse the ceiling panels gently for life (skip flickering ones)
            if (this.ceilingPanels) {
                const pulse = 0.75 + Math.sin(this.spinAngle * 1.3) * 0.1;
                for (const p of this.ceilingPanels) {
                    if (this._flickeringPanels && this._flickeringPanels.has(p)) continue;
                    p.material.opacity = pulse;
                }
            }

            // Ventilation fans rotating
            if (this.vents) {
                for (let i = 0; i < this.vents.length; i++) {
                    // Alternate rotation direction so it doesn't look mechanical
                    const dir = (i % 2 === 0) ? 1 : -1;
                    this.vents[i].rotation.y += dir * 0.015;
                }
            }

            // Pulsing docking strips — staggered pulses that travel outward
            if (this.dockingStrips) {
                const now = performance.now() * 0.002;
                for (let i = 0; i < this.dockingStrips.length; i++) {
                    const strip = this.dockingStrips[i];
                    const phase = now - i * 0.4;
                    const o = 0.25 + Math.max(0, Math.sin(phase)) * 0.7;
                    strip.material.opacity = o;
                }
            }

            // Hanging warning lamps — slow per-lamp pulse (skip surging lamps)
            if (this.warningLamps) {
                const t = performance.now() * 0.0015;
                for (let i = 0; i < this.warningLamps.length; i++) {
                    const lamp = this.warningLamps[i];
                    if (this._surgingLamps && this._surgingLamps.has(lamp)) continue;
                    lamp.material.opacity = 0.55 + Math.sin(t + i * 1.3) * 0.35;
                }
            }

            // Crane warning light — fast red blink
            if (this.craneLight) {
                const blink = (Math.sin(performance.now() * 0.006) > 0) ? 1.0 : 0.3;
                this.craneLight.material.opacity = blink;
            }

            // Slow rotation on the hero planet visible through the window
            if (this.heroPlanet) {
                this.heroPlanet.rotation.y += 0.0015;
            }

            // Console screens — redraw every 3rd frame for perf
            this._screenFrameCounter = (this._screenFrameCounter || 0) + 1;
            if (this._screenFrameCounter % 3 === 0) {
                this._updateConsoleScreens();
            }

            // Drifting dust particles — slow random motion, wrap at bounds
            if (this.dustParticles && this.dustBounds) {
                const posAttr = this.dustParticles.geometry.getAttribute('position');
                const arr = posAttr.array;
                const b = this.dustBounds;
                for (let i = 0; i < arr.length; i += 3) {
                    arr[i]     += this.dustVelocities[i]     * 0.5;
                    arr[i + 1] += this.dustVelocities[i + 1] * 0.5;
                    arr[i + 2] += this.dustVelocities[i + 2] * 0.5;

                    // Tiny sinusoidal jitter for organic feel
                    arr[i + 1] += Math.sin((performance.now() * 0.0005) + i * 0.13) * 0.005;

                    // Wrap around bounds
                    if (arr[i]     >  b.xz) arr[i]     = -b.xz;
                    if (arr[i]     < -b.xz) arr[i]     =  b.xz;
                    if (arr[i + 1] > b.maxY) arr[i + 1] = b.minY;
                    if (arr[i + 1] < b.minY) arr[i + 1] = b.maxY;
                    if (arr[i + 2] >  b.xz) arr[i + 2] = -b.xz;
                    if (arr[i + 2] < -b.xz) arr[i + 2] =  b.xz;
                }
                posAttr.needsUpdate = true;
            }

            // Platform ring flash on equip
            if (this._ringFlash > 0) {
                this._ringFlash -= 0.04;
                if (this.platformRing) {
                    this.platformRing.material.opacity = 0.6 + this._ringFlash;
                    const s = 1 + this._ringFlash * 0.3;
                    this.platformRing.scale.set(s, s, 1);
                }
            } else if (this.platformRing) {
                this.platformRing.material.opacity =
                    0.4 + Math.sin(this.spinAngle * 2.2) * 0.2 + launchRingFlash;
                const s = 1 + launchRingFlash * 0.45;
                this.platformRing.scale.set(s, s, 1);
            }

            // Ship info-hologram — counter-rotating rings + name plate
            // facing the camera, with a subtle breathing opacity.
            if (this._holoInfoGroup) {
                const ht = performance.now() * 0.001;
                if (this._holoRingOuter) {
                    this._holoRingOuter.rotation.z += 0.012;
                    this._holoRingOuter.material.opacity =
                        0.45 + Math.sin(ht * 1.2) * 0.12;
                }
                if (this._holoRingInner) {
                    this._holoRingInner.rotation.z -= 0.018;
                    this._holoRingInner.rotation.y += 0.006;
                    this._holoRingInner.material.opacity =
                        0.32 + Math.sin(ht * 1.7 + 1.3) * 0.12;
                }
                if (this._holoPips) {
                    for (let i = 0; i < this._holoPips.length; i++) {
                        const a = (i / 4) * Math.PI * 2 + ht * 0.6;
                        this._holoPips[i].position.set(
                            Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6
                        );
                    }
                }
                if (this._holoNamePlate) {
                    // Always face the camera horizontally
                    const cam = this.camera;
                    const np = this._holoNamePlate;
                    const wp = new THREE.Vector3();
                    np.getWorldPosition(wp);
                    np.lookAt(cam.position.x, wp.y, cam.position.z);
                    // Breathing + occasional micro-flicker
                    const base = 0.78 + Math.sin(ht * 2.0) * 0.08;
                    const flick = Math.random() < 0.012 ? -0.3 : 0;
                    np.material.opacity = Math.max(0.25, base + flick);
                }
                // Gentle vertical bob on the whole group
                this._holoInfoGroup.position.y = 9.0 + Math.sin(ht * 0.8) * 0.18;
            }

            // Fleet podiums — slow rotation + gentle bob, plus the
            // beam-up swap transition state machine. Rotation is
            // dt-driven so it stays smooth when no other animation
            // (door cycle, etc.) is masking frame jitter.
            if (this.fleetShipGroups && this.fleetPodiums) {
                const ft = performance.now() * 0.001;
                const dtSec = dtMs / 1000;
                const SHRINK_MS = 220;
                const GROW_MS   = 360;
                const LOAD_TIMEOUT_MS = 2500;

                for (let i = 0; i < this.fleetShipGroups.length; i++) {
                    const group = this.fleetShipGroups[i];
                    const pod   = this.fleetPodiums[i];
                    const beam  = this.fleetBeams[i];
                    const state = this.fleetSlotState[i];

                    // Drive the per-slot transition. Phases:
                    //   shrink  — ship vanishes upward, beam ramps up
                    //   loading — beam holds while async GLB resolves
                    //   grow    — beam fades, new ship pops in with overshoot
                    //   idle    — steady state, scale 1, beam 0
                    let scaleMul = 1;
                    let beamA = 0;
                    if (state) {
                        state.t += dtMs;
                        if (state.phase === 'shrink') {
                            const k = Math.min(1, state.t / SHRINK_MS);
                            scaleMul = 1 - k;
                            beamA = k * 0.95;
                            if (k >= 1) {
                                state.phase = 'loading';
                                state.t = 0;
                                this._kickFleetSlotLoad(i, state.pendingShip);
                            }
                        } else if (state.phase === 'loading') {
                            scaleMul = 0;
                            // Subtle pulse while we wait for the model
                            beamA = 0.85 + Math.sin(state.t * 0.018) * 0.1;
                            if (this.fleetLoadFlags[i] || state.t >= LOAD_TIMEOUT_MS) {
                                state.phase = 'grow';
                                state.t = 0;
                            }
                        } else if (state.phase === 'grow') {
                            const k = Math.min(1, state.t / GROW_MS);
                            // Easeout-back so the ship pops in
                            const eased = 1 + (k - 1) * (k - 1) * (k - 1);
                            const overshoot = Math.sin(k * Math.PI) * 0.08;
                            scaleMul = eased + overshoot;
                            beamA = (1 - k) * 0.95;
                            if (k >= 1) {
                                state.phase = 'idle';
                                state.t = 0;
                                scaleMul = 1;
                                beamA = 0;
                            }
                        }
                    }

                    if (group) {
                        // Idle bob + spin layered on top of transition scale
                        const rotSpeed = 0.28 + i * 0.05;
                        group.rotation.y += rotSpeed * dtSec;
                        group.position.y = Math.sin(ft * 0.7 + i * 1.4) * 0.22;
                        const finalScale = Math.max(0.0001, scaleMul);
                        group.scale.set(finalScale, finalScale, finalScale);
                    }

                    if (beam) {
                        beam.material.opacity = beamA;
                        // Subtle vertical breathing on the beam scale so
                        // the column doesn't read as a static cylinder
                        const bs = 1 + Math.sin(ft * 2.4 + i * 0.9) * 0.06;
                        beam.scale.set(bs, 1, bs);
                    }

                    if (pod && pod.ring) {
                        // Boost the ring while the slot is mid-transition
                        const boost = beamA * 0.4;
                        pod.ring.material.opacity =
                            0.35 + Math.sin(ft * 2.0 + i * 1.1) * 0.2 + boost;
                    }
                }
            }

            // Welding arc — irregular strobe with matching point-light
            if (this._weldArc) {
                const wt = performance.now() * 0.02;
                const s = Math.sin(wt) * Math.sin(wt * 1.73) * Math.sin(wt * 3.1);
                const on = s > 0.22;
                const intensity = on ? (0.75 + Math.random() * 0.25) : Math.max(0, s * 0.3);
                this._weldArc.material.opacity = intensity;
                this._weldArc.scale.setScalar(0.85 + Math.random() * 0.5);
                if (this._weldLight) this._weldLight.intensity = intensity * 3.2;
            }

            // Junction-box LEDs — independent per-LED blink
            if (this._ledDots) {
                const lt = performance.now() * 0.001;
                for (const d of this._ledDots) {
                    const p = Math.sin(lt * d.speed + d.phase);
                    d.mesh.material.opacity = p > 0 ? 0.85 : 0.18;
                }
            }

            // Hologram blueprint — gentle breathing + rare micro-flicker
            if (this._holoPlane) {
                const ht = performance.now() * 0.003;
                const base = 0.7 + Math.sin(ht * 2.1) * 0.1;
                const flick = Math.random() < 0.015 ? -0.35 : 0;
                this._holoPlane.material.opacity = Math.max(0.15, base + flick);
            }

            // Bay doors — periodic open/close cycle
            if (this._bayDoors) {
                for (const bay of this._bayDoors) {
                    bay.timer += dtMs;
                    const easeIO = (s) => s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);

                    if (bay.state === 'closed') {
                        // Pulsing red lamp while closed
                        const bt = performance.now() * 0.002;
                        bay.bulb.material.color.setHex(0xff3322);
                        bay.bulb.material.opacity = 0.55 + Math.sin(bt) * 0.4;
                        bay.innerGlow.material.opacity = 0;
                        // Check if time to open
                        if (bay.timer >= bay.nextEvent) {
                            bay.state = 'opening';
                            bay.timer = 0;
                        }
                    } else if (bay.state === 'opening') {
                        // Slats roll up over 2s
                        const dur = 2000;
                        const k = Math.min(1, bay.timer / dur);
                        const ek = easeIO(k);
                        for (let i = 0; i < bay.slats.length; i++) {
                            bay.slats[i].position.y = bay.slats[i]._homeY + ek * 14;
                        }
                        bay.innerGlow.material.opacity = ek * 0.4;
                        bay.bulb.material.color.setHex(0x22ff44);
                        bay.bulb.material.opacity = 0.8;
                        if (k >= 1) {
                            bay.state = 'open';
                            bay.timer = 0;
                        }
                    } else if (bay.state === 'open') {
                        // Hold open 4-8s, glow flickers
                        bay.innerGlow.material.opacity = 0.3 + Math.sin(performance.now() * 0.003) * 0.15;
                        bay.bulb.material.color.setHex(0x22ff44);
                        bay.bulb.material.opacity = 0.9;
                        if (bay.timer >= 4000 + Math.random() * 4000) {
                            bay.state = 'closing';
                            bay.timer = 0;
                        }
                    } else if (bay.state === 'closing') {
                        // Slats roll down over 2s
                        const dur = 2000;
                        const k = Math.min(1, bay.timer / dur);
                        const ek = easeIO(k);
                        for (let i = 0; i < bay.slats.length; i++) {
                            bay.slats[i].position.y = bay.slats[i]._homeY + (1 - ek) * 14;
                        }
                        bay.innerGlow.material.opacity = (1 - ek) * 0.4;
                        bay.bulb.material.color.setHex(0xffaa22);
                        bay.bulb.material.opacity = 0.7;
                        if (k >= 1) {
                            bay.state = 'closed';
                            bay.timer = 0;
                            bay.nextEvent = 20000 + Math.random() * 30000; // 20-50s until next
                        }
                    }
                }
            }

            // Tugger beacon — spin dome + sinusoidal light intensity sweep
            if (this._tuggerBeacon && this._tuggerBeaconLight) {
                const bt = performance.now();
                this._tuggerBeacon.rotation.y = bt * 0.004;
                const sweep = 0.5 + 0.5 * Math.sin(bt * 0.008);
                this._tuggerBeaconLight.intensity = 0.25 + sweep * 1.1;
            }

            // Heater shimmer — rising particles with horizontal jitter + wrap
            if (this._heaters) {
                const ht = performance.now();
                for (const h of this._heaters) {
                    const arr = h.particles.geometry.getAttribute('position').array;
                    for (let i = 0; i < arr.length; i += 3) {
                        arr[i + 1] += 0.02;
                        arr[i]     += Math.sin(ht * 0.002 + h.seedOffset + i) * 0.004;
                        arr[i + 2] += Math.cos(ht * 0.0015 + h.seedOffset + i) * 0.003;
                        if (arr[i + 1] > 4.2) {
                            arr[i]     = h.baseX + (Math.random() - 0.5) * 1.4;
                            arr[i + 1] = 1.2;
                            arr[i + 2] = h.baseZ + 0.42 + (Math.random() - 0.5) * 0.3;
                        }
                    }
                    h.particles.geometry.getAttribute('position').needsUpdate = true;
                }
            }

            // Clock + bay-status displays — repaint every 30 frames (~2Hz)
            this._kioskFrame = (this._kioskFrame || 0) + 1;
            if (this._kioskFrame % 30 === 0) {
                this._drawClockCanvas();
                this._drawStatusCanvas();
            }

            // Ambient events (sparks, steam, flickers, surges) — runs last
            // so it can override baseline panel/lamp assignments this frame.
            this._updateAmbientEvents(dtMs);

            // Auto-resize if canvas CSS dimensions changed (mobile layout)
            const canvasW = this.canvas.clientWidth;
            const canvasH = this.canvas.clientHeight;
            if (canvasW && canvasH && (this.canvas.width !== canvasW || this.canvas.height !== canvasH)) {
                this.onResize();
            }

            this.renderer.render(this.scene, this.camera);
        }
        requestAnimationFrame(() => this.tick());
    }
}
