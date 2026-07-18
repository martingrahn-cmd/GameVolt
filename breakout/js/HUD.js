import { OVERDRIVE_COMBO_THRESHOLD, OVERDRIVE_MULTIPLIER } from './Scoring.js';

export default class HUD {
  constructor(game) {
    this.game = game;

    // Cached heart (offscreen canvas — avoids bezier + shadowBlur every frame)
    this._heartCache = null;
    this._heartSize = 0;
  }

  update(dt) {
    this.game.comboPulse = Math.max(0, this.game.comboPulse - dt * 4.5);
    this.game.overdrivePulse = Math.max(0, this.game.overdrivePulse - dt * 2.2);
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
    ctx.fillStyle = this.game.isRankedRun ? "#ffff00" : "#ff8cff";
    ctx.fillText(
      this.game.isRankedRun ? `HI: ${this.game.highScore}` : 'PRACTICE',
      this.game.width / 2,
      yPos
    );
    ctx.restore();

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`LVL ${this.game.level}: ${this.game.currentLevelName}`, padding, 14);
    ctx.restore();

    this.drawComboAndOverdrive(ctx);
    this.drawBossStatus(ctx);

    const heartSize = 20;
    const startX = this.game.width - padding - (heartSize * 1.5 * 3);
    for (let i = 0; i < this.game.lives; i++) {
      this.drawHeart(ctx, startX + (i * heartSize * 1.5), yPos - 25, heartSize);
    }
  }

  drawComboAndOverdrive(ctx) {
    const g = this.game;
    const pulseSize = Math.round(g.comboPulse * 3);

    const meterWidth = Math.min(220, g.width * 0.28);
    const meterHeight = Math.max(5, Math.round(g.height * 0.008));
    const meterX = (g.width - meterWidth) / 2;
    const meterY = 27;
    const progress = Math.min(1, g.combo / OVERDRIVE_COMBO_THRESHOLD);
    const meterColor = g.overdriveActive ? '#ff3dff' : '#00eaff';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${8 + Math.min(2, pulseSize)}px "Press Start 2P", monospace`;
    ctx.fillStyle = g.overdriveActive
      ? '#ff8cff'
      : (g.combo > 0 ? '#ffffff' : 'rgba(255,255,255,0.5)');
    if (g.effectsLevel !== 'off' && g.combo > 0) {
      ctx.shadowBlur = g.overdriveActive ? 10 : 5;
      ctx.shadowColor = meterColor;
    }
    ctx.fillText(
      g.overdriveActive
        ? `COMBO x${g.combo} // OVERDRIVE x${OVERDRIVE_MULTIPLIER}`
        : `COMBO x${g.combo} // OVERDRIVE`,
      g.width / 2,
      9
    );
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    ctx.strokeStyle = g.overdriveActive ? '#ff8cff' : 'rgba(0,234,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX - 0.5, meterY - 0.5, meterWidth + 1, meterHeight + 1);

    if (progress > 0) {
      if (g.effectsLevel !== 'off' && g.overdrivePulse > 0) {
        ctx.shadowBlur = 6 + g.overdrivePulse * 10;
        ctx.shadowColor = meterColor;
      }
      ctx.fillStyle = meterColor;
      ctx.fillRect(meterX, meterY, meterWidth * progress, meterHeight);
    }
    ctx.restore();
  }

  drawBossStatus(ctx) {
    const status = this.game.bricks.getBossStatus();
    if (!status) return;

    const width = Math.min(260, this.game.width * 0.34);
    const height = Math.max(5, Math.round(this.game.height * 0.008));
    const x = (this.game.width - width) / 2;
    const y = 52;
    const progress = Math.max(0, Math.min(1, status.current / status.max));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = status.color;
    if (this.game.effectsLevel !== 'off') {
      ctx.shadowBlur = 7;
      ctx.shadowColor = status.color;
    }
    ctx.fillText(status.label, this.game.width / 2, 38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = status.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
    if (progress > 0) {
      ctx.fillStyle = status.color;
      ctx.fillRect(x, y, width * progress, height);
    }
    ctx.restore();
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
