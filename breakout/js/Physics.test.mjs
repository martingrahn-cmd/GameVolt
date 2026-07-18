import assert from 'node:assert/strict';

function createContextStub() {
  return {
    beginPath() {},
    closePath() {},
    fill() {},
    fillRect() {},
    fillText() {},
    strokeRect() {},
    stroke() {},
    arc() {},
    moveTo() {},
    lineTo() {}
  };
}

globalThis.document = {
  createElement() {
    return {
      width: 0,
      height: 0,
      getContext: createContextStub
    };
  }
};

const [{ default: Brick }, { default: BrickManager }, { Ball }] = await Promise.all([
  import('./Brick.js'),
  import('./BrickManager.js'),
  import('./Ball.js')
]);

function createGameStub() {
  const game = {
    width: 400,
    height: 400,
    level: 1,
    effectsLevel: 'high',
    combo: 0,
    overdriveActive: false,
    balls: [],
    lasers: [],
    powerUps: [],
    state: 'running',
    scoreEvents: [],
    powerUpCount: 0,
    powerUpScales: [],
    destroyedCount: 0,
    laserDestroyedCount: 0,
    perfectDriftCount: 0,
    finalCompleteCount: 0,
    nextLevelCount: 0,
    floatingTexts: [],
    paddle: { x: 150, y: 350, width: 100, height: 10 },
    audio: { play() {} },
    particles: { explode() {}, impact() {} },
    shake() {},
    incrementCombo() {
      this.combo++;
      this.overdriveActive = this.combo >= 10;
      if (this.ui) this.ui.onComboUpdate(this.combo);
    },
    resetCombo() {
      this.combo = 0;
      this.overdriveActive = false;
    },
    registerPerfectDrift() { this.perfectDriftCount++; },
    completeFinal() { this.finalCompleteCount++; },
    nextLevel() { this.nextLevelCount++; },
    addScore(points) { this.scoreEvents.push(points); },
    spawnPowerUp(x, y, dropScale) {
      this.powerUpCount++;
      this.powerUpScales.push(dropScale);
    },
    showFloatingText(text) {
      this.floatingTexts.push(text);
    },
    ui: {
      onComboUpdate() {},
      onBrickDestroyed() { game.destroyedCount++; },
      onLaserBrickDestroyed() { game.laserDestroyedCount++; }
    }
  };
  game.bricks = new BrickManager(game);
  return game;
}

// Neon God starts shielded, unlocks after four sentinels, changes phase,
// collapses its remaining arena on defeat and then completes the final.
{
  const game = createGameStub();
  game.level = 10;
  game.bricks.loadLevel(10);
  const sentinels = game.bricks.bricks.filter(brick => brick.isGodSentinel);
  const core = game.bricks.godCore;

  assert.equal(sentinels.length, 4);
  assert.equal(core.locked, true);
  assert.equal(core.hp, 12);
  assert.equal(game.bricks.getBossStatus().phase, 'shields');
  assert.equal(game.bricks.getBossStatus().current, 4);

  const blockedBall = {
    x: core.x + core.width / 2,
    y: core.y + core.height / 2,
    radius: 6,
    vx: 0,
    vy: -100
  };
  game.bricks.checkCollision(blockedBall);
  assert.equal(core.hp, 12);
  assert.ok(game.floatingTexts.includes('CORE SHIELDED'));

  sentinels.forEach(sentinel => {
    sentinel.armor = 0;
    sentinel.hp = 1;
    game.bricks.checkCollision({
      x: sentinel.x + sentinel.width / 2,
      y: sentinel.y + sentinel.height / 2,
      radius: 6,
      vx: 0,
      vy: -100
    });
  });

  assert.equal(game.bricks.godSentinelsRemaining, 0);
  assert.equal(core.locked, false);
  assert.ok(core.moveAmplitude > 0);
  assert.equal(game.bricks.getBossStatus().phase, 'core');

  core.hp = 9;
  game.bricks.checkCollision({
    x: core.x + core.width / 2,
    y: core.y + core.height / 2,
    radius: 6,
    vx: 0,
    vy: -100
  });
  assert.equal(core.hp, 8);
  assert.equal(game.bricks.godCoreStage, 2);

  core.hp = 1;
  game.bricks.checkCollision({
    x: core.x + core.width / 2,
    y: core.y + core.height / 2,
    radius: 6,
    vx: 0,
    vy: -100
  });
  assert.equal(core.destroyed, true);
  assert.equal(game.bricks.godPhase, 'defeated');
  assert.ok(game.scoreEvents.includes(5000));
  assert.equal(game.powerUpCount, 4, 'the boss core itself cannot drop a power-up');

  game.bricks.update(2);
  assert.equal(game.finalCompleteCount, 1);
}

