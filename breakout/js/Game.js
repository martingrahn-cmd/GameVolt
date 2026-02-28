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

export default class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.state = 'menu';
    this.paused = false;
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.timeScale = 1.0;
    this.highScore = 0; // Set by UIManager from bo_data

    this.ui = null; // Set by main.js after construction

    // Powerup status
    this.laserActive = false;
    this.laserTimer = 0;
    this.lastShotTime = 0;

    this.safetyFloorActive = false;
    this.safetyFloorTimer = 0;
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

  start() {
    this.state = 'running';
    this.paused = false;
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.combo = 0;
    this.timeScale = 1.0;
    this._levelStartTime = performance.now();

    this.resetPowerUps();
    this.bricks.loadLevel(this.level);

    this.balls = [new Ball(this)];
    this.ball.reset();
  }

  resetPowerUps() {
    this.powerUps = [];
    this.lasers = [];
    this.floatingTexts = [];

    this.laserActive = false;
    this.safetyFloorActive = false;
    this.widePaddleActive = false;
    this.paddle.setScale(1.0);
  }

  nextLevel() {
    // Notify UI before incrementing level (for achievements)
    var elapsed = (performance.now() - this._levelStartTime) / 1000;
    if (this.ui) this.ui.onLevelCleared(this.level, elapsed);

    this.level++;
    this.audio.play('level_clear');
    this._levelStartTime = performance.now();

    const levelBonus = 2000;
    this.addScore(levelBonus, this.width / 2, this.height / 2, true);

    const newScale = Math.max(0.5, 1.0 - (this.level - 1) * 0.05);
    this.paddle.baseScale = newScale;
    this.paddle.setScale(newScale);

    this.powerUps = [];
    this.lasers = [];

    this.bricks.loadLevel(this.level);

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

  spawnPowerUp(x, y) {
    if (Math.random() < 0.12) {
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
        this.paddle.setScale(1.5);
        this.showFloatingText("+WIDE", textX, textY, "#33ff33");
    }
    else if (type === 'multi') {
        if (this.balls.length >= 3) {
            this.addScore(500, textX, textY);
            return;
        }
        this.showFloatingText("+MULTIBALL", textX, textY, "#00eaff");

        const sourceBall = this.balls[0];
        if (!sourceBall) return;
        for (let i = 0; i < 2; i++) {
            const newBall = new Ball(this);
            newBall.x = sourceBall.x; newBall.y = sourceBall.y;
            newBall.isLaunched = true; newBall.speed = sourceBall.speed;
            const angleOffset = (i === 0) ? -0.5 : 0.5;
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
        this.lives++;
        if (this.lives > 5) this.lives = 5;
        this.showFloatingText("+1 UP", textX, textY, "#ff00ff");
        this.addScore(1000, textX, textY);
    }
    else if (type === 'laser') {
        this.laserActive = true;
        this.laserTimer = 10.0;
        this.showFloatingText("LASER!", textX, textY, "#ff0000");
    }
    else if (type === 'floor') {
        this.safetyFloorActive = true;
        this.safetyFloorTimer = 10.0;
        this.safetyFloorHits = 0;
        this.showFloatingText("SHIELD", textX, textY, "#ffd700");
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
        }
    }
  }

  shake(duration, magnitude) {
    this.shakeTime = duration;
    this.shakeMagnitude = magnitude;
  }

  addScore(points, x = 0, y = 0, big = false) {
    this.score += points;
    if (this.score > this.highScore) {
        this.highScore = this.score;
    }
    // Check score-based achievements
    if (this.ui) this.ui.checkInstantAchievements();

    if (x !== 0 && y !== 0) {
        let text = `+${points}`;
        let color = "#ffffff";
        if (big) { text = `LEVEL CLEARED! +${points}`; color = "#ffff00"; }
        this.showFloatingText(text, x, y, color);
    }
  }

  showFloatingText(text, x, y, color) {
      this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  loseLife() {
    this.lives--;
    this.shake(0.4, 10);
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
    this.timeScale = 1.0;
    this._levelStartTime = performance.now();

    this.paddle.setScale(1.0);
    this.resetPowerUps();
    this.bricks.loadLevel(this.level);

    this.balls = [new Ball(this)];
    this.ball.reset();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    if (this.paddle.resize) this.paddle.resize();
    if (this.state === 'running') {
       this.balls = [new Ball(this)];
       this.ball.reset();
       this.bricks.loadLevel(this.level);
    }
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

    if (this.laserActive) {
        this.laserTimer -= gameDt;
        if (this.laserTimer <= 0) this.laserActive = false;
    }

    if (this.safetyFloorActive) {
        this.safetyFloorTimer -= gameDt;
        if (this.safetyFloorTimer <= 0) this.safetyFloorActive = false;
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
                if (this.safetyFloorHits >= 1) this.safetyFloorActive = false;
            }
        }
    });

    var prevBallCount = this.balls.length;
    this.balls = this.balls.filter(b => b.y < this.height + 50);
    // Notify ball count change (balls lost)
    if (this.balls.length !== prevBallCount && this.ui) {
        this.ui.onBallCountChange(this.balls.length);
    }

    if (this.balls.length === 0) {
        this.loseLife();
    }

    this.lasers.forEach(l => l.update(gameDt));
    this.lasers = this.lasers.filter(l => !l.delete);

    for (const l of this.lasers) {
        for (const brick of this.bricks.bricks) {
            if (!brick.delete &&
                l.x > brick.x && l.x < brick.x + brick.width &&
                l.y > brick.y && l.y < brick.y + brick.height) {

                l.delete = true;
                brick.hit();
                this.addScore(5, brick.x, brick.y);
                if (brick.hp <= 0) {
                    this.spawnPowerUp(brick.x + brick.width/2, brick.y);
                    this.particles.explode(brick.x, brick.y, brick.color);
                    this.audio.play('brick_hit');
                    // Achievement: brick destroyed by laser
                    if (this.ui) {
                        this.ui.onBrickDestroyed();
                        this.ui.onLaserBrickDestroyed();
                    }
                }
                break;
            }
        }
    }

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
    const gradient = ctx.createLinearGradient(0, this.scanlineY, 0, this.scanlineY + 40);
    gradient.addColorStop(0, "rgba(0, 234, 255, 0)");
    gradient.addColorStop(0.5, "rgba(0, 234, 255, 0.15)");
    gradient.addColorStop(1, "rgba(0, 234, 255, 0)");
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
