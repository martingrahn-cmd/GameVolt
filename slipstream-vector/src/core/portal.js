// Portal adapter (CrazyGames) — the whole file is inert unless the page
// carries window.SV_PORTAL, which ONLY tools/package-portal.mjs injects.
// The GitHub Pages build never sets it, so every call here no-ops there by
// construction, and the portal build degrades to the same no-ops if the SDK
// fails to load (offline QA, ad blockers, --verify's blocked network) —
// a missing SDK must never cost the game anything but the ads.
//
// What the portal gets, and why:
//   - loading/gameplay events: the telemetry their full-launch review reads
//   - happytime(): wins and records, their "player is having a moment" signal
//   - midgame ad on the results board (never in gameplay), audio suspended
//     through the ad via the callbacks
//   - save mirroring: every sv-* localStorage key is copied into their data
//     module (account-synced when the player is logged in) at natural save
//     points, and restored at boot — trophies, records and ghosts follow the
//     player across devices, which localStorage alone cannot do. The same
//     hole a private window showed us: STATUS.md 2.6m.
const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

class Portal {
  constructor() {
    this.sdk = null;      // set only when init found a live, enabled SDK
    this._inited = false;
    this._gameVoltReady = false;
  }

  get active() { return !!this.sdk; }

  async init() {
    if (this._inited) return;
    this._inited = true;

    // GameVolt build: preserve the full local career in the portal's existing
    // JSON save row and register every local trophy with the shared profile.
    // The adapter remains inert on itch/GitHub/CrazyGames.
    if (window.GameVolt) {
      try {
        window.GameVolt.init('slipstream-vector');
        const keys = this.localKeys();
        window.GameVolt.save?.registerMigration?.({
          keys,
          merge: (local, cloud) => this.mergeSaves(local, cloud),
          getAchievements: (local) => {
            const earned = local?.['sv-ach'] || {};
            return Object.keys(earned).map((id) => ({ id, unlocked_at: earned[id] }));
          },
        });
        await new Promise((resolve) => window.GameVolt.onReady(resolve));
        const cloud = await window.GameVolt.save?.get?.();
        if (cloud) this.applySave(this.mergeSaves(this.snapshot(), cloud));
        this._gameVoltReady = true;
        const user = window.GameVolt.auth?.getUser?.();
        if (user) await this.pullCloudTrophies();
        window.GameVolt.auth?.onStateChange?.((nextUser) => {
          if (nextUser) this.pullCloudTrophies();
        });
      } catch (e) { /* local progress remains authoritative offline */ }
    }

    if (!window.SV_PORTAL) return;
    try {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = SDK_URL;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
        setTimeout(rej, 8000);   // a hung CDN must not hold the game hostage
      });
      const sdk = window.CrazyGames && window.CrazyGames.SDK;
      if (!sdk) return;
      await sdk.init();
      if (sdk.environment === 'disabled') return;
      this.sdk = sdk;
      await this.restoreSaves();
    } catch (e) { /* no SDK, no portal features — the game itself is whole */ }
  }

  loadingStart() { try { if (this.sdk) this.sdk.game.loadingStart(); } catch (e) { /* never fatal */ } }
  loadingStop() { try { if (this.sdk) this.sdk.game.loadingStop(); } catch (e) { /* never fatal */ } }
  gameplayStart() { try { if (this.sdk) this.sdk.game.gameplayStart(); } catch (e) { /* never fatal */ } }
  gameplayStop() { try { if (this.sdk) this.sdk.game.gameplayStop(); } catch (e) { /* never fatal */ } }
  happytime() { try { if (this.sdk) this.sdk.game.happytime(); } catch (e) { /* never fatal */ } }

  // Midgame ad on the results board. onMute/onUnmute bracket the ad so the
  // caller can suspend the AudioContext — their QA checks game audio is
  // silent under an ad. Resolves whatever happens; an adError is just "no ad".
  midgameAd(onMute, onUnmute) {
    return new Promise((res) => {
      if (!this.sdk) return res(false);
      try {
        this.sdk.ad.requestAd('midgame', {
          adStarted: () => { try { onMute(); } catch (e) { /* keep the ad flow alive */ } },
          adFinished: () => { try { onUnmute(); } catch (e) { /* ditto */ } res(true); },
          adError: () => { try { onUnmute(); } catch (e) { /* ditto */ } res(false); },
        });
      } catch (e) { try { onUnmute(); } catch (e2) { /* ditto */ } res(false); }
    });
  }

  // ---- save mirroring ------------------------------------------------------
  // Generic over the sv- prefix: no per-key registry to drift out of date
  // when a new record/trophy key lands. An index key lists what was mirrored,
  // because the data module has no enumeration.
  async pushSaves() {
    if (window.GameVolt?.save) {
      try { await window.GameVolt.save.set(this.snapshot()); } catch (e) { /* local save already exists */ }
    }
    if (!this.sdk) return;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sv-')) keys.push(k);
      }
      for (const k of keys) this.sdk.data.setItem(k, localStorage.getItem(k));
      this.sdk.data.setItem('sv-keys', JSON.stringify(keys));
    } catch (e) { /* sync is a bonus, never a blocker */ }
  }

  async restoreSaves() {
    if (!this.sdk) return;
    try {
      const idx = this.sdk.data.getItem('sv-keys');
      if (!idx) return;
      for (const k of JSON.parse(idx)) {
        const v = this.sdk.data.getItem(k);
        // The account copy fills gaps; a fresh local value wins (the player
        // just made it on THIS device — don't clobber it with cloud history).
        if (v !== null && v !== undefined && localStorage.getItem(k) === null) {
          localStorage.setItem(k, v);
        }
      }
    } catch (e) { /* sync is a bonus, never a blocker */ }
  }

  localKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sv-')) keys.push(key);
      }
    } catch (e) { /* private mode */ }
    // These exist on a normal career before its first natural cloud push.
    for (const key of ['sv-ach', 'sv-achstats', 'sv-unlocked', 'sv-champion', 'sv-champ']) {
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }

  snapshot() {
    const out = {};
    try {
      for (const key of this.localKeys()) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try { out[key] = JSON.parse(raw); } catch (e) { out[key] = raw; }
      }
    } catch (e) { /* private mode */ }
    return out;
  }

  mergeSaves(local, cloud) {
    const l = local && typeof local === 'object' ? local : {};
    const c = cloud && typeof cloud === 'object' ? cloud : {};
    const out = { ...c, ...l };
    const unionObject = (a, b) => {
      const merged = { ...(a || {}) };
      for (const [key, value] of Object.entries(b || {})) {
        if (Array.isArray(value)) merged[key] = [...new Set([...(merged[key] || []), ...value])];
        else if (typeof value === 'number') merged[key] = Math.max(Number(merged[key]) || 0, value);
        else if (!(key in merged)) merged[key] = value;
      }
      return merged;
    };
    out['sv-ach'] = unionObject(c['sv-ach'], l['sv-ach']);
    out['sv-achstats'] = unionObject(c['sv-achstats'], l['sv-achstats']);
    out['sv-unlocked'] = String(Math.max(Number(c['sv-unlocked']) || 0, Number(l['sv-unlocked']) || 0));
    out['sv-champion'] = (c['sv-champion'] === '1' || l['sv-champion'] === '1') ? '1' : (l['sv-champion'] ?? c['sv-champion']);
    for (const key of new Set([...Object.keys(c), ...Object.keys(l)])) {
      if (/^sv-(best|rec-|racebest-)/.test(key)) {
        const cv = Number(c[key]), lv = Number(l[key]);
        if (Number.isFinite(cv) || Number.isFinite(lv)) out[key] = String(Math.min(Number.isFinite(cv) ? cv : Infinity, Number.isFinite(lv) ? lv : Infinity));
      }
      if (key.startsWith('sv-ghost-') && c[key] && l[key]) {
        out[key] = Number(c[key].dur) < Number(l[key].dur) ? c[key] : l[key];
      }
    }
    this.applySave(out);
    return out;
  }

  applySave(data) {
    if (!data || typeof data !== 'object') return;
    try {
      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('sv-') || value === undefined) continue;
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    } catch (e) { /* private mode */ }
  }

  async pullCloudTrophies() {
    try {
      const ids = await window.GameVolt.achievements?.getUnlockedIds?.();
      if (!ids?.forEach) return;
      const earned = JSON.parse(localStorage.getItem('sv-ach') || '{}');
      ids.forEach((id) => { earned[id] ||= Date.now(); });
      localStorage.setItem('sv-ach', JSON.stringify(earned));
    } catch (e) { /* offline */ }
  }
}

export const portal = new Portal();
