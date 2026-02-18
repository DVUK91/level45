// LEVEL45 — tiny state (no backend)
// Saves progress in localStorage (mobile + laptop friendly)

const STORAGE_KEY = "level45_progress_v1";

// --- Settings (global) ---
const SETTINGS_KEY = "level45_settings_v1";
const DEFAULT_SETTINGS = { soundOn: true };

function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function setSettings(next) {
  const clean = {
    ...DEFAULT_SETTINGS,
    ...next,
    soundOn: Boolean(next.soundOn),
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

function isSoundOn() {
  return getSettings().soundOn;
}

function toggleSound() {
  const s = getSettings();
  const next = setSettings({ soundOn: !s.soundOn });
  updateSoundToggleUI(next.soundOn);
  return next.soundOn;
}

// --- Progress ---
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
    } catch {
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
  if (trialKey in p) p[trialKey] = true;
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

// --- Sound FX (tiny, retro) ---
let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

// Unlock audio on first user interaction (mobile safe)
document.addEventListener(
  "pointerdown",
  () => {
    const ctx = _getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  },
  { once: true }
);

function playBeep({ freq = 440, dur = 0.06, type = "square", vol = 0.05 } = {}) {
  if (!isSoundOn()) return;

  const ctx = _getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // soft envelope to avoid clicks
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToToValueAtTime?.(0.0001, now + dur); // (safety if browser supports typo)
  // Correct line (keep this one)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function sfxOk() {
  playBeep({ freq: 880, dur: 0.05, type: "square", vol: 0.05 });
}
function sfxBad() {
  playBeep({ freq: 140, dur: 0.08, type: "sawtooth", vol: 0.06 });
}
function sfxWin() {
  playBeep({ freq: 523, dur: 0.06, type: "square", vol: 0.05 }); // C5
  setTimeout(() => playBeep({ freq: 659, dur: 0.06, type: "square", vol: 0.05 }), 80);  // E5
  setTimeout(() => playBeep({ freq: 784, dur: 0.07, type: "square", vol: 0.05 }), 160); // G5
}

// --- Sound toggle UI (inject into top nav) ---
function updateSoundToggleUI(on) {
  const btn = document.getElementById("soundToggleBtn");
  if (!btn) return;

  btn.textContent = on ? "SFX: ON" : "SFX: OFF";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}


function mountSoundToggle() {
  // Your pages use <div class="nav">...</div>
  const nav = document.querySelector(".nav");
  if (!nav) return;

  if (document.getElementById("soundToggleBtn")) return;

  const btn = document.createElement("button");
  btn.id = "soundToggleBtn";
  btn.className = "btn btn-ghost mono sound-toggle";
  btn.type = "button";
  btn.title = "Sound effects";


  updateSoundToggleUI(isSoundOn());

  btn.addEventListener("click", () => {
    toggleSound();
  });

  nav.appendChild(btn);
}

// Try multiple times (works even if scripts load early/oddly)
mountSoundToggle();
document.addEventListener("DOMContentLoaded", mountSoundToggle);
setTimeout(mountSoundToggle, 0);

// Expose API
window.LEVEL45 = {
  // progress
  getProgress,
  setProgress,
  addXP,
  completeTrial,
  isComplete,
  resetProgress,

  // sound
  sfxOk,
  sfxBad,
  sfxWin,
  isSoundOn,
  toggleSound,
};
