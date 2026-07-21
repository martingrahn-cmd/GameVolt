// src/js/tray.js
export class Tray {
  constructor(ctx, layout) {
    this.ctx = ctx;
    this.layout = layout;
    this.slots = [];
    this.slotCount = 0;
    this.trayRect = { x: 0, y: 0, w: 0, h: 0 };
    this.theme = 'jungle';
  }

  setTheme(theme) { this.theme = theme || 'jungle'; }

  getPalette() {
    return {
      jungle:{ line:'#E8C45B', glow:'rgba(232,196,91,.55)', top:'rgba(20,30,20,.72)', bottom:'rgba(1,5,3,.94)', slot:'rgba(13,24,17,.72)' },
      frozen:{ line:'#9DE7FF', glow:'rgba(90,214,255,.52)', top:'rgba(15,37,50,.74)', bottom:'rgba(1,7,13,.95)', slot:'rgba(10,28,42,.75)' },
      inferno:{ line:'#FF9A4D', glow:'rgba(255,88,28,.55)', top:'rgba(50,19,13,.75)', bottom:'rgba(10,2,3,.96)', slot:'rgba(42,13,10,.76)' },
      neon:{ line:'#52E5FF', glow:'rgba(210,64,255,.55)', top:'rgba(13,18,48,.76)', bottom:'rgba(1,2,11,.96)', slot:'rgba(9,13,38,.78)' },
      zen:{ line:'#8FD6BF', glow:'rgba(91,199,167,.45)', top:'rgba(16,38,33,.72)', bottom:'rgba(2,9,8,.94)', slot:'rgba(10,30,25,.74)' }
    }[this.theme] || { line:'#E8C45B', glow:'rgba(232,196,91,.55)', top:'rgba(20,30,20,.72)', bottom:'rgba(1,5,3,.94)', slot:'rgba(13,24,17,.72)' };
  }

  roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  setSlotCount(count) {
    this.slotCount = count;
  }

  getSlotPosition(index) {
    if (this.slots[index]) {
        return this.slots[index];
    }
    return { x: 0, y: 0, size: 50 }; 
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.ctx.canvas.width / dpr;
    const h = this.ctx.canvas.height / dpr;

    // --- 1. STORLEK ---
    const trayHeight = 130;

    this.trayRect = {
      x: 0,
      y: h - trayHeight,
      w: w,
      h: trayHeight
    };

    this.slots = [];
    if (this.slotCount > 0) {
        // Max bredd = samma som 11x11 griden (ca 90% av skärmbredd)
        const maxTrayWidth = w * 0.92;
        const gap = 15;

        // Beräkna slot-storlek dynamiskt
        const availableWidth = maxTrayWidth - (gap * (this.slotCount - 1));
        const maxSlotSize = 85;
        const slotSize = Math.min(maxSlotSize, availableWidth / this.slotCount);
        
        const totalWidth = (this.slotCount * slotSize) + ((this.slotCount - 1) * gap);
        const startX = (w - totalWidth) / 2;
        const startY = this.trayRect.y + (trayHeight - slotSize) / 2;

        for (let i = 0; i < this.slotCount; i++) {
            this.slots.push({
                x: startX + i * (slotSize + gap),
                y: startY,
                size: slotSize
            });
        }
    }
  }

  draw() {
      if (!this.layout) return; 
      
      const ctx = this.ctx;
      const { x, y, w, h } = this.trayRect;
      const palette = this.getPalette();

      ctx.save();

      // --- 2. BAKGRUND (Mörk transparent) ---
      // Vi kör en svag gradient för att det ska kännas mer "golv" än "vägg"
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, palette.top);
      grad.addColorStop(1, palette.bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // --- 3. GULDLINJE (Tillbaka!) ---
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;

      // Lägg till lite "Glow" på linjen för premiumkänsla
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // Återställ

      // --- 4. SLOTS (Guldramar) ---
      this.slots.forEach(slot => {
          // Mörkare platta i botten
          const inset = 2;
          const slotGrad = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.size);
          slotGrad.addColorStop(0, palette.slot);
          slotGrad.addColorStop(1, 'rgba(0,0,0,.62)');
          ctx.fillStyle = slotGrad;
          this.roundedRect(ctx, slot.x, slot.y, slot.size, slot.size, 8);
          ctx.fill();

          // Recessed inner well, visible even after a piece has been placed.
          ctx.strokeStyle = 'rgba(255,255,255,.06)';
          ctx.lineWidth = 1;
          this.roundedRect(ctx, slot.x + inset, slot.y + inset, slot.size - inset * 2, slot.size - inset * 2, 7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(slot.x + slot.size / 2, slot.y + slot.size / 2, Math.max(2, slot.size * .035), 0, Math.PI * 2);
          ctx.fillStyle = palette.glow;
          ctx.fill();

          // Guldram runt rutan
          ctx.strokeStyle = palette.glow;
          ctx.lineWidth = 2;
          this.roundedRect(ctx, slot.x, slot.y, slot.size, slot.size, 8);
          ctx.stroke();

          // Litet hörn-detalj (valfritt, men snyggt)
          const corner = 8;
          ctx.strokeStyle = palette.line;
          ctx.beginPath();
          // Vänster uppe
          ctx.moveTo(slot.x, slot.y + corner); ctx.lineTo(slot.x, slot.y); ctx.lineTo(slot.x + corner, slot.y);
          // Höger uppe
          ctx.moveTo(slot.x + slot.size - corner, slot.y); ctx.lineTo(slot.x + slot.size, slot.y); ctx.lineTo(slot.x + slot.size, slot.y + corner);
          // Vänster nere
          ctx.moveTo(slot.x, slot.y + slot.size - corner); ctx.lineTo(slot.x, slot.y + slot.size); ctx.lineTo(slot.x + corner, slot.y + slot.size);
          // Höger nere
          ctx.moveTo(slot.x + slot.size - corner, slot.y + slot.size); ctx.lineTo(slot.x + slot.size, slot.y + slot.size); ctx.lineTo(slot.x + slot.size, slot.y + slot.size - corner);
          ctx.stroke();
      });

      ctx.restore();
  }
}
