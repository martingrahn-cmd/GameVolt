// Ship catalog — list of player-pickable ships and the persisted choice.
// Each entry just needs a unique id, a friendly name + description, and a
// path to the GLB file in assets/ships/. Add new ships by appending to the
// CATALOG array; the hangar UI picks them up automatically.

const Ships = {
    STORAGE_KEY: 'astroidStorm.equippedShip',

    CATALOG: [
        {
            id: 'raptor',
            name: 'RAPTOR',
            description: 'Predator-class strike craft with hooked wings.',
            path: 'assets/ships/raptor.glb',
            credit: 'Rae The Red Panda via Poly Pizza — CC0',
            hangarScale: 1.2,
            forceOpaque: true,
            // The GLB has multi-color detail baked as vertex colors (orange
            // body + black accents). The loader detects this and preserves
            // the original shading — no recolor needed.
            doubleSide: true,
            metalness: 0.1,
            roughness: 0.8
        },
        {
            id: 'xwing',
            name: 'X-WING',
            description: 'Legendary rebel starfighter. Four-engine, iconic.',
            path: 'assets/ships/xwing.glb',
            credit: 'T-65 X-Wing Starfighter by Ti Kawamoto [CC-BY] via Poly Pizza',
            hangarScale: 1.1,
            rotateY: Math.PI / 2
        },
        {
            id: 'corsair',
            name: 'CORSAIR',
            description: 'Heavy raider with wide hull. Built to dominate.',
            path: 'assets/ships/corsair.glb',
            credit: 'Spaceship by mastjie [CC-BY] via Poly Pizza',
            hangarScale: 1.1,
            hangarYOffset: 0.25,
            gameScale: 1.25
        },
        {
            id: 'phantom',
            name: 'PHANTOM',
            description: 'Nimble stealth craft. Small frame, big impact.',
            path: 'assets/ships/phantom.glb',
            credit: 'Spaceship by mastjie [CC-BY] via Poly Pizza',
            hangarScale: 1.2,
            gameScale: 1.25,
            emissiveIntensity: 0.1
        },
        {
            id: 'interceptor',
            name: 'INTERCEPTOR',
            description: 'Fast pursuit fighter. Twin-panel design.',
            path: 'assets/ships/interceptor.glb',
            hangarScale: 1.2,
            hangarYOffset: 0.25,
            bodyColor: 0x111111,
            accentColor: 0x333333
        },
        {
            id: 'heavy_bomber',
            name: 'HEAVY BOMBER',
            description: 'Wide-winged demolition craft. Built to flatten.',
            path: 'assets/ships/heavy_bomber.glb',
            credit: 'Generated with Meshy.ai',
            hangarScale: 1.25,
            gameScale: 1.25,
            forceOpaque: true,
            rotateY: Math.PI / 2
        },
        {
            id: 'javelin',
            name: 'JAVELIN',
            description: 'Sleek interceptor. Swept wings, pure speed.',
            path: 'assets/ships/javelin.glb',
            credit: 'Generated with Meshy.ai',
            hangarScale: 1.2,
            gameScale: 1.15,
            forceOpaque: true,
            rotateY: Math.PI / 2
        },
        {
            id: 'stealth_fighter',
            name: 'STEALTH',
            description: 'Angular ghost. Flat profile, zero signature.',
            path: 'assets/ships/stealth_fighter.glb',
            credit: 'Generated with Meshy.ai',
            hangarScale: 1.2,
            gameScale: 1.15,
            forceOpaque: true,
            rotateY: Math.PI / 2
        },
        {
            id: 'titan',
            name: 'TITAN',
            description: 'Armored capital ship. Wide, heavy, unstoppable.',
            path: 'assets/ships/titan.glb',
            credit: 'Generated with Meshy.ai',
            hangarScale: 1.15,
            gameScale: 1.2,
            forceOpaque: true,
            rotateY: Math.PI / 2
        }
    ],

    // Default ship if nothing has been picked yet
    DEFAULT_ID: 'raptor',

    getEquippedId() {
        try {
            const id = localStorage.getItem(this.STORAGE_KEY);
            if (id && this.CATALOG.find(s => s.id === id)) return id;
        } catch (e) {}
        return this.DEFAULT_ID;
    },

    setEquippedId(id) {
        if (!this.CATALOG.find(s => s.id === id)) return;
        try { localStorage.setItem(this.STORAGE_KEY, id); } catch (e) {}
    },

    getEquipped() {
        return this.CATALOG.find(s => s.id === this.getEquippedId()) || this.CATALOG[0];
    },

    getById(id) {
        return this.CATALOG.find(s => s.id === id);
    },

    getIndex(id) {
        return this.CATALOG.findIndex(s => s.id === id);
    },

    next(id) {
        const i = this.getIndex(id);
        if (i < 0) return this.CATALOG[0];
        return this.CATALOG[(i + 1) % this.CATALOG.length];
    },

    prev(id) {
        const i = this.getIndex(id);
        if (i < 0) return this.CATALOG[0];
        return this.CATALOG[(i - 1 + this.CATALOG.length) % this.CATALOG.length];
    }
};
