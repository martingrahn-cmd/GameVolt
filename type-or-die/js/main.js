// Shell — the GameVolt single-frame model: a main menu hub, mode launch,
// in-frame controls, the cross-mode overlays (Daily toggle, trophies), and
// the hot-seat two-player flow. Each mode owns its play surface, loop and
// input; the shell only activates/deactivates them and routes the frame.

import { SpeedTest } from "./speedtest.js";
import { ZombieGame } from "./zombie.js";
import { TROPHIES, TIERS, loadProfile, unlockedCount, registerCloudMigration, backfillTrophies } from "./trophies.js";
import { topScores } from "./leaderboard.js";
import { todayKey } from "./daily.js";
import { initRemote, remoteEnabled, board } from "./api.js";

const $ = (id) => document.getElementById(id);

const modes = {
  speedtest: new SpeedTest(),
  zombie: new ZombieGame(),
};
for (const m of Object.values(modes)) m.init();

const screenMenu = $("screen-menu");
const screenVersus = $("screen-versus");
const frameCtl = $("frame-ctl");
const dailyBtn = $("daily-btn");
const versusBtn = $("versus-btn");
const trophyOverlay = $("trophy-overlay");
const muteBtn = $("mute-btn");

let current = null; // active mode key, or null on a menu/versus screen
let daily = localStorage.getItem("tod_daily") === "1";
let versus = false; // hot-seat two-player — opt-in per session
let match = null; // { mode, seed, scores: [] }

// ---- screen flow --------------------------------------------------------

function showMenu() {
  if (current) {
    modes[current].onRunEnd = null;
    modes[current].fixedSeed = null;
    modes[current].deactivate();
    current = null;
  }
  match = null;
  frameCtl.hidden = true;
  screenVersus.hidden = true;
  screenMenu.hidden = false;
  focusScreen();
}

function launch(name) {
  if (!modes[name]) return;
  if (versus) {
    startMatch(name);
    return;
  }
  if (current) modes[current].deactivate();
  current = name;
  screenMenu.hidden = true;
  frameCtl.hidden = false;
  const m = modes[name];
  m.onRunEnd = null;
  m.fixedSeed = null;
  m.daily = daily;
  m.activate();
  localStorage.setItem("tod_mode", name);
  window.GameVoltTracker?.start(name === "zombie" ? "Type or Die — Zombie" : "Type or Die — Speed Test");
}

// ---- hot-seat two-player (turns) ---------------------------------------

function startMatch(modeName) {
  // One shared seed → both players face the identical challenge.
  match = { mode: modeName, seed: (Math.random() * 0xffffffff) >>> 0, scores: [] };
  showVersusReady(1);
}

function showVersusReady(player) {
  if (current) {
    modes[current].deactivate();
    current = null;
  }
  $("vs-title").textContent = "PLAYER " + player;
  $("vs-msg").textContent =
    player === 1
      ? "Player 1 — your run. Both players face the same challenge."
      : "Pass the keyboard. Player " + player + " — your turn.";
  $("vs-scores").hidden = true;
  $("vs-actions").replaceChildren(
    menuButton("START", () => versusLaunch(player)),
  );
  screenMenu.hidden = true;
  frameCtl.hidden = true;
  screenVersus.hidden = false;
  focusScreen();
}

function versusLaunch(player) {
  screenVersus.hidden = true;
  const m = modes[match.mode];
  current = match.mode;
  m.daily = false;
  m.fixedSeed = match.seed;
  m.onRunEnd = (result) => onVersusRunEnd(player, result);
  m.activate();
  frameCtl.hidden = false;
  window.GameVoltTracker?.start(match.mode === "zombie" ? "Type or Die — Zombie (2P)" : "Type or Die — Speed Test (2P)");
}

function onVersusRunEnd(player, result) {
  match.scores[player - 1] = result;
  if (player === 1) showVersusReady(2);
  else showVersusResult();
}

