const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
function storage() {
    const data = new Map();
    return { get length() { return data.size; }, key: i => [...data.keys()][i],
        getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key) };
}
function node() {
    return { style: {}, children: [], setAttribute() {}, appendChild(child) { this.children.push(child); },
        get firstChild() { return this.children[0]; } };
}
function sdk(localStorage = storage()) {
    const calls = [], events = {}, body = node();
    let respond = () => ({ data: [], error: null });
    const sb = { from(table) {
        const query = { table, action: 'select', filters: {} };
        const chain = {};
        for (const method of ['select', 'insert', 'upsert', 'delete', 'eq', 'like', 'limit', 'single', 'maybeSingle', 'order']) {
            chain[method] = (...args) => {
                if (['select', 'insert', 'upsert', 'delete'].includes(method)) { query.action = method; query.value = args[0]; query.options = args[1]; }
                if (method === 'eq') query.filters[args[0]] = args[1];
                return chain;
            };
        }
        chain.then = (ok, fail) => Promise.resolve().then(() => { calls.push(plain(query)); return respond(query); }).then(ok, fail);
        return chain;
    } };
    const window = { addEventListener: (event, fn) => events[event] = fn };
    const env = { window, document: { body, createElement: node }, localStorage, sessionStorage: storage(),
        console, setTimeout: () => 1, clearTimeout() {}, Set, Date };
    let source = read('sdk/gamevolt.js');
    source = source.replace('  window.GameVolt = {', `
      window.testContext = { set(user, game) { currentUser = user ? { id: user } : null; currentGameId = game; sb = window.testSB; cloudUnlocked = null; }, pendingWrites };
      window.GameVolt = {`);
    window.testSB = sb;
    vm.runInNewContext(source, env);
    window.testContext.set('alice', 'ink');
    return { api: window.GameVolt, context: window.testContext, calls, events, body, localStorage,
        respond(fn) { respond = fn; } };
}
function inkMigration() {
    const source = read('ink/index.html');
    const begin = source.indexOf('GameVolt.save.registerMigration(') + 'GameVolt.save.registerMigration('.length;
    const end = source.indexOf('\n      GameVolt.auth.onStateChange', begin);
    return vm.runInNewContext('(' + source.slice(begin, end).trim().replace(/;$/, '').replace(/\)$/, '') + ')', { Date, DEF: { strokes: 0, bestM: 0 } });
}

test('INK migrates parsed guest stats, rule union, scores and trophies through the real SDK contract', async () => {
    const h = sdk();
    h.localStorage.setItem('black:stats', JSON.stringify({ strokes: 12, bestM: 100, rules: ['wind'] }));
    h.localStorage.setItem('black:trophies', JSON.stringify(['first-stroke', 'contact']));
    h.localStorage.setItem('black:bestP', '1200');
    h.respond(q => ({ data: q.table === 'saves' && q.action === 'select' ? { save_data: { bestM: 150, rules: ['drip'] } } : [], error: null }));
    h.api.save.registerMigration(inkMigration());
    const result = await h.api.save.migrate();
    assert.equal(result.synced, true);
    const merged = h.calls.find(q => q.table === 'saves' && q.action === 'upsert').value.save_data;
    assert.deepEqual(merged, { strokes: 12, bestM: 150, rules: ['drip', 'wind'] });
    assert.equal(h.calls.find(q => q.table === 'scores' && q.action === 'upsert').value.score, 1200);
    assert.deepEqual(h.calls.filter(q => q.table === 'user_achievements').map(q => q.value.achievement_id), ['ink-first-stroke', 'ink-contact']);
    assert.ok(h.localStorage.getItem('black:stats'), 'guest data survives migration');
});

test('resolved Supabase errors retain saves and scores across reload; retries recover without duplicate runs', async () => {
    const h = sdk();
    h.respond(q => q.action === 'select' ? { data: [], error: null } : { error: { message: 'offline' } });
    const saveResult = await h.api.save.set({ level: 8 });
    const scoreResult = await h.api.leaderboard.submit(123, { mode: 'free' });
    assert.equal(saveResult.synced, false); assert.equal(scoreResult.savedLocally, true);
    assert.match(h.body.firstChild.firstChild.textContent, /sync pending/);
    assert.equal(h.api.sync.status().pending, 2);
    assert.deepEqual(plain(await h.api.save.get()), { level: 8 });
    const originalScore = h.calls.find(q => q.table === 'scores' && q.action === 'upsert').value;
    assert.match(originalScore.client_submission_id, /^[0-9a-f-]{36}$/);
    const reloaded = sdk(h.localStorage);
    // Simulate a committed score whose success response never reached the browser.
    const committed = new Map([[originalScore.client_submission_id, originalScore]]);
    reloaded.respond(q => {
        if (q.table === 'scores' && q.action === 'upsert') {
            assert.deepEqual(plain(q.options), { onConflict: 'client_submission_id', ignoreDuplicates: true });
            if (!committed.has(q.value.client_submission_id)) committed.set(q.value.client_submission_id, q.value);
        }
        return { data: [], error: null };
    });
    await reloaded.api.sync.retry();
    assert.equal(reloaded.api.sync.status().pending, 0);
    assert.equal(committed.size, 1);
    assert.equal(reloaded.calls.find(q => q.table === 'scores').value.client_submission_id, originalScore.client_submission_id);
    reloaded.respond(() => { throw new Error('offline'); });
    assert.deepEqual(plain(await reloaded.api.save.get()), { level: 8 }, 'account backup survives failed reads');
});

