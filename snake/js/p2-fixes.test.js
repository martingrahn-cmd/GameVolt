const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(file, replacements, context = {}, suffix = "") {
    const filename = path.join(__dirname, file);
    let source = fs.readFileSync(filename, "utf8").replace(/^import .*;$/gm, "");
    for (const [from, to] of replacements) source = source.replace(from, to);
    const sandbox = { module: { exports: {} }, console, URL, AbortController, setTimeout, clearTimeout, ...context };
    vm.runInNewContext(source + suffix, sandbox, { filename });
    return sandbox.module.exports;
}

test("only one direction change is accepted per grid step", () => {
    const Snake = load("snake.js", [["export class Snake", "class Snake"]], {}, "\nmodule.exports=Snake;");
    const snake = new Snake(10, 10, "right");
    snake.setDir("up");
    snake.setDir("left");
    snake._stepOnce();
    assert.equal(snake.dir, "up");
    assert.deepEqual({ ...snake.gridHead() }, { x: 10, y: 9 });
    assert.equal(snake.hitsSelf(), false);
    snake.setDir("left");
    snake._stepOnce();
    assert.equal(snake.dir, "left");
});

test("level loader falls back on network and invalid JSON-shaped data", async () => {
    const loadLevelRejected = load("levels.js", [["export async function loadLevel", "async function loadLevel"]], {
        fetch: async () => { throw new Error("offline"); }, console: { warn() {}, log() {}, error() {} }
    }, "\nmodule.exports=loadLevel;");
    assert.equal((await loadLevelRejected("level02")).name, "Fallback");

    const loadLevelInvalid = load("levels.js", [["export async function loadLevel", "async function loadLevel"]], {
        fetch: async () => ({ ok: true, json: async () => ({ nope: true }) })
    }, "\nmodule.exports=loadLevel;");
    assert.equal((await loadLevelInvalid("level02")).name, "Fallback");
});

test("safe storage survives denied browser storage", () => {
    const api = load("storage.js", [
        ["export function safeStorageGet", "function safeStorageGet"],
        ["export function safeStorageSet", "function safeStorageSet"],
        ["export function safeStorageRemove", "function safeStorageRemove"]
    ], { globalThis: { localStorage: { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } } } },
    "\nmodule.exports={safeStorageGet,safeStorageSet,safeStorageRemove};");
    api.safeStorageSet("score", "42");
    assert.equal(api.safeStorageGet("score"), "42");
    api.safeStorageRemove("score");
    assert.equal(api.safeStorageGet("score"), null);
});

test("malformed high-score data becomes an empty list", () => {
    const HighscoreManager = load("highscore.js", [["export class HighscoreManager", "class HighscoreManager"]], {
        safeStorageGet: () => JSON.stringify({ old: "schema" }), safeStorageSet() {}
    }, "\nmodule.exports=HighscoreManager;");
    const manager = new HighscoreManager("neo");
    assert.equal(manager.getLocalScores().length, 0);
    assert.doesNotThrow(() => manager.addScore(100, 1));
});

test("level transition, mode board and direct-link quit contracts are atomic", () => {
    const source = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
    assert.match(source, /await this\._advanceLevel\(nextLevel\);\s*this\.state = "playing"/);
    assert.match(source, /async _advanceLevel\(preloadedLevel = null\)/);
    assert.match(source, /this\.food\.grid = this\.grid/);
    assert.match(source, /this\.gameMode === "16bit" \? "16bit"/);
    assert.match(source, /url\.searchParams\.delete\("mode"\)/);
    assert.match(source, /window\.location\.replace/);
});

test("Fruit Chain game over uses shared controller ownership and B exits", () => {
    const source = fs.readFileSync(path.join(__dirname, "16bit/gameover_16bit.js"), "utf8");
    assert.match(source, /claimSnakeGamepad\(this\._gamepadOwner\)/);
    assert.match(source, /snakeGamepadIsNeutral\(state\)/);
    assert.match(source, /state\.back.*_lastGamepadState\.back/s);
    assert.match(source, /releaseSnakeGamepadWhenNeutral\(this\._gamepadOwner\)/);
});

test("audio created by a direct link can still unlock on a later gesture", async () => {
    class FakeContext {
        constructor() { this.state = "suspended"; this.destination = {}; }
        createAnalyser() { return { fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 8 }; }
        async resume() { this.state = "running"; }
    }
    const AudioNeo = load("audio.js", [["export class AudioNeo", "class AudioNeo"], ["export const audioNeo = new AudioNeo();", ""]], {
        window: { AudioContext: FakeContext }, Uint8Array, console
    }, "\nmodule.exports=AudioNeo;");
    const audio = new AudioNeo();
    await audio.init();
    assert.equal(audio.isUnlocked, false);
    await audio.unlock();
    assert.equal(audio.isUnlocked, true);
});

test("startup never awaits browser audio activation", () => {
    const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");
    assert.doesNotMatch(source, /await unlockAudio\(mode\)/);
    assert.match(source, /unlockAudio\(mode\)\.catch/);
});
