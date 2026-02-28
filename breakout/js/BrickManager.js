import Brick from "./Brick.js";

export default class BrickManager {
  constructor(game) {
    this.game = game;
    this.bricks = [];
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
    const cols = 10;
    const rows = 8; 
    
    const sidePadding = this.game.width * 0.06;
    const topOffset = this.game.height * 0.10;
    const brickAreaWidth = this.game.width - sidePadding * 2;
    const brickWidth = brickAreaWidth / cols;
    const brickHeight = this.game.height * 0.04;

    // Hämta Data (Karta + Namn)
    const designID = (levelIndex - 1) % 10 + 1;
    const levelData = this.getLevelData(designID); // NY METOD
    const map = levelData.map;
    
    // Spara namnet i spelet så HUD kan visa det
    this.game.currentLevelName = levelData.name;

    console.log(`[SYSTEM] Loading Level ${levelIndex}: ${levelData.name}`);

    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        let hp = map[row][col];
        
        if (levelIndex > 10) {
            if (hp > 0) hp += Math.floor((levelIndex - 1) / 10);
        }

        if (hp > 0) {
            const color = this.getColorForHP(hp);
            const x = sidePadding + col * brickWidth;
            const y = topOffset + row * brickHeight;
            this.bricks.push(new Brick(this.game, x, y, brickWidth, brickHeight, color, hp));
        }
      }
    }
  }

  update(dt) {
    this.bricks.forEach(brick => brick.update(dt));
    this.bricks = this.bricks.filter(b => !b.delete);

    if (this.bricks.length === 0 && this.game.state === 'running') {
        this.game.nextLevel();
    }
  }

  draw(ctx) {
    this.bricks.forEach(brick => brick.draw(ctx));
  }

checkCollision(ball) {
    for (const brick of this.bricks) {
      if (brick.delete) continue;

      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        brick.hit();
        this.game.combo++;
        if (this.game.ui) this.game.ui.onComboUpdate(this.game.combo);

        // --- NY POÄNGFORMEL ---
        const baseScore = 10;
        const comboBonus = this.game.combo * 10; // Mer värt att hålla combo
        
        // Multiball Multiplier! (Ju fler bollar, desto mer poäng)
        // Om du har 1 boll = 1x. 2 bollar = 2x. osv.
        const multiplier = Math.max(1, this.game.balls.length);
        
        const totalPoints = (baseScore + comboBonus) * multiplier;

        // Visa poängen flytande vid blocket
        this.game.addScore(totalPoints, brick.x, brick.y);

        if (brick.hp <= 0) {
             this.game.spawnPowerUp(brick.x + brick.width/2, brick.y);
             this.game.audio.play('brick_explode');
             this.game.particles.explode(ball.x, ball.y, brick.color);
             this.game.shake(0.2, 8);
             if (this.game.ui) this.game.ui.onBrickDestroyed();
        } else {
            brick.color = this.getColorForHP(brick.hp);
            this.game.audio.play('brick_hit');
        }

        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          ball.vx = -ball.vx;
        } else {
          ball.vy = -ball.vy;
        }
        return; 
      }
    }
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
            [3, 4, 3, 4, 3, 3, 4, 3, 4, 3],
            [4, 3, 4, 3, 4, 4, 3, 4, 3, 4],
            [3, 2, 2, 2, 4, 4, 2, 2, 2, 3],
            [3, 2, 1, 1, 1, 1, 1, 1, 2, 3],
            [3, 2, 1, 0, 0, 0, 0, 1, 2, 3],
            [3, 3, 3, 0, 0, 0, 0, 3, 3, 3]
        ]}
    };

    return levels[id] || levels[1];
  }
}