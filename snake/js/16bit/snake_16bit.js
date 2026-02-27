// ============================================================
// Snake16bit.js — Snake with wraparound + smooth animation
// ============================================================

export class Snake16bit {
    constructor(startX, startY, dir = "right", gridW = 48, gridH = 48) {
        this.gridW = gridW;
        this.gridH = gridH;
        
        // Grid cells the snake occupies
        this.gridCells = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];

        this.dir = dir;
        this.nextDir = dir;
        
        // Movement timing
        this.stepTime = 0.12;
        this.stepAcc = 0;
        
        // Smooth animation - interpolated positions
        this.smoothCells = this.gridCells.map(c => ({ x: c.x, y: c.y }));
        this.prevGridCells = this.gridCells.map(c => ({ x: c.x, y: c.y }));
        this.moveProgress = 0;
        
        // Growth queue
        this.growQueue = 0;
        
        // Animation
        this.t = 0;
        
        // For head animation
        this.mouthOpen = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
    }

    setGridSize(w, h) {
        this.gridW = w;
        this.gridH = h;
    }

    setDir(d) {
        const opposite = { up: "down", down: "up", left: "right", right: "left" };
        if (d !== opposite[this.dir]) {
            this.nextDir = d;
        }
    }

    grow(n = 1) {
        this.growQueue += n;
        this.mouthOpen = 1.0;
    }

    update(dt) {
        this.t += dt;
        this.stepAcc += dt;
        
        // Blinking
        this.blinkTimer += dt;
        if (this.blinkTimer > 3 + Math.random() * 2) {
            this.isBlinking = true;
            this.blinkTimer = 0;
        }
        if (this.isBlinking && this.blinkTimer > 0.15) {
            this.isBlinking = false;
        }
        
        // Mouth closing
        if (this.mouthOpen > 0) {
            this.mouthOpen = Math.max(0, this.mouthOpen - dt * 5);
        }

        // Calculate interpolation progress (0 to 1 between steps)
        this.moveProgress = this.stepAcc / this.stepTime;

        // Grid step when time accumulated
        while (this.stepAcc >= this.stepTime) {
            this.stepAcc -= this.stepTime;
            
            // Save previous positions before stepping
            this.prevGridCells = this.gridCells.map(c => ({ x: c.x, y: c.y }));
            
            this._step();
        }
        
        // Recalculate progress after potential step
        this.moveProgress = this.stepAcc / this.stepTime;
        
        // Update smooth positions every frame
        this._updateSmoothPositions();
    }

    _updateSmoothPositions() {
        // Ensure arrays match
        while (this.smoothCells.length < this.gridCells.length) {
            const last = this.gridCells[this.smoothCells.length];
            this.smoothCells.push({ x: last.x, y: last.y });
            this.prevGridCells.push({ x: last.x, y: last.y });
        }
        while (this.smoothCells.length > this.gridCells.length) {
            this.smoothCells.pop();
            this.prevGridCells.pop();
        }
        
        // Smooth interpolation using moveProgress
        // moveProgress goes from 0 to 1 between each grid step
        const t = this.moveProgress;
        
        for (let i = 0; i < this.gridCells.length; i++) {
            const curr = this.gridCells[i];
            const prev = this.prevGridCells[i] || curr;
            const smooth = this.smoothCells[i];
            
            let dx = curr.x - prev.x;
            let dy = curr.y - prev.y;
            
            // Handle wraparound - snap if crossing boundary
            if (Math.abs(dx) > this.gridW / 2) {
                smooth.x = curr.x;
            } else {
                // Smooth easing for nicer movement
                const easeT = t * t * (3 - 2 * t); // smoothstep
                smooth.x = prev.x + dx * easeT;
            }
            
            if (Math.abs(dy) > this.gridH / 2) {
                smooth.y = curr.y;
            } else {
                const easeT = t * t * (3 - 2 * t);
                smooth.y = prev.y + dy * easeT;
            }
        }
    }

    _step() {
        this.dir = this.nextDir;

        const head = this.gridCells[0];
        let nx = head.x;
        let ny = head.y;

        if (this.dir === "up") ny--;
        if (this.dir === "down") ny++;
        if (this.dir === "left") nx--;
        if (this.dir === "right") nx++;

        // Wraparound
        if (nx < 0) nx = this.gridW - 1;
        if (nx >= this.gridW) nx = 0;
        if (ny < 0) ny = this.gridH - 1;
        if (ny >= this.gridH) ny = 0;

        this.gridCells.unshift({ x: nx, y: ny });

        if (this.growQueue > 0) {
            this.growQueue--;
        } else {
            this.gridCells.pop();
        }
    }

    gridHead() {
        return this.gridCells[0];
    }

    hitsSelf() {
        const head = this.gridCells[0];
        for (let i = 1; i < this.gridCells.length; i++) {
            if (this.gridCells[i].x === head.x && this.gridCells[i].y === head.y) {
                return true;
            }
        }
        return false;
    }

    getSmoothedPoints() {
        return this.smoothCells.map(c => ({
            x: c.x + 0.5,
            y: c.y + 0.5
        }));
    }

    // --------------------------------------------------------
    // Interpolated render points (like Neo mode)
    // --------------------------------------------------------
    getRenderPoints() {
        const t = this.moveProgress;
        const pts = [];

        for (let i = 0; i < this.gridCells.length; i++) {
            const curr = this.gridCells[i];
            const prev = this.prevGridCells[i] || curr;

            let dx = curr.x - prev.x;
            let dy = curr.y - prev.y;

            // Handle wraparound - snap if crossing boundary
            if (Math.abs(dx) > this.gridW / 2) {
                dx = 0; // Don't interpolate across wrap
            }
            if (Math.abs(dy) > this.gridH / 2) {
                dy = 0;
            }

            pts.push({
                x: prev.x + dx * t + 0.5,
                y: prev.y + dy * t + 0.5
            });
        }

        return pts;
    }

    // --------------------------------------------------------
    // Catmull-Rom spline for silky smooth animation
    // sub = subdivisions per segment (higher = smoother)
    // --------------------------------------------------------
    getSmoothSplinePoints(sub = 4, cellSize = 16) {
        const dynamicSub = Math.max(sub, Math.ceil(cellSize / 4));
        
        const base = this.getRenderPoints();
        const N = base.length;

        if (N < 2) return base;

        const smooth = [];
        
        // Helper to check if two points are across a wrap boundary
        const isWrapBetween = (p1, p2) => {
            const dx = Math.abs(p1.x - p2.x);
            const dy = Math.abs(p1.y - p2.y);
            // If distance is more than half the grid, it's a wrap
            return dx > this.gridW / 2 || dy > this.gridH / 2;
        };

        for (let i = -1; i < N - 2; i++) {
            const p0 = base[Math.max(i, 0)];
            const p1 = base[i + 1];
            const p2 = base[i + 2];
            const p3 = base[Math.min(i + 3, N - 1)];
            
            // Check for wraparound between p1 and p2 (current segment)
            if (isWrapBetween(p1, p2)) {
                // Don't interpolate across wrap - just add the point directly
                smooth.push({ x: p1.x, y: p1.y });
                continue;
            }
            
            // Also check adjacent segments to avoid weird spline curves near wrap
            const hasNearbyWrap = isWrapBetween(p0, p1) || isWrapBetween(p2, p3);

            for (let t = 0; t < 1; t += 1 / dynamicSub) {
                if (hasNearbyWrap) {
                    // Simple linear interpolation near wrap points
                    const x = p1.x + (p2.x - p1.x) * t;
                    const y = p1.y + (p2.y - p1.y) * t;
                    smooth.push({ x, y });
                } else {
                    // Full Catmull-Rom spline for smooth curves
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
        }
        return smooth;
    }
}