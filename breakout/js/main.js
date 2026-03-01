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

// GameVolt SDK integration
if (window.GameVolt) {
  GameVolt.init('breakout');
  GameVolt.save.registerMigration({
    keys: ['bo_data'],
    merge: function(local, cloud) {
      var l = local['bo_data'] || {};
      var c = cloud || {};
      return {
        totalGames: Math.max(l.totalGames || 0, c.totalGames || 0),
        totalBricks: Math.max(l.totalBricks || 0, c.totalBricks || 0),
        bestScore: Math.max(l.bestScore || 0, c.bestScore || 0),
        bestLevel: Math.max(l.bestLevel || 0, c.bestLevel || 0),
        scores: (l.scores && l.scores.length > 0) ? l.scores : (c.scores || []),
        unlocked: Object.assign({}, c.unlocked || {}, l.unlocked || {})
      };
    },
    getScores: function(local) {
      var d = local['bo_data'];
      if (!d || !d.scores || d.scores.length === 0) return [];
      return [{ score: d.scores[0].score, mode: 'default' }];
    },
    getAchievements: function(local) {
      var d = local['bo_data'];
      if (!d || !d.unlocked) return [];
      var out = [];
      for (var id in d.unlocked) {
        if (d.unlocked[id]) out.push({ id: id, unlocked_at: d.unlocked[id] });
      }
      return out;
    }
  });
}
