const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const player = read('../play/index.html');

function setup() {
    const events = [], listeners = {};
    const document = {
        readyState: 'loading', hidden: false, body: {}, querySelectorAll: () => [],
        addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, removeEventListener() {}
    };
    const window = {
        location: new URL('https://gamevolt.io/'),
        gtag: (...args) => events.push(args), addEventListener() {}
    };
    const environment = { window, document, URL, MutationObserver: class { observe() {} } };
    vm.createContext(environment);
    vm.runInContext(read('gv-discovery.js'), environment);
    return { api: window.GVDiscovery, environment, events, listeners };
}

function link(source, href = '/play/?game=short-circuit&mode=daily&challenge=a%26b#start') {
    return {
        href: 'https://gamevolt.io' + href,
        closest: () => source ? { getAttribute: () => source } : null,
        matches: () => true,
        getAttribute() { return this.href; },
        setAttribute(_, value) { this.href = new URL(value, 'https://gamevolt.io').href; }
    };
}

test('entry labels survive normal/daily links, while unknown sources and another game fall back to direct', () => {
    const { api } = setup();
    for (const source of ['martins_picks', 'daily_challenges', 'catalog', 'continue_playing', 'favorites', 'new_games']) {
        const card = link(source);
        api.prepare(card);
        const url = new URL(card.href);
        assert.equal(url.searchParams.get('from'), source);
        assert.equal(url.searchParams.get('challenge'), 'a&b');
        assert.equal(url.hash, '#start');
        assert.equal(api.context(card.href, 'short-circuit').entry_mode, 'daily');
        assert.equal(api.context(card.href, 'short-circuit').selection_source, source);
        assert.equal(api.context(card.href, 'hoverdash').selection_source, 'direct');
    }
    const entry = api.context('/play/?game=short-circuit&from=anything-else', 'short-circuit');
    assert.equal(entry.selection_source, 'direct');
    assert.equal(entry.entry_mode, 'default');
    const switched = api.context('/play/?game=short-circuit&mode=daily&from=daily_challenges', 'hoverdash', 'sidebar');
    assert.equal(switched.selection_source, 'sidebar');
    assert.equal(switched.entry_mode, 'default');
    const external = link('catalog'); external.href = 'https://example.com/play/?game=breakout';
    api.prepare(external);
    assert.equal(external.href, 'https://example.com/play/?game=breakout');
});

test('clicks and middle clicks report selections without blocking navigation or treating a page load as play', () => {
    const { events, listeners } = setup();
    listeners.DOMContentLoaded[0]();
    assert.equal(events.length, 0);
    const card = link('catalog');
    const target = { closest: () => card };
    listeners.click[0]({ type: 'click', button: 0, target });
    listeners.auxclick[0]({ type: 'auxclick', button: 1, target });
    listeners.auxclick[0]({ type: 'auxclick', button: 2, target });
    listeners.click[0]({ type: 'click', button: 0, target, defaultPrevented: true });
    assert.equal(events.length, 2);
    assert.ok(events.every(e => e[1] === 'game_select' && e[2].selection_source === 'catalog'));
    // A failed/blocked analytics sender must not affect the link itself.
    const { api, environment } = setup();
    environment.window.gtag = () => { throw new Error('unavailable'); };
    assert.doesNotThrow(() => api.send('game_select', {}));
});

