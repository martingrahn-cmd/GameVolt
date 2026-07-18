import Brick from "./Brick.js";
import { getBrickHitScore, getLaserHitScore } from "./Scoring.js";
import {
  getBrickOptions,
  getLevelMechanic,
  rotateVelocity
} from "./BrickMechanics.js";
import {
  FINAL_BOSS_BONUS,
  FINAL_SENTINEL_COUNT,
  FINAL_VICTORY_DELAY,
  getFinalCoreHP,
  getFinalCoreStage,
  getFinalStageMotion
} from "./FinalBoss.js";

export default class BrickManager {
  constructor(game) {
    this.game = game;
    this.bricks = [];
    this.designID = 1;
    this.mechanic = getLevelMechanic(1);
    this.clearedRows = new Set();
    this.switchesRemaining = 0;
    this.formationReturns = 0;
    this.lastFormationDropTime = -Infinity;
    this.fleetBreached = false;
    this.godPhase = 'inactive';
    this.godSentinelsRemaining = 0;
    this.godCore = null;
    this.godCoreStage = 0;
    this.finalVictoryTimer = 0;
    this.finalVictoryTriggered = false;
  }

  getColorForHP(hp) {
    switch(hp) {
        case 1: return "#33ff33"; // Grön
        case 2: return "#ff9933"; // Orange
        case 3: return "#ff4444"; // Röd
        case 4: return "#ff00ff"; // Lila
        default: return "#ffffff"; 
    }
  }