// Later Neon God cycles in Endless keep advancing instead of reopening
// the level-ten victory screen and sending the player backwards.
{
  const game = createGameStub();
  game.level = 20;
  game.bricks.loadLevel(20);
  game.bricks.godPhase = 'defeated';
  game.bricks.finalVictoryTimer = 0.1;

  game.bricks.update(0.2);
  assert.equal(game.nextLevelCount, 1);
  assert.equal(game.finalCompleteCount, 0);
}

// Armor absorbs one complete hit without reducing the brick HP.
{
  const game = createGameStub();
  const brick = new Brick(
    game,
    100,
    50,
    40,
    12,
    '#ff4444',
    3,
    { kind: 'armor', armor: 1 }
  );
  game.bricks.bricks = [brick];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  game.bricks.checkCollision(ball);
  assert.equal(brick.armor, 0);
  assert.equal(brick.hp, 3);
  assert.equal(brick.destroyed, false);
  assert.deepEqual(game.scoreEvents, [10]);
  assert.ok(game.floatingTexts.includes('ARMOR BREAK'));
}

// A locked gate bounces the ball but gives no HP damage, combo or score.
{
  const game = createGameStub();
  const brick = new Brick(
    game,
    100,
    50,
    40,
    12,
    '#ff4444',
    3,
    { kind: 'locked', locked: true }
  );
  game.bricks.bricks = [brick];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  assert.equal(game.bricks.checkCollision(ball), true);
  assert.equal(brick.hp, 3);
  assert.equal(game.combo, 0);
  assert.deepEqual(game.scoreEvents, []);
  assert.ok(game.floatingTexts.includes('LOCKED'));
}

// Linked twins share one point of damage without recursively hitting each other.
{
  const game = createGameStub();
  game.bricks.designID = 4;
  const left = new Brick(
    game, 100, 50, 40, 12, '#33ff33', 1,
    { row: 0, col: 1, kind: 'linked', linkId: '0:1' }
  );
  const right = new Brick(
    game, 260, 50, 40, 12, '#33ff33', 1,
    { row: 0, col: 8, kind: 'linked', linkId: '0:1' }
  );
  game.bricks.bricks = [left, right];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  game.bricks.checkCollision(ball);
  assert.equal(left.destroyed, true);
  assert.equal(right.destroyed, true);
  assert.deepEqual(game.scoreEvents, [10, 25]);
  assert.equal(game.destroyedCount, 2);
  assert.equal(game.powerUpCount, 1, 'linked secondary destruction cannot drop a power-up');
}

// Blast bricks damage adjacent bricks and award a small deterministic chain bonus.
{
  const game = createGameStub();
  game.bricks.designID = 5;
  const bomb = new Brick(
    game, 100, 50, 40, 12, '#33ff33', 1,
    { row: 2, col: 2, kind: 'bomb' }
  );
  const neighbor = new Brick(
    game, 140, 50, 40, 12, '#33ff33', 1,
    { row: 2, col: 3 }
  );
  game.bricks.bricks = [bomb, neighbor];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  game.bricks.checkCollision(ball);
  assert.equal(bomb.destroyed, true);
  assert.equal(neighbor.destroyed, true);
  assert.deepEqual(game.scoreEvents, [10, 25]);
  assert.equal(game.powerUpCount, 1);
  assert.ok(game.floatingTexts.includes('BLAST +25'));
}

