// src/js/bitfield.js
export class BitField {
  constructor(grid) {
    this.grid = grid;
    this.map = [];
    this.cols = 0;
    this.rows = 0;
    this.occupied = new Set();
  }

  loadLevelMap(mapData) {
    // Kopiera kartan för att undvika referensfel
    this.map = mapData.map(row => [...row]);
    this.rows = this.map.length;
    this.cols = this.rows > 0 ? this.map[0].length : 0;
    this.occupied = new Set();
    console.log(`🗺️ Level Loaded: ${this.cols}x${this.rows}`);
  }

  canPlace(piece, col, row) {
    // Säkerställ heltal direkt vid placering
    const iCol = Math.round(col);
    const iRow = Math.round(row);

    return piece.shape.every(([dx, dy]) => {
      // Avrunda offsets ifall rotation skapat decimaler
      const c = iCol + Math.round(dx);
      const r = iRow + Math.round(dy);
      
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
      if (this.map[r][c] === 2) return false; // Väggar blockerar
      if (this.occupied.has(`${r},${c}`)) return false;
      return true;
    });
  }

  place(piece) {
      const col = Math.round(piece.col);
      const row = Math.round(piece.row);
      piece.shape.forEach(([dx, dy]) => {
          const c = col + Math.round(dx);
          const r = row + Math.round(dy);
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
              this.occupied.add(`${r},${c}`);
          }
      });
  }

  lift(piece) {
      const col = Math.round(piece.col);
      const row = Math.round(piece.row);
      piece.shape.forEach(([dx, dy]) => {
          const c = col + Math.round(dx);
          const r = row + Math.round(dy);
          this.occupied.delete(`${r},${c}`);
      });
  }

  // --- HÄR ÄR DEN VIKTIGA FIXEN ---
  isSolved(pieces) {
    let targetCount = 0;
    
    // 1. Räkna hur många GULD-rutor (1) som finns på banan
    for(let r=0; r<this.rows; r++) {
        for(let c=0; c<this.cols; c++) {
            if (this.map[r][c] === 1) targetCount++;
        }
    }

    // Om banan saknar mål (bara sandbox), vinn direkt
    if (targetCount === 0) return true;

    let coveredCount = 0;
    let coveredSet = new Set(); // Förhindrar att vi räknar samma ruta två gånger

    pieces.forEach(p => {
        if (!p.isPlaced) return;
        
        // VIKTIGT: Math.round() här räddar oss från decimal-buggar
        const pCol = Math.round(p.col);
        const pRow = Math.round(p.row);

        p.shape.forEach(([dx, dy]) => {
            const c = pCol + Math.round(dx);
            const r = pRow + Math.round(dy);
            
            // Kolla att vi är innanför kartan
            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                // Om vi träffar en målruta (1)
                if (this.map[r][c] === 1) {
                    const key = `${r},${c}`;
                    if (!coveredSet.has(key)) {
                        coveredSet.add(key);
                        coveredCount++;
                    }
                }
            }
        });
    });

    // Debug-utskrift: Öppna konsolen (F12) för att se detta!
    const isWin = coveredCount === targetCount;
    if (isWin) {
        console.log(`🏆 WIN! Covered: ${coveredCount} / Target: ${targetCount}`);
    } else {
        // Logga bara ibland för att inte spamma, eller när vi är nära
        if (coveredCount > 0) {
            console.log(`❌ Status: ${coveredCount} av ${targetCount} täckta.`);
        }
    }

    return isWin;
  }
  
  isCoveringGoal(piece) { return piece.isPlaced; }

  doesPieceFitTarget(piece, targetCol, targetRow) {
      if (!piece) return false;
      return Math.round(piece.col) === targetCol && Math.round(piece.row) === targetRow;
  }

  draw(ctx) {
    if (!this.grid) return;
    const p = this.grid.pitch;
    const ox = this.grid.originX;
    const oy = this.grid.originY;
    const theme = typeof this.grid.getThemeStyle === 'function' ? this.grid.getThemeStyle() : null;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.map[r][c];
        const x = ox + c * p;
        const y = oy + r * p;

        if (val === 1) { // MÅL
          const inset = Math.max(2, p * .08);
          const tile = ctx.createLinearGradient(x, y, x + p, y + p);
          tile.addColorStop(0, theme?.targetTop || "rgba(124,145,103,.2)");
          tile.addColorStop(.55, "rgba(38,48,41,.13)");
          tile.addColorStop(1, theme?.targetBottom || "rgba(5,10,8,.34)");
          ctx.fillStyle = tile;
          ctx.fillRect(x + inset, y + inset, p - inset * 2, p - inset * 2);
          ctx.strokeStyle = theme?.targetEdge || "rgba(218,187,104,.22)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + inset, y + inset, p - inset * 2, p - inset * 2);
          ctx.fillStyle = theme?.targetDot || "rgba(235,216,157,.18)";
          ctx.beginPath();
          ctx.arc(x + p / 2, y + p / 2, Math.max(1.2, p * .045), 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (val === 2) { // VÄGG
          ctx.fillStyle = "#1a1a1a"; ctx.fillRect(x, y, p, p);
          ctx.fillStyle = "#333"; ctx.fillRect(x, y, p, 4); ctx.fillRect(x, y, 4, p); 
          ctx.fillStyle = "#000"; ctx.fillRect(x, y + p - 4, p, 4); ctx.fillRect(x + p - 4, y, 4, p); 
          ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + p - 10, y + p - 10);
          ctx.moveTo(x + p - 10, y + 10); ctx.lineTo(x + 10, y + p - 10); ctx.stroke();
        }
      }
    }
  }
}
