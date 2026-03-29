// src/js/tray.js
export class Tray {
  constructor(ctx, layout) {
    this.ctx = ctx;
    this.layout = layout;
    this.slots = [];
    this.slotCount = 0;
    this.trayRect = { x: 0, y: 0, w: 0, h: 0 };
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

      ctx.save();

      // --- 2. BAKGRUND (Mörk transparent) ---
      // Vi kör en svag gradient för att det ska kännas mer "golv" än "vägg"
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.6)"); 
      grad.addColorStop(1, "rgba(0, 0, 0, 0.85)"); 
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // --- 3. GULDLINJE (Tillbaka!) ---
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.strokeStyle = "#FFD700"; // Guld
      ctx.lineWidth = 2;

      // Lägg till lite "Glow" på linjen för premiumkänsla
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // Återställ

      // --- 4. SLOTS (Guldramar) ---
      this.slots.forEach(slot => {
          // Mörkare platta i botten
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; 
          ctx.fillRect(slot.x, slot.y, slot.size, slot.size);

          // Guldram runt rutan
          ctx.strokeStyle = "rgba(255, 215, 0, 0.5)"; // Lite transparent guld
          ctx.lineWidth = 2;
          ctx.strokeRect(slot.x, slot.y, slot.size, slot.size);

          // Litet hörn-detalj (valfritt, men snyggt)
          const corner = 8;
          ctx.strokeStyle = "#FFD700"; // Starkare guld i hörnen
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