// src/js/dynamic_background.js
export class DynamicBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    this.width = canvas.width / dpr;
    this.height = canvas.height / dpr;
    
    this.particles = [];
    this.effectType = "spores"; 
    
    this.init();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.width / dpr;
    this.height = this.canvas.height / dpr;
    this.init();
  }

  setEffect(type) {
      this.effectType = type;
      this.init();
  }

  init() {
    this.particles = [];
    let count = 0;

    if (this.effectType === "spores") count = 60;   // Djungel
    if (this.effectType === "snow") count = 150;    // Snö (Många flingor)
    if (this.effectType === "volcano") count = 100; // Aska & Glöd
    if (this.effectType === "rain") count = 300;    // Cyber-regn

    for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle());
    }
  }

  createParticle() {
      const p = {
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 0,
          speedX: 0,
          speedY: 0,
          alpha: Math.random(),
          pulseSpeed: 0.02 + Math.random() * 0.03
      };

      if (this.effectType === "spores") {
          // Gula/Gröna svävande prickar
          p.size = Math.random() * 3 + 1;
          p.speedY = -Math.random() * 0.5 - 0.2; 
          p.speedX = (Math.random() - 0.5) * 0.5; 
          p.color = `hsl(${60 + Math.random() * 40}, 100%, 70%)`; 
      } 
      else if (this.effectType === "snow") {
          // Vita flingor, dalar långsamt
          p.size = Math.random() * 3 + 1;
          p.speedY = Math.random() * 2 + 1; // Faller neråt
          p.speedX = Math.random() * 1 - 0.5; // Vajar lite
          p.color = "rgba(255, 255, 255, 0.8)";
      }
      else if (this.effectType === "volcano") {
          // Aska och Glöd, stiger uppåt
          p.size = Math.random() * 3 + 1;
          p.speedY = -Math.random() * 2 - 1; // Stiger snabbare än sporer
          p.speedX = (Math.random() - 0.5) * 2; // Blåser lite i sidled
          
          // Slumpa mellan mörk aska och ljus glöd
          if (Math.random() > 0.7) {
              p.color = `rgba(255, ${Math.random() * 100}, 0, 0.8)`; // Orange/Eld
          } else {
              p.color = `rgba(50, 50, 50, 0.6)`; // Grå/Aska
          }
      }
      else if (this.effectType === "rain") {
          // Cyberpunk regn (Neonblå/Lila)
          p.size = Math.random() * 2 + 1; // Tjocklek
          p.speedY = Math.random() * 15 + 15; // Supersnabbt!
          p.speedX = 0; 
          // Neon-cyan färg
          p.color = "rgba(0, 255, 255, 0.4)";
      }

      return p;
  }

  update(dt) {
      this.particles.forEach(p => {
          p.x += p.speedX;
          p.y += p.speedY;

          if (this.effectType === "spores") {
              p.alpha += p.pulseSpeed;
              if (p.alpha > 1 || p.alpha < 0.2) p.pulseSpeed *= -1;
          }

          // --- LOOP-LOGIK ---
          
          // För saker som faller NER (Snow, Rain)
          if ((this.effectType === "snow" || this.effectType === "rain") && p.y > this.height) {
              p.y = -10;
              p.x = Math.random() * this.width;
          }

          // För saker som stiger UPP (Spores, Volcano)
          if ((this.effectType === "spores" || this.effectType === "volcano") && p.y < -10) {
              p.y = this.height + 10;
              p.x = Math.random() * this.width;
          }
          
          // Sido-loop
          if (p.x > this.width) p.x = 0;
          if (p.x < 0) p.x = this.width;
      });
  }

  draw() {
      this.ctx.save();
      
      this.particles.forEach(p => {
          this.ctx.globalAlpha = p.alpha;
          this.ctx.fillStyle = p.color;

          if (this.effectType === "rain") {
              // Rita streck för regn
              this.ctx.beginPath();
              this.ctx.moveTo(p.x, p.y);
              this.ctx.lineTo(p.x, p.y + p.speedY); // Långt streck baserat på fart
              this.ctx.strokeStyle = p.color;
              this.ctx.lineWidth = p.size;
              this.ctx.stroke();
          }
          else {
              // Rita cirklar (Spores, Snow, Volcano)
              this.ctx.beginPath();
              this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              this.ctx.fill();
              
              // Glow-effekt borttagen för bättre prestanda
          }
      });

      this.ctx.restore();
  }
}