export default class Brick {
  constructor(game, x, y, width, height, color, hp, options = {}) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.originY = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.maxHP = hp;
    this.hp = hp;
    this.row = options.row ?? 0;
    this.col = options.col ?? 0;
    this.kind = options.kind || 'normal';
    this.armor = Math.max(0, options.armor || 0);
    this.linkId = options.linkId || null;
    this.locked = !!options.locked;
    this.isSwitch = !!options.isSwitch;
    this.isGodSentinel = !!options.isGodSentinel;
    this.isGodCore = !!options.isGodCore;
    this.moveAmplitude = options.moveAmplitude || 0;
    this.moveSpeed = options.moveSpeed || 0;
    this.movePhase = options.movePhase || 0;
    this.prismDirection = options.prismDirection || 0;
    this.elapsed = 0;
    this.delete = false;
    this.destroyed = false;

    this.fade = 1;
    this.fadeDuration = 0.12;
    this._cachedHP = hp;
    this._cachedArmor = this.armor;
    this._cachedLocked = this.locked;
    this._cache = null;
    this._buildCache();
  }

  _buildCache() {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(this.width));
    c.height = Math.max(1, Math.ceil(this.height));
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

    this._drawMechanicMarker(cx);

    // HP readability: remaining hits are encoded with high-contrast energy
    // cells, so brick strength is readable without relying on color alone.
    if (this.hp <= 4) {
      var pipCount = Math.max(1, this.hp);
      var pipGap = 2;
      var pipWidth = Math.min(9, (this.width - 12 - (pipCount - 1) * pipGap) / pipCount);
      var pipHeight = Math.max(2, Math.min(4, this.height * 0.14));
      var pipTotal = pipCount * pipWidth + (pipCount - 1) * pipGap;
      var pipStartX = (this.width - pipTotal) / 2;
      var pipY = this.height - pipHeight - 4;

      cx.fillStyle = "rgba(0, 0, 0, 0.65)";
      cx.fillRect(pipStartX - 2, pipY - 2, pipTotal + 4, pipHeight + 4);
      cx.fillStyle = "rgba(255, 255, 255, 0.9)";
      for (var pip = 0; pip < pipCount; pip++) {
        cx.fillRect(pipStartX + pip * (pipWidth + pipGap), pipY, pipWidth, pipHeight);
      }
    } else {
      cx.fillStyle = "rgba(0, 0, 0, 0.7)";
      cx.fillRect(this.width / 2 - 12, this.height / 2 - 8, 24, 16);
      cx.fillStyle = "#ffffff";
      cx.font = 'bold 11px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(String(this.hp), this.width / 2, this.height / 2 + 1);
    }

    // Outline
    cx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    cx.lineWidth = 1;
    cx.strokeRect(0, 0, this.width, this.height);

    this._cache = c;
    this._cachedHP = this.hp;
    this._cachedArmor = this.armor;
    this._cachedLocked = this.locked;
  }

  _drawMechanicMarker(cx) {
    const w = this.width;
    const h = this.height;
    const midX = w / 2;
    const midY = h / 2;

    if (this.armor > 0) {
      cx.strokeStyle = '#e8f7ff';
      cx.lineWidth = Math.max(2, Math.min(4, h * 0.14));
      cx.strokeRect(3, 3, w - 6, h - 6);
      cx.fillStyle = '#ffffff';
      const plate = Math.max(3, Math.min(6, h * 0.2));
      cx.fillRect(3, 3, plate, plate);
      cx.fillRect(w - plate - 3, 3, plate, plate);
    }

    if (this.kind === 'god-sentinel') {
      const radius = Math.max(5, Math.min(9, h * 0.32));
      cx.fillStyle = '#12001f';
      cx.strokeStyle = '#ff8cff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(midX, midY, radius, 0, Math.PI * 2);
      cx.fill();
      cx.stroke();
      cx.strokeStyle = '#00eaff';
      cx.beginPath();
      cx.moveTo(midX - radius - 3, midY);
      cx.lineTo(midX + radius + 3, midY);
      cx.moveTo(midX, midY - radius - 3);
      cx.lineTo(midX, midY + radius + 3);
      cx.stroke();
    } else if (this.kind === 'god-core') {
      const coreRadius = Math.max(8, Math.min(16, h * 0.34));
      cx.fillStyle = '#100018';
      cx.strokeStyle = '#ff8cff';
      cx.lineWidth = 3;
      cx.beginPath();
      cx.moveTo(midX, midY - coreRadius);
      cx.lineTo(midX + coreRadius * 1.5, midY);
      cx.lineTo(midX, midY + coreRadius);
      cx.lineTo(midX - coreRadius * 1.5, midY);
      cx.closePath();
      cx.fill();
      cx.stroke();
      cx.strokeStyle = '#00eaff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(midX - coreRadius * 0.72, midY);
      cx.lineTo(midX + coreRadius * 0.72, midY);
      cx.stroke();
    } else if (this.kind === 'linked') {
      cx.strokeStyle = '#00eaff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(midX - 8, midY);
      cx.lineTo(midX + 8, midY);
      cx.stroke();
      cx.fillStyle = '#ffffff';
      cx.fillRect(midX - 10, midY - 2, 4, 4);
      cx.fillRect(midX + 6, midY - 2, 4, 4);
    } else if (this.kind === 'bomb') {
      const radius = Math.max(4, Math.min(8, h * 0.3));
      cx.fillStyle = '#160018';
      cx.beginPath();
      cx.arc(midX, midY + 1, radius, 0, Math.PI * 2);
      cx.fill();
      cx.strokeStyle = '#ff5cff';
      cx.lineWidth = 2;
      cx.stroke();
      cx.beginPath();
      cx.moveTo(midX + radius * 0.5, midY - radius * 0.6);
      cx.lineTo(midX + radius + 3, midY - radius - 1);
      cx.stroke();
    } else if (this.kind === 'moving') {
      cx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      cx.beginPath();
      cx.moveTo(midX - 10, midY);
      cx.lineTo(midX - 5, midY - 4);
      cx.lineTo(midX - 5, midY + 4);
      cx.closePath();
      cx.fill();
      cx.beginPath();
      cx.moveTo(midX + 10, midY);
      cx.lineTo(midX + 5, midY - 4);
      cx.lineTo(midX + 5, midY + 4);
      cx.closePath();
      cx.fill();
    } else if (this.kind === 'invader') {
      cx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      cx.beginPath();
      cx.moveTo(midX, midY + 5);
      cx.lineTo(midX - 5, midY - 2);
      cx.lineTo(midX + 5, midY - 2);
      cx.closePath();
      cx.fill();
    } else if (this.kind === 'prism') {
      cx.fillStyle = '#ffffff';
      cx.strokeStyle = '#00eaff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(midX, midY - 7);
      cx.lineTo(midX + 8, midY);
      cx.lineTo(midX, midY + 7);
      cx.lineTo(midX - 8, midY);
      cx.closePath();
      cx.fill();
      cx.stroke();
    } else if (this.isSwitch) {
      cx.fillStyle = '#001b22';
      cx.strokeStyle = '#00eaff';
      cx.lineWidth = 2;
      cx.fillRect(midX - 9, midY - 6, 18, 12);
      cx.strokeRect(midX - 9, midY - 6, 18, 12);
      cx.fillStyle = '#ffffff';
      cx.fillRect(midX - 6, midY - 2, 8, 4);
    }

    if (this.locked) {
      if (this.isGodCore) {
        cx.fillStyle = 'rgba(32, 0, 48, 0.76)';
        cx.fillRect(2, 2, w - 4, h - 4);
        cx.strokeStyle = '#ff3dff';
        cx.lineWidth = 3;
        cx.strokeRect(4, 4, w - 8, h - 8);
        cx.strokeStyle = '#00eaff';
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(midX, midY, Math.max(8, h * 0.28), 0, Math.PI * 2);
        cx.stroke();
      } else {
        cx.fillStyle = 'rgba(25, 12, 0, 0.72)';
        cx.fillRect(2, 2, w - 4, h - 4);
        cx.strokeStyle = '#ffd700';
        cx.lineWidth = 2;
        cx.strokeRect(3, 3, w - 6, h - 6);
        cx.beginPath();
        cx.arc(midX, midY - 2, 5, Math.PI, 0);
        cx.stroke();
        cx.fillStyle = '#ffd700';
        cx.fillRect(midX - 7, midY - 2, 14, 9);
      }
    }
  }

  setColor(color) {
    if (
      this.color === color &&
      this._cachedHP === this.hp &&
      this._cachedArmor === this.armor &&
      this._cachedLocked === this.locked
    ) return;
    this.color = color;
    this._buildCache();
  }

  hit() {
    if (this.destroyed) {
      return { didHit: false, destroyed: false };
    }

    if (this.locked) {
      return { didHit: false, destroyed: false, blocked: true };
    }

    if (this.armor > 0) {
      this.armor--;
      this._buildCache();
      return { didHit: true, destroyed: false, armorBroken: true };
    }

    this.hp--;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      this.startFade = true;
      return { didHit: true, destroyed: true };
    }
    return { didHit: true, destroyed: false };
  }

  unlock() {
    if (!this.locked) return false;
    this.locked = false;
    if (this.kind === 'locked') this.kind = 'normal';
    this._buildCache();
    return true;
  }

  setMotion(amplitude, speed) {
    this.moveAmplitude = Math.max(0, Number(amplitude) || 0);
    this.moveSpeed = Math.max(0, Number(speed) || 0);
  }

  forceDestroy() {
    if (this.destroyed) return false;
    this.armor = 0;
    this.hp = 0;
    this.destroyed = true;
    this.startFade = true;
    return true;
  }

  shiftDown(distance) {
    this.baseY += distance;
    this.y += distance;
  }

  resetVerticalPosition() {
    this.baseY = this.originY;
    this.y = this.originY;
  }

  resize(scaleX, scaleY) {
    this.x *= scaleX;
    this.y *= scaleY;
    this.baseX *= scaleX;
    this.baseY *= scaleY;
    this.originY *= scaleY;
    this.width *= scaleX;
    this.height *= scaleY;
    this.moveAmplitude *= scaleX;
    this._buildCache();
  }

  update(dt) {
    if (this.moveAmplitude > 0 && !this.destroyed) {
      this.elapsed += dt;
      this.x = this.baseX + Math.sin(this.elapsed * this.moveSpeed + this.movePhase) * this.moveAmplitude;
    }

    if (this.startFade) {
      this.fade -= dt / this.fadeDuration;
      if (this.fade <= 0) {
        this.fade = 0;
        this.delete = true;
      }
    }
  }

  draw(ctx) {
    if (!this._cache) return;
    ctx.save();
    ctx.globalAlpha = this.fade * 0.9;
    ctx.drawImage(this._cache, this.x, this.y, this.width, this.height);

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
