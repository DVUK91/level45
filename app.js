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
let lastRewardTheme = 0;
let rewardThemeTimer;
let rewardThemePlaying = false;

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
  if(!settings.soundOn) stopRewardTheme();
  updateSoundToggles();
  if(settings.soundOn) startRewardTheme();
  return settings;
}

function unlockAudio(){
  if(audioUnlocked || !getSettings().soundOn) return audioUnlocked;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return false;
  if(!audioCtx) audioCtx = new Ctx();
  if(audioCtx.state === "suspended"){
    const resume = audioCtx.resume();
    if(resume && resume.then){
      resume.then(()=>{
        audioUnlocked = audioCtx.state === "running";
      }).catch(()=>{
        audioUnlocked = false;
      });
    }
  }
  audioUnlocked = audioCtx.state === "running";
  return audioUnlocked;
}

function tone(freq, duration, type, gainValue, delay){
  if(!getSettings().soundOn) return false;
  unlockAudio();
  if(!audioCtx || audioCtx.state !== "running") return false;
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
  return true;
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

function playRewardTheme(){
  if(!getSettings().soundOn) return false;

  const now = Date.now();
  if(now - lastRewardTheme < 4200) return false;

  const melody = [
    [523, 0.11, 0],
    [659, 0.11, 0.12],
    [784, 0.13, 0.24],
    [1047, 0.18, 0.38],
    [988, 0.1, 0.62],
    [1047, 0.1, 0.74],
    [1175, 0.16, 0.86],
    [1047, 0.22, 1.08],
    [784, 0.12, 1.38],
    [880, 0.12, 1.5],
    [1047, 0.3, 1.64]
  ];

  const bass = [
    [131, 0.2, 0],
    [196, 0.2, 0.38],
    [165, 0.2, 0.76],
    [262, 0.32, 1.38]
  ];

  let played = false;
  melody.forEach(([freq, duration, delay])=>{
    played = tone(freq, duration, "square", 0.026, delay) || played;
  });
  bass.forEach(([freq, duration, delay])=>{
    played = tone(freq, duration, "triangle", 0.018, delay) || played;
  });

  if(played) lastRewardTheme = now;
  return played;
}

function startRewardTheme(){
  if(!getSettings().soundOn) return false;
  if(rewardThemePlaying) return true;
  unlockAudio();
  if(!audioCtx) return false;
  if(audioCtx.state === "suspended"){
    const resume = audioCtx.resume();
    if(resume && resume.then){
      resume.then(()=>{
        if(audioCtx.state === "running") startRewardTheme();
      }).catch(()=>{});
    }
    return true;
  }
  if(!playRewardTheme()) return false;

  rewardThemePlaying = true;
  rewardThemeTimer = setInterval(()=>{
    if(!getSettings().soundOn){
      stopRewardTheme();
      return;
    }
    playRewardTheme();
  }, 4300);

  return true;
}

function stopRewardTheme(){
  rewardThemePlaying = false;
  lastRewardTheme = 0;
  if(rewardThemeTimer){
    clearInterval(rewardThemeTimer);
    rewardThemeTimer = undefined;
  }
}

function isRewardThemePlaying(){
  return rewardThemePlaying;
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
  startRewardTheme();
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

function showCompleteOverlay(nextUrl, options){
  const config = {
    kicker: "SYSTEM CONFIRMED",
    title: "MISSION COMPLETE",
    message: "Progress saved. Next route unlocked.",
    delay: 1450,
    ...options
  };
  const overlay = document.createElement("div");
  overlay.className = "complete-overlay";
  overlay.innerHTML = `
    <div class="complete-panel">
      <p class="kicker">${config.kicker}</p>
      <h2>${config.title}</h2>
      <p>${config.message}</p>
    </div>
  `;
  document.body.appendChild(overlay);
  sfxWin();
  setTimeout(()=>{ window.location.href = nextUrl; }, config.delay);
}

function requireUnlocked(kind){
  const progress = getProgress();
  if(kind === "rhythm" && !progress.pattern) window.location.href = "missions.html";
  if(kind === "response" && !progress.rhythm) window.location.href = "missions.html";
  if(kind === "reward" && !progress.response) window.location.href = "missions.html";
}

function bindGlobalEvents(){
  document.addEventListener("pointerdown", ()=>{
    unlockAudio();
    startRewardTheme();
  }, {once:true});
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
  window.addEventListener("pagehide", stopRewardTheme);
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
  playRewardTheme,
  startRewardTheme,
  stopRewardTheme,
  isRewardThemePlaying,
  initShell,
  updateHud,
  toast,
  showCompleteOverlay,
  requireUnlocked,
  progressPercent
};
