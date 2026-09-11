const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('opening Big Picture as a local file redirects to the running site', () => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const redirectScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
    let destination = '';
    const window = { location: { protocol: 'file:', search: '?game=manny', hash: '#preview', replace(url) { destination = url; } } };
    vm.runInNewContext(redirectScript, { window });
    assert.equal(destination, 'http://localhost:8000/big-picture/?game=manny#preview');
});

function setup(options = {}) {
    const elements = {}, listeners = {};
    const bodyClasses = new Set();
    let tick, pads = [], fullscreenRequests = 0;
    const document = {
        hidden: false, activeElement: null,
        body: { classList: { toggle(name, active) { if (active) bodyClasses.add(name); else bodyClasses.delete(name); }, contains(name) { return bodyClasses.has(name); } } },
        getElementById(id) { return elements[id] ||= element(); },
        createElement() { return element(); },
        addEventListener(type, fn) { listeners[type] = fn; },
        documentElement: { async requestFullscreen() { fullscreenRequests++; if (options.rejectFullscreen) throw new Error('blocked'); } }
    };
    function element() {
        return {
            children: [], attributes: {}, listeners: {}, hidden: false, textContent: '', scrollTop: 0,
            classList: { toggle() {} },
            setAttribute(key, value) { this.attributes[key] = value; },
            append(...children) { this.children.push(...children); children.forEach(child => { child.parent = this; }); },
            remove() { this.parent.children = this.parent.children.filter(child => child !== this); },
            addEventListener(type, fn) { this.listeners[type] = fn; },
            focus() { document.activeElement = this; this.listeners.focus?.(); },
            click(event = { isTrusted: false }) { this.listeners.click?.(event); },
            scrollIntoView() {}, scrollBy(options) { this.scrollTop += options.top; }, matches() { return false; }, querySelector() { return element(); }
        };
    }
    const window = { location: { href: '/big-picture/' }, matchMedia: () => ({ matches: true }), requestAnimationFrame(fn) { tick = fn; } };
    if (options.GameVolt) window.GameVolt = options.GameVolt;
    const storage = new Map();
    const context = { window, document,
        navigator: { platform: 'MacIntel', getGamepads() { if (options.blockGamepads) throw new Error('denied'); return pads; } },
        sessionStorage: { getItem(key) { if (options.blockStorage) throw new Error('denied'); return storage.get(key); }, setItem(key, value) { if (options.blockStorage) throw new Error('denied'); storage.set(key, value); } }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), context);
    function pad(buttons = [], axes = [0, 0], mapping = 'standard') {
        pads = [{ connected: true, mapping, axes, buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: buttons.includes(index) })) }];
    }
    return { elements, document, window, pad, step: now => tick(now), disconnect() { pads = []; },
        key(key, extra = {}) { const event = { key, preventDefault() { this.prevented = true; }, ...extra }; listeners.keydown(event); return event; },
        get fullscreenRequests() { return fullscreenRequests; } };
}

test('controller repeats directions at a controlled rate and wraps the eight-game collection', () => {
    const env = setup();
    env.pad([15]); env.step(0);
    assert.equal(env.elements.selectedTitle.textContent, 'HoverDash');
    assert.equal(env.elements.gameShelf.children[0].attributes['data-side'], 'left');
    assert.equal(env.elements.gameShelf.children[1].attributes['data-side'], 'active');
    assert.equal(env.elements.gameShelf.children[2].attributes['data-side'], 'right');
    assert.equal(env.elements.gameShelf.children[2].attributes['data-distance'], '1');
    env.step(100); assert.equal(env.elements.selectedTitle.textContent, 'HoverDash');
    env.step(350); assert.equal(env.elements.selectedTitle.textContent, 'Axeluga');
    env.pad(); env.step(400);
    env.pad([14]); env.step(410); assert.equal(env.elements.selectedTitle.textContent, 'HoverDash');
    env.pad(); env.step(420); env.pad([14]); env.step(430);
    env.pad(); env.step(440); env.pad([14]); env.step(450);
    assert.equal(env.elements.selectedTitle.textContent, 'Manny the Mole');
});

test('visible previous and next controls browse the collection and wrap at both ends', () => {
    const env = setup();
    env.elements.prevGame.click();
    assert.equal(env.elements.selectedTitle.textContent, 'Manny the Mole');
    env.elements.nextGame.click();
    assert.equal(env.elements.selectedTitle.textContent, 'Slipstream Vector');
    env.elements.nextGame.click();
    assert.equal(env.elements.selectedTitle.textContent, 'HoverDash');
});

