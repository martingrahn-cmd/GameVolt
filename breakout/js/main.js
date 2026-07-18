import Game from "./Game.js";
import UIManager from "./UI.js";
import { saveBOData } from "./Achievements.js";
import { SCORE_VERSION, LEADERBOARD_MODE } from "./Scoring.js";

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
      var lIsV2 = l.scoreVersion === SCORE_VERSION;
      var cIsV2 = c.scoreVersion === SCORE_VERSION;
      var lScores = lIsV2 ? (l.scores || []) : [];
      var cScores = cIsV2 ? (c.scores || []) : [];
      return {
        totalGames: Math.max(l.totalGames || 0, c.totalGames || 0),
        totalBricks: Math.max(l.totalBricks || 0, c.totalBricks || 0),
        scoreVersion: SCORE_VERSION,
        bestScore: Math.max(lIsV2 ? (l.bestScore || 0) : 0, cIsV2 ? (c.bestScore || 0) : 0),
        bestLevel: Math.max(l.bestLevel || 0, c.bestLevel || 0),
        scores: lScores.length > 0 ? lScores : cScores,
        legacyBestScore: Math.max(
          l.legacyBestScore || (!lIsV2 ? (l.bestScore || 0) : 0),
          c.legacyBestScore || (!cIsV2 ? (c.bestScore || 0) : 0)
        ),
        legacyScores: (l.legacyScores && l.legacyScores.length > 0)
          ? l.legacyScores
          : (c.legacyScores || (!cIsV2 ? (c.scores || []) : [])),
        unlocked: Object.assign({}, c.unlocked || {}, l.unlocked || {})
      };
    },
    getScores: function(local) {
      var d = local['bo_data'];
      if (!d || d.scoreVersion !== SCORE_VERSION || !d.scores || d.scores.length === 0) return [];
      return [{ score: d.scores[0].score, mode: LEADERBOARD_MODE }];
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

  // Cross-device: pull cloud-earned trophies into bo_data so this device
  // doesn't re-toast them. The SDK has the cloud set cached by the time
  // onStateChange fires with a user.
  function backfillTrophies(user) {
    if (!user || !GameVolt.achievements.getUnlockedIds) return;
    GameVolt.achievements.getUnlockedIds().then(function(ids) {
      if (!ids || !ids.forEach) return;
      var d = game && game.ui ? game.ui.boData : null;
      if (!d || !d.unlocked) return;
      ids.forEach(function(id) { d.unlocked[id] = d.unlocked[id] || Date.now(); });
      saveBOData(d);
      if (game.ui.renderTrophyGrid) game.ui.renderTrophyGrid();
    });
  }
  GameVolt.auth.onStateChange(backfillTrophies);
  if (GameVolt.auth.getUser) { var u = GameVolt.auth.getUser(); if (u) backfillTrophies(u); }
}
