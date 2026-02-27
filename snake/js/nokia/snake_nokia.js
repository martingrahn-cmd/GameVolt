// js/nokia/snake_nokia.js
// Blockig Nokia-orm – ärver all logik men ritar utan smoothing

import { Snake } from "../snake.js";

export class SnakeNokia extends Snake {
  constructor(startX, startY, dir) {
    super(startX, startY, dir);

    // Lite snabbare, mer "klickig"
    this.stepTime = 0.09;

    // Kortare startlängd känns mer som Nokia
    this.length = 8;

    // Bygg om kroppen med den kortare längden
    this.gridCells = [];
    const v = this._dirVec();
    for (let i = 0; i < this.length; i++) {
      this.gridCells.push({
        x: startX - v.x * i,
        y: startY - v.y * i
      });
    }
    this.prevCells = this.gridCells.map(c => ({ x: c.x, y: c.y }));
  }

  // Ingen interpolering: ritar exakt i rutorna
  getInterpolatedPoints() {
    return this.gridCells.map(c => ({
      x: c.x + 0.5,
      y: c.y + 0.5
    }));
  }

  // (övriga metoder ärvs rakt av)
}