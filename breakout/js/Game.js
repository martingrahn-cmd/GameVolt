import Paddle from './Paddle.js';
import InputHandler from './InputHandler.js';
import BrickManager from './BrickManager.js';
import AudioManager from './AudioManager.js';
import ParticleManager from './ParticleManager.js';
import PowerUp from './PowerUp.js';
import Laser from './Laser.js';
import FloatingText from './FloatingText.js';
import { Ball } from './Ball.js';
import HUD from './HUD.js';
import { isOverdriveCombo } from './Scoring.js';
import { isRankedStartLevel } from './LevelSelect.js';
import {
  EXTRA_BALL_DROP_SCALE,
  LASER_VOLLEY_CAPACITY,
  getPowerUpDropChance,
  consumeLaserVolley,
  restoreNormalDropForSingleBall
} from './PowerUpBalance.js';

export default class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.state = 'menu';
    this.paused = false;
    this.level = 1;
    this.startLevel = 1;
    this.isRankedRun = true;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.overdriveActive = false;
    this.comboPulse = 0;
    this.overdrivePulse = 0;
    this.timeScale = 1.0;
    this.highScore = 0; // Set by UIManager from bo_data

    const savedEffects = localStorage.getItem('bo_fx');
    this.effectsLevel = ['high', 'low', 'off'].includes(savedEffects) ? savedEffects : 'high';
    this.shakeEnabled = localStorage.getItem('bo_shake') !== '0';
    document.body.dataset.fx = this.effectsLevel;

    this.ui = null; // Set by main.js after construction

    // Powerup status
    this.laserActive = false;
    this.laserVolleys = 0;
    this.lastShotTime = 0;

    this.safetyFloorActive = false;
    this.safetyFloorHits = 0;

    this.widePaddleActive = false;
    this.widePaddleTimer = 0;

    this.shakeTime = 0;
    this.shakeMagnitude = 0;

    this.bgImage = new Image();
    this.bgImage.src = "assets/images/grid_bg.png";
    this.scanlineY = 0;
    this.scanlineSpeed = 150;

    this._levelStartTime = 0;

    this.audio = new AudioManager(this);
    this.hud = new HUD(this);
    this.paddle = new Paddle(this);

    this.balls = [];
    this.balls.push(new Ball(this));

    this.bricks = new BrickManager(this);
    this.particles = new ParticleManager(this);
    this.input = new InputHandler(this, canvas);

    this.powerUps = [];
    this.lasers = [];
    this.floatingTexts = [];

    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  get ball() { return this.balls[0]; }

  start(startLevel = 1) {
    const safeStartLevel = Math.max(1, Math.floor(Number(startLevel) || 1));
    this.state = 'running';
    this.paused = false;
    this.score = 0;
    this.level = safeStartLevel;
    this.startLevel = safeStartLevel;
    this.isRankedRun = isRankedStartLevel(safeStartLevel);
    this.lives = 3;
    this.combo = 0;
    this.overdriveActive = false;
    this.comboPulse = 0;
    this.overdrivePulse = 0;
    this.timeScale = 1.0;
    this._levelStartTime = performance.now();

    this.paddle.baseScale = Math.max(0.5, 1.0 - (this.level - 1) * 0.05);
    this.resetPowerUps();
    this.bricks.loadLevel(this.level);

    this.balls = [new Ball(this)];
    this.ball.reset();
    this.announceLevelMechanic();
  }

  resetPowerUps(preserveShield = false) {
    const keepShield = preserveShield && this.safetyFloorActive;
    const shieldHits = this.safetyFloorHits;

    this.powerUps = [];
    this.lasers = [];
    this.floatingTexts = [];

    this.laserActive = false;
    this.laserVolleys = 0;
    this.safetyFloorActive = keepShield;
    this.safetyFloorHits = keepShield ? shieldHits : 0;
    this.widePaddleActive = false;
    this.paddle.setScale(this.paddle.baseScale || 1.0);
  }

  nextLevel() {
    // Notify UI before incrementing level (for achievements)
    var elapsed = (performance.now() - this._levelStartTime) / 1000;
    if (this.ui) this.ui.onLevelCleared(this.level, elapsed);

    this.level++;
    this.audio.play('level_clear');
    this._levelStartTime = performance.now();

    const newScale = Math.max(0.5, 1.0 - (this.level - 1) * 0.05);
    this.paddle.baseScale = newScale;
    this.resetPowerUps(true);

    const levelBonus = 2000;
    this.addScore(levelBonus, this.width / 2, this.height / 2, true);

    this.bricks.loadLevel(this.level);
    this.announceLevelMechanic();

    this.balls.forEach(b => {
        if (b.y < this.height * 0.5) {
            b.y = this.height * 0.6;
            b.vy = Math.abs(b.vy);
        }
        b.speed *= 1.05;
        const currentSpeed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
        b.vx = (b.vx / currentSpeed) * b.speed;
        b.vy = (b.vy / currentSpeed) * b.speed;
    });

    this.timeScale = 0.1;
  }

  completeFinal() {
    if (this.state !== 'running') return;
    const elapsed = (performance.now() - this._levelStartTime) / 1000;
    if (this.ui) this.ui.onLevelCleared(this.level, elapsed);
    this.state = 'victory';
    this.paused = false;
    this.resetCombo();
    if (this.ui) this.ui.showVictory();
  }

  continueEndless() {
    this.state = 'running';
    this.paused = false;
    this.level = 11;
    this.startLevel = 11;
    this.isRankedRun = false;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.overdriveActive = false;
    this.comboPulse = 0;
    this.overdrivePulse = 0;
    this.timeScale = 1;
    this._levelStartTime = performance.now();

    this.paddle.baseScale = Math.max(0.5, 1.0 - (this.level - 1) * 0.05);
    this.resetPowerUps();
    this.bricks.loadLevel(this.level);
    this.balls = [new Ball(this)];
    this.ball.reset();
    this.announceLevelMechanic();
  }

  spawnPowerUp(x, y, dropScale = 1) {
    if (Math.random() < getPowerUpDropChance(dropScale)) {
        const rand = Math.random();
        let type = 'wide';

        if (rand < 0.40) type = 'wide';
        else if (rand < 0.60) type = 'multi';
        else if (rand < 0.80) type = 'laser';
        else if (rand < 0.95) type = 'floor';
        else type = 'life';

        this.powerUps.push(new PowerUp(this, x, y, type));
    }
  }

  activatePowerUp(type) {
    // Notify UI for achievement tracking
    if (this.ui) this.ui.onPowerUpCollected(type);

    if (type === 'life') this.audio.play('extra_life');
    else if (type === 'multi') this.audio.play('multiball');
    else if (type === 'wide') this.audio.play('paddle_wide');
    else if (type === 'laser') this.audio.play('powerup_laser');
    else if (type === 'floor') this.audio.play('powerup_floor');
    else this.audio.play('ball_launch');

    const textX = this.paddle.x + this.paddle.width/2;
    const textY = this.paddle.y - 20;

    if (type === 'wide') {
        this.widePaddleActive = true;
        this.widePaddleTimer = 10.0;
        this.paddle.setScale((this.paddle.baseScale || 1.0) * 1.5);
        this.showFloatingText("+WIDE", textX, textY, "#33ff33");
    }
    else if (type === 'multi') {
        if (this.balls.length >= 3) {
            this.showFloatingText("MULTI MAX", textX, textY, "#00eaff");
            return;
        }
        this.showFloatingText("+MULTIBALL", textX, textY, "#00eaff");

        const sourceBall = this.balls.find(ball => ball.isLaunched) || this.balls[0];
        if (!sourceBall) return;
        const ballsToAdd = 3 - this.balls.length;
        for (let i = 0; i < ballsToAdd; i++) {
            const newBall = new Ball(this, { powerUpDropScale: EXTRA_BALL_DROP_SCALE });
            newBall.x = sourceBall.x; newBall.y = sourceBall.y;
            newBall.isLaunched = true; newBall.speed = sourceBall.speed;
            const angleOffset = (i % 2 === 0) ? -0.5 : 0.5;
            newBall.vx = sourceBall.vx + angleOffset * 150;
            newBall.vy = sourceBall.vy;
            const speed = Math.sqrt(newBall.vx*newBall.vx + newBall.vy*newBall.vy);
            newBall.vx = (newBall.vx / speed) * newBall.speed;
            newBall.vy = (newBall.vy / speed) * newBall.speed;
            this.balls.push(newBall);
        }
        // Notify ball count change
        if (this.ui) this.ui.onBallCountChange(this.balls.length);
    }
    else if (type === 'life') {
        if (this.lives < 5) {
            this.lives++;
            this.showFloatingText("+1 UP", textX, textY, "#ff00ff");
        } else {
            this.showFloatingText("LIFE MAX", textX, textY, "#ff00ff");
        }
    }
    else if (type === 'laser') {
        this.laserActive = true;
        this.laserVolleys = LASER_VOLLEY_CAPACITY;
        this.lastShotTime = 0;
        this.showFloatingText("LASER x12", textX, textY, "#ff0000");
    }
    else if (type === 'floor') {
        this.safetyFloorActive = true;
        this.safetyFloorHits = 0;
        this.showFloatingText("SHIELD READY", textX, textY, "#ffd700");
    }
  }

  shootLaser() {
    if (this.laserActive) {
        const now = performance.now();
        if (now - this.lastShotTime > 300) {
            this.lastShotTime = now;
            this.audio.play('laser_shoot');
            this.lasers.push(new Laser(this.paddle.x + 5, this.paddle.y));
            this.lasers.push(new Laser(this.paddle.x + this.paddle.width - 9, this.paddle.y));
            this.laserVolleys = consumeLaserVolley(this.laserVolleys);
            if (this.laserVolleys === 0) {
                this.laserActive = false;
                this.showFloatingText(
                  "LASER EMPTY",
                  this.paddle.x + this.paddle.width / 2,
                  this.paddle.y - 18,
                  "#ff5555"
                );
            }
        }
    }
  }

  shake(duration, magnitude) {
    if (!this.shakeEnabled || this.effectsLevel === 'off') return;
    if (this.effectsLevel === 'low') magnitude *= 0.4;
    this.shakeTime = duration;
    this.shakeMagnitude = magnitude;
  }

  setEffectsLevel(level) {
    if (!['high', 'low', 'off'].includes(level)) return;
    this.effectsLevel = level;
    localStorage.setItem('bo_fx', level);
    document.body.dataset.fx = level;

    if (level === 'off') {
      this.shakeTime = 0;
      this.particles.clear();
      this.balls.forEach(ball => { ball.trail = []; });
    }
  }

  setShakeEnabled(enabled) {
    this.shakeEnabled = !!enabled;
    localStorage.setItem('bo_shake', this.shakeEnabled ? '1' : '0');
    if (!this.shakeEnabled) this.shakeTime = 0;
  }

  incrementCombo(x = 0, y = 0) {
    const wasActive = this.overdriveActive;
    this.combo++;
    this.comboPulse = 1;
    this.overdriveActive = isOverdriveCombo(this.combo);

    if (this.ui) this.ui.onComboUpdate(this.combo);

    if (!wasActive && this.overdriveActive) {
      this.overdrivePulse = 1;
      this.audio.play('powerup_laser');
      this.showFloatingText('OVERDRIVE x2', this.width / 2, this.height * 0.55, '#ff3dff');
      this.particles.impact(this.width / 2, this.height * 0.48, '#ff3dff', 2);
      this.shake(0.25, 7);
    }

    return this.combo;
  }

  resetCombo() {
    this.combo = 0;
    this.overdriveActive = false;
    this.comboPulse = 0;
  }

  registerPerfectDrift(hitPosition, x, y) {
    const direction = Math.sign(hitPosition) || 1;
    this.paddle.driftFlash = 1;
    this.paddle.driftFlashDirection = direction;
    this.comboPulse = Math.max(this.comboPulse, 0.7);
    this.overdrivePulse = Math.max(this.overdrivePulse, 0.35);
    const feedbackX = Math.max(this.width * 0.15, Math.min(this.width * 0.85, x));
    this.showFloatingText(
      'PERFECT DRIFT',
      feedbackX,
      y - 12,
      '#ff5cff'
    );
    this.particles.impact(x, y, '#ff3dff', 1.6);
    this.shake(0.12, 4);
  }

  addScore(points, x = 0, y = 0, big = false, colorOverride = null) {
    this.score += points;
    if (this.isRankedRun && this.score > this.highScore) {
        this.highScore = this.score;
    }
    // Check score-based achievements
    if (this.ui) this.ui.checkInstantAchievements();

    if (x !== 0 && y !== 0) {
        let text = `+${points}`;
        let color = colorOverride || "#ffffff";
        if (big) { text = `LEVEL CLEARED! +${points}`; color = "#ffff00"; }
        this.showFloatingText(text, x, y, color);
    }
  }

  showFloatingText(text, x, y, color) {
      this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  announceLevelMechanic() {
    if (!this.currentLevelMechanic) return;
    this.showFloatingText(
      this.currentLevelMechanic,
      this.width / 2,
      this.height * 0.62,
      this.bricks.designID === 10 ? '#ff5cff' : '#00eaff'
    );
  }

  loseLife() {
    this.lives--;
    this.shake(0.4, 10);
    this.resetCombo();
    this.resetPowerUps();

    if (this.ui) this.ui.onLifeLost();

    if (this.lives <= 0) {
        this.audio.play('game_over');
        this.state = 'gameover';
        if (this.ui) this.ui.showGameOver();
    } else {
        this.balls = [new Ball(this)];
        this.ball.reset();
        this.timeScale = 1.0;
    }
  }

  continueGame() {
    this.state = 'running';
    this.paused = false;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.overdriveActive = false;
    this.comboPulse = 0;
    this.overdrivePulse = 0;
    this.timeScale = 1.0;
    this._levelStartTime = performance.now();

    this.paddle.baseScale = Math.max(0.5, 1.0 - (this.level - 1) * 0.05);
    this.resetPowerUps();
    this.bricks.loadLevel(this.level);

    this.balls = [new Ball(this)];
    this.ball.reset();
    this.announceLevelMechanic();
  }

  resize(w, h) {
    if (!w || !h) return;

    const oldW = this.width || w;
    const oldH = this.height || h;
    const scaleX = w / oldW;
    const scaleY = h / oldH;
    const paddleCenterRatio = this.paddle
      ? (this.paddle.x + this.paddle.width / 2) / oldW
      : 0.5;

    this.width = w;
    this.height = h;

    if (this.paddle && this.paddle.resize) {
      this.paddle.resize();
      this.paddle.moveTo(paddleCenterRatio * w);
      this.paddle.resetMotionTracking();
    }

    this.balls.forEach(ball => ball.resize(scaleX, scaleY, h));
    this.bricks.resize(scaleX, scaleY);

    this.powerUps.forEach(powerUp => {
      powerUp.x *= scaleX;
      powerUp.y *= scaleY;
    });

    this.lasers.forEach(laser => {
      laser.x *= scaleX;
      laser.y *= scaleY;
    });

    this.particles.particles.forEach(particle => {
      particle.x *= scaleX;
      particle.y *= scaleY;
    });
    this.particles.rings.forEach(ring => {
      ring.x *= scaleX;
      ring.y *= scaleY;
      ring.radius *= Math.min(scaleX, scaleY);
      ring.maxRadius *= Math.min(scaleX, scaleY);
    });

    this.floatingTexts.forEach(text => {
      text.x *= scaleX;
      text.y *= scaleY;
    });

    this.scanlineY *= scaleY;
    this.lastTime = performance.now();
  }

  update(dt) {
    this.hud.update(dt);
    if (this.state !== 'running' || this.paused) return;

    if (this.timeScale < 1.0) {
        this.timeScale += dt * 0.5;
        if (this.timeScale > 1.0) this.timeScale = 1.0;
    }
    const gameDt = dt * this.timeScale;

    if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        if (this.shakeTime < 0) this.shakeTime = 0;
    }

    if (this.widePaddleActive) {
        this.widePaddleTimer -= gameDt;
        if (this.widePaddleTimer <= 0) {
            this.widePaddleActive = false;
            this.paddle.setScale(this.paddle.baseScale || 1.0);
        }
    }

    this.scanlineY += this.scanlineSpeed * gameDt;
    if (this.scanlineY > this.height) this.scanlineY = -50;

    this.input.updateKeyboard(gameDt);
    this.paddle.update(gameDt);

    this.balls.forEach(b => {
        b.update(gameDt);
        if (this.safetyFloorActive) {
            const safetyY = this.height - 15;
            if (b.y + b.radius > safetyY && b.vy > 0) {
                b.y = safetyY - b.radius;
                b.vy = -Math.abs(b.vy);
                this.audio.play('wall_hit');
                this.safetyFloorHits++;
                this.safetyFloorActive = false;
                this.particles.impact(b.x, safetyY, '#ffd700', 1.2);
                this.showFloatingText("SHIELD SAVE", b.x, safetyY - 12, "#ffd700");
            }
        }
    });

    if (this.bricks.consumeFleetBreach()) {
        this.loseLife();
        if (this.state === 'running') {
            this.showFloatingText(
              'FLEET BREACH',
              this.width / 2,
              this.height * 0.62,
              '#ff3344'
            );
        }
        return;
    }

    var prevBallCount = this.balls.length;
    this.balls = this.balls.filter(b => b.y < this.height + 50);
    restoreNormalDropForSingleBall(this.balls);
    // Notify ball count change (balls lost)
    if (this.balls.length !== prevBallCount && this.ui) {
        this.ui.onBallCountChange(this.balls.length);
    }

    if (this.balls.length === 0) {
        this.loseLife();
    }

    this.lasers.forEach(l => l.update(gameDt));
    this.lasers = this.lasers.filter(l => !l.delete);

    this.lasers.forEach(laser => this.bricks.checkLaserCollision(laser));
    this.lasers = this.lasers.filter(laser => !laser.delete);

    this.bricks.update(gameDt);
    this.particles.update(gameDt);

    this.powerUps.forEach(p => p.update(gameDt));
    this.powerUps = this.powerUps.filter(p => !p.delete);
    this.floatingTexts.forEach(t => t.update(gameDt));
    this.floatingTexts = this.floatingTexts.filter(t => !t.delete);

    for (const p of this.powerUps) {
        if (
            p.x < this.paddle.x + this.paddle.width &&
            p.x + p.width > this.paddle.x &&
            p.y < this.paddle.y + this.paddle.height &&
            p.y + p.height > this.paddle.y
        ) {
            this.activatePowerUp(p.type);
            p.delete = true;
            this.addScore(500, p.x, p.y);
        }
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    if (this.shakeTime > 0 && this.state === 'running') {
        const dx = (Math.random() - 0.5) * this.shakeMagnitude;
        const dy = (Math.random() - 0.5) * this.shakeMagnitude;
        ctx.translate(dx, dy);
    }

    if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
        try { ctx.drawImage(this.bgImage, 0, 0, this.width, this.height); }
        catch (e) { ctx.fillStyle = "#1a0b2e"; ctx.fillRect(0,0,this.width,this.height); }
    } else {
        ctx.fillStyle = "#050010"; ctx.fillRect(0,0,this.width,this.height);
    }

    ctx.save();
    const scanColor = this.overdriveActive ? '255, 61, 255' : '0, 234, 255';
    const gradient = ctx.createLinearGradient(0, this.scanlineY, 0, this.scanlineY + 40);
    gradient.addColorStop(0, `rgba(${scanColor}, 0)`);
    gradient.addColorStop(0.5, `rgba(${scanColor}, 0.15)`);
    gradient.addColorStop(1, `rgba(${scanColor}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.scanlineY, this.width, 40);
    ctx.restore();

    if (this.state === 'running') {
        if (this.safetyFloorActive) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ffd700";
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(0, this.height - 10);
            ctx.lineTo(this.width, this.height - 10);
            ctx.stroke();
            ctx.restore();
        }

        this.bricks.draw(ctx);
        this.particles.draw(ctx);
        this.balls.forEach(b => b.draw(ctx));
        this.lasers.forEach(l => l.draw(ctx));
        this.paddle.draw(ctx);
        this.powerUps.forEach(p => p.draw(ctx));
        this.floatingTexts.forEach(t => t.draw(ctx));
    }

    ctx.strokeStyle = "#00eaff";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, this.width - 3, this.height - 3);
    ctx.strokeStyle = "rgba(0, 234, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, this.width - 8, this.height - 8);

    ctx.restore();
    this.hud.draw(ctx);
  }

  gameLoop(t) {
    const dt = (t - this.lastTime) / 1000;
    this.lastTime = t;
    this.update(dt);
    this.draw(this.ctx);
    requestAnimationFrame(tt => this.gameLoop(tt));
  }
}
