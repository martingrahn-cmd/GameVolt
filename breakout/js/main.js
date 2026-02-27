import Game from "./Game.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false }); // alpha: false kan ge prestanda-boost

let game = null;

// -----------------------------------------
// Perfect 16:9 centered layout with max height
// -----------------------------------------
function resize() {
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  const targetRatio = 16 / 9;
  const MAX_HEIGHT = 880;

  let cw = windowW;
  let ch = Math.floor(windowW / targetRatio);

  if (ch > windowH) {
    ch = windowH;
    cw = Math.floor(windowH * targetRatio);
  }

  if (ch > MAX_HEIGHT) {
    ch = MAX_HEIGHT;
    cw = Math.floor(MAX_HEIGHT * targetRatio);
  }

  // --- PRESTANDA FIX FÖR IPHONE ---
  // Vi begränsar Pixel Ratio till max 1.5. 
  // iPhone har normalt 3.0 vilket är för tungt för Canvas ShadowBlur.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  // Sätt canvasens interna upplösning
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;

  // Skala med CSS så den fyller skärmen
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  
  canvas.style.left = `${(windowW - cw) / 2}px`;
  canvas.style.top = `${(windowH - ch) / 2}px`;

  // Normalisera kontexten så vi kan använda logiska koordinater i spelet
  ctx.scale(dpr, dpr);

  // Skicka logiska mått till spelet
  if (game) {
    game.resize(cw, ch);
  } else {
      // Om spelet inte är skapat än (första gången)
      // måste vi returnera måtten eller skapa det här.
      // Men init() sköter skapandet.
  }
  return { w: cw, h: ch };
}

// -----------------------------------------
// Initialization
// -----------------------------------------
function init() {
  const size = resize(); 
  game = new Game(canvas, ctx);
  
  // Tvinga en resize igen för att sätta rätt värden i Game
  game.resize(size.w, size.h);
  
  window.addEventListener("resize", resize);
}

init();