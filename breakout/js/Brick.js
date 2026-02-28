export default class Brick {
  constructor(game, x, y, width, height, color, hp) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.maxHP = hp;
    this.hp = hp;
    this.delete = false;

    this.fade = 1;
    this.fadeSpeed = 0.15;
    this._cachedHP = hp;
    this._cache = null;
    this._buildCache();
  }

  _buildCache() {
    var c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    var cx = c.getContext('2d');

    // Base fill
    cx.fillStyle = this.color;
    cx.fillRect(0, 0, this.width, this.height);

    // Bevel
    var b = 3;
    cx.fillStyle = "rgba(255, 255, 255, 0.4)";
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.lineTo(this.width, 0);
    cx.lineTo(this.width - b, b);
    cx.lineTo(b, b);
    cx.lineTo(b, this.height - b);
    cx.lineTo(0, this.height);
    cx.closePath();
    cx.fill();

    cx.fillStyle = "rgba(0, 0, 0, 0.4)";
    cx.beginPath();
    cx.moveTo(this.width, 0);
    cx.lineTo(this.width, this.height);
    cx.lineTo(0, this.height);
    cx.lineTo(b, this.height - b);
    cx.lineTo(this.width - b, this.height - b);
    cx.lineTo(this.width - b, b);
    cx.closePath();
    cx.fill();

    // Scanlines
    cx.fillStyle = "rgba(0, 0, 0, 0.2)";
    for (var i = 0; i < this.height; i += 4) {
      cx.fillRect(b, i, this.width - b * 2, 1);
    }

    // Outline
    cx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    cx.lineWidth = 1;
    cx.strokeRect(0, 0, this.width, this.height);

    this._cache = c;
    this._cachedHP = this.hp;
  }

  hit() {
    this.hp--;
    if (this.hp <= 0) {
      this.startFade = true;
    }
  }

  update(dt) {
    if (this.startFade) {
      this.fade -= this.fadeSpeed;
      if (this.fade <= 0) {
        this.delete = true;
      }
    }
  }

  draw(ctx) {
    if (!this._cache) return;
    ctx.save();
    ctx.globalAlpha = this.fade * 0.9;
    ctx.drawImage(this._cache, this.x, this.y);

    // Glitch overlay for damaged bricks
    if (this.hp < this.maxHP && this.hp > 0) {
      ctx.fillStyle = "#ffffff";
      var dmg = this.maxHP - this.hp;
      var count = dmg === 1 ? 2 : 8;
      var maxS = dmg === 1 ? 8 : 15;
      for (var i = 0; i < count; i++) {
        var gw = Math.random() * maxS + 2;
        var gh = Math.random() * 3 + 1;
        ctx.fillRect(
          this.x + 3 + Math.random() * (this.width - 6 - gw),
          this.y + 3 + Math.random() * (this.height - 6 - gh),
          gw, gh
        );
      }
    }

    ctx.restore();
  }
}