// src/js/shop.js
import { SKINS, TRAILS, GLOWS, WORLDS } from './config.js';

export class Shop {
  constructor(canvas, onClose, onPurchase, ads) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onClose = onClose;
    this.onPurchase = onPurchase;
    this.ads = ads || null;

    this.tabs = [ 
        { id: 'skin', label: 'BLOCKS', color: '#00F3FF' }, 
        { id: 'trail', label: 'TRAILS', color: '#FF00FF' }, 
        { id: 'world', label: 'THEMES', color: '#FFD700' }, 
        { id: 'gear', label: 'GEAR',   color: '#AAAAAA' } 
    ];
    this.activeTab = 'skin'; 

    this.scrollY = 0;
    this.targetScrollY = 0;
    this.isDragging = false;
    this.lastY = 0;
    
    this.ownedItems = [];
    this.activeItems = {};
    this.ownedHints = 0; 
    
    this.worldImages = {};
    this.loadWorldThumbnails();
    
    // Köp-animation
    this.purchaseAnimations = [];
    // Floating texts (för +50 etc)
    this.floatingTexts = [];
    // Tab rektanglar för klick-detektion
    this.tabRects = [];
    
    // Skattkiste-animation
    this.chestAnimation = null; // { phase, time, skinId, skinName, skinColors }

