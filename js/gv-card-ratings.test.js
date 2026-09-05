const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'gv-card-ratings.js'), 'utf8');
function setup(GameVolt, cards = []) {
    const context = {
        window: { GameVolt }, GameVolt,
        document: {
            readyState: 'loading', body: null, addEventListener() {},
            getElementById: () => ({}), querySelectorAll: () => cards,
            createElement: () => ({ style: {}, classList: { add() {} }, setAttribute() {} })
        }
    };
    vm.runInNewContext(source, context);
    return { api: context.window.GVCardRatings, context };
}

test('one vote cannot rank a game; established ratings beat a small perfect sample', () => {
    const { rankScore } = setup().api;
    assert.equal(rankScore({ avg: 5, count: 1 }), null);
    assert.equal(rankScore({ avg: 1, count: 4 }), null);
    assert.ok(rankScore({ avg: 4.5, count: 50 }) > rankScore({ avg: 5, count: 5 }));
    assert.ok(rankScore({ avg: 4.5, count: 1000 }) > rankScore({ avg: 4.5, count: 5 }));
    for (const agg of [null, {}, { avg: NaN, count: 5 }, { avg: 6, count: 100 }, { avg: 4, count: -1 }]) {
        assert.equal(rankScore(agg), null);
    }
});

test('low-sample badges treat positive and negative votes alike', async () => {
    function card(id) {
        return {
            badge: null,
            getAttribute: () => '/play/?game=' + id,
            querySelector(selector) {
                if (selector === '.game-rating') return this.badge;
                return { insertAdjacentElement: (_, element) => { this.badge = element; } };
            }
        };
    }
    const cards = [card('positive'), card('negative'), card('established')];
    const map = { positive: { avg: 5, count: 1 }, negative: { avg: 1, count: 1 }, established: { avg: 4.2, count: 50 } };
    const { api } = setup({ rating: { getAllAggregates: () => Promise.resolve(map) } }, cards);
    await api.render();
    assert.equal(cards[0].badge.textContent, '1 rating · Early ratings');
    assert.equal(cards[1].badge.textContent, cards[0].badge.textContent);
    assert.match(cards[2].badge.innerHTML, /4\.2/);
    assert.match(cards[2].badge.innerHTML, /\(50\)/);
});

test('concurrent rating requests wait for SDK readiness and share one fetch', async () => {
    let ready, resolve, calls = 0;
    const { api } = setup({
        onReady: callback => { ready = callback; },
        rating: { getAllAggregates: () => { calls++; return new Promise(r => { resolve = r; }); } }
    });
    const first = api.load(), second = api.load();
    assert.equal(first, second);
    assert.equal(calls, 0);
    ready();
    await Promise.resolve();
    assert.equal(calls, 1);
    const map = { test: { avg: 4, count: 7 } };
    resolve(map);
    assert.equal(await first, map);
    assert.equal(await api.load(), map);
    assert.equal(calls, 1);
});

test('failed fetches and a not-yet-loaded SDK do not freeze an empty cache', async () => {
    const { api, context } = setup();
    assert.equal(await api.load(), null);
    let calls = 0;
    context.GameVolt = context.window.GameVolt = {
        rating: { getAllAggregates: () => ++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({}) }
    };
    assert.equal(await api.load(), null);
    assert.deepEqual(Object.keys(await api.load()), []);
    assert.equal(calls, 2);
});

test('a delayed Top Rated response cannot undo a later category selection', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const script = html.slice(html.indexOf('    // Category filter + sort tabs'), html.indexOf('    // Continue Playing section'));
    function item(category, id) {
        const classes = new Set();
        return {
            dataset: { category }, getAttribute: () => '/play/?game=' + id,
            classList: { remove: x => classes.delete(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
            hidden: () => classes.has('hidden-by-filter')
        };
    }
    const cards = [item('action', 'action-game'), item('word', 'word-game')];
    const pills = ['all', 'top-rated', 'word'].map(filter => ({ dataset: { filter }, querySelector: () => null, classList: { add() {}, remove() {} }, setAttribute() {} }));
    let click, finish;
    const filters = { querySelectorAll: () => pills, addEventListener: (_, fn) => { click = fn; } };
    const grid = { querySelectorAll: () => cards, appendChild: card => { cards.splice(cards.indexOf(card), 1); cards.push(card); } };
    const title = {}, note = {};
    const rating = { ...setup().api, load: () => new Promise(resolve => { finish = resolve; }) };
    vm.runInNewContext(script, {
        window: { GVCardRatings: rating }, GVCardRatings: rating,
        document: { getElementById: id => ({ categoryFilters: filters, games: title, 'game-sort-note': note })[id], querySelector: () => grid }
    });
    click({ target: { closest: () => pills[1] } });
    click({ target: { closest: () => pills[2] } });
    finish({ 'action-game': { avg: 5, count: 100 } });
    await Promise.resolve();
    assert.equal(title.textContent, 'Word');
    assert.equal(note.hidden, true);
    assert.equal(cards.find(c => c.dataset.category === 'action').hidden(), true);
    assert.equal(cards.find(c => c.dataset.category === 'word').hidden(), false);
});
