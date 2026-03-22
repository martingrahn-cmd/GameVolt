/* ── Daily Challenge Mixin ── */

import { TILE_TYPES, TILE_INDEX_BY_ID, DAILY_STORAGE_KEY, DAILY_CHALLENGE_VERSION } from "./constants.js";
import { gamevolt } from "./gamevolt.js";

export const dailyMixin = {
  initializeDailyLoop() {
    const today = this.getLocalDateKey();
    const raw = this.loadDailyState();
    this.dailyState = {
      version: 1,
      streak: Number.isFinite(raw?.streak) ? Math.max(0, Math.floor(raw.streak)) : 0,
      lastLoginDate: typeof raw?.lastLoginDate === "string" ? raw.lastLoginDate : "",
      lastCompletedDate: typeof raw?.lastCompletedDate === "string" ? raw.lastCompletedDate : "",
      challenge: null,
    };
    if (this.dailyState.lastCompletedDate) {
      const gap = this.dayDiffBetween(this.dailyState.lastCompletedDate, today);
      if (gap > 1) this.dailyState.streak = 0;
    }
    let challenge = null;
    const generatedChallenge = this.createDailyChallengeForDate(today, this.dailyState.streak);
    if (raw?.challenge?.dateKey === today) {
      const savedVersion = Number(raw.challenge.version ?? 1);
      const savedTarget = Number(raw.challenge.target);
      const savedProgress = Number(raw.challenge.progress);
      if (savedVersion === DAILY_CHALLENGE_VERSION) {
        challenge = {
          version: DAILY_CHALLENGE_VERSION, dateKey: today,
          type: typeof raw.challenge.type === "string" ? raw.challenge.type : "score",
          target: Number.isFinite(savedTarget) ? Math.max(1, Math.floor(savedTarget)) : 1,
          progress: Number.isFinite(savedProgress) ? Math.max(0, Math.floor(savedProgress)) : 0,
          completed: Boolean(raw.challenge.completed),
          tileId: typeof raw.challenge.tileId === "string" ? raw.challenge.tileId : "",
        };
        challenge.progress = Math.min(challenge.target, challenge.progress);
        challenge.completed = challenge.completed || challenge.progress >= challenge.target;
      } else {
        challenge = { ...generatedChallenge };
        if (Number.isFinite(savedTarget) && savedTarget > 0 && Number.isFinite(savedProgress) && savedProgress > 0) {
          const ratio = Math.min(1, Math.max(0, savedProgress / savedTarget));
          challenge.progress = Math.min(challenge.target, Math.floor(challenge.target * ratio));
        }
        if (Boolean(raw.challenge.completed)) { challenge.progress = challenge.target; challenge.completed = true; }
      }
    }
    if (!challenge) challenge = generatedChallenge;
    this.dailyState.challenge = challenge;
    if (this.dailyState.lastLoginDate !== today) {
      this.pendingDailyReward = this.getDailyLoginReward(this.dailyState.streak);
      this.dailyState.lastLoginDate = today;
    }
    this.saveDailyState();
  },

  getLocalDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  dateFromKey(dateKey) {
    const [y, m, d] = String(dateKey).split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(y, m - 1, d);
  },

  dayDiffBetween(fromDateKey, toDateKey) {
    const from = this.dateFromKey(fromDateKey); const to = this.dateFromKey(toDateKey);
    if (!from || !to) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  },

  shiftDateKey(dateKey, deltaDays) {
    const source = this.dateFromKey(dateKey); if (!source) return this.getLocalDateKey();
    source.setDate(source.getDate() + deltaDays); return this.getLocalDateKey(source);
  },

  loadDailyState() { try { const raw = window.localStorage.getItem(DAILY_STORAGE_KEY); if (!raw) return null; const parsed = JSON.parse(raw); return parsed && typeof parsed === "object" ? parsed : null; } catch { return null; } },
  saveDailyState() { if (!this.dailyState) return; try { window.localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(this.dailyState)); } catch {} },

  syncDailyProgress(force = false) { if (!force && !this.dailyProgressDirty) return; this.dailyProgressDirty = false; this.saveDailyState(); this.renderDailyPanel(); },

  createDailyChallengeForDate(dateKey, streak = 0) {
    const seed = Number(String(dateKey).replace(/-/g, "")) || 0;
    const modes = ["score", "clear", "collect", "score", "clear", "collect", "special", "chain"];
    const mode = modes[Math.abs(seed % modes.length)];
    const tier = Math.abs(Math.floor(seed / 10) % 3);
    const streakTier = Math.min(3, Math.floor(Math.max(0, streak) / 4));
    const difficulty = tier + streakTier;
    const challenge = { version: DAILY_CHALLENGE_VERSION, dateKey, type: "score", target: 3200, progress: 0, completed: false, tileId: "" };
    if (mode === "score") { challenge.type = "score"; challenge.target = 3000 + difficulty * 700; return challenge; }
    if (mode === "clear") { challenge.type = "clear"; challenge.target = 42 + difficulty * 8; return challenge; }
    if (mode === "collect") { challenge.type = "collect"; const tileIndex = Math.abs((seed * 7 + 3) % TILE_TYPES.length); challenge.tileId = TILE_TYPES[tileIndex].id; challenge.target = 18 + difficulty * 5; return challenge; }
    if (mode === "special") { challenge.type = "special"; challenge.target = 3 + Math.floor((difficulty + 1) / 2); return challenge; }
    challenge.type = "chain"; challenge.target = 2 + Math.floor(difficulty / 2); return challenge;
  },

  getDailyChallengeText(challenge) {
    if (!challenge) return "No challenge active.";
    if (challenge.type === "score") return `Score ${challenge.target} points today.`;
    if (challenge.type === "clear") return `Clear ${challenge.target} tiles today.`;
    if (challenge.type === "collect") { const tileIndex = TILE_INDEX_BY_ID[challenge.tileId]; const tile = TILE_TYPES[tileIndex]; return `Collect ${tile?.name ?? "tiles"} ${tile?.icon ?? "◆"} x${challenge.target} today.`; }
    if (challenge.type === "special") return `Create ${challenge.target} special tiles today.`;
    if (challenge.type === "chain") return `Make ${challenge.target} combo chains today.`;
    return "Complete today's goal.";
  },

  getDailyLoginReward(streak) { const s = Math.max(0, Math.floor(streak)); return { moves: 1 + Number(s >= 7), fever: 10 + Math.min(16, s * 2) }; },

  getDailyChallengeReward(streak, challengeType = "score") {
    const s = Math.max(1, Math.floor(streak));
    const profile = { score: { score: 320, fever: 10 }, clear: { score: 360, fever: 12 }, collect: { score: 340, fever: 11 }, special: { score: 420, fever: 14 }, chain: { score: 460, fever: 15 } };
    const base = profile[challengeType] ?? profile.score;
    return { moves: 1 + Number(s >= 5), score: base.score + Math.min(700, s * 55), fever: base.fever + Math.min(16, Math.floor(s / 2) * 2) };
  },

  getProjectedDailyStreak() {
    if (!this.dailyState) return 1;
    const today = this.getLocalDateKey(); const yesterday = this.shiftDateKey(today, -1);
    if (this.dailyState.lastCompletedDate === yesterday) return this.dailyState.streak + 1;
    if (this.dailyState.lastCompletedDate === today) return this.dailyState.streak;
    return 1;
  },

  applyPendingDailyReward() {
    if (!this.pendingDailyReward) return;
    const reward = this.pendingDailyReward; this.pendingDailyReward = null;
    this.moves += reward.moves; this.addFeverCharge(reward.fever);
    this.dailyRewardStatus = `Daily bonus: +${reward.moves} moves, +${reward.fever}% FEVER`;
  },

  recordDailyProgress(kind, amount = 1, tileId = "") {
    if (!this.dailyState?.challenge || this.dailyState.challenge.completed) return;
    const challenge = this.dailyState.challenge;
    if (!Number.isFinite(amount) || amount <= 0) return;
    let delta = 0;
    if (challenge.type === "score" && kind === "score") delta = Math.floor(amount);
    if (challenge.type === "clear" && kind === "clear") delta = Math.floor(amount);
    if (challenge.type === "collect" && kind === "collect" && tileId === challenge.tileId) delta = Math.floor(amount);
    if (challenge.type === "special" && kind === "special") delta = Math.floor(amount);
    if (challenge.type === "chain" && kind === "chain") delta = Math.floor(amount);
    if (delta <= 0) return;
    challenge.progress = Math.min(challenge.target, challenge.progress + delta);
    if (challenge.progress >= challenge.target) { this.completeDailyChallenge(); return; }
    this.dailyProgressDirty = true;
  },

  completeDailyChallenge() {
    const challenge = this.dailyState?.challenge; if (!challenge || challenge.completed) return;
    challenge.completed = true; challenge.progress = challenge.target;
    const today = this.getLocalDateKey(); const yesterday = this.shiftDateKey(today, -1);
    if (this.dailyState.lastCompletedDate === yesterday) this.dailyState.streak += 1;
    else if (this.dailyState.lastCompletedDate !== today) this.dailyState.streak = 1;
    this.dailyState.lastCompletedDate = today;
    gamevolt.addStat("dailiesCompleted", 1);
    gamevolt.setStat("maxDailyStreak", this.dailyState.streak);
    const reward = this.getDailyChallengeReward(this.dailyState.streak, challenge.type);
    this.moves += reward.moves; this.score += reward.score; this.addFeverCharge(reward.fever);
    this.dailyProgressDirty = true; this.syncDailyProgress(true);
    this.showComboBurst("DAILY CLEAR");
    this.setStatus(`Daily challenge complete! +${reward.moves} moves, +${reward.score} score, +${reward.fever}% FEVER.`);
    this.updateHUD();
  },

  renderDailyPanel() {
    if (!this.dailyTaskEl || !this.dailyFillEl || !this.dailyCountEl || !this.dailyStreakEl || !this.dailyRewardEl) return;
    const challenge = this.dailyState?.challenge;
    if (!challenge) { this.dailyTaskEl.textContent = "Loading daily challenge..."; this.dailyFillEl.style.width = "0%"; this.dailyCountEl.textContent = "0/0"; this.dailyStreakEl.textContent = "Streak 0"; this.dailyRewardEl.textContent = "Reward waiting"; return; }
    const progress = Math.min(challenge.target, challenge.progress);
    const percent = challenge.target > 0 ? Math.round((progress / challenge.target) * 100) : 0;
    this.dailyTaskEl.textContent = this.getDailyChallengeText(challenge);
    this.dailyFillEl.style.width = `${percent}%`; this.dailyCountEl.textContent = `${progress}/${challenge.target}`;
    this.dailyStreakEl.textContent = `Streak ${this.dailyState.streak}`;
    this.dailyProgressEl?.setAttribute("aria-valuenow", `${percent}`);
    this.dailyPanelEl?.classList.toggle("complete", challenge.completed);
    if (challenge.completed) { this.dailyRewardEl.textContent = "Done today. New challenge tomorrow."; return; }
    const projectedStreak = this.getProjectedDailyStreak();
    const preview = this.getDailyChallengeReward(projectedStreak, challenge.type);
    this.dailyRewardEl.textContent = `Reward: +${preview.moves} moves, +${preview.score} score, +${preview.fever}% FEVER`;
  },
};
