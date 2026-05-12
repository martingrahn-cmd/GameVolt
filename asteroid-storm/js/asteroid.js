// Procedural asteroid generation — pooled geometry variants
// Pre-generates N unique shapes per size at startup. Each spawn
// picks a random variant and clones it with unique rotation/scale,
// avoiding expensive per-spawn geometry generation.

function fbmNoise(x, y, z, octaves = 4) {
    let val = 0, amp = 1, freq = 1, total = 0;
    for (let i = 0; i < octaves; i++) {
        const h = Math.sin(x * freq * 12.9898 + y * freq * 78.233 + z * freq * 45.164) * 43758.5453;
        val += ((h - Math.floor(h)) - 0.5) * 2 * amp;
        total += amp;
        amp *= 0.5;
        freq *= 2.1;
    }
    return val / total;
}

// ── Palette pool ──
const ASTEROID_PALETTES = [
    { r: 0.42, g: 0.40, b: 0.36 },  // neutral gray
    { r: 0.32, g: 0.30, b: 0.28 },  // dark gray
    { r: 0.50, g: 0.38, b: 0.26 },  // brown
    { r: 0.45, g: 0.32, b: 0.20 },  // rust brown
    { r: 0.20, g: 0.19, b: 0.18 },  // near black
    { r: 0.55, g: 0.50, b: 0.42 },  // sandy
    { r: 0.30, g: 0.32, b: 0.38 },  // cool gray
    { r: 0.38, g: 0.28, b: 0.22 },  // dark brown
];

const SIZE_TINTS = {
    large:  { edge: 0x0088cc, glow: 0x003366, rim: 0x88ccff, edgeOpacity: 0.40, glowOpacity: 0.10, rimOpacity: 0.18 },
    medium: { edge: 0x44ddbb, glow: 0x004433, rim: 0x88ffdd, edgeOpacity: 0.55, glowOpacity: 0.12, rimOpacity: 0.22 },
    small:  { edge: 0xffaa44, glow: 0x553311, rim: 0xffcc88, edgeOpacity: 0.70, glowOpacity: 0.15, rimOpacity: 0.28 }
};

// ── Geometry variant cache ──
// Built once at first use, stores { geo, edgesGeo, glowGeo, rimGeo, palette } per variant.
const VARIANT_COUNT = 12;
const _geoCache = {};  // { large: [...], medium: [...] }

function _buildVariant(size) {
    const radius = { large: 4, medium: 2.5, small: 1.2 }[size];
    const detail = size === 'large' ? 4 : size === 'medium' ? 3 : 2;
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.getAttribute('position');

    // Random stretch
    const stretchX = 0.7 + Math.random() * 0.6;
    const stretchY = 0.7 + Math.random() * 0.6;
    const stretchZ = 0.7 + Math.random() * 0.6;

    // Generate craters
    const craterCount = 2 + Math.floor(Math.random() * 6);
    const craters = [];
    for (let c = 0; c < craterCount; c++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        craters.push({
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.sin(phi) * Math.sin(theta),
            z: Math.cos(phi),
            radius: 0.15 + Math.random() * 0.4,
            depth: 0.05 + Math.random() * 0.12,
            rimHeight: 0.02 + Math.random() * 0.05
        });
    }

    // Generate lumps
    const lumpCount = 1 + Math.floor(Math.random() * 3);
    const lumps = [];
    for (let l = 0; l < lumpCount; l++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        lumps.push({
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.sin(phi) * Math.sin(theta),
            z: Math.cos(phi),
            size: 0.3 + Math.random() * 0.5,
            height: 0.1 + Math.random() * 0.2
        });
    }

    // Displace vertices
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) * stretchX;
        let y = pos.getY(i) * stretchY;
        let z = pos.getZ(i) * stretchZ;

        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;

        let displacement = fbmNoise(nx * 2.5, ny * 2.5, nz * 2.5, 3) * radius * 0.2;
        displacement += fbmNoise(nx * 7, ny * 7, nz * 7, 2) * radius * 0.06;

        for (const lump of lumps) {
            const dot = nx * lump.x + ny * lump.y + nz * lump.z;
            const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
            const t = angle / lump.size;
            if (t < 1.0) displacement += lump.height * radius * Math.pow(1 - t, 2);
        }

        for (const cr of craters) {
            const dot = nx * cr.x + ny * cr.y + nz * cr.z;
            const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
            const t = angle / cr.radius;
            if (t < 1.0) {
                displacement -= (cr.depth * radius - Math.pow(t, 2) * cr.depth * radius);
            } else if (t < 1.3) {
                displacement += cr.rimHeight * radius * (1 - (t - 1.0) / 0.3);
            }
        }

        const newLen = len + displacement;
        pos.setXYZ(i, nx * newLen, ny * newLen, nz * newLen);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Pick palette and bake vertex colors
    const palette = ASTEROID_PALETTES[Math.floor(Math.random() * ASTEROID_PALETTES.length)];
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;
        const normalizedHeight = (len - radius * 0.7) / (radius * 0.6);
        const h = Math.max(0, Math.min(1, normalizedHeight));
        const surfNoise = fbmNoise(nx * 5, ny * 5, nz * 5, 2) * 0.5 + 0.5;
        const bright = 0.25 + h * 0.45 + surfNoise * 0.2;
        colors[i * 3] = palette.r * bright;
        colors[i * 3 + 1] = palette.g * bright;
        colors[i * 3 + 2] = palette.b * bright;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Pre-compute derived geometries
    const edgesGeo = new THREE.EdgesGeometry(geo, 15);

    const glowGeo = geo.clone();
    const glowPos = glowGeo.getAttribute('position');
    for (let i = 0; i < glowPos.count; i++) {
        glowPos.setXYZ(i, pos.getX(i) * 1.06, pos.getY(i) * 1.06, pos.getZ(i) * 1.06);
    }
    glowPos.needsUpdate = true;

    const rimGeo = geo.clone();
    const rimPos = rimGeo.getAttribute('position');
    for (let i = 0; i < rimPos.count; i++) {
        rimPos.setXYZ(i, pos.getX(i) * 1.04, pos.getY(i) * 1.04, pos.getZ(i) * 1.04);
    }
    rimPos.needsUpdate = true;

    return { geo, edgesGeo, glowGeo, rimGeo, palette };
}

