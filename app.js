// LEVEL45 — tiny state (no backend)
// Saves progress in localStorage

function getState() {
  return {
    xp: Number(localStorage.getItem("xp") || 0),
    trial1: localStorage.getItem("trial1") === "done",
  };
}

function setState(next) {
  localStorage.setItem("xp", String(next.xp));
  localStorage.setItem("trial1", next.trial1 ? "done" : "todo");
}

function addXP(amount) {
  const s = getState();
  s.xp += amount;
  setState(s);
  return s;
}