// Clearing the final brick in a level-two row awards one row-chain bonus.
{
  const game = createGameStub();
  game.bricks.designID = 2;
  const first = new Brick(game, 100, 50, 40, 12, '#33ff33', 1, { row: 1, col: 0 });
  const second = new Brick(game, 180, 50, 40, 12, '#33ff33', 1, { row: 1, col: 1 });
  game.bricks.bricks = [first, second];

  game.bricks.checkCollision({ x: 100, y: 56, radius: 6, vx: 100, vy: -100 });
  game.bricks.checkCollision({ x: 180, y: 56, radius: 6, vx: 100, vy: -100 });

  assert.deepEqual(game.scoreEvents, [10, 20, 250]);
  assert.ok(game.floatingTexts.includes('ROW CHAIN +250'));
}

// A destroyed switch opens every locked gate.
{
  const game = createGameStub();
  game.bricks.designID = 9;
  game.bricks.switchesRemaining = 1;
  const switchBrick = new Brick(
    game, 100, 50, 40, 12, '#33ff33', 1,
    { row: 2, col: 2, kind: 'switch', isSwitch: true }
  );
  const gate = new Brick(
    game, 100, 100, 40, 12, '#ff4444', 3,
    { row: 5, col: 0, kind: 'locked', locked: true }
  );
  game.bricks.bricks = [switchBrick, gate];

  game.bricks.checkCollision({ x: 100, y: 56, radius: 6, vx: 100, vy: -100 });
  assert.equal(gate.locked, false);
  assert.ok(game.floatingTexts.includes('GATES OPEN'));
}

// Lasers use the same armor and destruction rules as ball hits.
{
  const game = createGameStub();
  const brick = new Brick(
    game, 100, 50, 40, 12, '#33ff33', 1,
    { kind: 'armor', armor: 1 }
  );
  game.bricks.bricks = [brick];

  game.bricks.checkLaserCollision({ x: 110, y: 52, width: 4, height: 15, delete: false });
  assert.equal(brick.armor, 0);
  assert.equal(brick.hp, 1);
  game.bricks.checkLaserCollision({ x: 110, y: 52, width: 4, height: 15, delete: false });
  assert.equal(brick.destroyed, true);
  assert.equal(game.laserDestroyedCount, 1);
}

// Level-seven paddle returns move the entire living formation downward.
{
  const game = createGameStub();
  game.bricks.designID = 7;
  const invader = new Brick(
    game, 100, 50, 40, 12, '#33ff33', 1,
    { kind: 'invader' }
  );
  game.bricks.bricks = [invader];
  game.bricks.onPaddleHit();
  assert.equal(invader.y, 50 + game.height * 0.012);
}

// A destroyed brick becomes non-collidable immediately, even while fading.
{
  const game = createGameStub();
  const brick = new Brick(game, 100, 50, 40, 12, '#33ff33', 1);
  game.bricks.bricks = [brick];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  assert.equal(game.bricks.checkCollision(ball), true);
  assert.equal(brick.destroyed, true);
  assert.deepEqual(game.scoreEvents, [10]);
  assert.equal(game.powerUpCount, 1);
  assert.deepEqual(game.powerUpScales, [1]);
  assert.equal(game.destroyedCount, 1);

  ball.x = 100;
  ball.y = 56;
  assert.equal(game.bricks.checkCollision(ball), false);
  assert.deepEqual(game.scoreEvents, [10], 'destroyed brick cannot score twice');
  assert.equal(game.powerUpCount, 1, 'destroyed brick cannot drop twice');

  brick.update(0.06);
  assert.equal(brick.delete, false);
  brick.update(0.06);
  assert.equal(brick.delete, true, 'fade duration is time-based');
}

// Bricks destroyed by an extra multiball use the heavily reduced drop scale.
{
  const game = createGameStub();
  const brick = new Brick(game, 100, 50, 40, 12, '#33ff33', 1);
  game.bricks.bricks = [brick];
  const extraBall = {
    x: 100,
    y: 56,
    radius: 6,
    vx: 100,
    vy: -100,
    powerUpDropScale: 0.1
  };

  game.bricks.checkCollision(extraBall);
  assert.deepEqual(game.powerUpScales, [0.1]);
}

