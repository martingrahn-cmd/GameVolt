import { OneStrokeApp } from "./game/app.js";

// Initialize GameVolt SDK (optional — works without it)
if (window.GameVolt) {
  // Migrate localStorage data to cloud on first login
  GameVolt.save.registerMigration({
    keys: [
      "one-stroke-campaign-progress-v2",
      "one-stroke-challenge-run-history-v1",
      "one-stroke-achievement-unlocks-v1",
      "one-stroke-daily-progress-v1",
    ],
    merge: function(localData, cloudData) {
      return OneStrokeApp.mergeCloudSaveData(
        localData["one-stroke-campaign-progress-v2"],
        cloudData,
        localData["one-stroke-daily-progress-v1"],
      );
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

  // Register migration before init so a restored session cannot miss it.
  GameVolt.init("one-stroke");
}

const app = new OneStrokeApp();

// Expose for devtools debugging
window.__oneStroke = app;

// Cross-device: pull cloud-earned trophies into the local unlock store on login
// so this device doesn't re-toast already-earned trophies.
if (window.GameVolt) {
  var backfillTrophies = function(user) {
    if (!user || !GameVolt.achievements.getUnlockedIds) return;
    GameVolt.achievements.getUnlockedIds().then(function(ids) {
      if (!ids || !ids.forEach) return;
      app.mergeCloudTrophies(ids);
    });
  };
  var syncSignedInData = function(user) {
    if (!user) return;
    backfillTrophies(user);
    app.syncCloudProgress();
  };
  GameVolt.auth.onStateChange(syncSignedInData);
  GameVolt.onReady(function() {
    var user = GameVolt.auth.getUser ? GameVolt.auth.getUser() : null;
    if (user) syncSignedInData(user);
  });
}

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  var hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
  var updateNotice = document.getElementById("pwaUpdateNotice");
  var updateReloadBtn = document.getElementById("pwaReloadBtn");
  var updateReady = false;
  updateReloadBtn?.addEventListener("click", function() {
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener("controllerchange", function() {
    if (!hadServiceWorkerController || updateReady) return;
    updateReady = true;
    if (updateNotice) updateNotice.hidden = false;
  });
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
