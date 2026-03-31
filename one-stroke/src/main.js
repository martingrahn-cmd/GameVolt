import { OneStrokeApp } from "./game/app.js";

// Initialize GameVolt SDK (optional — works without it)
if (window.GameVolt) {
  GameVolt.init("one-stroke");
}

const app = new OneStrokeApp();

// Expose for devtools debugging
window.__oneStroke = app;

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