// The tenth brick hit activates Overdrive before that hit is scored.
{
  const game = createGameStub();
  game.combo = 9;
  const brick = new Brick(game, 100, 50, 40, 12, '#33ff33', 1);
  game.bricks.bricks = [brick];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  game.bricks.checkCollision(ball);
  assert.equal(game.combo, 10);
  assert.equal(game.overdriveActive, true);
  assert.deepEqual(game.scoreEvents, [200], 'the x10 hit receives the 2x Overdrive score');
}

// Damage updates both HP and the cached visual.
{
  const game = createGameStub();
  const brick = new Brick(game, 100, 50, 40, 12, '#ff9933', 2);
  game.bricks.bricks = [brick];
  const ball = { x: 100, y: 56, radius: 6, vx: 100, vy: -100 };

  game.bricks.checkCollision(ball);
  assert.equal(brick.hp, 1);
  assert.equal(brick.destroyed, false);
  assert.equal(brick.color, '#33ff33');
  assert.equal(brick._cachedHP, 1);
}

// Fast movement is sub-stepped so a ball cannot tunnel through a thin brick.
{
  const game = createGameStub();
  const brick = new Brick(game, 80, 50, 40, 10, '#33ff33', 1);
  game.bricks.bricks = [brick];

  const ball = new Ball(game);
  ball.x = 100;
  ball.y = 80;
  ball.isLaunched = true;
  ball.speed = 1200;
  ball.vx = 0;
  ball.vy = -1200;
  game.balls = [ball];

  ball.update(0.05);
  assert.equal(brick.destroyed, true, 'sub-steps detect the crossed brick');
}

// New multiballs carry their reduced power-up drop scale with them.
{
  const game = createGameStub();
  const primary = new Ball(game);
  const extra = new Ball(game, { powerUpDropScale: 0.1 });
  assert.equal(primary.powerUpDropScale, 1);
  assert.equal(extra.powerUpDropScale, 0.1);
}

// A moving outer-grip catch preserves combo; an ordinary catch breaks it.
{
  const game = createGameStub();
  game.combo = 6;
  game.paddle.velocityX = 200;

  const driftBall = new Ball(game);
  driftBall.x = game.paddle.x + game.paddle.width * 0.85;
  driftBall.y = game.paddle.y - driftBall.radius + 1;
  driftBall.isLaunched = true;
  driftBall.speed = driftBall.baseSpeed;
  driftBall.vx = 0;
  driftBall.vy = driftBall.speed;
  game.balls = [driftBall];

  driftBall.update(0.01);
  assert.equal(game.perfectDriftCount, 1);
  assert.equal(game.combo, 6, 'Perfect Drift holds the current combo');
  assert.ok(driftBall.vx > 0, 'the drift sends the ball toward the moving edge');

  game.combo = 6;
  game.overdriveActive = false;
  game.paddle.velocityX = 0;
  const normalBall = new Ball(game);
  normalBall.x = game.paddle.x + game.paddle.width / 2;
  normalBall.y = game.paddle.y - normalBall.radius + 1;
  normalBall.isLaunched = true;
  normalBall.speed = normalBall.baseSpeed;
  normalBall.vx = 0;
  normalBall.vy = normalBall.speed;
  normalBall.update(0.01);
  assert.equal(game.combo, 0, 'an ordinary paddle catch resets combo');
}

// Resizing preserves normalized object positions and active state.
{
  const game = createGameStub();
  const brick = new Brick(game, 100, 50, 40, 12, '#33ff33', 1);
  brick.resize(0.5, 0.5);
  assert.equal(brick.x, 50);
  assert.equal(brick.y, 25);
  assert.equal(brick.width, 20);
  assert.equal(brick.height, 6);

  const ball = new Ball(game);
  ball.x = 200;
  ball.y = 300;
  ball.isLaunched = true;
  ball.vx = 100;
  ball.vy = -200;
  ball.resize(0.5, 0.5, 200);
  assert.equal(ball.x, 100);
  assert.equal(ball.y, 150);
  assert.equal(ball.isLaunched, true);
  assert.equal(ball.vx, 50);
  assert.equal(ball.vy, -100);
}

console.log('✅ Breakout physics and brick lifecycle pass');
