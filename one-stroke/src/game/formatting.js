export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function utcDaySeed(daysAgo = 0, now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function todaySeed(now = new Date()) {
  return utcDaySeed(0, now);
}

export function formatUtcDay(daySeed, locale = "en-US") {
  const date = new Date(`${daySeed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return daySeed;
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function utcWeekInfo(now = new Date(), locale = "en-US") {
  const date = new Date(now);
  const utcDay = date.getUTCDay() || 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - utcDay + 1);
  const thursday = new Date(monday);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const weekYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((thursday - yearStart) / 86_400_000) + 1) / 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const format = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return {
    id: `${weekYear}-W${String(week).padStart(2, "0")}`,
    seed: `weekly-${weekYear}-W${String(week).padStart(2, "0")}`,
    startDay: monday.toISOString().slice(0, 10),
    endDay: sunday.toISOString().slice(0, 10),
    label: `${format.format(monday)}–${format.format(sunday)} · UTC`,
  };
}

export function createRunId() {
  return `run-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function toDisplayTime(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function toDisplayScore(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function toDisplayDecimal(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function toDisplayPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return `${toDisplayDecimal(value, 1)}%`;
}

export function toMachineDecimal(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number(value).toFixed(fractionDigits);
}

export function toDisplaySignedScoreDelta(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (value === 0) {
    return "PB";
  }
  const sign = value > 0 ? "+" : "-";
  return `${sign}${toDisplayScore(Math.abs(value))} p`;
}

export function toDisplaySignedTimeDelta(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  if (ms === 0) {
    return "PB";
  }
  const sign = ms > 0 ? "+" : "-";
  return `${sign}${toDisplayTime(Math.abs(ms))}`;
}

export function toDisplayPenaltySeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "+0.0s";
  }
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(seconds);
  return `+${formatted}s`;
}

export function toDisplayDateTime(iso) {
  if (!iso) {
    return "--";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
