const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
process.env.TZ = 'America/Los_Angeles';

function storage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) };
}
function progress() {
    const env = { window: {}, document: { readyState: 'loading', addEventListener() {} }, Date, setTimeout, clearTimeout };
    vm.runInNewContext(read('gv-daily-progress.js'), env);
    return env.window.GVDailyProgress;
}

test('daily cards respect local versus UTC days, live streaks and missed days', () => {
    const api = progress(), now = new Date('2026-09-06T00:30:00Z'); // Sep 5 locally
    const saved = storage({
        'short-circuit:daily': JSON.stringify({ date: '2026-09-05', time: 13.4, streak: 4 }),
        daily_complete_2026: 'ignored',
        'daily_complete_2026-09-06': 'true', 'daily_complete_2026-09-05': 'true',
        goldenGlyphsDailyResults: JSON.stringify({ '2026-09-06': { time: 23.5, stars: 3 } }),
        fb_daily_done: JSON.stringify('2026-09-04'), fb_daily_streak: '5', fb_daily_best: '1000', fb_daily_stars: '3'
    });
    assert.equal(api.status('short-circuit', now, saved).completed, true);
    assert.equal(api.status('short-circuit', now, saved).seconds, 13.4);
    assert.equal(api.status('golden-glyphs', now, saved).completed, true);
    assert.equal(api.status('golden-glyphs', now, saved).streak, 2);
    assert.equal(api.status('livewire', now, saved).completed, false);
    assert.equal(api.status('livewire', now, saved).streak, 5);
    assert.equal(api.status('livewire', now, saved).seconds, null);
    const tomorrow = new Date('2026-09-06T08:00:00Z');
    assert.equal(api.status('short-circuit', tomorrow, saved).completed, false);
    assert.equal(api.status('short-circuit', tomorrow, saved).streak, 4);
    assert.equal(api.status('livewire', tomorrow, saved).streak, 0);
    assert.equal(api.status('short-circuit', new Date('2026-09-08T08:00:00Z'), saved).streak, 0);
    assert.equal(api.status('golden-glyphs', new Date('2026-09-08T08:00:00Z'), saved).streak, 0);
});

test('unavailable, malformed and older saves never invent a daily result', () => {
    const api = progress(), now = new Date('2026-09-06T12:00:00Z');
    const saved = storage({ 'short-circuit:daily': '{broken', fb_daily_done: '"2026-09-06"', fb_daily_best: '900', fb_daily_stars: '3' });
    assert.equal(api.status('short-circuit', now, saved).completed, false);
    assert.equal(api.status('livewire', now, saved).completed, true);
    assert.equal(api.status('livewire', now, saved).seconds, null);
    assert.equal(api.status('livewire', now, saved).stars, null);
    for (const id of ['short-circuit', 'golden-glyphs', 'livewire']) {
        assert.equal(api.status(id, now, { getItem() { throw new Error('blocked'); } }).available, false);
    }
    saved.setItem('short-circuit:daily', JSON.stringify({ date: '2026-09-06', time: -1, streak: 'oops' }));
    assert.equal(api.status('short-circuit', now, saved).seconds, null);
    assert.equal(api.status('short-circuit', now, saved).streak, 0);
    assert.equal(api.formatTime(0), '0.0s');
    assert.equal(api.formatTime(125), '2:05');
});

test('Golden Glyphs real daily writer produces the card result and keeps the fastest replay', () => {
    const saved = storage(), now = new Date('2026-09-06T12:00:00Z');
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
    const source = read('../golden-glyphs/src/js/daily.js').replace(/^import[^\n]+\n/, '').replace('export class DailySystem', 'class DailySystem');
    const env = { localStorage: saved, Date: Clock, LEVELS_DAILY: [{}] };
    vm.runInNewContext(source + '\nthis.daily = new DailySystem();', env);
    env.daily.markCompleted({ time: 48, stars: 2 });
    env.daily.markCompleted({ time: 65, stars: 1 });
    const result = progress().status('golden-glyphs', now, saved);
    assert.equal(result.completed, true); assert.equal(result.seconds, 48); assert.equal(result.streak, 1);
    env.daily.markCompleted({ time: 32, stars: 3 });
    assert.equal(progress().status('golden-glyphs', now, saved).seconds, 32);
});

