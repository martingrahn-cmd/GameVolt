const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");

function loadGamepadModule() {
    const filename = path.join(__dirname, "gamepad.js");
    const source = fs.readFileSync(filename, "utf8")
        .replaceAll("export function ", "function ") +
        "\nmodule.exports = { isSnakeGamepad, snakeGamepadHasActivity, selectSnakeGamepad, getSnakeGamepad, readSnakeGamepadState, snakeGamepadIsNeutral };";
    const context = {
        module: { exports: {} },
        exports: {},
        requestAnimationFrame: () => 0
    };
    vm.runInNewContext(source, context, { filename });
    return context.module.exports;
}

function pad({ id = "Xbox Controller", index = 0, mapping = "standard", buttons = 16, axes = [0, 0] } = {}) {
    return {
        id,
        index,
        mapping,
        connected: true,
        buttons: Array.from({ length: buttons }, () => ({ pressed: false, value: 0 })),
        axes: [...axes]
    };
}

test("controller selection ignores audio devices", () => {
    const api = loadGamepadModule();
    const headset = pad({ id: "Wireless Headset Gamepad", index: 0 });
    const controller = pad({ id: "DualSense Wireless Controller", index: 1 });
    assert.equal(api.isSnakeGamepad(headset), false);
    assert.equal(api.selectSnakeGamepad([headset, controller]), controller);
});

test("active controller wins and remains preferred after release", () => {
    const api = loadGamepadModule();
    const idle = pad({ id: "Idle standard", index: 0 });
    const active = pad({ id: "Active legacy", index: 1, mapping: "" });
    active.buttons[0] = { pressed: true, value: 1 };
    assert.equal(api.selectSnakeGamepad([idle, active]), active);
    active.buttons[0] = { pressed: false, value: 0 };
    assert.equal(api.selectSnakeGamepad([idle, active]), active);
});

test("gamepad state maps stick, D-pad and face buttons", () => {
    const api = loadGamepadModule();
    const controller = pad({ axes: [-0.8, 0.9] });
    controller.buttons[0].pressed = true;
    controller.buttons[1].pressed = true;
    controller.buttons[9].pressed = true;
    controller.buttons[12].pressed = true;
    assert.deepEqual(
        { ...api.readSnakeGamepadState(controller) },
        { up: true, down: true, left: true, right: false, confirm: true, back: true, start: true }
    );
});

test("getSnakeGamepad tolerates blocked browser APIs", () => {
    const api = loadGamepadModule();
    assert.equal(api.getSnakeGamepad({ getGamepads() { throw new Error("blocked"); } }), null);
    assert.equal(api.snakeGamepadIsNeutral({ up: false, confirm: false }), true);
});

test("every Snake screen uses the shared controller mapper", () => {
    for (const file of ["input.js", "menu.js", "options.js", "levelcomplete.js", "achievements.js"]) {
        const source = fs.readFileSync(path.join(__dirname, file), "utf8");
        assert.match(source, /from "\.\/gamepad\.js\?v=1\.9"/);
    }
});

test("trophies, highscores and SDK pause expose complete gamepad actions", () => {
    const achievements = fs.readFileSync(path.join(__dirname, "achievements.js"), "utf8");
    const game = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
    assert.match(achievements, /D-PAD ↑↓ SCROLL · B BACK/);
    assert.match(achievements, /D-PAD NAVIGATE · A SELECT · B BACK/);
    assert.match(achievements, /state\.confirm/);
    assert.match(achievements, /state\.back/);
    assert.match(achievements, /\.sn-hs-body button, \.sn-hs-body \[role=button\]/);
    assert.match(game, /_moveSdkPauseSelection\(dir\)/);
    assert.match(game, /_activateSdkPauseSelection\(\)/);
    assert.match(game, /input\[type=range\]/);
    assert.match(game, /action === "start" \|\| action === "back"/);
});
