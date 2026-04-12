const STORAGE_KEY = "level45.progress";
const SETTINGS_KEY = "level45.settings";

const DEFAULT_PROGRESS = {
  xp: 0,
  pattern: false,
  rhythm: false,
  response: false
};

const DEFAULT_SETTINGS = {
  soundOn: true
};

let audioCtx;
let audioUnlocked = false;

function readJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? {...fallback, ...JSON.parse(raw)} : {...fallback};
  }catch{
    return {...fallback};
  }
}

function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function getProgress(){
  return readJson(STORAGE_KEY, DEFAULT_PROGRESS);
}

function setProgress(next){
  const progress = {...DEFAULT_PROGRESS, ...next};
  writeJson(STORAGE_KEY, progress);
  return progress;
}

function completeTrial(trialKey){
  const progress = getProgress();
  if(!progress[trialKey]){
    progress[trialKey] = true;
    progress.xp = Math.min(300, progress.xp + 100);
  }
  setProgress(progress);
  return progress;
}

function resetProgress(){
  localStorage.removeItem(STORAGE_KEY);
  return getProgress();
}

function getSettings(){
  return readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
}

function setSettings(next){
  const settings = {...DEFAULT_SETTINGS, ...next};
  writeJson(SETTINGS_KEY, settings);
  return settings;
}

function toggleSound(){
  const settings = getSettings();
  settings.soundOn = !settings.soundOn;
  setSettings(settings);
  updateSoundToggles();
  if(settings.soundOn) unlockAudio();
  return settings;
}

function unlockAudio(){
  if(audioUnlocked || !getSettings().soundOn) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return;
  if(!audioCtx) audioCtx = new Ctx();
  if(audioCtx.state === "suspended") audioCtx.resume();
  audioUnlocked = true;
}

function tone(freq, duration, type, gainValue, delay){
  if(!getSettings().soundOn) return;
  unlockAudio();
  if(!audioCtx) return;
  const now = audioCtx.currentTime + (delay || 0);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || "square";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function sfxOk(){
  tone(540, 0.08, "square", 0.035, 0);
  tone(810, 0.1, "square", 0.032, 0.07);
}

function sfxBad(){
  tone(180, 0.12, "sawtooth", 0.04, 0);
  tone(120, 0.14, "sawtooth", 0.035, 0.08);
}

function sfxWin(){
  tone(440, 0.1, "square", 0.035, 0);
  tone(660, 0.1, "square", 0.035, 0.1);
  tone(880, 0.16, "square", 0.035, 0.2);
}

function updateSoundToggles(){
  const settings = getSettings();
  document.querySelectorAll("[data-sound-toggle]").forEach((button)=>{
    button.textContent = `SFX: ${settings.soundOn ? "ON" : "OFF"}`;
    button.setAttribute("aria-pressed", String(settings.soundOn));
  });
}

function trialCount(progress){
  return ["pattern", "rhythm", "response"].filter((key)=>progress[key]).length;
}

function progressPercent(progress){
  return Math.round((trialCount(progress) / 3) * 100);
}

function updateHud(){
  const progress = getProgress();
  document.querySelectorAll("[data-progress-bar]").forEach((bar)=>{
    bar.style.width = `${progressPercent(progress)}%`;
  });
  document.querySelectorAll("[data-xp]").forEach((el)=>{
    el.textContent = String(progress.xp);
  });
  document.querySelectorAll("[data-complete-count]").forEach((el)=>{
    el.textContent = String(trialCount(progress));
  });
  updateSoundToggles();
}

function initShell(active){
  const topbar = document.querySelector("[data-topbar]");
  const progress = getProgress();
  if(topbar){
    topbar.classList.add("topbar");
    topbar.innerHTML = `
      <div class="topbar-inner">
        <a class="brand" href="index.html" aria-label="Level 45 home">
          <span class="status-dot"></span>
          <span>
            <span class="brand-title">LEVEL 45</span>
            <span class="brand-sub">PLAYER: LUKI13</span>
          </span>
        </a>
        <nav class="nav" aria-label="Main navigation">
          <a href="profile.html" ${active === "profile" ? "class='active'" : ""}>PROFILE</a>
          <a href="missions.html" ${active === "missions" ? "class='active'" : ""}>MISSIONS</a>
          <button class="nav-button" type="button" data-sound-toggle title="Sound effects">SFX: ON</button>
        </nav>
      </div>
      <div class="progress-wrap" aria-label="mission progress">
        <div class="progress ${progressPercent(progress) === 100 ? "success" : ""}">
          <div class="bar" data-progress-bar></div>
        </div>
      </div>
    `;
  }
  updateHud();
}

function toast(message){
  let el = document.querySelector(".toast");
  if(!el){
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.remove("show"), 1800);
}

function showCompleteOverlay(nextUrl){
  const overlay = document.createElement("div");
  overlay.className = "complete-overlay";
  overlay.innerHTML = `
    <div class="complete-panel">
      <p class="kicker">SYSTEM CONFIRMED</p>
      <h2>TRIAL COMPLETE</h2>
      <p>Progress saved. Next route unlocked.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  sfxWin();
  setTimeout(()=>{ window.location.href = nextUrl; }, 1450);
}

function requireUnlocked(kind){
  const progress = getProgress();
  if(kind === "rhythm" && !progress.pattern) window.location.href = "missions.html";
  if(kind === "response" && !progress.rhythm) window.location.href = "missions.html";
  if(kind === "reward" && !progress.response) window.location.href = "missions.html";
}

function bindGlobalEvents(){
  document.addEventListener("pointerdown", unlockAudio, {once:true});
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event)=>{
    const now = Date.now();
    if(now - lastTouchEnd <= 320){
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, {passive:false});
  document.addEventListener("gesturestart", (event)=>{
    event.preventDefault();
  });
  document.addEventListener("click", (event)=>{
    if(event.target.matches("[data-sound-toggle]")){
      toggleSound();
    }
  });
}

bindGlobalEvents();
window.Level45 = {
  getProgress,
  setProgress,
  completeTrial,
  resetProgress,
  getSettings,
  toggleSound,
  sfxOk,
  sfxBad,
  sfxWin,
  initShell,
  updateHud,
  toast,
  showCompleteOverlay,
  requireUnlocked,
  progressPercent
};
