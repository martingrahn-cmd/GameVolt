// src/js/input.js
export class Input {
  constructor(canvas, grid, pieces, bitfield, tray, effects) {
    this.canvas = canvas;
    this.grid = grid;
    this.pieces = pieces; 
    this.bitfield = bitfield; 
    this.tray = tray;
    this.effects = effects;

    this.activePiece = null;
    this.locked = false;
    this.lastTapTime = 0;
    this.clickStartX = 0;
    this.clickStartY = 0;
    this.tapTimer = null;
    
    this.mx = 0;
    this.my = 0;
    this.hudCheckFn = null; // Set by game.js to check HUD hit areas

    const opts = { passive: false };
    canvas.addEventListener("pointerdown", e => this.onDown(e), opts);
    canvas.addEventListener("pointermove", e => this.onMove(e), opts);
    canvas.addEventListener("pointerup",   e => this.onUp(e), opts);
    canvas.addEventListener("pointercancel", e => this.onUp(e), opts);

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.handleRightClick(e);
    });
  }

  playSound(name) {
    if (window.audio) {
        if (typeof window.audio.playSfx === 'function') window.audio.playSfx(name);
        else if (typeof window.audio.play === 'function') window.audio.play(name);
    }
  }

  getMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = (this.canvas.width / dpr) / rect.width;
    const scaleY = (this.canvas.height / dpr) / rect.height;
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    this.mx = (clientX - rect.left) * scaleX;
    this.my = (clientY - rect.top) * scaleY;
  }

  handleRightClick(e) {
      if (this.locked) return;
      this.getMouse(e);
      for (let i = this.pieces.length - 1; i >= 0; i--) {
          const p = this.pieces[i];
          if (p.containsPoint(this.mx, this.my)) {
              p.rotate();
              this.updateGhost(p);
              this.playSound('rotate');
              break;
          }
      }
  }

  onDown(e) {
    if(e.cancelable) e.preventDefault();
    if (this.locked) return;
    this.getMouse(e);

    this.clickStartX = this.mx;
    this.clickStartY = this.my;
    this.activePiece = null;

    // Clear stale tap timer from previous interaction
    if (this.tapTimer) { clearTimeout(this.tapTimer); this.tapTimer = null; }

    // Skip piece picking if click is in HUD area
    if (this.hudCheckFn && this.hudCheckFn(this.mx, this.my)) return;

    for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        if (p.containsPoint(this.mx, this.my)) {
            
            this.playSound('pickup');
            
            this.activePiece = p;
            p.dragging = true;
            p.onPickup(); 
            this.activePiece.offsetX = this.mx - p.visualX;
            this.activePiece.offsetY = this.my - p.visualY;
            
            if (this.bitfield && !p.inTray) { this.bitfield.lift(p); p.isPlaced = false; }
            
            // Flytta biten överst (Detta ändrar index, men nu har vi trayIndex!)
            this.pieces.splice(i, 1);
            this.pieces.push(p);

            this.canvas.setPointerCapture(e.pointerId);
            return; 
        }
    }
  }

  onMove(e) {
    e.preventDefault();
    if (!this.activePiece) return;
    this.getMouse(e);
    const p = this.activePiece;
    
    if (this.effects) this.effects.emitTrail(this.mx, this.my);

    p.targetX = this.mx - p.offsetX;
    p.targetY = this.my - p.offsetY;
    p.x = p.targetX;
    p.y = p.targetY;
    
    this.updateGhost(p);
  }

  updateGhost(p) {
      if (!this.grid) return;
      const pitch = this.grid.pitch;
      const col = Math.round((p.targetX - this.grid.originX) / pitch);
      const row = Math.round((p.targetY - this.grid.originY) / pitch);
      const ghostCells = p.shape.map(([dx, dy]) => ({ col: col + dx, row: row + dy }));
      this.grid.setHoverCells(ghostCells);
  }

  onUp(e) {
    e.preventDefault();
    if (!this.activePiece) return;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch(_) {}
    this.grid.setHoverCells([]);
    
    const p = this.activePiece;
    const distMoved = Math.hypot(this.mx - this.clickStartX, this.my - this.clickStartY);
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    // --- TAP / DUBBELTAP ---
    if (distMoved < 15) { 
        if (timeSinceLastTap < 400) { // Dubbeltap
            clearTimeout(this.tapTimer); this.tapTimer = null;
            p.flip(); 
            this.updateGhost(p); 
            this.playSound('rotate');
            this.lastTapTime = 0; 
            if (p.inTray) this.returnToTray(p, true); 
            p.dragging = false; this.activePiece = null; 
            return;
        } 
        // Singeltap
        this.lastTapTime = currentTime;
        this.tapTimer = setTimeout(() => {
            p.rotate(); 
            this.updateGhost(p); 
            this.playSound('rotate');
            if (p.inTray) this.returnToTray(p, true); 
            p.dragging = false; this.activePiece = null; this.tapTimer = null;
        }, 200); 
        return;
    }

    // --- DROP LOGIK (Här fixar vi städningen) ---
    p.dragging = false; 
    this.activePiece = null;

    // FIXAT: Robustare koll för att släppa i Trayen
    // Om vi har en trayRect, använd den. Annars gissa på botten av skärmen (150px).
    const dpr = window.devicePixelRatio || 1;
    const trayY = (this.tray && this.tray.trayRect) ? this.tray.trayRect.y : (this.canvas.height / dpr - 150);

    if (this.my > trayY) {
        // Om musen är nere i tray-området -> Skicka hem biten!
        this.returnToTray(p);
    } else {
        // Annars försök placera på brädet
        this.tryPlacePiece(p);
    }
  }

  tryPlacePiece(p) {
    const pitch = this.grid.pitch;
    const col = Math.round((p.targetX - this.grid.originX) / pitch);
    const row = Math.round((p.targetY - this.grid.originY) / pitch);
    
    if (this.bitfield && this.bitfield.canPlace(p, col, row)) {
        this.playSound('place'); 
        
        if (this.effects) {
            const centerX = p.targetX + (p.widthCells * pitch) / 2;
            const centerY = p.targetY + (p.heightCells * pitch) / 2;
            this.effects.explode(centerX, centerY, "#FFD700", 15);
            this.effects.shake(4); 
        }
        
        p.col = col; p.row = row; p.inTray = false; p.isPlaced = true; 
        p.targetX = this.grid.originX + col * pitch;
        p.targetY = this.grid.originY + row * pitch;
        p.targetScale = 1.0;

        this.bitfield.place(p);
        if (window.checkWin) window.checkWin();

    } else {
        this.playSound('place_invalid');
        this.returnToTray(p, true);
    }
  }

  returnToTray(p, silent = false) {
      if (this.tray) {
          if (!silent) this.playSound('drop');
          
          // Använd trayIndex för rätt slot
          const index = (typeof p.trayIndex !== 'undefined') ? p.trayIndex : this.pieces.indexOf(p);
          
          const slot = this.tray.getSlotPosition(index);
          const slotCenterX = slot.x + slot.size / 2;
          const slotCenterY = slot.y + slot.size / 2;
          
          // Uppdatera metrics vid full skala först för att få rätt dimensioner
          p.scale = 1.0;
          p.updateMetrics();
          
          // Beräkna skala dynamiskt så biten passar i sloten
          const fullPitch = this.grid.pitch;
          const fullW = p.widthCells * fullPitch;
          const fullH = p.heightCells * fullPitch;
          const maxDim = Math.max(fullW, fullH);
          
          // Lämna 15% marginal i sloten
          const targetSize = slot.size * 0.85;
          const scale = Math.min(targetSize / maxDim, 0.7); // Max 0.7 för att inte bli för stort
          
          p.targetScale = scale;
          p.scale = scale; // Sätt direkt för omedelbar uppdatering
          p.updateMetrics();
          
          const pitch = this.grid.pitch * scale;
          
          // Beräkna bounding box i pixlar
          const bboxW = p.widthCells * pitch;
          const bboxH = p.heightCells * pitch;
          
          // Ta hänsyn till minC/minR offset
          const offsetX = p.minC * pitch;
          const offsetY = p.minR * pitch;
          
          // Centrera bounding boxen i sloten
          const tx = slotCenterX - (bboxW / 2) - offsetX;
          const ty = slotCenterY - (bboxH / 2) - offsetY;
          
          // Sätt position
          p.targetX = tx;
          p.targetY = ty;
          p.inTray = true;
          
          if (p.isPlaced) { 
              p.isPlaced = false; 
              this.bitfield.lift(p); 
          }
      }
  }
}