function _ensureCache(size) {
    if (_geoCache[size]) return;
    _geoCache[size] = [];
    for (let i = 0; i < VARIANT_COUNT; i++) {
        _geoCache[size].push(_buildVariant(size));
    }
}

class Asteroid {
    constructor(position, size = 'large', velocity = null, rotation = null, scene = null) {
        this.position = position ? position.clone() : new Vector2D(0, 0);
        this.velocity = velocity ? velocity.clone() : new Vector2D(0, 0);
        this.size = size;
        this.radius = this.getRadius();
        this.scene = scene;

        this.rotation = rotation || {
            x: (Math.random() - 0.5) * 3,
            y: (Math.random() - 0.5) * 3,
            z: (Math.random() - 0.5) * 3
        };

        this.mesh = this.createMesh();
        this.health = 1;
    }

    getRadius() {
        return { 'large': 4, 'medium': 2.5, 'small': 1.2 }[this.size];
    }

    createMesh() {
        _ensureCache(this.size);
        const variants = _geoCache[this.size];
        const variant = variants[Math.floor(Math.random() * variants.length)];
        const tint = SIZE_TINTS[this.size] || SIZE_TINTS.large;

        const group = new THREE.Group();

        // Solid mesh — clone geometry so each instance has independent transforms
        const solidMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true
        });
        const solidMesh = new THREE.Mesh(variant.geo, solidMat);
        solidMesh.castShadow = true;
        solidMesh.receiveShadow = true;
        group.add(solidMesh);

        // Edge glow
        const edgeMat = new THREE.LineBasicMaterial({
            color: tint.edge,
            transparent: true,
            opacity: tint.edgeOpacity
        });
        group.add(new THREE.LineSegments(variant.edgesGeo, edgeMat));

        // Outer glow shell
        const glowMat = new THREE.MeshBasicMaterial({
            color: tint.glow,
            transparent: true,
            opacity: tint.glowOpacity,
            side: THREE.BackSide
        });
        group.add(new THREE.Mesh(variant.glowGeo, glowMat));

        // Bright rim shell
        const rimMat = new THREE.MeshBasicMaterial({
            color: tint.rim,
            transparent: true,
            opacity: tint.rimOpacity,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(variant.rimGeo, rimMat));

        // Random initial rotation so same variant looks different each spawn
        group.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        // Slight random scale variation (±10%) for extra uniqueness
        const scaleJitter = 0.9 + Math.random() * 0.2;
        group.scale.set(scaleJitter, scaleJitter, scaleJitter);

        group.position.set(this.position.x, 1, this.position.z);
        return group;
    }

    update(dt) {
        this.position.add(this.velocity.clone().scale(dt));
        updateWrapAround(this);

        this.mesh.position.set(this.position.x, this.mesh.position.y, this.position.z);

        this.mesh.rotation.x += this.rotation.x * dt;
        this.mesh.rotation.y += this.rotation.y * dt;
        this.mesh.rotation.z += this.rotation.z * dt;
    }

    split() {
        const children = [];

        if (this.size === 'large') {
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 15 + Math.random() * 20;

                const vel = new Vector2D(
                    Math.cos(angle) * speed + this.velocity.x * 0.5,
                    Math.sin(angle) * speed + this.velocity.z * 0.5
                );

                const child = new Asteroid(
                    this.position.clone(),
                    'medium',
                    vel,
                    null,
                    this.scene
                );
                children.push(child);
            }
        }

        return children;
    }

    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}
