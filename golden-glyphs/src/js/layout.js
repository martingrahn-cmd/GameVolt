// layout.js – v3.0 Solid Center
import { CONFIG } from './config.js';

export class Layout {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Säkra grundstilen via JS så CSS inte bråkar
    this.canvas.style.display = "block";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.background = "#0b0f16"; // Dark background match
    
    // Lyssna på resize
    this.onResize = () => {};
    window.addEventListener('resize', () => this.resize());
    
    // Kör direkt
    this.resize();
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    // 1. Sätt fysisk upplösning (för skärpa)
    this.canvas.width = Math.floor(vw * dpr);
    this.canvas.height = Math.floor(vh * dpr);
    
    // 2. Sätt CSS-storlek (för layout)
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';
    
    // 3. Skala kontexten så vi kan rita med logiska koordinater (0..vw)
    // Detta gör att vi slipper tänka på DPR i resten av spelet
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Trigga omritning av grid/tray
    if (this.onResize) this.onResize();
  }
}
