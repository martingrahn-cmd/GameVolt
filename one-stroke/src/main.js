import { OneStrokeApp } from "./game/app.js";

// Initialize GameVolt SDK (optional — works without it)
if (window.GameVolt) {
  GameVolt.init("one-stroke");

  // Migrate localStorage data to cloud on first login
  GameVolt.save.registerMigration({
    keys: [
      "one-stroke-campaign-progress-v2",
      "one-stroke-challenge-run-history-v1",
      "one-stroke-achievement-unlocks-v1",
    ],
    merge: function(localData, cloudData) {
      if (cloudData) return cloudData;
      return localData["one-stroke-campaign-progress-v2"] || {};
    },
    getAchievements: function(localData) {
      var unlocks = localData["one-stroke-achievement-unlocks-v1"] || {};
      return Object.keys(unlocks).filter(function(id) { return unlocks[id]; })
        .map(function(id) { return { id: id }; });
    },
    getScores: function(localData) {
      var history = localData["one-stroke-challenge-run-history-v1"];
      if (!Array.isArray(history) || history.length === 0) return [];
      var best = history.reduce(function(a, b) {
        return (b.totalScore || 0) > (a.totalScore || 0) ? b : a;
      });
      return [{ score: best.totalScore || 0, mode: "default" }];
    }
  });
}

const app = new OneStrokeApp();

// Expose for devtools debugging
window.__oneStroke = app;

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