function showVersusResult() {
  if (current) {
    modes[current].deactivate();
    current = null;
  }
  const [p1, p2] = match.scores;
  const tie = p1.versusScore === p2.versusScore;
  const p1won = p1.versusScore > p2.versusScore;
  $("vs-title").textContent = tie
    ? "DRAW"
    : p1won
      ? "PLAYER 1 WINS"
      : "PLAYER 2 WINS";
  $("vs-msg").textContent =
    match.mode === "zombie" ? "Highest score takes it." : "Highest WPM takes it.";
  const scores = $("vs-scores");
  scores.hidden = false;
  scores.replaceChildren(
    versusRow("PLAYER 1", p1, !tie && p1won),
    versusRow("PLAYER 2", p2, !tie && !p1won),
  );
  const rematchMode = match.mode;
  $("vs-actions").replaceChildren(
    menuButton("REMATCH", () => startMatch(rematchMode)),
    menuButton("MENU", showMenu, true),
  );
  frameCtl.hidden = true;
  screenVersus.hidden = false;
  focusScreen();
}

function versusRow(name, result, won) {
  const row = document.createElement("div");
  row.className = "vs-row" + (won ? " vs-row--win" : "");
  row.innerHTML =
    '<span class="vs-row-name"></span>' +
    '<span class="vs-row-sub"></span>' +
    '<span class="vs-row-score"></span>';
  row.querySelector(".vs-row-name").textContent = won ? name + "  ★" : name;
  row.querySelector(".vs-row-sub").textContent = result.summary;
  row.querySelector(".vs-row-score").textContent = result.versusScore;
  return row;
}

