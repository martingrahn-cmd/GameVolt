// ============================================================
// Food16bit.js — 5 fruits on board + queue system
// ============================================================

export class Food16bit {
    constructor(grid) {
        this.grid = grid;
        
        // The 5 fruit types
        this.fruitTypes = ['apple', 'cherry', 'orange', 'grape', 'banana'];
        
        // Current fruits on the board (always 5, one of each type)
        this.fruits = [];
        
        // The queue of fruits to eat (what order player must follow)
        this.queue = [];
        this.queueLength = 10;
        
        // Current target (first in queue)
        this.currentTarget = null;
        
        // Walls to avoid when spawning
        this.walls = [];
        
        // Lock-in zone (center of board)
        this.lockInZone = {
            x: Math.floor(grid.w / 2),
            y: Math.floor(grid.h / 2),
            radius: 2 // How many cells from center count as lock-in
        };
    }

    setWalls(walls) {
        this.walls = walls || [];
    }

    // Initialize all 5 fruits on the board
    init(snake) {
        this.fruits = [];
        this.queue = [];
        
        // Spawn one of each fruit type
        for (const type of this.fruitTypes) {
            this.fruits.push(this._spawnFruit(type, snake));
        }
        
        // Generate initial queue
        for (let i = 0; i < this.queueLength; i++) {
            this.queue.push(this._randomFruitType());
        }
        
        this.currentTarget = this.queue[0];
    }

    _spawnFruit(type, snake) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            x = Math.floor(Math.random() * this.grid.w);
            y = Math.floor(Math.random() * this.grid.h);
            attempts++;
        } while (attempts < maxAttempts && !this._isValidPosition(x, y, snake));
        
        return { type, x, y };
    }

    _isValidPosition(x, y, snake) {
        // Not on snake
        if (snake && snake.gridCells) {
            for (const cell of snake.gridCells) {
                if (cell.x === x && cell.y === y) return false;
            }
        }
        
        // Not on walls
        for (const wall of this.walls) {
            if (wall.x === x && wall.y === y) return false;
        }
        
        // Not on other fruits
        for (const fruit of this.fruits) {
            if (fruit.x === x && fruit.y === y) return false;
        }
        
        // Not in lock-in zone
        const dx = x - this.lockInZone.x;
        const dy = y - this.lockInZone.y;
        if (Math.abs(dx) <= this.lockInZone.radius && Math.abs(dy) <= this.lockInZone.radius) {
            return false;
        }
        
        return true;
    }

    _randomFruitType() {
        return this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
    }

    // Check if snake head is on any fruit
    checkCollision(snakeHead) {
        for (const fruit of this.fruits) {
            if (fruit.x === snakeHead.x && fruit.y === snakeHead.y) {
                return fruit;
            }
        }
        return null;
    }

    // Check if snake head is in lock-in zone
    checkLockIn(snakeHead) {
        const dx = snakeHead.x - this.lockInZone.x;
        const dy = snakeHead.y - this.lockInZone.y;
        return Math.abs(dx) <= this.lockInZone.radius && Math.abs(dy) <= this.lockInZone.radius;
    }

    // Eat a fruit - returns { correct: bool, type: string }
    eat(fruit, snake) {
        const isCorrect = fruit.type === this.currentTarget;
        
        // Respawn this fruit type at new location
        const index = this.fruits.findIndex(f => f === fruit);
        if (index !== -1) {
            this.fruits[index] = this._spawnFruit(fruit.type, snake);
        }
        
        if (isCorrect) {
            // Remove from queue, add new to end
            this.queue.shift();
            this.queue.push(this._randomFruitType());
            this.currentTarget = this.queue[0];
        }
        
        return { correct: isCorrect, type: fruit.type };
    }

    // Reset for new round (after lock-in)
    resetForNewRound(snake) {
        // Respawn all fruits
        this.fruits = [];
        for (const type of this.fruitTypes) {
            this.fruits.push(this._spawnFruit(type, snake));
        }
        
        // Keep the queue going (don't reset it)
        this.currentTarget = this.queue[0];
    }

    // Get the current target fruit type
    getCurrentTarget() {
        return this.currentTarget;
    }

    // Get the visible queue
    getQueue() {
        return this.queue.slice(0, this.queueLength);
    }

    // Get fruit that matches current target (for highlighting)
    getTargetFruit() {
        return this.fruits.find(f => f.type === this.currentTarget);
    }

    // Get all fruits
    getAllFruits() {
        return this.fruits;
    }

    // Get lock-in zone info
    getLockInZone() {
        return this.lockInZone;
    }

    // Update lock-in zone position (center of grid)
    updateLockInZone() {
        this.lockInZone.x = Math.floor(this.grid.w / 2);
        this.lockInZone.y = Math.floor(this.grid.h / 2);
    }
}