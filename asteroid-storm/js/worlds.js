// World selection — persisted choice of which background to use.
const Worlds = {
    STORAGE_KEY: 'astroidStorm.selectedWorld',

    getAll() {
        // Return [{id, name, description}, ...] + a "random" option
        const list = [{ id: 'random', name: 'RANDOM', description: 'A different world each game' }];
        if (typeof PLANET_VARIANTS !== 'undefined') {
            for (const v of PLANET_VARIANTS) {
                if (v.id) list.push({ id: v.id, name: v.name, description: v.description || '' });
            }
        }
        return list;
    },

    getSelectedId() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'random';
        } catch (e) { return 'random'; }
    },

    setSelectedId(id) {
        try { localStorage.setItem(this.STORAGE_KEY, id); } catch (e) {}
    }
};