test('the actual iframe relay attaches the same source to game_start and 60 seconds of foreground play', () => {
    const { api, environment, events } = setup();
    const activeFrame = {}, incoming = {};
    environment.window.addEventListener = (type, fn) => { incoming[type] = fn; };
    environment.frame = { contentWindow: activeFrame };
    environment.currentEntry = api.context('/play/?game=short-circuit&mode=daily&from=daily_challenges', 'short-circuit');
    environment.GVDiscovery = api;
    environment.gtag = environment.window.gtag;
    vm.runInContext(player.slice(player.indexOf('    // Forward GA4 events'), player.indexOf('    // PostMessage listener')), environment);

    let now = 1000, tick;
    const game = setup();
    game.environment.window.parent = { postMessage: data => incoming.message({ origin: 'https://gamevolt.io', source: activeFrame, data }) };
    game.environment.Date = { now: () => now };
    game.environment.setInterval = fn => { tick = fn; return 1; };
    game.environment.clearInterval = () => {};
    vm.runInContext(read('gv-ga4.js'), game.environment);
    const tracker = game.environment.window.GameVoltTracker;
    tracker.start('Short Circuit');
    now += 120000; // An idle menu creates no gameplay events.
    assert.equal(events.length, 0);
    tracker.play();
    now += 30000; tick();
    game.environment.document.hidden = true;
    game.listeners.visibilitychange.forEach(fn => fn());
    now += 90000; tick();
    assert.equal(events.filter(e => e[1] === 'game_play_60s').length, 0);
    game.environment.document.hidden = false;
    game.listeners.visibilitychange.forEach(fn => fn());
    now += 30000; tick(); tick();
    assert.deepEqual(events.map(e => e[1]), ['game_start', 'game_play_30s', 'game_play_60s']);
    for (const event of events) {
        assert.equal(event[2].selection_source, 'daily_challenges');
        assert.equal(event[2].game_id, 'short-circuit');
        assert.equal(event[2].entry_mode, 'daily');
        assert.equal(event[2].game_name, 'Short Circuit');
    }
    const data = { type: 'gamevolt_ga4', event: 'game_start', params: { selection_source: 'spoofed' } };
    incoming.message({ origin: 'https://example.com', source: activeFrame, data });
    incoming.message({ origin: 'https://gamevolt.io', source: {}, data });
    assert.equal(events.length, 3);
    environment.frame = { contentWindow: {} }; // Sidebar navigation replaces the old iframe.
    environment.currentEntry = api.context('/play/?game=hoverdash&from=sidebar', 'hoverdash');
    incoming.message({ origin: 'https://gamevolt.io', source: activeFrame, data });
    assert.equal(events.length, 3);
    incoming.message({ origin: 'https://gamevolt.io', source: environment.frame.contentWindow, data });
    assert.equal(events[3][2].selection_source, 'sidebar');
    assert.equal(events[3][2].entry_mode, 'default');
});

test('rotation uses the shared requirements, keeps the exit focused, and restores the game after turning', () => {
    const { environment } = setup();
    vm.runInContext(read('gv-game-hints.js'), environment);
    const hints = environment.window.GVGameHints;
    for (const id of ['breakout', 'asteroid-storm', 'type-or-die']) assert.equal(hints.requiresLandscape(id), true);
    assert.equal(hints.requiresLandscape('short-circuit'), false);
    let backFocused = 0, frameFocused = 0, active;
    const header = {}, main = {};
    Object.assign(environment, {
        GVGameHints: hints, currentGame: 'breakout', rotating: false,
        playerSupport: { dialog: { open: true, close() { this.open = false; } } },
        rotateQuery: { matches: true }, rotateBack: { focus: () => backFocused++ },
        rotateOverlay: { classList: { toggle: (_, value) => { active = value; } } },
        frame: { focus: () => frameFocused++ }
    });
    environment.document.querySelector = selector => selector === '.gv-header' ? header : main;
    vm.runInContext(player.slice(player.indexOf('    function syncOrientation()'), player.indexOf("    rotateQuery.addEventListener")), environment);
    environment.syncOrientation();
    assert.equal(active, true); assert.equal(header.inert, true); assert.equal(main.inert, true); assert.equal(backFocused, 1);
    assert.equal(environment.playerSupport.dialog.open, false);
    environment.rotateQuery.matches = false; environment.syncOrientation();
    assert.equal(active, false); assert.equal(header.inert, false); assert.equal(main.inert, false); assert.equal(frameFocused, 1);
    environment.currentGame = 'short-circuit'; environment.rotateQuery.matches = true; environment.syncOrientation();
    assert.equal(active, false);
});

test('the leaderboard load hook preserves sidebar attribution', () => {
    const loads = [], boards = [];
    const env = { loadGame: (...args) => loads.push(args), loadSidebarLeaderboard: key => boards.push(key) };
    vm.createContext(env);
    vm.runInContext(player.slice(player.indexOf('    // Hook into loadGame'), player.indexOf('    // Load for initial game')), env);
    env.loadGame('short-circuit', 'sidebar');
    assert.deepEqual(loads, [['short-circuit', 'sidebar']]);
    assert.deepEqual(boards, ['short-circuit']);
});
