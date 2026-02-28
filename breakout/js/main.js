import Game from "./Game.js";
import UIManager from "./UI.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

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

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  canvas.width = cw * dpr;
  canvas.height = ch * dpr;

  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;

  canvas.style.left = `${(windowW - cw) / 2}px`;
  canvas.style.top = `${(windowH - ch) / 2}px`;

  ctx.scale(dpr, dpr);

  if (game) {
    game.resize(cw, ch);
  }
  return { w: cw, h: ch };
}

// -----------------------------------------
// Initialization
// -----------------------------------------
function init() {
  const size = resize();
  game = new Game(canvas, ctx);
  game.resize(size.w, size.h);

  // Wire UIManager (bridges DOM overlays with Game)
  var ui = new UIManager(game);
  game.ui = ui;
  game.highScore = ui.boData.bestScore;

  window.addEventListener("resize", resize);
}

init();