test('featured carousel swaps gameplay videos including Gridburn', () => {
    const env = setup();
    assert.equal(env.elements.selectedVideo.hidden, true);
    assert.equal(env.elements.selectedStill.hidden, false);
    assert.equal(env.elements.selectedStill.src, '/assets/thumbnails/slipstream-vector-tall.png');
    assert.equal(env.elements.previousPeekName.textContent, 'Manny the Mole');
    assert.equal(env.elements.nextPeekName.textContent, 'HoverDash');
    assert.equal(env.elements.farPreviousPeekName.textContent, 'Gridburn');
    assert.equal(env.elements.farNextPeekName.textContent, 'Axeluga');
    assert.equal(env.elements.carouselRail.children.length, 8);
    env.elements.nextGame.click();
    assert.equal(env.elements.selectedVideo.src, '/hoverdash/preview.mp4');
    assert.equal(env.elements.previousPeekName.textContent, 'Slipstream Vector');
    assert.equal(env.elements.nextPeekName.textContent, 'Axeluga');
    assert.equal(env.elements.farPreviousPeekName.textContent, 'Manny the Mole');
    assert.equal(env.elements.farNextPeekName.textContent, 'Snake Neo');
    env.elements.gameShelf.children[6].click();
    assert.equal(env.elements.selectedVideo.hidden, false);
    assert.equal(env.elements.selectedStill.hidden, true);
    assert.equal(env.elements.selectedVideo.src, '/gridburn/preview.mp4');
});

test('launch reuses the normal player and holding View unloads it without a duplicate launch', () => {
    const env = setup();
    env.pad([0]); env.step(0);
    const mount = env.elements.playerMount;
    assert.equal(mount.children.length, 1);
    assert.equal(mount.children[0].src, '/play/?game=slipstream-vector&from=big_picture&big-picture=1');
    assert.equal(mount.children[0].allow, 'autoplay; fullscreen; gamepad');
    env.step(100); assert.equal(mount.children.length, 1);
    env.pad([1]); env.step(150); // Normal game back buttons do not exit the player.
    assert.equal(env.elements.player.hidden, false);
    env.pad([8]); env.step(200); env.step(1199);
    assert.equal(mount.children.length, 1);
    assert.equal(env.elements.returnProgress.value, 100);
    env.step(1200); assert.equal(mount.children.length, 0);
    assert.equal(env.document.getElementById('library').hidden, false);
    assert.equal(env.elements.player.hidden, true);
    env.step(1000); assert.equal(mount.children.length, 0);
    assert.equal(env.document.activeElement, env.elements.gameShelf.children[0]);
});

test('View + Menu remains a faster return chord and shows hold progress', () => {
    const env = setup();
    env.elements.play.click();
    env.pad([8, 9]); env.step(10); env.step(659);
    assert.equal(env.elements.playerMount.children.length, 1);
    assert.equal(env.elements.returnProgress.value, 100);
    env.step(660);
    assert.equal(env.document.getElementById('playerMount').children.length, 0);
});

test('holding Menu alone returns for controllers without a View button', () => {
    const env = setup();
    env.elements.play.click();
    env.pad([9]); env.step(0); env.step(1499);
    assert.equal(env.elements.playerMount.children.length, 1);
    env.step(1500);
    assert.equal(env.elements.playerMount.children.length, 0);
});

test('blocked gamepad and storage APIs preserve keyboard, touch and return navigation', () => {
    const env = setup({ blockGamepads: true, blockStorage: true });
    assert.doesNotThrow(() => env.step(0));
    assert.equal(env.key('ArrowRight').prevented, true);
    assert.equal(env.elements.selectedTitle.textContent, 'HoverDash');
    env.key('Enter');
    assert.equal(env.elements.playerMount.children.length, 1);
    env.elements.back.click();
    env.elements.gameShelf.children[4].click();
    env.elements.play.click();
    assert.ok(env.elements.playerMount.children[0].src.includes('blockstorm'));
});