    // Free gold cooldown
    this.lastFreeGoldTime = 0;
  }
  
  // Skapa köp-animation
  triggerPurchaseAnimation(amount, x, y) {
      this.purchaseAnimations.push({
          amount: amount,
          x: x,
          y: y,
          startY: y,
          opacity: 1,
          scale: 1.5,
          time: 0
      });
  }
  
  // Skapa floating text (för +guld etc)
  triggerFloatingText(text, x, y, color = "#4CAF50") {
      this.floatingTexts.push({
          text: text,
          x: x,
          y: y,
          startY: y,
          opacity: 1,
          time: 0,
          color: color
      });
  }
  
  // Starta skattkiste-animation
  startChestAnimation(itemId, itemType = 'skin') {
      let itemName, itemColors, itemColor;
      
      if (itemType === 'skin') {
          const skin = SKINS[itemId];
          itemName = skin ? skin.name : 'Unknown';
          itemColors = skin && skin.COLORS ? Object.values(skin.COLORS).slice(0, 6) : ['#888'];
      } else if (itemType === 'trail') {
          const trail = TRAILS[itemId];
          itemName = trail ? trail.name : 'Unknown';
          itemColor = trail ? trail.color : '#888';
          itemColors = [itemColor]; // För trails använder vi bara en färg
      }
      
      this.chestAnimation = {
          phase: 'shake',
          time: 0,
          itemId: itemId,
          itemType: itemType,
          itemName: itemName,
          itemColors: itemColors,
          itemColor: itemColor,
          particles: []
      };
      
      // Skapa partiklar
      for (let i = 0; i < 20; i++) {
          this.chestAnimation.particles.push({
              x: 0, y: 0,
              vx: (Math.random() - 0.5) * 400,
              vy: -Math.random() * 300 - 100,
              size: Math.random() * 8 + 4,
              color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`,
              life: 1
          });
      }
  }
  
  // Rita skattkiste-animation
  drawChestAnimation(ctx) {
      if (!this.chestAnimation) return;
      
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      const anim = this.chestAnimation;
      const dt = 0.016;

      anim.time += dt;

      // Mörk overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.8, anim.time * 2)})`;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const chestW = 150;
      const chestH = 120;
      
      // === FASE 1: SKAKA (0-1s) ===
      if (anim.phase === 'shake') {
          const shake = Math.sin(anim.time * 40) * (10 - anim.time * 8);
          this.drawChest(ctx, cx + shake, cy, chestW, chestH, 0);
          
          if (anim.time > 1) {
              anim.phase = 'open';
              anim.time = 0;
          }
      }
      // === FASE 2: ÖPPNA (0-0.5s) ===
      else if (anim.phase === 'open') {
          const lidAngle = Math.min(1, anim.time * 2) * -1.2; // Öppna locket
          this.drawChest(ctx, cx, cy, chestW, chestH, lidAngle);

          // Glow från kistan
          const glowIntensity = anim.time * 2;
          ctx.save();
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 50 * glowIntensity;
          ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity * 0.3})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy - chestH * 0.2, chestW * 0.4, chestH * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          if (anim.time > 0.5) {
              anim.phase = 'reveal';
              anim.time = 0;
          }
      }
      // === FASE 3: AVSLÖJA (0-3s) ===
      else if (anim.phase === 'reveal') {
          // Rita öppen kista
          this.drawChest(ctx, cx, cy, chestW, chestH, -1.2);
          
          // Partiklar
          anim.particles.forEach(p => {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.vy += 400 * dt; // Gravitation
              p.life -= dt * 0.5;
              
              if (p.life > 0) {
                  ctx.globalAlpha = p.life;
                  ctx.fillStyle = p.color;
                  ctx.beginPath();
                  ctx.arc(cx + p.x, cy - chestH * 0.3 + p.y, p.size, 0, Math.PI * 2);
                  ctx.fill();
              }
          });
          ctx.globalAlpha = 1;
          
          // Preview som åker upp
          const revealY = cy - chestH * 0.5 - Math.min(1, anim.time * 2) * 80;
          const revealScale = Math.min(1, anim.time * 3);
          
          ctx.save();
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 20;
          
          if (anim.itemType === 'skin') {
              // Rita skin-färger i grid
              const gridSize = 40 * revealScale;
              const colors = anim.itemColors;
              const cols = 3;
              const rows = 2;
              const cellSize = gridSize / cols * 0.9;
              const startX = cx - gridSize / 2;
              const startY = revealY - gridSize / 2;
              
              for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < cols; c++) {
                      const idx = r * cols + c;
                      if (idx < colors.length) {
                          ctx.fillStyle = colors[idx];
                          ctx.fillRect(
                              startX + c * (gridSize / cols),
                              startY + r * (gridSize / rows),
                              cellSize, cellSize
                          );
                      }
                  }
              }
          } else if (anim.itemType === 'trail') {
              // Rita trail-preview (större)
              ctx.globalAlpha = revealScale;
              this.drawTrailPreview(ctx, cx, revealY, anim.itemId, anim.itemColor, 1.5);
          }
          
          ctx.restore();
          
          // Item-namn
          const nameY = revealY + 50;
          if (anim.time > 0.5) {
              const textAlpha = Math.min(1, (anim.time - 0.5) * 2);
              ctx.globalAlpha = textAlpha;
              ctx.font = `bold ${28}px 'Cinzel', serif`;
              ctx.textAlign = 'center';
              ctx.fillStyle = '#FFD700';
              ctx.shadowColor = '#000';
              ctx.shadowBlur = 10;
              ctx.fillText(anim.itemName.toUpperCase(), cx, nameY);
              
              // "Tap to continue" efter 2s
              if (anim.time > 2) {
                  ctx.font = `${16}px sans-serif`;
                  ctx.fillStyle = '#AAA';
                  ctx.fillText('Tap to continue', cx, nameY + 40);
              }
              ctx.globalAlpha = 1;
          }
          
          // Stäng efter 5s eller vid klick (hanteras i handleInput)
          if (anim.time > 5) {
              anim.phase = 'done';
          }
      }
      // === FASE 4: KLAR ===
      else if (anim.phase === 'done') {
          this.chestAnimation = null;
      }
  }
  
  // Rita skattkista
  drawChest(ctx, x, y, w, h, lidAngle) {
      ctx.save();
      ctx.translate(x, y);

      // Kistans kropp
      const bodyH = h * 0.6;
      const bodyY = h * 0.1;

      // Skugga
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-w/2 + 5, bodyY + 5, w, bodyH);

      // Kropp gradient
      const bodyGrad = ctx.createLinearGradient(-w/2, bodyY, -w/2, bodyY + bodyH);
      bodyGrad.addColorStop(0, '#8B4513');
      bodyGrad.addColorStop(0.5, '#A0522D');
      bodyGrad.addColorStop(1, '#654321');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(-w/2, bodyY, w, bodyH);

      // Metallband
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(-w/2, bodyY, w, 8);
      ctx.fillRect(-w/2, bodyY + bodyH - 8, w, 8);
      ctx.fillRect(-w/2, bodyY, 8, bodyH);
      ctx.fillRect(w/2 - 8, bodyY, 8, bodyH);

      // Lås
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, bodyY + bodyH/2, 12, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(-3, bodyY + bodyH/2 - 8, 6, 16);

      // Lock (roterar)
      ctx.save();
      ctx.translate(0, bodyY);
      ctx.rotate(lidAngle);

      const lidH = h * 0.35;
      const lidGrad = ctx.createLinearGradient(-w/2, -lidH, -w/2, 0);
      lidGrad.addColorStop(0, '#A0522D');
      lidGrad.addColorStop(1, '#8B4513');
      ctx.fillStyle = lidGrad;

      ctx.beginPath();
      ctx.moveTo(-w/2, 0);
      ctx.lineTo(-w/2, -lidH * 0.7);
      ctx.quadraticCurveTo(-w/2, -lidH, -w/3, -lidH);
      ctx.lineTo(w/3, -lidH);
      ctx.quadraticCurveTo(w/2, -lidH, w/2, -lidH * 0.7);
      ctx.lineTo(w/2, 0);
      ctx.closePath();
      ctx.fill();

      // Metallband på lock
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(-w/2, -8, w, 8);

      ctx.restore();
      ctx.restore();
  }
  
  // Uppdatera och rita animationer
  updateAnimations(ctx, dt) {
      // Köp-animationer
      this.purchaseAnimations = this.purchaseAnimations.filter(anim => {
          anim.time += dt || 0.016;
          anim.y = anim.startY - (anim.time * 80);
          anim.opacity = Math.max(0, 1 - anim.time * 1.2);
          anim.scale = 1.5 - (anim.time * 0.5);

          if (anim.opacity > 0) {
              ctx.save();
              ctx.globalAlpha = anim.opacity;
              ctx.font = `bold ${Math.max(18, 24 * anim.scale)}px 'Cinzel', serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              // Skugga
              ctx.fillStyle = "rgba(0,0,0,0.5)";
              ctx.fillText(`-${anim.amount}`, anim.x + 2, anim.y + 2);

              // Text
              ctx.fillStyle = "#FF4444";
              ctx.fillText(`-${anim.amount}`, anim.x, anim.y);
              ctx.restore();
          }

          return anim.opacity > 0;
      });

      // Floating texts
      this.floatingTexts = this.floatingTexts.filter(ft => {
          ft.time += dt || 0.016;
          ft.y = ft.startY - (ft.time * 60);
          ft.opacity = Math.max(0, 1 - ft.time * 1.0);

          if (ft.opacity > 0) {
              ctx.save();
              ctx.globalAlpha = ft.opacity;
              ctx.font = `bold ${20}px 'Cinzel', serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              ctx.fillStyle = "rgba(0,0,0,0.5)";
              ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

              ctx.fillStyle = ft.color;
              ctx.fillText(ft.text, ft.x, ft.y);
              ctx.restore();
          }

          return ft.opacity > 0;
      });
  }

  playSound(name) {
    if (window.audio) {
        if (typeof window.audio.playSfx === 'function') window.audio.playSfx(name);
        else if (typeof window.audio.play === 'function') window.audio.play(name);
    }
  }

  loadWorldThumbnails() {
      Object.entries(WORLDS).forEach(([key, data]) => {
          if (data.src) {
              const img = new Image();
              img.src = data.src;
              this.worldImages[key] = img;
          }
      });
  }

  updateInventory(owned, active, hints) {
      if(owned) this.ownedItems = owned;
      if(active) this.activeItems = active;
      if(hints !== undefined) this.ownedHints = hints;
  }

  getItemsForTab() {
      if (this.activeTab === 'skin') return Object.entries(SKINS).map(([k,v]) => ({id:k, ...v, type:'skin'}));
      if (this.activeTab === 'trail') return Object.entries(TRAILS).map(([k,v]) => ({id:k, ...v, type:'trail'}));
      if (this.activeTab === 'glow') return Object.entries(GLOWS).map(([k,v]) => ({id:k, ...v, type:'glow'}));
      if (this.activeTab === 'world') return Object.entries(WORLDS).map(([k,v]) => ({id:k, ...v, type:'world'}));
      if (this.activeTab === 'gear') {
          const items = [
              {id:'hint', name:"HINT", price:150, desc:"Reveal one piece", type:'consumable', icon:"👁️"}
          ];
          
          // Skin Mystery Box - dynamiskt pris
          const unownedSkins = this.getUnownedSkins();
          if (unownedSkins.length > 0) {
              const skinPrice = this.calculateLootboxPrice(unownedSkins, SKINS);
              items.push({
                  id:'random_skin', 
                  name:"SKIN BOX", 
                  price: skinPrice, 
                  desc:`${unownedSkins.length} skins left!`, 
                  type:'lootbox_skin', 
                  icon:"🎁"
              });
          }
          
          // Trail Mystery Box - dynamiskt pris
          const unownedTrails = this.getUnownedTrails();
          if (unownedTrails.length > 0) {
              const trailPrice = this.calculateLootboxPrice(unownedTrails, TRAILS);
              items.push({
                  id:'random_trail', 
                  name:"TRAIL BOX", 
                  price: trailPrice, 
                  desc:`${unownedTrails.length} trails left!`, 
                  type:'lootbox_trail', 
                  icon:"🎁"
              });
          }
          
          return items;
      }
      return [];
  }
  
  // Kolla hur många skins spelaren inte äger
  getUnownedSkins() {
      return Object.keys(SKINS).filter(id => id !== 'skin_default' && !this.ownedItems.includes(id));
  }
  
  // Kolla hur många trails spelaren inte äger
  getUnownedTrails() {
      return Object.keys(TRAILS).filter(id => id !== 'trail_default' && !this.ownedItems.includes(id));
  }
  
  // Beräkna lootbox-pris baserat på genomsnittsvärde av kvarvarande items × 0.85
  calculateLootboxPrice(unownedIds, itemsDict) {
      if (unownedIds.length === 0) return 0;
      const totalValue = unownedIds.reduce((sum, id) => sum + (itemsDict[id]?.price || 0), 0);
      const avgValue = totalValue / unownedIds.length;
      // 85% av genomsnittet, avrundat till närmaste 50
      return Math.round((avgValue * 0.85) / 50) * 50;
  }

  handleWheel(deltaY) { this.targetScrollY += deltaY; }

  handleInput(type, x, y) {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const isMobile = w < 800;

    // Om skattkiste-animation pågår, stäng vid klick
    if (this.chestAnimation) {
        if (type === 'down' && this.chestAnimation.phase === 'reveal' && this.chestAnimation.time > 1) {
            this.chestAnimation.phase = 'done';
            this.playSound('click');
        }
        return; // Blockera all annan input
    }

    const topY = 20;
    const barH = 45;
    const btnSize = barH;

    // 1. BACK-KNAPP
    if (type === 'down' && x > 15 && x < 15 + btnSize && y > topY && y < topY + btnSize) {
        this.playSound('click');
        this.onClose();
        return;
    }

    // 2. FREE GOLD KNAPP (visas bara om ad-SDK finns)
    const headMargin = 15;
    const headGap = 10;
    const hintW = isMobile ? 70 : 90;
    const goldW = isMobile ? 100 : 130;
    const adW = isMobile ? 90 : 110;
    const hintX = w - headMargin - hintW;
    const goldX = hintX - headGap - goldW;
    const adX = goldX - headGap - adW;

    if (this.ads && this.ads.isAvailable() && type === 'down' && x > adX && x < adX + adW && y > topY && y < topY + barH) {
        const now = Date.now();
        if (now - this.lastFreeGoldTime < 10000) {
            this.playSound('invalid');
            this.triggerFloatingText("WAIT...", adX + adW/2, topY + barH, "#FF8800");
            return;
        }
        this.lastFreeGoldTime = now;
        this.playSound('click');

        const self = this;
        const savedAdX = adX;
        const savedAdW = adW;
        const savedTopY = topY;
        const savedBarH = barH;

        this.ads.showRewarded(
            () => {
                self.onPurchase({ id: 'free_gold', price: 0, type: 'ad', reward: 100 }, 'watch_ad');
                self.triggerFloatingText("+100 🪙", savedAdX + savedAdW/2, savedTopY + savedBarH, "#FFD700");
            },
            () => {
                self.lastFreeGoldTime = 0;
            }
        );
        return;
    }

    // Tabs - använd tabRects om de finns
    const tabY = 100;
    const tabH = 40;
    if (type === 'down' && y > tabY && y < tabY + tabH && this.tabRects) {
        for (const rect of this.tabRects) {
            if (x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h) {
                if (this.activeTab !== rect.id) {
                    this.playSound('tab');
                    this.activeTab = rect.id;
                    this.scrollY = 0; this.targetScrollY = 0;
                }
                return;
            }
        }
    }

    // Scroll
    if (type === 'down') { this.isDragging = true; this.lastY = y; this.clickStartY = y; } 
    else if (type === 'move') { if (this.isDragging) { this.targetScrollY += (y - this.lastY); this.lastY = y; } }
    else if (type === 'up') { this.isDragging = false; if (Math.abs(y - this.clickStartY) < 10) this.checkItemClick(x, y); }
  }

  checkItemClick(x, y) {
      const items = this.getItemsForTab();
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const isMobile = w < 800;

      // Max bredd för innehåll (samma som i draw)
      const maxContentW = isMobile ? w : Math.min(w, 900);
      const contentMarginX = (w - maxContentW) / 2;

      const cols = 2;
      const gap = isMobile ? 12 : 20;
      const margin = isMobile ? 15 : 30;
      const itemW = (maxContentW - (margin*2) - gap * (cols-1)) / cols;
      const itemH = isMobile ? 140 : 160;
      const startY = 155 + this.scrollY + 10;

      for (let i = 0; i < items.length; i++) {
          const col = i % cols; const row = Math.floor(i / cols);
          const ix = contentMarginX + margin + col * (itemW + gap);
          const iy = startY + row * (itemH + gap);
          if (x > ix && x < ix + itemW && y > iy && y < iy + itemH) {
              const item = items[i];
              const isOwned = this.ownedItems.includes(item.id);
              this.playSound('click');
              
              // Beräkna mitten av kortet för animation
              const cardCenterX = ix + itemW / 2;
              const cardCenterY = iy + itemH / 2;
              
              if (item.type === 'lootbox_skin') {
                  // Skin Mystery Box
                  const unownedSkins = this.getUnownedSkins();
                  if (unownedSkins.length === 0) {
                      this.triggerFloatingText("ALL OWNED!", cardCenterX, cardCenterY, "#FF4444");
                      return;
                  }
                  const result = this.onPurchase(item, 'lootbox_skin');
                  if (result && result.success) {
                      this.triggerPurchaseAnimation(item.price, cardCenterX, cardCenterY);
                      this.startChestAnimation(result.itemId, 'skin');
                  }
              } else if (item.type === 'lootbox_trail') {
                  // Trail Mystery Box
                  const unownedTrails = this.getUnownedTrails();
                  if (unownedTrails.length === 0) {
                      this.triggerFloatingText("ALL OWNED!", cardCenterX, cardCenterY, "#FF4444");
                      return;
                  }
                  const result = this.onPurchase(item, 'lootbox_trail');
                  if (result && result.success) {
                      this.triggerPurchaseAnimation(item.price, cardCenterX, cardCenterY);
                      this.startChestAnimation(result.itemId, 'trail');
                  }
              } else if (item.type === 'consumable') {
                  // Köp hint
                  const result = this.onPurchase(item, 'buy');
                  if (result && result.success) {
                      this.triggerPurchaseAnimation(item.price, cardCenterX, cardCenterY);
                  } else {
                      this.triggerFloatingText("NOT ENOUGH GOLD", cardCenterX, cardCenterY, "#FF4444");
                  }
              } else if (isOwned) {
                  // Equip - visa liten feedback
                  this.triggerFloatingText("EQUIPPED!", cardCenterX, cardCenterY, "#4CAF50");
                  this.onPurchase(item, 'equip');
              } else {
                  // Köp item
                  const result = this.onPurchase(item, 'buy');
                  if (result && result.success) {
                      this.triggerPurchaseAnimation(item.price, cardCenterX, cardCenterY);
                  } else {
                      this.triggerFloatingText("NOT ENOUGH GOLD", cardCenterX, cardCenterY, "#FF4444");
                  }
              }
              return;
          }
      }
  }

  drawCoin(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2);
      ctx.fillStyle = "#FFD700"; ctx.fill();
      ctx.strokeStyle = "#B8860B"; ctx.lineWidth = size * 0.15; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(-size*0.3, -size*0.3, size*0.25, 0, Math.PI*2); ctx.fill();
      ctx.restore();
  }

  // Rita en snygg bakåtpil (chevron)
  drawBackArrow(ctx, x, y, size) {
      ctx.save();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = size * 0.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      // Enkel chevron <
      ctx.beginPath();
      ctx.moveTo(x + size * 0.3, y - size * 0.4);
      ctx.lineTo(x - size * 0.2, y);
      ctx.lineTo(x + size * 0.3, y + size * 0.4);
      ctx.stroke();
      
      ctx.restore();
  }

  drawTrailPreview(ctx, x, y, trailId, color, scale) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      
      if (trailId === 'trail_rainbow' || color === "RAINBOW") {
          // Rainbow - flera färgade stjärnor
          const colors = ["#FF0000", "#FF8800", "#FFFF00", "#00FF00", "#00FFFF", "#FF00FF"];
          colors.forEach((c, i) => {
              ctx.fillStyle = c;
              this.drawStar(ctx, x + (i - 2.5) * 10 * scale, y + Math.sin(i) * 6 * scale, 4 * scale, 5);
          });
      } else if (trailId === 'trail_spark') {
          // Sparkles - blixt/gnistor
          ctx.fillStyle = color;
          for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * 12 * scale;
              const oy = Math.sin(i * 1.3) * 8 * scale;
              const size = (3 + Math.random() * 2) * scale;
              ctx.globalAlpha = 0.6 + i * 0.08;
              this.drawStar(ctx, x + ox, y + oy, size, 4);
          }
      } else if (trailId === 'trail_hearts') {
          // Hearts - hjärtan
          ctx.fillStyle = color;
          for (let i = 0; i < 4; i++) {
              const ox = (i - 1.5) * 14 * scale;
              const oy = Math.sin(i * 1.5) * 6 * scale;
              const size = (4 + i * 0.5) * scale;
              ctx.globalAlpha = 0.5 + i * 0.15;
              this.drawHeart(ctx, x + ox, y + oy, size);
          }
      } else if (trailId === 'trail_bubbles') {
          // Bubbles - bubblor med highlight
          for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * 11 * scale;
              const oy = Math.sin(i * 1.2) * 7 * scale;
              const size = (4 + i * 0.8) * scale;
              ctx.globalAlpha = 0.4 + i * 0.12;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x + ox, y + oy, size, 0, Math.PI * 2);
              ctx.fill();
              // Highlight
              ctx.fillStyle = "rgba(255,255,255,0.5)";
              ctx.beginPath();
              ctx.arc(x + ox - size * 0.3, y + oy - size * 0.3, size * 0.3, 0, Math.PI * 2);
              ctx.fill();
          }
      } else if (trailId === 'trail_stars') {
          // Stars - stjärnor
          ctx.fillStyle = color;
          for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * 12 * scale;
              const oy = Math.sin(i * 1.4) * 7 * scale;
              const size = (4 + i * 0.6) * scale;
              ctx.globalAlpha = 0.5 + i * 0.1;
              this.drawStar(ctx, x + ox, y + oy, size, 5);
          }
      } else if (trailId === 'trail_ice') {
          // Frost - snöflingor
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 * scale;
          for (let i = 0; i < 4; i++) {
              const ox = (i - 1.5) * 14 * scale;
              const oy = Math.sin(i * 1.3) * 6 * scale;
              const size = (5 + i * 0.5) * scale;
              ctx.globalAlpha = 0.5 + i * 0.12;
              this.drawSnowflake(ctx, x + ox, y + oy, size);
          }
      } else if (trailId === 'trail_fire') {
          // Fire - eldflammor
          ctx.fillStyle = color;
          for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * 11 * scale;
              const oy = Math.sin(i * 1.5) * 5 * scale;
              const size = (5 + i * 0.7) * scale;
              ctx.globalAlpha = 0.5 + i * 0.1;
              this.drawFlame(ctx, x + ox, y + oy, size);
          }
      } else if (trailId === 'trail_sakura') {
          // Sakura - körsbärsblommor
          ctx.fillStyle = color;
          for (let i = 0; i < 4; i++) {
              const ox = (i - 1.5) * 14 * scale;
              const oy = Math.sin(i * 1.2) * 7 * scale;
              const size = (5 + i * 0.5) * scale;
              ctx.globalAlpha = 0.5 + i * 0.12;
              this.drawFlower(ctx, x + ox, y + oy, size);
          }
      } else if (trailId === 'trail_magic') {
          // Magic - magiska gnistor med spiraleffekt
          ctx.fillStyle = color;
          for (let i = 0; i < 6; i++) {
              const angle = i * 0.8;
              const dist = (i + 1) * 6 * scale;
              const ox = Math.cos(angle) * dist;
              const oy = Math.sin(angle) * dist * 0.5;
              const size = (3 + i * 0.4) * scale;
              ctx.globalAlpha = 0.4 + i * 0.1;
              this.drawStar(ctx, x + ox, y + oy, size, 4);
          }
      } else if (trailId === 'trail_default') {
          // Default trail - enkla vita partiklar
          ctx.fillStyle = color;
          for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * 11 * scale;
              const oy = Math.sin(i * 1.4) * 6 * scale;
              const size = (3 + i * 0.5) * scale;
              ctx.globalAlpha = 0.3 + i * 0.12;
              ctx.beginPath();
              ctx.arc(x + ox, y + oy, size, 0, Math.PI * 2);
              ctx.fill();
          }
      } else {
          // Fallback - enkla cirklar
          ctx.fillStyle = color;
          for (let i = 0; i < 5; i++) {
              const size = (3 + i) * scale;
              const offsetX = (i - 2) * 12 * scale;
              const offsetY = Math.sin(i * 1.5) * 8 * scale;
              ctx.globalAlpha = 0.5 + (i * 0.12);
              ctx.beginPath();
              ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
              ctx.fill();
          }
      }
      ctx.restore();
  }
  
  // Rita stjärna
  drawStar(ctx, x, y, size, points) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? size : size * 0.4;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
          else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
  }
  
  // Rita hjärta
  drawHeart(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.3);
      ctx.bezierCurveTo(x, y - size * 0.5, x - size, y - size * 0.5, x - size, y + size * 0.1);
      ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size);
      ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.1);
      ctx.bezierCurveTo(x + size, y - size * 0.5, x, y - size * 0.5, x, y + size * 0.3);
      ctx.fill();
  }
  
  // Rita snöflinga
  drawSnowflake(ctx, x, y, size) {
      for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
          ctx.stroke();
          // Små grenar
          const branchX = x + Math.cos(angle) * size * 0.6;
          const branchY = y + Math.sin(angle) * size * 0.6;
          ctx.beginPath();
          ctx.moveTo(branchX, branchY);
          ctx.lineTo(branchX + Math.cos(angle + 0.5) * size * 0.3, branchY + Math.sin(angle + 0.5) * size * 0.3);
          ctx.moveTo(branchX, branchY);
          ctx.lineTo(branchX + Math.cos(angle - 0.5) * size * 0.3, branchY + Math.sin(angle - 0.5) * size * 0.3);
          ctx.stroke();
      }
  }
  
  // Rita eldflamma
  drawFlame(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.3, x + size * 0.3, y + size * 0.5);
      ctx.quadraticCurveTo(x, y + size * 0.2, x, y + size * 0.5);
      ctx.quadraticCurveTo(x, y + size * 0.2, x - size * 0.3, y + size * 0.5);
      ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.3, x, y - size);
      ctx.fill();
  }
  
  // Rita blomma (sakura)
  drawFlower(ctx, x, y, size) {
      const petals = 5;
      for (let i = 0; i < petals; i++) {
          const angle = (i * Math.PI * 2) / petals - Math.PI / 2;
          const px = x + Math.cos(angle) * size * 0.5;
          const py = y + Math.sin(angle) * size * 0.5;
          ctx.beginPath();
          ctx.ellipse(px, py, size * 0.4, size * 0.25, angle, 0, Math.PI * 2);
          ctx.fill();
      }
      // Mitten
      ctx.fillStyle = "#FFFF88";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
  }

  draw(ctx, totalGold) {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const isMobile = w < 800;
    const time = Date.now() / 1000;

    // BACKGROUND - Ljusare gradient
    const grad = ctx.createRadialGradient(w/2, h*0.2, 0, w/2, h*0.5, w);
    grad.addColorStop(0, "#2a3a5a"); 
    grad.addColorStop(0.4, "#1e2d4a");
    grad.addColorStop(0.7, "#162035");
    grad.addColorStop(1, "#0d1520"); 
    ctx.fillStyle = grad; 
    ctx.fillRect(0, 0, w, h);
    
    // Geometriskt mönster
    this.drawBackgroundPattern(ctx, w, h, time);

    // Ljuspunkter som rör sig
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 6; i++) {
        const px = (w * 0.1) + (i * w * 0.16);
        const py = h * 0.3 + Math.sin(time * 0.3 + i * 0.8) * 50;
        const size = 100 + Math.sin(time * 0.5 + i) * 30;
        const gradLight = ctx.createRadialGradient(px, py, 0, px, py, size);
        gradLight.addColorStop(0, "#FFD700");
        gradLight.addColorStop(0.5, "rgba(255, 215, 0, 0.3)");
        gradLight.addColorStop(1, "transparent");
        ctx.fillStyle = gradLight;
        ctx.fillRect(px - size, py - size, size*2, size*2);
    }
    ctx.restore();

    // --- HEADER BAKGRUND ---
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, 90);
    ctx.strokeStyle = "rgba(255,215,0,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.lineTo(w, 90);
    ctx.stroke();
    ctx.restore();

    const topY = 20;
    const barH = 45;
    const cornerRadius = 10;

    // 1. BACK-KNAPP
    const btnSize = barH;
    const btnX = 15;
    
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
    ctx.beginPath(); 
    ctx.roundRect(btnX, topY, btnSize, btnSize, cornerRadius); 
    ctx.fill();
    ctx.shadowBlur = 0;
    
    const btnBorderGrad = ctx.createLinearGradient(btnX, topY, btnX, topY + btnSize);
    btnBorderGrad.addColorStop(0, "rgba(255,255,255,0.25)");
    btnBorderGrad.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.strokeStyle = btnBorderGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${22}px sans-serif`;
    ctx.textAlign = "center"; 
    ctx.textBaseline = "middle";
    // Rita chevron istället för emoji
    this.drawBackArrow(ctx, btnX + btnSize/2, topY + btnSize/2, btnSize * 0.35);
    ctx.restore();

    // 2. STATS (höger sida)
    const headMargin = 15;
    const headGap = 10;

    // A. HINTS
    const hintW = isMobile ? 70 : 90;
    const hintX = w - headMargin - hintW;
    
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
    ctx.beginPath(); 
    ctx.roundRect(hintX, topY, hintW, barH, cornerRadius); 
    ctx.fill();
    const hintBorder = ctx.createLinearGradient(hintX, topY, hintX, topY + barH);
    hintBorder.addColorStop(0, "rgba(255,255,255,0.2)");
    hintBorder.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.strokeStyle = hintBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#FFF";
    ctx.font = `bold ${isMobile ? 16 : 18}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`👁️ ${this.ownedHints}`, hintX + hintW/2, topY + barH/2);
    ctx.restore();

    // B. GULD
    const goldW = isMobile ? 100 : 130;
    const goldX = hintX - headGap - goldW;
    
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
    ctx.beginPath(); 
    ctx.roundRect(goldX, topY, goldW, barH, cornerRadius); 
    ctx.fill();
    const goldBorder = ctx.createLinearGradient(goldX, topY, goldX, topY + barH);
    goldBorder.addColorStop(0, "rgba(255,215,0,0.4)");
    goldBorder.addColorStop(1, "rgba(255,215,0,0.1)");
    ctx.strokeStyle = goldBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.drawCoin(ctx, goldX + 18, topY + barH/2, 9);
    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${isMobile ? 16 : 20}px 'Cinzel', serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${totalGold}`, goldX + 34, topY + barH/2);
    ctx.restore();

    // C. FREE GOLD - Titta på reklam för guld (visas bara om ad-SDK finns)
    if (this.ads && this.ads.isAvailable()) {
        const adW = isMobile ? 90 : 110;
        const adX = goldX - headGap - adW;

        ctx.save();
        const pulse = 0.7 + Math.sin(time * 3) * 0.3;
        ctx.shadowColor = "#4CAF50";
        ctx.shadowBlur = 12 * pulse;
        ctx.fillStyle = "#4CAF50";
        ctx.beginPath();
        ctx.roundRect(adX, topY, adW, barH, cornerRadius);
        ctx.fill();
        ctx.shadowBlur = 0;

        const shineGrad = ctx.createLinearGradient(adX, topY, adX, topY + barH * 0.5);
        shineGrad.addColorStop(0, "rgba(255,255,255,0.3)");
        shineGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.roundRect(adX, topY, adW, barH * 0.5, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();

        // Rita mynt-ikon och +100
        ctx.fillStyle = "#FFF";
        ctx.font = `bold ${isMobile ? 12 : 14}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const coinSize = isMobile ? 7 : 8;
        this.drawCoin(ctx, adX + adW/2 - 22, topY + barH/2, coinSize);
        ctx.fillText("+100", adX + adW/2 + 8, topY + barH/2);
        ctx.restore();
    }

    // --- TABS (som knappar) ---
    const tabY = 100;
    const tabH = 40;
    const tabGap = 8;
    const tabPadding = isMobile ? 16 : 24;

    // Beräkna total bredd för alla tabs
    ctx.font = `bold ${isMobile ? 11 : 13}px 'Cinzel', serif`;
    const tabWidths = this.tabs.map(tab => ctx.measureText(tab.label).width + tabPadding * 2);
    const totalTabsW = tabWidths.reduce((a, b) => a + b, 0) + tabGap * (this.tabs.length - 1);
    let tabStartX = (w - totalTabsW) / 2;
    
    const activeTabObj = this.tabs.find(t => t.id === this.activeTab);
    const activeColor = activeTabObj ? activeTabObj.color : "#FFF";
    
    this.tabs.forEach((tab, i) => {
        const tabW = tabWidths[i];
        const tx = tabStartX;
        const isActive = this.activeTab === tab.id;
        
        ctx.save();
        
        // Bakgrund för tab-knapp
        const radius = 8;
        ctx.beginPath();
        ctx.roundRect(tx, tabY, tabW, tabH, radius);
        
        if (isActive) {
            // Aktiv tab - fylld med färg
            ctx.fillStyle = tab.color;
            ctx.shadowColor = tab.color;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Text i mörk färg för kontrast
            ctx.fillStyle = "#000";
        } else {
            // Inaktiv tab - transparent med kant
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.fillStyle = "#888";
        }
        
        ctx.font = `bold ${isMobile ? 11 : 13}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tab.label, tx + tabW/2, tabY + tabH/2);
        ctx.restore();
        
        tabStartX += tabW + tabGap;
    });
    
    // Spara tab-positioner för klick-detektion
    this.tabRects = [];
    tabStartX = (w - totalTabsW) / 2;
    this.tabs.forEach((tab, i) => {
        this.tabRects.push({ x: tabStartX, y: tabY, w: tabWidths[i], h: tabH, id: tab.id });
        tabStartX += tabWidths[i] + tabGap;
    });

    // --- ITEM GRID (med max-bredd på desktop) ---
    const startListY = 155;
    const listAreaH = h - startListY;
    const items = this.getItemsForTab();

    // Max bredd för innehåll på desktop
    const maxContentW = isMobile ? w : Math.min(w, 900);
    const contentMarginX = (w - maxContentW) / 2;

    const cols = 2;
    const gap = isMobile ? 12 : 20;
    const margin = isMobile ? 15 : 30;
    const itemW = (maxContentW - (margin*2) - gap * (cols-1)) / cols;
    const itemH = isMobile ? 140 : 160;
    const rows = Math.ceil(items.length / cols);
    const totalContentH = rows * (itemH + gap) + margin;
    const minScroll = Math.min(0, listAreaH - totalContentH);

    if (!this.isDragging) {
        if (this.targetScrollY > 0) this.targetScrollY = 0;
        if (this.targetScrollY < minScroll) this.targetScrollY = minScroll;
    }
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.15;

    ctx.save();
    ctx.beginPath(); 
    ctx.rect(0, startListY, w, listAreaH); 
    ctx.clip();

    items.forEach((item, index) => {
        const col = index % cols; 
        const row = Math.floor(index / cols);
        const ix = contentMarginX + margin + col * (itemW + gap);
        const iy = startListY + this.scrollY + row * (itemH + gap) + 10;

        if (iy > h + 50 || iy + itemH < startListY - 50) return; 

        const isOwned = this.ownedItems.includes(item.id);
        let isActiveItem = false;
        if (item.type === 'skin' && this.activeItems.skin === item.id) isActiveItem = true;
        if (item.type === 'trail' && this.activeItems.trail === item.id) isActiveItem = true;
        if (item.type === 'glow' && this.activeItems.glow === item.id) isActiveItem = true;
        if (item.type === 'world' && this.activeItems.world === item.id) isActiveItem = true;

        ctx.save();
        
        // Kort-skugga
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        
        // Kort-bakgrund
        ctx.fillStyle = "rgba(15, 20, 30, 0.92)";
        ctx.beginPath(); 
        ctx.roundRect(ix, iy, itemW, itemH, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Accent-linje på toppen
        const accentColor = isActiveItem ? "#4CAF50" : (isOwned ? activeColor : "#333");
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(ix, iy, itemW, 4, [12, 12, 0, 0]);
        ctx.fill();

        if (isActiveItem || isOwned) {
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(ix, iy, itemW, 4, [12, 12, 0, 0]);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Border
        const borderGrad = ctx.createLinearGradient(ix, iy, ix, iy + itemH);
        borderGrad.addColorStop(0, "rgba(255,255,255,0.12)");
        borderGrad.addColorStop(0.5, "rgba(255,255,255,0.03)");
        borderGrad.addColorStop(1, "rgba(255,255,255,0.08)");
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ix, iy, itemW, itemH, 12);
        ctx.stroke();

        // Preview
        const cx = ix + itemW/2;
        const cy = iy + itemH * 0.45;
        const previewSize = isMobile ? 32 : 42;

        if (item.type === 'trail') {
            this.drawTrailPreview(ctx, cx, cy, item.id, item.color, 1);
        } else if (item.type === 'skin' && item.COLORS) {
            // Visa 4x3 grid av nyanser
            const cols = 4;
            const rows = 3;
            const cellSize = isMobile ? 10 : 12;
            const gap = isMobile ? 2 : 2;
            const gridW = cols * cellSize + (cols - 1) * gap;
            const gridH = rows * cellSize + (rows - 1) * gap;
            const startX = cx - gridW / 2;
            const startY = cy - gridH / 2;

            const colorKeys = Object.keys(item.COLORS);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    if (idx < colorKeys.length) {
                        const color = item.COLORS[colorKeys[idx]];
                        const px = startX + c * (cellSize + gap);
                        const py = startY + r * (cellSize + gap);
                        
                        ctx.fillStyle = color;
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                }
            }
            // Subtil kant runt hela
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX - 2, startY - 2, gridW + 4, gridH + 4);
        } else if (item.type === 'skin' && !item.COLORS) {
            // Classic Jade - visa originalfärger
            const cols = 4;
            const rows = 3;
            const cellSize = isMobile ? 10 : 12;
            const gap = isMobile ? 2 : 2;
            const gridW = cols * cellSize + (cols - 1) * gap;
            const gridH = rows * cellSize + (rows - 1) * gap;
            const startX = cx - gridW / 2;
            const startY = cy - gridH / 2;

            const defaultColors = ["#E63946", "#9B5DE5", "#F15BB5", "#FEE440", "#00BBF9", "#00F5D4", "#8338EC", "#FF9F1C", "#FF006E", "#3A86FF", "#80FFDB", "#FFFFFF"];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    if (idx < defaultColors.length) {
                        const px = startX + c * (cellSize + gap);
                        const py = startY + r * (cellSize + gap);
                        ctx.fillStyle = defaultColors[idx];
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                }
            }
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX - 2, startY - 2, gridW + 4, gridH + 4);
        } else if (item.type === 'glow') {
            ctx.save(); 
            ctx.shadowColor = item.color; 
            ctx.shadowBlur = item.blur || 25;
            ctx.fillStyle = "#FFF"; 
            ctx.fillRect(cx - previewSize/2, cy - previewSize/2, previewSize, previewSize); 
            ctx.restore();
        } else if (item.type === 'world') {
            const tw = isMobile ? 75 : 95;
            const th = isMobile ? 45 : 55;
            
            if (item.id === 'default') {
                ctx.save();
                ctx.beginPath(); 
                ctx.roundRect(cx - tw/2, cy - th/2, tw, th, 6);
                const grad = ctx.createLinearGradient(cx - tw/2, cy, cx + tw/2, cy);
                grad.addColorStop(0, "#4CAF50");
                grad.addColorStop(0.33, "#00BCD4");
                grad.addColorStop(0.66, "#FF5722");
                grad.addColorStop(1, "#E040FB");
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.4)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "#FFF";
                ctx.font = `bold ${isMobile ? 11 : 13}px sans-serif`;
                ctx.textAlign = "center"; 
                ctx.textBaseline = "middle";
                ctx.fillText("AUTO", cx, cy);
                ctx.restore();
            } else {
                const img = this.worldImages[item.id];
                ctx.save(); 
                ctx.beginPath(); 
                ctx.roundRect(cx - tw/2, cy - th/2, tw, th, 6);
                ctx.clip();
                if (img && img.complete && img.width > 0) {
                    ctx.drawImage(img, cx - tw/2, cy - th/2, tw, th);
                } else { 
                    ctx.fillStyle = "#222"; 
                    ctx.fillRect(cx - tw/2, cy - th/2, tw, th); 
                }
                ctx.restore(); 
                ctx.strokeStyle = "rgba(255,255,255,0.25)"; 
                ctx.lineWidth = 1; 
                ctx.beginPath();
                ctx.roundRect(cx - tw/2, cy - th/2, tw, th, 6);
                ctx.stroke();
            }
        } else {
            ctx.font = `${previewSize}px sans-serif`; 
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle"; 
            ctx.fillStyle = "#FFF"; 
            ctx.fillText(item.icon || "?", cx, cy);
        }

        // Item namn
        ctx.fillStyle = isActiveItem ? "#4CAF50" : "#FFF";
        ctx.font = `bold ${isMobile ? 12 : 14}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(item.name, cx, iy + 10);

        // Action-knapp
        const btnPadding = isMobile ? 8 : 10;
        const actionBtnH = isMobile ? 26 : 30;
        const actionBtnW = itemW - btnPadding * 2;
        const actionBtnX = ix + btnPadding;
        const actionBtnY = iy + itemH - actionBtnH - btnPadding;
        
        ctx.beginPath();
        ctx.roundRect(actionBtnX, actionBtnY, actionBtnW, actionBtnH, 6);

        if (isActiveItem) {
            ctx.fillStyle = "rgba(76, 175, 80, 0.25)"; 
            ctx.fill(); 
            ctx.strokeStyle = "#4CAF50"; 
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#4CAF50";
            ctx.font = `bold ${isMobile ? 10 : 12}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("✓ ACTIVE", cx, actionBtnY + actionBtnH/2);
        } else if (isOwned && item.type !== 'consumable') {
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)"; 
            ctx.fill(); 
            ctx.strokeStyle = activeColor; 
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = activeColor;
            ctx.font = `bold ${isMobile ? 10 : 12}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("EQUIP", cx, actionBtnY + actionBtnH/2);
        } else {
            const canBuy = totalGold >= item.price;
            if (canBuy) {
                ctx.fillStyle = "#FFD700"; 
                ctx.fill();
                const buyShine = ctx.createLinearGradient(actionBtnX, actionBtnY, actionBtnX, actionBtnY + actionBtnH * 0.5);
                buyShine.addColorStop(0, "rgba(255,255,255,0.35)");
                buyShine.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = buyShine;
                ctx.beginPath(); 
                ctx.roundRect(actionBtnX, actionBtnY, actionBtnW, actionBtnH * 0.5, [6, 6, 0, 0]);
                ctx.fill();

                // Visa pris med mynt
                ctx.fillStyle = "#000";
                ctx.font = `bold ${isMobile ? 11 : 13}px sans-serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                const priceText = `${item.price}`;
                const textMetrics = ctx.measureText(priceText);
                const coinSize = isMobile ? 6 : 7;
                const gap = isMobile ? 8 : 10;
                const totalWidth = coinSize * 2 + gap + textMetrics.width;
                const startX = cx - totalWidth / 2;
                this.drawCoin(ctx, startX + coinSize, actionBtnY + actionBtnH/2, coinSize);
                ctx.fillText(priceText, startX + coinSize * 2 + gap, actionBtnY + actionBtnH/2);
            } else {
                // Kan inte köpa - visa lås-ikon och pris i rött
                ctx.fillStyle = "rgba(40,40,40,0.8)"; 
                ctx.fill();
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 1;
                ctx.stroke();
                
                ctx.fillStyle = "#888";
                ctx.font = `bold ${isMobile ? 10 : 12}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(`🔒 ${item.price}`, cx, actionBtnY + actionBtnH/2);
            }
        }
        ctx.restore();
    });

    ctx.restore();
    
    // Rita animationer sist (ovanpå allt annat)
    this.updateAnimations(ctx, 0.016);
    
    // Skattkiste-animation (överst)
    this.drawChestAnimation(ctx);
  }
  
  // Rita geometriskt bakgrundsmönster
  drawBackgroundPattern(ctx, w, h, time) {
      ctx.save();
      ctx.globalAlpha = 0.04;

      const gridSize = 60;
      const offsetX = (time * 10) % gridSize;
      const offsetY = (time * 5) % gridSize;

      // Hexagon/diamant-mönster
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1;

      for (let x = -gridSize; x < w + gridSize; x += gridSize) {
          for (let y = -gridSize; y < h + gridSize; y += gridSize) {
              const px = x + offsetX;
              const py = y + offsetY;

              // Rita en liten diamant
              ctx.beginPath();
              ctx.moveTo(px, py - 10);
              ctx.lineTo(px + 10, py);
              ctx.lineTo(px, py + 10);
              ctx.lineTo(px - 10, py);
              ctx.closePath();
              ctx.stroke();
          }
      }

      // Extra subtila cirklar
      ctx.globalAlpha = 0.02;
      for (let i = 0; i < 5; i++) {
          const cx = w * (0.2 + i * 0.15);
          const cy = h * 0.4 + Math.sin(time * 0.2 + i) * 100;
          const radius = 80 + i * 20;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
      }

      ctx.restore();
  }
}