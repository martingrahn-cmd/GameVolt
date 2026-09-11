const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function devicePage(search, options = {}) {
    const elements = {};
    function element() {
        return {
            hidden: false, textContent: '', className: '', disabled: false, listeners: {},
            addEventListener(type, fn) { this.listeners[type] = fn; },
            click() { if (this.listeners.click) this.listeners.click(); }
        };
    }
    const document = { getElementById(id) { return elements[id] ||= element(); } };
    let stateChange, loginCalls = 0, approveArgs, initializedWith;
    const GameVolt = {
        init(id) { initializedWith = id; }, onReady(fn) { fn(); },
        auth: {
            getUser() { return options.user || null; },
            login() { loginCalls++; }, onStateChange(fn) { stateChange = fn; }
        },
        deviceAuth: {
            inspect() { return Promise.resolve({ status: 'pending', displayCode: '123456' }); },
            approve(id, secret) { approveArgs = [id, secret]; return Promise.resolve({ ok: true }); }
        }
    };
    const window = { location: { search }, GameVolt };
    const context = { window, document, GameVolt, URLSearchParams, Promise };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'auth/device/app.js'), 'utf8'), context);
    return { elements, GameVolt, get stateChange() { return stateChange; }, get loginCalls() { return loginCalls; },
        get approveArgs() { return approveArgs; }, get initializedWith() { return initializedWith; } };
}

const REQUEST = '123e4567-e89b-42d3-a456-426614174000';
const APPROVAL = 'A'.repeat(43);

test('signing in from the QR page automatically approves the matching screen', async () => {
    const env = devicePage('?request=' + REQUEST + '&approve=' + APPROVAL + '&code=999999');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(env.initializedWith, 'device-auth');
    assert.equal(env.elements.deviceCode.textContent, '123 456');
    assert.equal(env.elements.deviceSignedOut.hidden, false);
    env.elements['gv-login-btn'].click();
    assert.equal(env.loginCalls, 1);
    env.stateChange({ username: 'Nova', email: 'nova@example.com' });
    assert.equal(env.elements.deviceSignedIn.hidden, false);
    assert.equal(env.elements.deviceUser.textContent, 'Nova');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(env.approveArgs, [REQUEST, APPROVAL]);
    assert.equal(env.elements.deviceSuccess.hidden, false);
});

test('an already signed-in phone approves immediately after scanning', async () => {
    const env = devicePage('?request=' + REQUEST + '&approve=' + APPROVAL, {
        user: { username: 'Nova', email: 'nova@example.com' }
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(env.elements.deviceSignedIn.hidden, false);
    assert.deepEqual(env.approveArgs, [REQUEST, APPROVAL]);
    assert.equal(env.elements.deviceSuccess.hidden, false);
});

test('malformed QR requests fail closed before calling the backend', () => {
    const env = devicePage('?request=bad&approve=bad');
    assert.equal(env.elements.deviceInvalid.hidden, false);
    assert.equal(env.initializedWith, undefined);
});

test('device auth keeps the polling secret out of QR links and locks its table from browser roles', () => {
    const sdk = fs.readFileSync(path.join(__dirname, '..', 'sdk/gamevolt.js'), 'utf8');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'sql/device-auth.sql'), 'utf8');
    const edge = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/device-auth/index.ts'), 'utf8');
    assert.match(sdk, /\/auth\/device\/\?request=/);
    const qrBuilder = sdk.slice(sdk.indexOf("'/auth/device/?request='"), sdk.indexOf("var box = modal.querySelector"));
    assert.doesNotMatch(qrBuilder, /pollToken/);
    assert.match(sql, /revoke all on table public\.device_auth_requests from anon, authenticated/i);
    assert.match(sql, /enable row level security/i);
    assert.match(edge, /getUser\(req\)/);
    assert.match(edge, /auth\.admin\.generateLink/);
    assert.ok(fs.existsSync(path.join(__dirname, 'qrcode.LICENSE')));
});
