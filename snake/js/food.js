// ============================================================
// Food.js — Food spawning with forbidden zones
// ============================================================

export class Food {
    constructor(grid) {
        this.grid = grid;
        this.x = 0;
        this.y = 0;
        
        // Forbidden zones where food can't spawn (for HUD etc)
        // Format: { x1, y1, x2, y2 } (inclusive)
        this.forbiddenZones = [];
        
        // Level walls
        this.walls = [];
    }

    // Add a zone where food can't spawn
    addForbiddenZone(x1, y1, x2, y2) {
        this.forbiddenZones.push({ x1, y1, x2, y2 });
    }

    // Clear all forbidden zones
    clearForbiddenZones() {
        this.forbiddenZones = [];
    }

    // Set walls from level data
    setWalls(walls) {
        this.walls = walls || [];
    }

    // Check if position is in a forbidden zone
    _isInForbiddenZone(x, y) {
        for (const zone of this.forbiddenZones) {
            if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) {
                return true;
            }
        }
        return false;
    }

    // Check if position is on a wall
    _isOnWall(x, y) {
        for (const wall of this.walls) {
            if (x >= wall.x && x < wall.x + wall.w &&
                y >= wall.y && y < wall.y + wall.h) {
                return true;
            }
        }
        return false;
    }

    respawn(snake) {
        const head = snake.gridHead();
        const reachable = this._reachableCells(head.x, head.y);
        const occupied = new Set((snake.gridCells || []).map(cell => `${cell.x},${cell.y}`));
        const candidates = reachable.filter(cell =>
            !occupied.has(`${cell.x},${cell.y}`) &&
            !this._isInForbiddenZone(cell.x, cell.y)
        );

        if (!candidates.length) {
            this.x = -1;
            this.y = -1;
            return false;
        }

        const selected = candidates[(Math.random() * candidates.length) | 0];
        this.x = selected.x;
        this.y = selected.y;
        return true;
    }

    // Flood-fill from the snake head so food can never appear in a sealed room.
    _reachableCells(startX, startY) {
        if (startX < 0 || startY < 0 || startX >= this.grid.w || startY >= this.grid.h || this._isOnWall(startX, startY)) {
            return [];
        }
        const cells = [];
        const queue = [{ x: startX, y: startY }];
        const seen = new Set([`${startX},${startY}`]);
        for (let index = 0; index < queue.length; index++) {
            const cell = queue[index];
            cells.push(cell);
            for (const next of [
                { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
                { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
            ]) {
                const key = `${next.x},${next.y}`;
                if (next.x < 0 || next.y < 0 || next.x >= this.grid.w || next.y >= this.grid.h || seen.has(key) || this._isOnWall(next.x, next.y)) continue;
                seen.add(key);
                queue.push(next);
            }
        }
        return cells;
    }
}
