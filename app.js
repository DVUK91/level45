// LEVEL45 — tiny state (no backend)
// Saves progress in localStorage (mobile + laptop friendly)

const STORAGE_KEY = "level45_progress_v1";

// default progress
const DEFAULT_PROGRESS = {
  xp: 0,
  pattern: false,   // Trial 1
  rhythm: false,    // Trial 2
  response: false,  // Trial 3
};

function getProgress() {
  // 1) read new format
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PROGRESS,
        ...parsed,
        xp: Number(parsed.xp || 0),
      };
    } catch (e) {
      // if corrupted, fall back to default
      return { ...DEFAULT_PROGRESS };
    }
  }

  // 2) legacy support (from your old version)
  const legacyXp = Number(localStorage.getItem("xp") || 0);
  const legacyTrial1Done = localStorage.getItem("trial1") === "done";

  const migrated = {
    ...DEFAULT_PROGRESS,
    xp: legacyXp,
    pattern: legacyTrial1Done,
  };

  setProgress(migrated);
  return migrated;
}

function setProgress(next) {
  const clean = {
    ...DEFAULT_PROGRESS,
    ...next,
    xp: Number(next.xp || 0),
    pattern: Boolean(next.pattern),
    rhythm: Boolean(next.rhythm),
    response: Boolean(next.response),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

function addXP(amount) {
  const p = getProgress();
  p.xp += Number(amount || 0);
  return setProgress(p);
}

function completeTrial(trialKey, xpReward = 25) {
  const p = getProgress();
  if (trialKey in p) {
    p[trialKey] = true;
  }
  p.xp += Number(xpReward || 0);
  return setProgress(p);
}

function isComplete(trialKey) {
  const p = getProgress();
  return Boolean(p[trialKey]);
}

function resetProgress() {
  // remove new storage
  localStorage.removeItem(STORAGE_KEY);

  // also remove legacy keys (clean reset)
  localStorage.removeItem("xp");
  localStorage.removeItem("trial1");

  return { ...DEFAULT_PROGRESS };
}

// (optional) make available in console for debugging
window.LEVEL45 = {
  getProgress,
  setProgress,
  addXP,
  completeTrial,
  isComplete,
  resetProgress,
};