  loadLevel(levelIndex) {
    this.bricks = [];
    this.clearedRows = new Set();
    this.formationReturns = 0;
    this.lastFormationDropTime = -Infinity;
    this.fleetBreached = false;
    this.godPhase = 'inactive';
    this.godSentinelsRemaining = 0;
    this.godCore = null;
    this.godCoreStage = 0;
    this.finalVictoryTimer = 0;
    this.finalVictoryTriggered = false;
    const cols = 10;
    const designID = (levelIndex - 1) % 10 + 1;
    
    const sidePadding = this.game.width * 0.06;
    const topOffset = this.game.height * (designID === 10 ? 0.16 : 0.10);
    const brickAreaWidth = this.game.width - sidePadding * 2;
    const brickWidth = brickAreaWidth / cols;
    const brickHeight = this.game.height * 0.04;

    // Hämta Data (Karta + Namn)
    this.designID = designID;
    this.mechanic = getLevelMechanic(designID);
    const levelData = this.getLevelData(designID);
    const map = levelData.map;
    
    this.game.currentLevelName = levelData.name;
    this.game.currentLevelMechanic = this.mechanic.label;
    this.game.currentLevelMechanicDescription = this.mechanic.description;

    console.log(`[SYSTEM] Loading Level ${levelIndex}: ${levelData.name}`);

    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        let hp = map[row][col];
        
        if (levelIndex > 10) {
            if (hp > 0) hp += Math.floor((levelIndex - 1) / 10);
        }

        if (hp > 0) {
            const x = sidePadding + col * brickWidth;
            const y = topOffset + row * brickHeight;
            const options = getBrickOptions(designID, row, col, hp, brickWidth);
            const color = options.isGodSentinel
              ? '#00eaff'
              : this.getColorForHP(hp);
            this.bricks.push(new Brick(
              this.game,
              x,
              y,
              brickWidth,
              brickHeight,
              color,
              hp,
              options
            ));
        }
      }
    }

    this.switchesRemaining = this.bricks.filter(brick => brick.isSwitch).length;

    if (designID === 10) {
      const coreHP = getFinalCoreHP(levelIndex);
      const core = new Brick(
        this.game,
        sidePadding + brickWidth * 4,
        topOffset + brickHeight * 2,
        brickWidth * 2,
        brickHeight * 2,
        '#ff00ff',
        coreHP,
        {
          row: 2,
          col: 4.5,
          kind: 'god-core',
          locked: true,
          isGodCore: true
        }
      );
      this.bricks.push(core);
      this.godCore = core;
      this.godPhase = 'shields';
      this.godSentinelsRemaining = this.bricks.filter(
        brick => brick.isGodSentinel
      ).length;
    }
  }

  update(dt) {
    if (this.finalVictoryTimer > 0) {
      this.finalVictoryTimer = Math.max(0, this.finalVictoryTimer - dt);
      if (this.finalVictoryTimer === 0 && !this.finalVictoryTriggered) {
        this.finalVictoryTriggered = true;
        if (this.game.level === 10) {
          this.game.completeFinal();
        } else {
          this.game.nextLevel();
        }
      }
    }

    this.bricks.forEach(brick => brick.update(dt));
    this.bricks = this.bricks.filter(b => !b.delete);

    if (this.bricks.length === 0 && this.game.state === 'running') {
        if (this.designID === 10 && this.godPhase === 'defeated') return;
        this.game.nextLevel();
    }
  }

  draw(ctx) {
    this.bricks.forEach(brick => brick.draw(ctx));
  }

  resize(scaleX, scaleY) {
    this.bricks.forEach(brick => brick.resize(scaleX, scaleY));
  }

  checkCollision(ball) {
    for (const brick of this.bricks) {
      if (brick.delete || brick.destroyed) continue;

      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        const hitResult = brick.hit();
        if (hitResult.blocked) {
          this._blockedImpact(brick, ball.x, ball.y);
          this._resolveBallCollision(ball, brick);
          return true;
        }
        if (!hitResult.didHit) continue;

        this.game.incrementCombo(brick.x + brick.width / 2, brick.y + brick.height / 2);

        // Every ball earns its own hits. There is deliberately no additional
        // active-ball multiplier, which previously rewarded multiball twice.
        const totalPoints = getBrickHitScore(this.game.combo, this.game.overdriveActive);
        this.game.addScore(
          totalPoints,
          brick.x,
          brick.y,
          false,
          this.game.overdriveActive ? '#ff5cff' : null
        );

        this._finishDirectHit(brick, hitResult, {
          source: 'ball',
          x: ball.x,
          y: ball.y,
          dropScale: typeof ball.powerUpDropScale === 'number'
            ? ball.powerUpDropScale
            : 1
        });
        this._resolveBallCollision(ball, brick);
        this._applyPrismDeflection(ball, brick);

        return true;
      }
    }
    return false;
  }

  checkLaserCollision(laser) {
    for (const brick of this.bricks) {
      if (brick.delete || brick.destroyed) continue;

      if (
        laser.x + laser.width > brick.x &&
        laser.x < brick.x + brick.width &&
        laser.y + laser.height > brick.y &&
        laser.y < brick.y + brick.height
      ) {
        laser.delete = true;
        const hitResult = brick.hit();

        if (hitResult.blocked) {
          this._blockedImpact(brick, laser.x, laser.y);
          return true;
        }
        if (!hitResult.didHit) return true;

        const laserScore = getLaserHitScore(this.game.overdriveActive);
        this.game.addScore(
          laserScore,
          brick.x,
          brick.y,
          false,
          this.game.overdriveActive ? '#ff5cff' : null
        );
        this._finishDirectHit(brick, hitResult, {
          source: 'laser',
          x: laser.x,
          y: laser.y,
          dropScale: 1
        });
        return true;
      }
    }
    return false;
  }

  _finishDirectHit(brick, hitResult, context) {
    const intensity = hitResult.destroyed ? 1.25 : (hitResult.armorBroken ? 1 : 0.7);
    this.game.particles.impact(context.x, context.y, brick.color, intensity);

    if (hitResult.destroyed) {
      if (!brick.isGodCore) {
        this.game.spawnPowerUp(
          brick.x + brick.width / 2,
          brick.y,
          context.dropScale
        );
      }
      this.game.audio.play('brick_explode');
      this.game.particles.explode(context.x, context.y, brick.color);
      this.game.shake(0.2, 8);
      this._registerDestroyedBrick(brick, context.source);
    } else {
      this._updateBrickColor(brick);
      this.game.audio.play('brick_hit');
      if (hitResult.armorBroken) {
        this._showText('ARMOR BREAK', brick, '#e8f7ff');
      }
      if (brick.isGodCore) this._updateGodCorePhase(brick);
    }

    this._applyLinkedDamage(brick);
    if (brick.kind === 'bomb' && hitResult.destroyed) {
      this._detonateBrick(brick);
    }
  }

  _registerDestroyedBrick(brick, source = 'indirect') {
    if (this.game.ui) {
      this.game.ui.onBrickDestroyed();
      if (source === 'laser' && this.game.ui.onLaserBrickDestroyed) {
        this.game.ui.onLaserBrickDestroyed();
      }
    }

    if (brick.isSwitch) {
      this.switchesRemaining = Math.max(0, this.switchesRemaining - 1);
      if (this.switchesRemaining === 0) {
        let unlocked = 0;
        this.bricks.forEach(candidate => {
          if (candidate.unlock()) unlocked++;
        });
        if (unlocked > 0) {
          this._showText('GATES OPEN', brick, '#ffd700');
          this.game.audio.play('level_clear');
          this.game.shake(0.18, 5);
        }
      }
    }

    if (brick.isGodSentinel) {
      this._registerGodSentinelDestroyed(brick);
    }

    if (brick.isGodCore) {
      this._defeatNeonGod(brick);
    }

    if (this.designID === 2) {
      this._rewardClearedRow(brick.row);
    }
  }

  _applyLinkedDamage(brick) {
    if (!brick.linkId) return;
    const twin = this.bricks.find(candidate =>
      candidate !== brick &&
      !candidate.delete &&
      !candidate.destroyed &&
      candidate.linkId === brick.linkId
    );
    if (!twin) return;

    const result = this._damageIndirect(twin, '#00eaff');
    if (result.didHit) {
      this.game.particles.impact(
        brick.x + brick.width / 2,
        brick.y + brick.height / 2,
        '#00eaff',
        0.55
      );
      if (result.destroyed) {
        this.game.addScore(25);
        this._showText('LINK +25', twin, '#00eaff');
      }
    }
  }

  _detonateBrick(sourceBrick) {
    let chainScore = 0;
    const nearby = this.bricks.filter(candidate =>
      candidate !== sourceBrick &&
      !candidate.delete &&
      !candidate.destroyed &&
      Math.abs(candidate.row - sourceBrick.row) <= 1 &&
      Math.abs(candidate.col - sourceBrick.col) <= 1
    );

    nearby.forEach(candidate => {
      const result = this._damageIndirect(candidate, '#ff5cff');
      if (result.destroyed) chainScore += 25;
    });

    if (chainScore > 0) {
      this.game.addScore(chainScore);
      this._showText(`BLAST +${chainScore}`, sourceBrick, '#ff5cff');
    } else {
      this._showText('BLAST', sourceBrick, '#ff5cff');
    }
    this.game.shake(0.24, 9);
  }

  _damageIndirect(brick, effectColor) {
    const hitResult = brick.hit();
    if (hitResult.blocked || !hitResult.didHit) return hitResult;

    this.game.particles.impact(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      effectColor,
      hitResult.destroyed ? 1 : 0.55
    );

    if (hitResult.destroyed) {
      this.game.particles.explode(
        brick.x + brick.width / 2,
        brick.y + brick.height / 2,
        brick.color
      );
      this._registerDestroyedBrick(brick, 'indirect');
    } else {
      this._updateBrickColor(brick);
    }
    return hitResult;
  }

  _rewardClearedRow(row) {
    if (this.clearedRows.has(row)) return;
    const hasLivingBrick = this.bricks.some(brick =>
      brick.row === row && !brick.destroyed && !brick.delete
    );
    if (hasLivingBrick) return;

    this.clearedRows.add(row);
    const source = this.bricks.find(brick => brick.row === row);
    this.game.addScore(250);
    if (source) this._showText('ROW CHAIN +250', source, '#00eaff');
  }

  _blockedImpact(brick, x, y) {
    const isGodCore = brick.isGodCore;
    const color = isGodCore ? '#ff3dff' : '#ffd700';
    this.game.particles.impact(x, y, color, isGodCore ? 1 : 0.7);
    this.game.audio.play('wall_hit');
    this._showText(isGodCore ? 'CORE SHIELDED' : 'LOCKED', brick, color);
  }

  _resolveBallCollision(ball, brick) {
    const overlapLeft = (ball.x + ball.radius) - brick.x;
    const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
    const overlapTop = (ball.y + ball.radius) - brick.y;
    const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      ball.x = brick.x - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    } else if (minOverlap === overlapRight) {
      ball.x = brick.x + brick.width + ball.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (minOverlap === overlapTop) {
      ball.y = brick.y - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    } else {
      ball.y = brick.y + brick.height + ball.radius;
      ball.vy = Math.abs(ball.vy);
    }
  }

  _applyPrismDeflection(ball, brick) {
    let direction = brick.prismDirection;
    let angle = 14;
    if (brick.isGodCore && this.godCoreStage >= 3) {
      direction = ball.x < brick.x + brick.width / 2 ? -1 : 1;
      angle = 18;
    }
    if (!direction) return;
    const deflected = rotateVelocity(
      ball.vx,
      ball.vy,
      direction * angle
    );
    ball.vx = deflected.vx;
    ball.vy = deflected.vy;
    this._showText(
      direction < 0 ? 'PRISM ↙' : 'PRISM ↘',
      brick,
      '#ffffff'
    );
  }

  _showText(text, brick, color) {
    if (!this.game.showFloatingText) return;
    this.game.showFloatingText(
      text,
      brick.x + brick.width / 2,
      brick.y,
      color
    );
  }

  onPaddleHit() {
    if (this.designID !== 7) return;
    const now = performance.now();
    if (now - this.lastFormationDropTime < 250) return;

    this.lastFormationDropTime = now;
    this.formationReturns++;
    const distance = this.game.height * 0.012;
    const living = this.bricks.filter(brick => !brick.delete && !brick.destroyed);
    living.forEach(brick => brick.shiftDown(distance));

    if (this.formationReturns === 1 || this.formationReturns % 4 === 0) {
      const source = living[0];
      if (source) this._showText('FLEET ↓', source, '#ff5cff');
    }

    const lowestEdge = living.reduce(
      (lowest, brick) => Math.max(lowest, brick.y + brick.height),
      0
    );
    if (lowestEdge >= this.game.paddle.y - this.game.paddle.height * 3) {
      living.forEach(brick => brick.resetVerticalPosition());
      this.fleetBreached = true;
      this.game.shake(0.35, 10);
    }
  }

  consumeFleetBreach() {
    if (!this.fleetBreached) return false;
    this.fleetBreached = false;
    return true;
  }

  _updateBrickColor(brick) {
    if (brick.isGodCore) {
      const stage = getFinalCoreStage(brick.hp, brick.maxHP);
      const colors = {
        1: '#b026ff',
        2: '#ff00ff',
        3: '#ff3344'
      };
      brick.setColor(colors[stage]);
      return;
    }
    if (brick.isGodSentinel) {
      brick.setColor('#00eaff');
      return;
    }
    brick.setColor(this.getColorForHP(brick.hp));
  }

  _registerGodSentinelDestroyed(brick) {
    if (this.godPhase !== 'shields') return;
    this.godSentinelsRemaining = Math.max(0, this.godSentinelsRemaining - 1);
    this._showText(
      this.godSentinelsRemaining > 0
        ? `SHIELDS ${this.godSentinelsRemaining}/${FINAL_SENTINEL_COUNT}`
        : 'SHIELDS DOWN',
      brick,
      '#00eaff'
    );

    if (this.godSentinelsRemaining === 0 && this.godCore) {
      this.godPhase = 'core';
      this.godCoreStage = 1;
      this.godCore.unlock();
      const motion = getFinalStageMotion(1, this.godCore.width / 2);
      this.godCore.setMotion(motion.amplitude, motion.speed);
      this._updateBrickColor(this.godCore);
      this._showText('CORE EXPOSED', this.godCore, '#ff5cff');
      this.game.audio.play('level_clear');
      this.game.particles.impact(
        this.godCore.x + this.godCore.width / 2,
        this.godCore.y + this.godCore.height / 2,
        '#ff3dff',
        2
      );
      this.game.shake(0.32, 10);
    }
  }

  _updateGodCorePhase(core) {
    if (this.godPhase !== 'core' || core.destroyed) return;
    const nextStage = getFinalCoreStage(core.hp, core.maxHP);
    if (nextStage <= this.godCoreStage) return;

    this.godCoreStage = nextStage;
    const motion = getFinalStageMotion(nextStage, core.width / 2);
    core.setMotion(motion.amplitude, motion.speed);
    core.prismDirection = nextStage >= 3 ? 1 : 0;
    this._updateBrickColor(core);

    this._showText(
      nextStage === 2 ? 'CORE OVERLOAD' : 'FINAL FORM',
      core,
      nextStage === 2 ? '#ff5cff' : '#ff3344'
    );
    this.game.particles.impact(
      core.x + core.width / 2,
      core.y + core.height / 2,
      nextStage === 2 ? '#ff5cff' : '#ff3344',
      nextStage === 2 ? 1.8 : 2.4
    );
    this.game.shake(0.3, nextStage === 2 ? 8 : 12);
  }

  _defeatNeonGod(core) {
    if (this.godPhase === 'defeated') return;
    this.godPhase = 'defeated';
    this.finalVictoryTimer = FINAL_VICTORY_DELAY;
    this.game.addScore(FINAL_BOSS_BONUS);
    this._showText(`NEON GOD DOWN +${FINAL_BOSS_BONUS}`, core, '#ffff00');
    this.game.audio.play('level_clear');
    this.game.shake(0.5, 15);
    this.game.balls.forEach(ball => {
      ball.isLaunched = false;
      ball.vx = 0;
      ball.vy = 0;
    });
    this.game.lasers = [];
    this.game.powerUps = [];

    let effectIndex = 0;
    this.bricks.forEach(brick => {
      if (brick === core || brick.destroyed || brick.delete) return;
      if (!brick.forceDestroy()) return;
      if (this.game.ui) this.game.ui.onBrickDestroyed();
      if (effectIndex % 3 === 0) {
        this.game.particles.explode(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          brick.color
        );
      }
      effectIndex++;
    });
  }

  getBossStatus() {
    if (this.designID !== 10 || this.godPhase === 'inactive') return null;
    if (this.godPhase === 'shields') {
      return {
        phase: 'shields',
        label: `NEON GOD // SHIELDS ${this.godSentinelsRemaining}/${FINAL_SENTINEL_COUNT}`,
        current: this.godSentinelsRemaining,
        max: FINAL_SENTINEL_COUNT,
        color: '#00eaff'
      };
    }
    if (this.godPhase === 'defeated') {
      return {
        phase: 'defeated',
        label: 'NEON GOD // DEFEATED',
        current: 0,
        max: 1,
        color: '#ffff00'
      };
    }
    return {
      phase: 'core',
      label: `NEON GOD // CORE ${this.godCore.hp}/${this.godCore.maxHP}`,
      current: this.godCore.hp,
      max: this.godCore.maxHP,
      color: this.godCoreStage >= 3 ? '#ff3344' : '#ff3dff'
    };
  }

  // --- LEVEL DATA (Karta + Namn) ---
  getLevelData(id) {
    // Definiera kartor och namn
    const levels = {
        1: { name: "THE ARROW", map: [
            [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
        ]},
        2: { name: "NEON STRIPES", map: [
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]},
        3: { name: "THE PILLARS", map: [
            [3, 0, 2, 0, 3, 3, 0, 2, 0, 3],
            [3, 0, 2, 0, 2, 2, 0, 2, 0, 3],
            [3, 0, 2, 0, 1, 1, 0, 2, 0, 3],
            [2, 0, 1, 0, 1, 1, 0, 1, 0, 2],
            [2, 0, 1, 0, 0, 0, 0, 1, 0, 2]
        ]},
        4: { name: "CHECKMATE", map: [
            [3, 0, 3, 0, 3, 3, 0, 3, 0, 3],
            [0, 2, 0, 2, 0, 0, 2, 0, 2, 0],
            [2, 0, 2, 0, 2, 2, 0, 2, 0, 2],
            [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 1, 0, 1, 0, 1]
        ]},
        5: { name: "THE BUNKER", map: [
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [3, 0, 1, 1, 1, 1, 1, 1, 0, 3],
            [3, 0, 1, 1, 1, 1, 1, 1, 0, 3],
            [3, 0, 0, 0, 0, 0, 0, 0, 0, 3]
        ]},
        6: { name: "X-FACTOR", map: [
            [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [0, 2, 0, 0, 0, 0, 0, 0, 2, 0],
            [0, 0, 2, 0, 0, 0, 0, 2, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 3, 3, 1, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0]
        ]},
        7: { name: "INVADERS", map: [
            [0, 0, 3, 0, 0, 0, 0, 3, 0, 0],
            [0, 0, 3, 3, 3, 3, 3, 3, 0, 0],
            [0, 3, 3, 2, 2, 2, 2, 3, 3, 0],
            [3, 3, 2, 1, 1, 1, 1, 2, 3, 3],
            [3, 0, 2, 0, 0, 0, 0, 2, 0, 3],
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0]
        ]},
        8: { name: "DIAMOND CUT", map: [
            [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
            [0, 0, 0, 3, 2, 2, 3, 0, 0, 0],
            [0, 0, 3, 2, 1, 1, 2, 3, 0, 0],
            [0, 3, 2, 1, 0, 0, 1, 2, 3, 0],
            [0, 0, 3, 2, 1, 1, 2, 3, 0, 0],
            [0, 0, 0, 3, 2, 2, 3, 0, 0, 0]
        ]},
        9: { name: "THE MAZE", map: [
            [3, 3, 3, 3, 0, 0, 3, 3, 3, 3],
            [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [3, 0, 2, 2, 2, 2, 2, 2, 0, 3],
            [3, 0, 2, 0, 0, 0, 0, 2, 0, 3],
            [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
            [3, 3, 3, 3, 0, 0, 3, 3, 3, 3]
        ]},
        10: { name: "NEON GOD", map: [
            [3, 4, 3, 0, 0, 0, 0, 3, 4, 3],
            [4, 3, 3, 2, 0, 0, 2, 3, 3, 4],
            [3, 2, 2, 0, 0, 0, 0, 2, 2, 3],
            [3, 2, 1, 0, 0, 0, 0, 1, 2, 3],
            [3, 4, 1, 1, 0, 0, 1, 1, 4, 3],
            [3, 3, 2, 1, 0, 0, 1, 2, 3, 3]
        ]}
    };

    return levels[id] || levels[1];
  }
}
