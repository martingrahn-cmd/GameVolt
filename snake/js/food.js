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
        let tries = 0;

        while (tries < 200) {
            this.x = (Math.random() * this.grid.w) | 0;
            this.y = (Math.random() * this.grid.h) | 0;

            let ok = true;

            // Check forbidden zones (HUD area)
            if (this._isInForbiddenZone(this.x, this.y)) {
                ok = false;
            }

            // Check walls
            if (ok && this._isOnWall(this.x, this.y)) {
                ok = false;
            }

            // blockera huvudcellen
            if (ok) {
                const head = snake.gridHead();
                if (this.x === head.x && this.y === head.y) {
                    ok = false;
                }
            }

            // blockera alla kroppsceller
            if (ok && snake.gridCells) {
                for (let c of snake.gridCells) {
                    if (c.x === this.x && c.y === this.y) {
                        ok = false;
                        break;
                    }
                }
            }

            if (ok) return; // hittade en säker cell
            tries++;
        }
        // om vi mot förmodan inte hittar något: låt den stå kvar
    }
}