test('a newer save cannot be removed by the acknowledgement of an older in-flight save', async () => {
    const h = sdk(); let release;
    h.respond(q => q.action === 'upsert' && q.value.save_data.level === 1
        ? new Promise(resolve => release = resolve) : { data: [], error: null });
    const first = h.api.save.set({ level: 1 }); await settle();
    const second = h.api.save.set({ level: 2 });
    release({ data: [], error: null });
    await Promise.all([first, second]);
    const writes = h.calls.filter(q => q.action === 'upsert');
    assert.deepEqual(writes.map(q => q.value.save_data.level), [1, 2]);
    assert.equal(h.api.sync.status().pending, 0);
});

test('pending writes and backup saves stay with their original account after logout/switch', async () => {
    const h = sdk();
    h.respond(() => ({ error: { message: 'offline' } }));
    await h.api.save.set({ level: 3 });
    await h.api.achievements.unlock('contact');
    assert.equal(h.api.achievements.isUnlocked('contact'), false, 'failed trophy is not cloud-confirmed');
    h.context.set('bob', 'ink'); h.calls.length = 0;
    await h.api.sync.retry();
    assert.equal(h.calls.length, 0);
    assert.equal(await h.api.save.get(), null);
    h.context.set('alice', 'ink');
    h.respond(() => ({ data: [], error: null }));
    await h.api.sync.retry();
    assert.equal(h.api.achievements.isUnlocked('contact'), true);
    assert.ok(h.calls.filter(q => q.action === 'upsert').every(q => q.value.user_id === 'alice'));
});

test('account switch during a score request retains the original owner on retry', async () => {
    const h = sdk(); let release;
    h.respond(() => new Promise(resolve => release = resolve));
    const submission = h.api.leaderboard.submit(9); await settle();
    h.context.set('bob', 'ink'); release({ error: { message: 'request interrupted' } }); await submission;
    assert.equal(h.calls[0].value.user_id, 'alice');
    assert.equal(h.context.pendingWrites('alice').length, 1);
    h.calls.length = 0; await h.api.sync.retry(); assert.equal(h.calls.length, 0);
});

test('migration never overwrites cloud data when the initial read fails, and retries the same session', async () => {
    const h = sdk(); h.localStorage.setItem('black:stats', '{"strokes":12}');
    h.respond(() => ({ error: { message: 'read failed' } }));
    h.api.save.registerMigration(inkMigration());
    assert.equal((await h.api.save.migrate()).synced, false);
    assert.equal(h.calls.filter(q => q.action !== 'select').length, 0);
    h.respond(() => ({ data: null, error: null }));
    assert.equal((await h.api.save.migrate()).synced, true);
});

test('storage failure is visible and does not claim a durable backup', async () => {
    const local = storage(); local.setItem = () => { throw new Error('full'); };
    const h = sdk(local); h.respond(() => Promise.reject(new Error('network')));
    const result = await h.api.leaderboard.submit(10);
    assert.equal(result.synced, false); assert.equal(result.savedLocally, false);
    assert.match(h.body.firstChild.firstChild.textContent, /Keep this page open/);
});

test('favorite write failure stays pending; a failed initial read leaves the UI unchanged', async () => {
    const h = sdk();
    h.respond(q => q.action === 'select' ? { data: null, error: null } : { error: { message: 'write failed' } });
    assert.equal(await h.api.favorites.toggle('ink'), true);
    assert.equal(await h.api.favorites.is('ink'), true);
    h.respond(() => ({ error: { message: 'read failed' } }));
    assert.equal(await h.api.favorites.toggle('spinburn'), null);
});

function tracker(hidden = false) {
    let now = 0; const handlers = {}, sent = [];
    const document = { hidden, addEventListener: (event, fn) => handlers[event] = fn, removeEventListener() {} };
    const window = { addEventListener: (event, fn) => handlers[event] = fn, parent: { postMessage: message => sent.push(message) } };
    vm.runInNewContext(read('js/gv-ga4.js'), { window, document, Date: { now: () => now }, setInterval: () => 1, clearInterval() {} });
    const t = window.GameVoltTracker; t.start('Test'); t.play();
    return { t, sent, tick(ms) { now = ms; t._tick(); }, at(ms) { now = ms; },
        visibility(ms, hidden) { now = ms; document.hidden = hidden; handlers.visibilitychange(); }, handlers };
}

test('analytics counts 100 seconds, not 370, around a long background interval after the 60s milestone', () => {
    const h = tracker(); for (let now = 2000; now <= 60000; now += 2000) h.tick(now);
    h.visibility(90000, true); h.visibility(390000, false); h.at(400000); h.t.end();
    assert.equal(h.sent.find(e => e.event === 'game_end').params.play_time_seconds, 100);
    assert.equal(h.sent.filter(e => e.event === 'game_play_30s').length, 1);
    assert.equal(h.sent.filter(e => e.event === 'game_play_60s').length, 1);
});

