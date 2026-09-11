const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const snakeRoot = path.resolve(__dirname, "..");

function loadSingleClass(file, className, context = {}, prelude = "") {
    const filename = path.join(__dirname, file);
    const source = prelude + "\n" + fs.readFileSync(filename, "utf8")
        .replace(/^import .*;$/gm, "")
        .replace(`export class ${className}`, `class ${className}`) +
        `\nmodule.exports = ${className};`;
    const sandbox = { module: { exports: {} }, exports: {}, ...context };
    vm.runInNewContext(source, sandbox, { filename });
    return sandbox.module.exports;
}

test("every start direction builds the snake body behind its head", () => {
    const Snake = loadSingleClass("snake.js", "Snake");
    const vectors = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
        left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
    };
    for (const [direction, vector] of Object.entries(vectors)) {
        const snake = new Snake(20, 20, direction);
        assert.deepEqual(
            { ...snake.gridCells[1] },
            { x: 20 - vector.x, y: 20 - vector.y },
            direction
        );
        for (let step = 0; step < 3; step++) {
            snake._stepOnce();
            assert.equal(snake.hitsSelf(), false, `${direction}, step ${step + 1}`);
        }
    }
});

test("level 7 can follow its declared left start direction safely", () => {
    const Snake = loadSingleClass("snake.js", "Snake");
    const level = JSON.parse(fs.readFileSync(path.join(snakeRoot, "assets/levels/level07.json"), "utf8"));
    const snake = new Snake(level.start[0], level.start[1], level.startDir);
    snake._stepOnce();
    snake._stepOnce();
    assert.equal(snake.hitsSelf(), false);
});

test("level 10 food is always chosen from the head's reachable component", () => {
    const random = { value: 0 };
    const Food = loadSingleClass("food.js", "Food", { Math: Object.assign(Object.create(Math), { random: () => random.value }) });
    const level = JSON.parse(fs.readFileSync(path.join(snakeRoot, "assets/levels/level10.json"), "utf8"));
    const food = new Food({ w: level.gridWidth, h: level.gridHeight });
    food.setWalls(level.walls);
    const snake = {
        gridHead: () => ({ x: level.start[0], y: level.start[1] }),
        gridCells: [{ x: level.start[0], y: level.start[1] }]
    };
    const reachable = food._reachableCells(level.start[0], level.start[1]);
    const keys = new Set(reachable.map(cell => `${cell.x},${cell.y}`));
    assert.equal(reachable.length, 1840);
    assert.equal(keys.has("18,18"), false, "sealed inner arena must be excluded");
    for (const value of [0, 0.1, 0.5, 0.9, 0.999999]) {
        random.value = value;
        assert.equal(food.respawn(snake), true);
        assert.equal(keys.has(`${food.x},${food.y}`), true, `random=${value}`);
    }
});

test("campaign restart restores the complete initial board", () => {
    const prelude = `
        class Renderer {}
        class Grid { constructor(w, h) { this.w = w; this.h = h; } inBounds() { return true; } }
        class Snake { constructor(x, y, dir) { this.start = [x, y, dir]; } _step() {} }
        class Food {}
        class Scoring {}
        class Hud {}
        class GameOverScreen { resetContinue() { this.reset = true; } }
        class PauseScreen {}
        class LevelCompleteScreen {}
        class OptionsScreen { getSettings() { return {}; } }
        class HighScoresScreen {}
        class HighscoreManager {}
        class Input {}
        function loadLevel() {}
        function recordRun() {}
    `;
    const Game = loadSingleClass("game.js", "Game", {
        window: { dispatchEvent() {} }, performance: { now: () => 100 }, CustomEvent: class {},
        console, setTimeout, clearTimeout, requestAnimationFrame: () => 1
    }, prelude);
    const game = new Game();
    game.initialLevel = { name: "Open Field", gridWidth: 48, gridHeight: 48, start: [24, 24], startDir: "right", walls: [] };
    game.level = { name: "Scattered", gridWidth: 32, gridHeight: 32, start: [6, 6], startDir: "down", walls: [{ x: 1, y: 1, w: 2, h: 2 }] };
    game.renderer = { grid: null, size: 0, resizeCalls: 0, resize() { this.resizeCalls++; } };
    game.food = {
        cleared: 0, walls: null, respawns: 0,
        clearForbiddenZones() { this.cleared++; },
        setWalls(walls) { this.walls = walls; },
        respawn() { this.respawns++; }
    };
    game.hud = { setups: 0, setupForbiddenZone() { this.setups++; }, setPauseButtonVisible() {} };
    game.scoring = { resets: 0, reset() { this.resets++; } };
    game.currentLevelIndex = 5;
    game._restart();
    assert.equal(game.level.name, "Open Field");
    assert.equal(game.currentLevelIndex, 1);
    assert.equal(game.grid.w, 48);
    assert.equal(game.food.grid, game.grid);
    assert.equal(game.food.walls.length, 0);
    assert.equal(game.food.cleared, 1);
    assert.equal(game.food.respawns, 1);
    assert.equal(game.hud.setups, 1);
    assert.equal(game.renderer.resizeCalls, 1);
});

test("restart contract resets board state and routes Fruit Chain correctly", () => {
    const source = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
    assert.match(source, /if \(this\.mode16bit && this\._restart16bit\)/);
    assert.match(source, /this\.level = JSON\.parse\(JSON\.stringify\(this\.initialLevel\)\)/);
    assert.match(source, /this\.grid = new Grid\(this\.level\.gridWidth, this\.level\.gridHeight\)/);
    assert.match(source, /this\.food\.setWalls\(this\.level\.walls \|\| \[\]\)/);
    assert.match(source, /this\.hud\?\.setupForbiddenZone/);
});

test("Fruit Chain tutorial owns and handles the controller", () => {
    let state = { back: true };
    const Tutorial16bit = loadSingleClass("16bit/tutorial_16bit.js", "Tutorial16bit", {
        window: { audioNeoSFX: null },
        requestAnimationFrame: () => 1,
        cancelAnimationFrame() {},
        claimSnakeGamepad() {}, releaseSnakeGamepadWhenNeutral() {},
        getSnakeGamepad: () => ({}), readSnakeGamepadState: () => state,
        snakeGamepadIsNeutral: () => false,
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
    });
    const tutorial = new Tutorial16bit();
    tutorial.overlay = {};
    tutorial._gamepadReady = true;
    tutorial._lastGamepad = {};
    let closed = 0;
    tutorial._complete = () => { closed++; };
    tutorial._pollGamepad();
    assert.equal(closed, 1, "B must skip the tutorial");

    state = { confirm: true };
    tutorial._lastGamepad = {};
    let activated = 0;
    tutorial._activateGamepadSelection = () => { activated++; };
    tutorial._pollGamepad();
    assert.equal(activated, 1, "A must activate the selected tutorial button");
});
