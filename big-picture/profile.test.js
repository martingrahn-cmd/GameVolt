const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(user) {
    const elements = {};
    function element() {
        return {
            children: [], hidden: false, textContent: '', className: '', style: {},
            append(...children) { this.children.push(...children); },
            removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
            get firstChild() { return this.children[0] || null; },
            setAttribute() {},
            querySelector(selector) {
                if (selector === 'p') return this.paragraph ||= element();
                return null;
            }
        };
    }
    const document = {
        getElementById(id) { return elements[id] ||= element(); },
        createElement() { return element(); }
    };
    let initializedWith = null;
    const profile = {
        created_at: '2025-03-04T00:00:00Z',
        bestScores: { hoverdash: { score: 12345 }, sudoku: { score: 999999 } }
    };
    const achievements = {
        total: 10, unlocked: 4,
        games: { hoverdash: { total: 5, unlocked: 3 }, blockstorm: { total: 5, unlocked: 1 } }
    };
    const GameVolt = {
        init(id) { initializedWith = id; },
        onReady(fn) { fn(); },
        auth: {
            getUser() { return user || null; }, onStateChange() {},
            getFullProfile() { return Promise.resolve(profile); }
        },
        achievements: { getProfile() { return Promise.resolve(achievements); } },
        avatar: { render() { const avatar = element(); avatar.className = 'avatar'; return avatar; } }
    };
    const window = {
        GameVolt,
        GVLeaderboardConfig: { mode() { return 'default'; }, format(id, score) { return id + ':' + score; } }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'profile.js'), 'utf8'), { window, document, Promise });
    return { elements, window, initializedWith };
}

test('logged-out Big Picture renders an honest guest profile state', () => {
    const env = setup(null);
    assert.equal(env.initializedWith, 'profile');
    assert.equal(env.elements.profileGuest.hidden, false);
    assert.equal(env.elements.profileContent.hidden, true);
    assert.equal(env.elements.profileTitle.textContent, 'Play as a guest');
    assert.match(env.elements.profileGuest.paragraph.textContent, /session follows you here automatically/);
});

test('an existing session renders controller-game scores and trophy progress', async () => {
    const env = setup({ username: 'Nova', email: 'nova@example.com', avatar_url: 'gv1:test' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(env.elements.profileContent.hidden, false);
    assert.equal(env.elements.profileGuest.hidden, true);
    assert.equal(env.elements.profileName.textContent, 'Nova');
    assert.equal(env.elements.profileTrophies.textContent, 4);
    assert.equal(env.elements.profileCompletion.textContent, '40%');
    assert.equal(env.elements.profileScoredGames.textContent, 1);
    assert.deepEqual(env.elements.profileScores.children.map(row => row.children[0].textContent), ['HoverDash']);
    assert.equal(env.elements.profileScores.children[0].children[1].textContent, 'hoverdash:12345');
    assert.deepEqual(env.elements.profileGameTrophies.children.map(row => row.children[0].textContent), ['HoverDash', 'BlockStorm']);
});