test('analytics handles hidden starts, short foreground intervals, pagehide and restarting', () => {
    const h = tracker(true); h.tick(20000); assert.equal(h.t.activeMs, 0);
    h.visibility(50000, false); h.visibility(80000, true); h.at(90000); h.handlers.pagehide();
    assert.equal(h.sent.find(e => e.event === 'game_end').params.play_time_seconds, 30);
    h.t.start('New run'); h.t.play(); h.visibility(100000, false); h.at(110000); h.t.end();
    assert.equal(h.sent.filter(e => e.event === 'game_end')[1].params.play_time_seconds, 10);
});

test('profile contains all 24 games and exactly mirrors the 93 newly covered SQL definitions', () => {
    const source = read('profile/index.html'); const begin = source.indexOf('        var TROPHY_CATALOG =');
    const end = source.indexOf('\n        };', begin) + 11;
    const env = {}; vm.runInNewContext(source.slice(begin, end) + '\nthis.catalog = TROPHY_CATALOG;', env);
    assert.equal(Object.keys(env.catalog).length, 24);
    for (const game of ['ink', 'gridburn', 'spinburn']) {
        const sql = read('sql/' + game + '-achievements.sql');
        const ids = [...sql.matchAll(new RegExp("\\('(" + game + "-[^']+)'", 'g'))].map(m => m[1]);
        assert.deepEqual(plain(env.catalog[game].map(t => t.id)), ids);
    }
    const dom = { innerHTML: '' };
    env.document = { getElementById: () => dom };
    env.GAME_NAMES = { ink: 'INK', gridburn: 'Gridburn', spinburn: 'Spinburn' };
    vm.runInNewContext(source.slice(source.indexOf('        var TIER_ORDER'), source.indexOf('        // Username editing')), env);
    env.renderTrophies({ unlocked: 4, unlockedSet: { 'ink-first-stroke': 'date', 'gridburn-first-ride': 'date', 'spinburn-first_serve': 'date', 'retired-trophy': 'date' } });
    assert.match(dom.innerHTML, /3 of 744 trophies unlocked/);
    assert.match(dom.innerHTML, /3 Bronze/);
    for (const game of ['ink', 'gridburn', 'spinburn']) assert.ok(dom.innerHTML.includes('data-game="' + game + '"'));

});

test('sidebar chooses current modes, ignores old responses and recovers after a failed request', async () => {
    const source = read('play/index.html');
    const begin = source.indexOf('    var lastLbGame ='), end = source.indexOf('    function escHtml', begin);
    const elements = { sidebarLbSection: { style: {} }, sidebarLbList: { innerHTML: '' } }, queue = [];
    const env = { window: {}, SB_URL: '', SB_KEY: '', gvCurrentUserId: null, escHtml: s => s,
        document: { getElementById: id => elements[id] }, fetch: (url, opts) => new Promise((resolve, reject) => queue.push({ resolve, reject, body: JSON.parse(opts.body) })) };
    vm.runInNewContext(read('js/gv-leaderboard-config.js'), env);
    env.GVLeaderboardConfig = env.window.GVLeaderboardConfig;
    vm.runInNewContext(source.slice(begin, end), env);
    env.loadSidebarLeaderboard('hoverdash'); env.loadSidebarLeaderboard('ink');
    assert.deepEqual(queue.map(q => q.body.p_mode), ['vx9', 'free']);
    queue[1].resolve({ ok: true, json: async () => [{ rank: 1, username: 'INK', score: 222 }] }); await settle();
    queue[0].resolve({ ok: true, json: async () => [{ rank: 1, username: 'Old HoverDash', score: 111 }] }); await settle();
    assert.ok(elements.sidebarLbList.innerHTML.includes('INK')); assert.ok(!elements.sidebarLbList.innerHTML.includes('Old HoverDash'));
    env.loadSidebarLeaderboard('breakout'); queue[2].reject(new Error('offline')); await settle();
    assert.equal(elements.sidebarLbSection.style.display, 'none');
    env.loadSidebarLeaderboard('breakout'); assert.equal(queue[3].body.p_mode, 'neon-drift-v2');
    for (const [game, mode] of Object.entries({ livewire: 'endless', 'short-circuit': 'daily-streak', gridburn: 'solo', sudoku: 'easy', minesweeper: 'easy-v3', 'vector-hexagon': 'climb-HEXAGON' })) assert.equal(env.GVLeaderboardConfig.mode(game), mode);
});


test('a late cloud read cannot replace progress saved while it was in flight', async () => {
    const h = sdk(); let release;
    h.respond(q => q.action === 'select' ? new Promise(resolve => release = resolve) : { data: [], error: null });
    const loading = h.api.save.get(); await settle();
    await h.api.save.set({ level: 5 });
    release({ data: { save_data: { level: 1 } }, error: null });
    assert.deepEqual(plain(await loading), { level: 5 });
});
