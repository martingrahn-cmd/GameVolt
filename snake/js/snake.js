// ============================================================
// Snake.js — v6.0 (True Smooth Snake + Correct Collisions)
// ============================================================

export class Snake {
  constructor(startX, startY, dir) {
    this.dir = dir;
    this.stepTime = 0.12;
    this.acc = 0;

    this.pendingGrow = 0;

    // GRID-body (start with 5 segments)
    this.gridCells = [];
    for (let i = 0; i < 5; i++) {
      this.gridCells.push({ x: startX - i, y: startY });
    }

    // for interpolation
    this.prev = this.gridCells.map(c => ({ x: c.x, y: c.y }));
  }

  // ------------------------------------------------------------
  // Direction vector
  // ------------------------------------------------------------
  _dirVec() {
    switch (this.dir) {
      case "up": return { x: 0, y: -1 };
      case "down": return { x: 0, y: 1 };
      case "left": return { x: -1, y: 0 };
      case "right": return { x: 1, y: 0 };
    }
  }

  // ------------------------------------------------------------
  // Change direction (no reverse)
  // ------------------------------------------------------------
  setDir(d) {
    if ((this.dir === "up" && d === "down") ||
        (this.dir === "down" && d === "up") ||
        (this.dir === "left" && d === "right") ||
        (this.dir === "right" && d === "left"))
      return;

    this.dir = d;
  }

  // ------------------------------------------------------------
  // Update
  // ------------------------------------------------------------
  update(dt) {
    this.acc += dt;

    while (this.acc >= this.stepTime) {
      this.acc -= this.stepTime;
      this._step();
    }
  }

  // ------------------------------------------------------------
  // One grid step (internal logic)
  // ------------------------------------------------------------
  _stepOnce() {
    this.prev = this.gridCells.map(c => ({ x: c.x, y: c.y }));

    const v = this._dirVec();
    const h = this.gridCells[0];

    const newHead = { x: h.x + v.x, y: h.y + v.y };
    this.gridCells.unshift(newHead);

    if (this.pendingGrow > 0) this.pendingGrow--;
    else this.gridCells.pop();
  }

  // Alias for backward compatibility
  _step() {
    this._stepOnce();
  }

  grow(n = 2) {
    this.pendingGrow += n;
  }

  // ------------------------------------------------------------
  // Collision coordinate
  // ------------------------------------------------------------
  gridHead() {
    return {
      x: this.gridCells[0].x,
      y: this.gridCells[0].y
    };
  }

  hitsSelf() {
    const h = this.gridHead();
    for (let i = 3; i < this.gridCells.length; i++) {
      const c = this.gridCells[i];
      if (h.x === c.x && h.y === c.y) return true;
    }
    return false;
  }

  // ------------------------------------------------------------
  // Interpolated curve control points
  // ------------------------------------------------------------
  getRenderPoints() {
    const t = this.acc / this.stepTime;
    const pts = [];

    for (let i = 0; i < this.gridCells.length; i++) {
      const c = this.gridCells[i];
      const p = this.prev[i] || c;

      pts.push({
        x: p.x + (c.x - p.x) * t + 0.5,
        y: p.y + (c.y - p.y) * t + 0.5
      });
    }

    return pts;
  }

  // ------------------------------------------------------------
  // Catmull–Rom spline
  // ------------------------------------------------------------
  getSmoothPoints(sub = 6) {
    const base = this.getRenderPoints();
    const N = base.length;

    if (N < 2) return base;

    const smooth = [];

    for (let i = -1; i < N - 2; i++) {
      const p0 = base[Math.max(i, 0)];
      const p1 = base[i + 1];
      const p2 = base[i + 2];
      const p3 = base[Math.min(i + 3, N - 1)];

      for (let t = 0; t < 1; t += 1 / sub) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t2 +
          (-p0.x + 3*p1.x - 3*p2.x + p3.x) * t3
        );

        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t2 +
          (-p0.y + 3*p1.y - 3*p2.y + p3.y) * t3
        );

        smooth.push({ x, y });
      }
    }
    return smooth;
  }
}