test('Livewire dates results by the played board, resets each day and rejects old-tab overwrites', () => {
    const saved = storage(), source = read('../livewire/index.html');
    const env = { store: { get(key, fallback) { return JSON.parse(saved.getItem(key) || 'null') ?? fallback; }, set(key, value) { saved.setItem(key, JSON.stringify(value)); } } };
    vm.runInNewContext(source.slice(source.indexOf('function recordDailyResult('), source.indexOf('/* ===== Ångra')), env);
    env.recordDailyResult('2026-09-05', 1000, 3);
    saved.setItem('fb_daily_done', '"2026-09-06"'); saved.setItem('fb_daily_streak', '2');
    env.recordDailyResult('2026-09-06', 24000, 2);
    const api = progress(), now = new Date('2026-09-06T12:00:00Z');
    assert.equal(api.status('livewire', now, saved).seconds, 24);
    assert.equal(api.status('livewire', now, saved).stars, 2);
    env.recordDailyResult('2026-09-06', 19000, 3);
    env.recordDailyResult('2026-09-06', 30000, 1);
    env.recordDailyResult('2026-09-05', 100, 1); // yesterday's tab finishes late
    assert.equal(api.status('livewire', now, saved).seconds, 19);
    assert.equal(api.status('livewire', now, saved).stars, 3);
});

function support() {
    const elements = {}, timers = new Map(); let id = 0, ready = 0, retries = 0;
    function element() { return {
        hidden: true, listeners: {}, children: [], textContent: '', open: false,
        addEventListener(type, fn) { this.listeners[type] = fn; },
        replaceChildren() { this.children = []; }, append(...nodes) { this.children.push(...nodes); },
        focus() { this.focused = true; },
        showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); }
    }; }
    const env = { window: {}, document: { getElementById: key => elements[key] ||= element(), createElement: element },
        setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(key) { timers.delete(key); } };
    vm.runInNewContext(read('gv-player-support.js'), env);
    const api = env.window.GVPlayerSupport.create({ ready: () => ready++, retry: () => retries++ });
    return { api, elements, timers, env, counts: () => ({ ready, retries }) };
}

test('all 24 player games have help, and loading recovery ignores replaced frames', () => {
    const { api, env, elements, timers, counts } = support();
    const player = read('../play/index.html');
    vm.runInNewContext(player.slice(player.indexOf('    const GAMES ='), player.indexOf("    let frame =")) + '\nthis.catalog = GAMES;', env);
    assert.equal(Object.keys(env.catalog).length, 24);
    for (const [key, game] of Object.entries(env.catalog)) {
        api.watch({}, key, game.name);
        assert.ok(elements.gameHelpBody.children.length >= 6, key);
    }
    const old = {}, current = {};
    api.watch(old, 'hoverdash', 'HoverDash'); const staleTimeout = [...timers.values()][0];
    api.watch(current, 'livewire', 'Livewire');
    old.onload(); old.onerror(); staleTimeout();
    assert.equal(elements.gameLoadActions.hidden, true);
    assert.equal(counts().ready, 0);
    [...timers.values()][0]();
    assert.equal(elements.gameLoadActions.hidden, false);
    assert.match(elements.gameLoadMessage.textContent, /Livewire is taking longer/);
    elements.gameLoadRetry.listeners.click();
    assert.equal(counts().retries, 1);
    elements.helpBtn.listeners.click();
    current.onload();
    assert.equal(elements.gameLoadStatus.hidden, true);
    assert.equal(counts().ready, 0); // loading must not steal focus out of help
    elements.helpClose.listeners.click();
    assert.equal(api.dialog.open, false); assert.equal(elements.helpBtn.focused, true);
});

test('player reload keeps daily, challenge and discovery context while replacing the iframe', () => {
    const source = read('../play/index.html'), document = { readyState: 'loading', addEventListener() {}, getElementById: () => ({}) };
    const window = { location: new URL('https://gamevolt.io/play/?game=short-circuit&mode=daily&challenge=a%26b&from=daily_challenges') };
    const history = { pushState(_, __, url) { window.location = new URL(url, window.location); } };
    function frame() { return { cloneNode: frame, replaceWith() {} }; }
    const env = { document, window, history, URL, URLSearchParams, currentGame: null, currentEntry: null,
        sessionStart: null, frame: frame(), nameEl: {}, catEl: {}, playerSupport: { watch() {} },
        syncOrientation() {}, renderSidebar() {}, refreshFavButton() {}, refreshRatingWidget() {} };
    vm.createContext(env); vm.runInContext(read('gv-discovery.js'), env); env.GVDiscovery = window.GVDiscovery;
    vm.runInContext(source.slice(source.indexOf('    const GAMES ='), source.indexOf('    let frame =')), env);
    vm.runInContext(source.slice(source.indexOf('    function loadGame('), source.indexOf('    function renderSidebar(')), env);
    env.loadGame('short-circuit'); const initialFrame = env.frame;
    env.loadGame('short-circuit');
    assert.notEqual(env.frame, initialFrame);
    assert.equal(env.frame.src, '/short-circuit/?challenge=a%26b&mode=daily');
    assert.equal(env.currentEntry.selection_source, 'daily_challenges');
    assert.equal(env.currentEntry.entry_mode, 'daily');
    env.loadGame('livewire', 'sidebar'); env.loadGame('livewire');
    assert.equal(env.frame.src, '/livewire/');
    assert.equal(env.currentEntry.selection_source, 'sidebar');
    assert.equal(env.currentEntry.entry_mode, 'default');
});