test('disconnect cancels an in-progress exit chord and unknown mappings never launch a game', () => {
    const env = setup();
    env.pad([0], [0, 0], ''); env.step(0);
    assert.equal(env.document.getElementById('library').hidden, false);
    env.elements.play.click(); env.pad([8, 9]); env.step(10);
    env.disconnect(); env.step(500); env.pad([8, 9]); env.step(800);
    assert.equal(env.elements.player.hidden, false);
    assert.equal(env.elements.returnProgress.value, 0);
    env.step(1450); assert.equal(env.elements.player.hidden, true);
});

test('mouse requests browser fullscreen while gamepad fullscreen works without browser activation', () => {
    const mouseEnv = setup();
    mouseEnv.elements.fullscreen.click({ isTrusted: true });
    assert.equal(mouseEnv.fullscreenRequests, 1);
});

test('blocked browser fullscreen falls back to TV view and B returns to the library', async () => {
    const env = setup({ rejectFullscreen: true });
    env.pad([3]); env.step(0); env.step(100);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(env.fullscreenRequests, 1);
    assert.equal(env.document.body.classList.contains('controller-fullscreen'), true);
    env.pad(); env.step(110); env.pad([1]); env.step(120);
    assert.equal(env.document.body.classList.contains('controller-fullscreen'), false);
    assert.equal(env.window.location.href, '/big-picture/');
    env.pad(); env.step(130); env.pad([12]); env.step(140);
    env.pad(); env.step(150); env.pad([15]); env.step(160);
    env.pad(); env.step(170); env.pad([0]); env.step(180);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(env.document.activeElement, env.elements.fullscreen);
    assert.equal(env.document.body.classList.contains('controller-fullscreen'), true);
    for (const card of env.elements.gameShelf.children) {
        const asset = card.children[0].src;
        assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), asset);
        card.click(); env.elements.play.click();
        const url = new URL(env.elements.playerMount.children[0].src, 'https://gamevolt.io');
        assert.ok(fs.existsSync(path.join(__dirname, '..', url.searchParams.get('game'), 'index.html')));
        env.elements.back.click();
    }
    for (const preview of ['hoverdash', 'axeluga', 'snake', 'blockstorm', 'asteroid-storm', 'gridburn', 'manny-the-mole']) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', preview, 'preview.mp4')), preview + ' preview');
    }
});

test('X opens the controller profile, D-pad scrolls it and B returns without leaving Big Picture', () => {
    const env = setup();
    env.pad([2]); env.step(0);
    assert.equal(env.elements.library.hidden, true);
    assert.equal(env.elements.profileView.hidden, false);
    assert.equal(env.document.getElementById('playerMount').children.length, 0);
    env.pad(); env.step(10); env.pad([13]); env.step(20);
    assert.equal(env.document.activeElement, env.elements.profileLogin);
    env.step(370);
    assert.equal(env.elements.profileScroller.scrollTop, 240);
    env.pad(); env.step(380); env.pad([1]); env.step(390);
    assert.equal(env.elements.profileView.hidden, true);
    assert.equal(env.elements.library.hidden, false);
    assert.equal(env.window.location.href, '/big-picture/');
    assert.equal(env.document.activeElement, env.elements['gv-login-btn']);
});

test('D-pad up focuses Profile, A opens it and down returns to the selected game', () => {
    const env = setup();
    env.pad([12]); env.step(0);
    assert.equal(env.document.activeElement, env.elements['gv-login-btn']);
    env.pad(); env.step(10); env.pad([0]); env.step(20);
    assert.equal(env.elements.profileView.hidden, false);
    env.pad(); env.step(30); env.pad([1]); env.step(40);
    assert.equal(env.elements.profileView.hidden, true);
    assert.equal(env.document.activeElement, env.elements['gv-login-btn']);
    env.pad(); env.step(50); env.pad([13]); env.step(60);
    assert.equal(env.document.activeElement, env.elements.gameShelf.children[0]);
});

test('guest profile navigation reaches Sign in and A opens the SDK login', () => {
    let loginCalls = 0;
    const env = setup({ GameVolt: { auth: { login() { loginCalls++; } } } });
    env.elements['gv-login-btn'].click();
    env.pad([13]); env.step(0);
    assert.equal(env.document.activeElement, env.elements.profileLogin);
    env.pad(); env.step(10); env.pad([0]); env.step(20);
    assert.equal(loginCalls, 1);
    env.pad(); env.step(30); env.pad([12]); env.step(40);
    assert.equal(env.document.activeElement, env.elements.profileBack);
});
