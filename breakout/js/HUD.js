export default class HUD {
  constructor(game) {
    this.game = game;

    // Cached heart (offscreen canvas — avoids bezier + shadowBlur every frame)
    this._heartCache = null;
    this._heartSize = 0;
  }

  update(dt) {
    // Reserved for future HUD animations
  }

  draw(ctx) {
    // Only draw in-game HUD during gameplay (shakes with canvas)
    if (this.game.state !== 'running') return;

    ctx.save();
    ctx.font = '20px "Press Start 2P", monospace';
    this.drawGameUI(ctx);
    ctx.restore();
  }

  drawGameUI(ctx) {
    ctx.fillStyle = '#00eaff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 0;

    const padding = 20;
    const yPos = this.game.height - padding;

    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.game.score}`, padding, yPos);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = "#ffff00";
    ctx.fillText(`HI: ${this.game.highScore}`, this.game.width / 2, yPos);
    ctx.restore();

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`LVL ${this.game.level}: ${this.game.currentLevelName}`, padding, 20);
    ctx.restore();

    const heartSize = 20;
    const startX = this.game.width - padding - (heartSize * 1.5 * 3);
    for (let i = 0; i < this.game.lives; i++) {
      this.drawHeart(ctx, startX + (i * heartSize * 1.5), yPos - 25, heartSize);
    }
  }

  _buildHeartCache(size) {
    var pad = 10;
    var c = document.createElement('canvas');
    c.width = size + pad * 2;
    c.height = size + pad * 2;
    var cx = c.getContext('2d');

    cx.fillStyle = "#ff00ff";
    cx.shadowBlur = 12;
    cx.shadowColor = "#ff00ff";

    var ox = size / 2 + pad;
    var oy = pad;
    var topCurveHeight = size * 0.3;

    cx.beginPath();
    cx.moveTo(ox, oy + topCurveHeight);
    cx.bezierCurveTo(ox, oy, ox - size / 2, oy, ox - size / 2, oy + topCurveHeight);
    cx.bezierCurveTo(ox - size / 2, oy + (size + topCurveHeight) / 2, ox, oy + (size + topCurveHeight) / 2, ox, oy + size);
    cx.bezierCurveTo(ox, oy + (size + topCurveHeight) / 2, ox + size / 2, oy + (size + topCurveHeight) / 2, ox + size / 2, oy + topCurveHeight);
    cx.bezierCurveTo(ox + size / 2, oy, ox, oy, ox, oy + topCurveHeight);
    cx.fill();

    this._heartCache = c;
    this._heartSize = size;
    this._heartPad = pad;
  }

  drawHeart(ctx, x, y, size) {
    if (!this._heartCache || this._heartSize !== size) {
      this._buildHeartCache(size);
    }
    ctx.drawImage(this._heartCache, x - size / 2 - this._heartPad, y - this._heartPad);
  }
}
