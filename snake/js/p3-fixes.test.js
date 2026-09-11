const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadClass(file, className, context = {}) {
    const filename = path.join(__dirname, file);
    const source = fs.readFileSync(filename, "utf8")
        .replace(/^import .*;$/gm, "")
        .replace(`export class ${className}`, `class ${className}`) + `\nmodule.exports=${className};`;
    const sandbox = { module: { exports: {} }, console, Math, ...context };
    vm.runInNewContext(source, sandbox, { filename });
    return sandbox.module.exports;
}

test("Continue describes and performs the real one-use action without a fake ad", () => {
    const source = fs.readFileSync(path.join(__dirname, "gameover.js"), "utf8");
    assert.match(source, /One use · Score reset/);
    assert.match(source, /_useContinue\(\)/);
    assert.doesNotMatch(source, /Watch Ad|LOADING AD|_simulateAd/);
});

test("the high-score header has a narrow-phone layout", () => {
    const source = fs.readFileSync(path.join(__dirname, "achievements.js"), "utf8");
    assert.match(source, /@media\(max-width:380px\)/);
    assert.match(source, /\.sn-hs-title\{font-size:10px/);
    assert.match(source, /white-space:nowrap/);
});

test("Nokia HUD reads integer score from the game instead of frame delta", () => {
    let stored = null;
    const HudNokia = loadClass("nokia/hud_nokia.js", "HudNokia", {
        safeStorageGet: () => null,
        safeStorageSet: (key, value) => { stored = [key, value]; }
    });
    const game = { scoring: { score: 0 } };
    const hud = new HudNokia(game, { getContext: () => ({}) });
    hud.update(0.016);
    assert.equal(hud.high, 0);
    assert.equal(stored, null);
    game.scoring.score = 7.9;
    hud.update(0.016);
    assert.equal(hud.high, 7);
    assert.equal(stored[1], 7);
});

test("global pager uses the beginning of the last real page and handles rejected calls", () => {
    const source = fs.readFileSync(path.join(__dirname, "achievements.js"), "utf8");
    assert.match(source, /Math\.floor\(\(this\.total - 1\) \/ HS_PAGE\) \* HS_PAGE/);
    assert.match(source, /next\.disabled = this\.total <= 0 \|\| this\.offset \+ HS_PAGE >= this\.total/);
    assert.match(source, /leaderboard\.count[\s\S]*?\.catch\(/);
    assert.match(source, /leaderboard\.myRank[\s\S]*?\.catch\(/);
    assert.match(source, /leaderboard\.page[\s\S]*?\.catch\(\(\) => \[\]\)/);
});

test("Fruit Chain exhaustively selects a valid cell and reports a full board", () => {
    const Food16bit = loadClass("16bit/food_16bit.js", "Food16bit");
    const food = new Food16bit({ w: 8, h: 8 });
    const snake = { gridCells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] };
    const fruit = food._spawnFruit("apple", snake);
    assert.ok(fruit);
    assert.equal(food._isValidPosition(fruit.x, fruit.y, snake), true);

    const full = new Food16bit({ w: 3, h: 3 });
    assert.equal(full._spawnFruit("apple", { gridCells: [] }), null);
});

test("both modes finish a full board as cleared instead of leaving invalid food", () => {
    const game = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
    const main = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");
    const over = fs.readFileSync(path.join(__dirname, "gameover.js"), "utf8");
    assert.match(game, /if \(!this\.food\.respawn\(this\.snake\)\) \{\s*this\._gameOver\(true\)/);
    assert.match(main, /result\.boardFull[\s\S]*?_gameOver16bit\(true\)/);
    assert.match(main, /if \(!this\.food\.resetForNewRound\(this\.snake\)\)/);
    assert.match(over, /stats\.boardCleared \? 'BOARD CLEARED' : 'GAME OVER'/);
});