function menuButton(label, onClick, ghost) {
  const b = document.createElement("button");
  b.className = "menu-btn" + (ghost ? " menu-btn--ghost" : "");
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

// ---- Daily Challenge / two-player toggles (mutually exclusive) ----------

function setDaily(on) {
  daily = on;
  if (on) setVersus(false);
  localStorage.setItem("tod_daily", on ? "1" : "0");
  dailyBtn.classList.toggle("is-active", on);
  dailyBtn.textContent = on ? `◷ DAILY · ${todayKey()}` : "◷ DAILY CHALLENGE";
}

function setVersus(on) {
  versus = on;
  if (on) setDaily(false);
  versusBtn.classList.toggle("is-active", on);
  versusBtn.textContent = on ? "👥 2-PLAYER · ON" : "👥 2-PLAYER";
}

// ---- trophy case (GDD §5) ----------------------------------------------

function openTrophies() {
  const p = loadProfile();
  const s = p.daily.streak;
  $("trophy-count").textContent = `${unlockedCount(p)} / ${TROPHIES.length}`;
  $("streak-line").textContent = `Daily streak: ${s} day${s === 1 ? "" : "s"}`;

  // Grouped into tier sections — bronze / silver / gold / platinum bands,
  // each a grid of cards (Asteroid Storm layout).
  const grid = $("trophy-list");
  grid.replaceChildren();
  for (const tierKey of ["bronze", "silver", "gold", "platinum"]) {
    const list = TROPHIES.filter((t) => t.tier === tierKey);
    const got = list.filter((t) => p.unlocked[t.id]).length;

    const header = document.createElement("div");
    header.className = `trophy-section-header ${tierKey}`;
    header.textContent = `${TIERS[tierKey].label} · ${got}/${list.length}`;
    grid.appendChild(header);

    const cards = document.createElement("div");
    cards.className = "trophy-cards";
    for (const t of list) {
      const unlocked = !!p.unlocked[t.id];
      const card = document.createElement("div");
      card.className =
        `trophy-card ${tierKey} ` + (unlocked ? "unlocked" : "trophy-locked");
      card.tabIndex = 0; // keyboard-navigable
      card.innerHTML =
        '<div class="trophy-card-header">' +
        '<span class="trophy-card-icon"></span>' +
        '<span class="trophy-card-name"></span>' +
        "</div>" +
        '<div class="trophy-card-desc"></div>' +
        `<div class="trophy-card-tier ${tierKey}"></div>`;
      card.querySelector(".trophy-card-icon").textContent = t.icon;
      card.querySelector(".trophy-card-name").textContent = t.name;
      card.querySelector(".trophy-card-desc").textContent = t.desc;
      card.querySelector(".trophy-card-tier").textContent = TIERS[tierKey].label;
      cards.appendChild(card);
    }
    grid.appendChild(cards);
  }
  trophyOverlay.hidden = false;
  focusScreen();
}

function closeTrophies() {
  trophyOverlay.hidden = true;
  focusScreen(); // hand focus back to whatever screen is underneath
}

// ---- high scores -------------------------------------------------------

// Both boards are the shared GameVolt component, mounted inline into the
// screen's own list containers so the placement (and the game's cyan look)
// is unchanged. The component owns rows, avatars, own-row highlight and the
// loading / empty / error states; we only supply the data and the units.

const ACCENT = "#00ffff";
const mounts = { zombie: null, speed: null }; // component instances, one per board

const hasBoardUI = () =>
  !!(window.GameVolt && window.GameVolt.ui && window.GameVolt.ui.leaderboard);

// Local rows carry `name` (and no avatar); the component reads `username`.
const fromLocal = (rows) => rows.map((r) => ({ ...r, username: r.name }));

// Prefer the server-validated board when signed in; else the local one.
async function zombieRows() {
  const remote = remoteEnabled() ? await board("zombie", "all", 10) : null;
  return remote || fromLocal(topScores("zombie", "classic", ["score", "wave"]));
}

async function speedRows() {
  const remote = remoteEnabled() ? await board("speedtest-30", "all", 10) : null;
  const rows = remote || fromLocal(topScores("speedtest", "30", ["wpm", "accuracy"]));
  return rows.map((r) => ({ ...r, score: r.wpm })); // WPM is the primary value
}

// Minimal local renderer for when the SDK isn't there (standalone / offline).
// The scores live in localStorage and need no SDK, so they must still show.
function renderLocalRows(listId, emptyId, rows, main, sub) {
  $(emptyId).hidden = rows.length > 0;
  $(listId).replaceChildren(
    ...rows.map((r, i) => {
      const row = document.createElement("div");
      row.className = "lb-row" + (i === 0 ? " lb-row--top" : "");
      row.innerHTML =
        `<span class="lb-rank">${i + 1}</span>` +
        '<span class="lb-name"></span>' +
        `<span class="lb-wpm">${main(r)}</span>` +
        `<span class="lb-acc">${sub(r)}</span>`;
      row.querySelector(".lb-name").textContent = r.name ?? r.username ?? "";
      return row;
    }),
  );
}

// Mount once, then just reload on each re-open (keeps the fetch fresh).
function mountBoard(key, listId, emptyId, opts) {
  const empty = $(emptyId);
  empty.hidden = true; // the component renders its own empty state
  if (mounts[key]) {
    mounts[key].reload();
    return;
  }
  mounts[key] = GameVolt.ui.leaderboard({
    container: $(listId),
    limit: 10,
    accent: ACCENT,
    ...opts,
  });
}

function openLeaderboard() {
  $("screen-leaderboard").hidden = false;

  if (hasBoardUI()) {
    mountBoard("zombie", "hs-zombie-list", "hs-zombie-empty", {
      mode: "zombie",
      scoreLabel: "pts",
      fetch: zombieRows,
      // Local rows record the wave reached; the validated board doesn't.
      meta: (r) => (r.wave != null ? "wave " + r.wave : ""),
    });

    mountBoard("speed", "hs-speed-list", "hs-speed-empty", {
      mode: "speedtest-30",
      scoreLabel: "wpm",
      format: (v) => String(v ?? 0),
      fetch: speedRows,
      meta: (r) => (r.accuracy != null ? r.accuracy + "%" : ""),
    });
  } else {
    // No SDK: the localStorage boards still work, exactly as before.
    renderLocalRows(
      "hs-zombie-list", "hs-zombie-empty",
      topScores("zombie", "classic", ["score", "wave"]),
      (r) => r.score,
      (r) => "wave " + r.wave,
    );
    renderLocalRows(
      "hs-speed-list", "hs-speed-empty",
      topScores("speedtest", "30", ["wpm", "accuracy"]),
      (r) => r.wpm + " wpm",
      (r) => r.accuracy + "%",
    );
  }

  // Focus CLOSE last: the mounted board can contain its own Sign in button,
  // which precedes CLOSE in document order and would otherwise steal focus.
  $("leaderboard-close").focus();
}

function closeLeaderboard() {
  $("screen-leaderboard").hidden = true;
  focusScreen();
}

// ---- settings ----------------------------------------------------------

function openSettings() {
  const audio = modes.zombie.audio;
  $("set-sound").textContent =
    localStorage.getItem("tod_muted") === "1" ? "OFF" : "ON";
  $("set-music").value = Math.round(audio.musicVol * 100);
  $("set-sfx").value = Math.round(audio.sfxVol * 100);
  const reset = $("set-reset");
  reset.textContent = "RESET PROGRESS";
  reset.classList.remove("is-armed");
  delete reset.dataset.armed;
  $("screen-settings").hidden = false;
  focusScreen();
}

function closeSettings() {
  $("screen-settings").hidden = true;
  focusScreen();
}

// ---- fullscreen --------------------------------------------------------

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

// ---- keyboard navigation for the screen overlays -----------------------

// trophy-overlay first — it is a modal that opens on top of the menu, so
// it must win over the still-visible menu underneath it.
const SCREEN_IDS = [
  "trophy-overlay", "screen-leaderboard", "screen-settings",
  "overlay", "zombie-overlay", "screen-versus", "screen-menu",
];

function visibleScreen() {
  for (const id of SCREEN_IDS) {
    const el = $(id);
    if (el && !el.hidden) return el;
  }
  return null;
}

function navItems(screen) {
  return [...screen.querySelectorAll("button, input, [tabindex]")].filter(
    (el) => !el.disabled && el.offsetParent !== null,
  );
}

// Move keyboard focus onto the first control of whatever screen is showing.
function focusScreen() {
  const screen = visibleScreen();
  if (!screen) return;
  const items = navItems(screen);
  if (items.length) items[0].focus();
}

// Geometric focus move: from the focused control, pick the nearest control
// whose centre lies in the pressed direction. Works for any layout — the
// menu's button rows, the vertical result panels, the trophy card grid.
function pickInDirection(items, current, key) {
  const c = current.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    let along;
    let off;
    if (key === "ArrowUp") {
      if (dy > -4) continue;
      along = -dy;
      off = Math.abs(dx);
    } else if (key === "ArrowDown") {
      if (dy < 4) continue;
      along = dy;
      off = Math.abs(dx);
    } else if (key === "ArrowLeft") {
      if (dx > -4) continue;
      along = -dx;
      off = Math.abs(dy);
    } else {
      if (dx < 4) continue;
      along = dx;
      off = Math.abs(dy);
    }
    const score = along + off * 2.5; // strongly prefer aligned targets
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

// All four arrows move focus; Enter activates natively; Esc backs out.
// Active only while a screen overlay is up — during play the modes own
// the keyboard.
document.addEventListener("keydown", (e) => {
  const screen = visibleScreen();
  if (!screen) return;

  if (e.key === "Escape") {
    e.preventDefault();
    if (screen.id === "trophy-overlay") closeTrophies();
    else if (screen.id === "screen-leaderboard") closeLeaderboard();
    else if (screen.id === "screen-settings") closeSettings();
    else if (screen.id !== "screen-menu") showMenu();
    return;
  }
  if (!e.key.startsWith("Arrow")) return;
  // Don't hijack left/right while typing in a field — let the caret move.
  const active = document.activeElement;
  if (
    active &&
    active.tagName === "INPUT" &&
    (e.key === "ArrowLeft" || e.key === "ArrowRight")
  ) {
    return;
  }
  const items = navItems(screen);
  if (!items.length) return;
  e.preventDefault();
  const current = items.includes(document.activeElement)
    ? document.activeElement
    : null;
  const target = current ? pickInDirection(items, current, e.key) : items[0];
  if (target) {
    target.focus();
    modes.zombie.audio.uiMove();
  }
});

// UI click on any button activation (mouse or keyboard) — also unlocks the
// audio context on the menu's first interaction.
document.addEventListener("click", (e) => {
  if (e.target.closest("button")) modes.zombie.audio.uiClick();
});

// ---- wiring -------------------------------------------------------------

for (const btn of document.querySelectorAll("[data-mode]")) {
  btn.addEventListener("click", () => launch(btn.dataset.mode));
}
for (const btn of document.querySelectorAll('[data-act="menu"]')) {
  btn.addEventListener("click", showMenu);
}

dailyBtn.addEventListener("click", () => setDaily(!daily));
versusBtn.addEventListener("click", () => setVersus(!versus));
$("trophy-btn").addEventListener("click", openTrophies);
$("trophy-close").addEventListener("click", closeTrophies);

$("leaderboard-btn").addEventListener("click", openLeaderboard);
$("leaderboard-close").addEventListener("click", closeLeaderboard);
$("settings-btn").addEventListener("click", openSettings);
$("settings-close").addEventListener("click", closeSettings);
$("fullscreen-btn").addEventListener("click", toggleFullscreen);

document.addEventListener("fullscreenchange", () => {
  $("fullscreen-btn").textContent = document.fullscreenElement
    ? "⛶ EXIT FULLSCREEN"
    : "⛶ FULLSCREEN";
});

$("set-sound").addEventListener("click", () => {
  const muted = modes.zombie.toggleMute();
  $("set-sound").textContent = muted ? "OFF" : "ON";
  muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
});
$("set-music").addEventListener("input", (e) => {
  modes.zombie.audio.setMusicVolume(Number(e.target.value) / 100);
});
$("set-sfx").addEventListener("input", (e) => {
  modes.zombie.audio.setSfxVolume(Number(e.target.value) / 100);
});
$("set-reset").addEventListener("click", () => {
  const btn = $("set-reset");
  if (btn.dataset.armed) {
    localStorage.removeItem("tod_profile_v2");
    localStorage.removeItem("tod_leaderboard_v2");
    btn.textContent = "PROGRESS CLEARED";
    btn.classList.remove("is-armed");
    delete btn.dataset.armed;
  } else {
    btn.dataset.armed = "1";
    btn.classList.add("is-armed");
    btn.textContent = "CONFIRM RESET?";
  }
});

$("restart").addEventListener("click", () => {
  if (current) modes[current].restart();
});
muteBtn.addEventListener("click", () => {
  const muted = modes.zombie.toggleMute();
  muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
});

// ---- boot ---------------------------------------------------------------

setDaily(daily);
setVersus(false);
muteBtn.textContent = localStorage.getItem("tod_muted") === "1" ? "\u{1F507}" : "\u{1F50A}";
showMenu();

// Detect a logged-in GameVolt session in the background; if present, runs
// use the server-validated leaderboard (otherwise the local one).
initRemote();

// ---- GameVolt account (sign-in / sign-out) ------------------------------
// Only meaningful when the SDK is present (i.e. served on the portal). The
// button opens GameVolt's own auth modal; signing in there reloads the frame
// via OAuth/magic-link redirect, after which initRemote() picks the session
// up and the server-validated boards light up.
(function wireAccount() {
  const btn = $("signin-btn");
  if (!btn || !window.GameVolt) return; // standalone dev: stays hidden

  function paint() {
    const user = window.GameVolt.auth?.getUser?.();
    if (user) {
      const name = user.username || user.email || "Player";
      btn.innerHTML = "\u{1F464} " + name + " · SIGN OUT";
    } else {
      btn.innerHTML = "\u{1F464} SIGN IN";
    }
    btn.hidden = false;
  }

  btn.addEventListener("click", () => {
    const user = window.GameVolt.auth?.getUser?.();
    if (user) {
      window.GameVolt.auth.logout?.();
    } else {
      window.GameVolt.auth.login?.();
    }
  });

  window.GameVolt.init?.("type-or-die");
  // Carry a guest's local trophies & stats into their account on sign-in.
  registerCloudMigration();
  window.GameVolt.onReady?.(paint);
  window.GameVolt.auth?.onStateChange?.(paint);
  paint();

  // Cross-device trophy sync: pull cloud-earned trophies into the local profile
  // on sign-in so a second signed-in device doesn't re-toast them (and the
  // trophy count is correct). Fires after the SDK has cached the cloud set.
  function backfill(user) {
    if (!user || !window.GameVolt.achievements?.getUnlockedIds) return;
    window.GameVolt.achievements.getUnlockedIds().then((ids) => {
      if (backfillTrophies(ids)) {
        // Refresh the trophy case if it's currently open.
        const overlay = $("trophy-overlay");
        if (overlay && !overlay.hidden) openTrophies();
      }
    });
  }
  window.GameVolt.auth?.onStateChange?.(backfill);
  const current = window.GameVolt.auth?.getUser?.();
  if (current) backfill(current);
})();

// Desktop-only (GDD §9): gate touch-only devices (no real keyboard). A
// "play anyway" escape covers hybrids that mis-detect.
if (
  window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(pointer: fine)").matches
) {
  const gate = $("desktop-gate");
  gate.hidden = false;
  $("gate-anyway").addEventListener("click", () => {
    gate.hidden = true;
  });
}
