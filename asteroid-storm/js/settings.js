// User settings persistence (localStorage).
const Settings = {
    KEY: 'astroidStorm.settings',
    _data: null,
    _defaults: {
        muted: false,
        masterVolume: 0.4,
        musicVolume: 1.0,
        sfxVolume: 1.0
    },

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            this._data = raw
                ? Object.assign({}, this._defaults, JSON.parse(raw))
                : Object.assign({}, this._defaults);
        } catch (e) {
            this._data = Object.assign({}, this._defaults);
        }
        return this._data;
    },

    save() {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(this._data));
        } catch (e) {}
    },

    get(key) {
        if (!this._data) this.load();
        return this._data[key];
    },

    set(key, value) {
        if (!this._data) this.load();
        this._data[key] = value;
        this.save();
    }
};
