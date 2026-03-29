// =============================================================
// overlay.js – Audio init overlay (v3.1.0 Fixed)
// =============================================================
window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("audioOverlay");
  if (!overlay) return console.warn("⚠️ audioOverlay saknas i DOM.");

  overlay.style.display = "flex";
  overlay.style.cursor = "pointer";

  let audioReady = false;

  // Vänta lite innan vi tillåter klick
  setTimeout(() => {
    if (window.audio) {
      audioReady = true;
    } else {
      console.warn("⚠️ AudioSystem fortfarande inte redo (fördröjd start)");
    }
  }, 500);

  const activateAudio = () => {
    if (audioReady && window.audio) {
      console.log("🔊 Ljudsystem redo.");
      overlay.style.display = "none";
      overlay.removeEventListener("click", activateAudio);
    } else {
      console.warn("⚠️ AudioSystem ej redo vid klick – försök igen.");
    }
  };

  overlay.addEventListener("click", activateAudio);
});
