import { createAudio } from "./audio.js";
import { loadAssets } from "./assets.js";
import { SUPPORT_URL } from "./config.js";
import { createGameState, drainAudioEvents, flap, showHall, startRun, submitRecord, togglePause, updateState } from "./game-state.js";
import { applyCanvasLayout, getView } from "./layout.js";
import { render } from "./renderer.js";
import { hasValidName, saveScoreRemote, syncLeaderboardFromServer } from "./storage.js";
import { renderGameToText } from "./text-state.js";
import { trackStatsEvent, trackVisitOnce } from "./analytics.js";

const canvas = document.querySelector("#game");
const nameInput = document.querySelector("#nameInput");
const ctx = canvas.getContext("2d", { alpha: false });
const state = createGameState();
const audio = createAudio();
let assets = null;
let lastTime = performance.now();
let pointerHeld = false;
let pointerHoldTimer = 0;

bootstrap();

async function bootstrap() {
  assets = await loadAssets();
  applyCanvasLayout(canvas, state);
  bindInput();
  registerServiceWorker();
  exposeTestHooks();
  render(ctx, state, assets);
  syncRemoteLeaderboard();
  trackVisitOnce();
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.clock += dt;
  updateHeldPointer(dt);
  updateState(state, dt);
  playQueuedAudio();
  render(ctx, state, assets);
  syncNameInput();
  requestAnimationFrame(loop);
}

function bindInput() {
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", releasePointer);
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
  nameInput.addEventListener("keydown", handleNameKey);
  nameInput.addEventListener("change", handleNameCommit);
  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ -]/g, "").slice(0, 8);
  });
}

function handleKeyDown(event) {
  audio.unlock();
  if (event.code === "Space") {
    event.preventDefault();
    flap(state);
  } else if (event.code === "KeyP") {
    togglePause(state);
  } else if (event.code === "KeyF") {
    toggleFullscreen();
  } else if (event.code === "KeyM") {
    state.soundMuted = audio.toggleMute();
  } else if (event.code === "Enter") {
    event.preventDefault();
    handleEnter();
  } else if (event.code === "Escape" && (state.mode === "playing" || state.mode === "paused")) {
    event.preventDefault();
    togglePause(state);
  } else if (event.code === "Escape" && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function handleNameKey(event) {
  if (event.key !== "Enter" && event.code !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  handleRecordSubmit();
  syncNameInput();
}

function handleNameCommit(event) {
  if (state.mode !== "gameover" || !state.isRecord || state.saved) return;
  event.preventDefault();
  handleRecordSubmit();
  syncNameInput();
}

function handlePointerDown(event) {
  event.preventDefault();
  audio.unlock();
  const point = toCanvasPoint(event);
  const button = state.buttons.find((item) => isInside(point, item));
  if (button) {
    releasePointer();
    performAction(button.action);
    return;
  }
  if (state.mode === "menu") {
    startRunTracked();
  } else if (state.mode === "playing") {
    flap(state);
    pointerHeld = true;
    pointerHoldTimer = 0.16;
    if (event.pointerId !== undefined) canvas.setPointerCapture(event.pointerId);
  }
}

function releasePointer(event) {
  pointerHeld = false;
  pointerHoldTimer = 0;
  if (event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function updateHeldPointer(dt) {
  if (!pointerHeld || state.mode !== "playing") return;
  pointerHoldTimer -= dt;
  if (pointerHoldTimer > 0) return;
  flap(state);
  pointerHoldTimer = 0.14;
}

function handleEnter() {
  if (state.mode === "menu" || state.mode === "hall") startRunTracked();
  else if (state.mode === "gameover" && state.isRecord && !state.saved) handleRecordSubmit();
  else if (state.mode === "gameover") startRunTracked();
  else if (state.mode === "paused") togglePause(state);
}

function performAction(action) {
  if (action === "start" || action === "restart") startRunTracked();
  else if (action === "resume") togglePause(state);
  else if (action === "pause") togglePause(state);
  else if (action === "hall") showHall(state);
  else if (action === "back") state.mode = "menu";
  else if (action === "save") handleRecordSubmit();
  else if (action === "support") openSupportPage();
  else if (action === "sound") state.soundMuted = audio.toggleMute();
  if (action !== "sound") audio.play("button");
  syncNameInput();
}

function startRunTracked() {
  startRun(state);
  trackStatsEvent("start");
}

function openSupportPage() {
  const opened = window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

function handleRecordSubmit() {
  const name = nameInput.value;
  if (!hasValidName(name)) {
    state.message = "이름을 입력해주세요";
    render(ctx, state, assets);
    nameInput.focus({ preventScroll: true });
    return;
  }
  const stats = {
    score: state.score,
    distance: state.distance,
    crystals: state.crystals,
  };
  const accepted = submitRecord(state, name);
  if (!accepted) return;
  trackStatsEvent("record");
  saveScoreRemote(name, stats).then((leaderboard) => {
    state.leaderboard = leaderboard;
    render(ctx, state, assets);
  });
}

function syncNameInput() {
  const visible = state.mode === "gameover" && state.isRecord && !state.saved;
  nameInput.style.display = visible ? "block" : "none";
  if (!visible) return;
  const rect = canvas.getBoundingClientRect();
  const view = getView(state);
  const inputCanvasY = view.portrait ? 534 : view.height * 0.61;
  nameInput.style.left = `${rect.left + rect.width / 2}px`;
  nameInput.style.top = `${rect.top + (inputCanvasY / view.height) * rect.height}px`;
  nameInput.style.width = view.portrait ? `${Math.min(300, rect.width * 0.76)}px` : "";
  if (document.activeElement !== nameInput) nameInput.focus({ preventScroll: true });
}

function syncRemoteLeaderboard() {
  syncLeaderboardFromServer().then((leaderboard) => {
    state.leaderboard = leaderboard;
    render(ctx, state, assets);
  });
}

function toCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const view = getView(state);
  const x = ((event.clientX - rect.left) / rect.width) * view.width;
  const y = ((event.clientY - rect.top) / rect.height) * view.height;
  return { x, y };
}

function isInside(point, box) {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function exposeTestHooks() {
  window.render_game_to_text = () => renderGameToText(state);
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      state.clock += 1 / 60;
      updateState(state, 1 / 60);
    }
    playQueuedAudio();
    render(ctx, state, assets);
    syncNameInput();
  };
}

function playQueuedAudio() {
  for (const event of drainAudioEvents(state)) audio.play(event);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol !== "http:") return;
  const local = ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
  if (local) {
    navigator.serviceWorker.getRegistrations().then((items) => items.forEach((item) => item.unregister())).catch(() => {});
    return;
  }
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function handleResize() {
  applyCanvasLayout(canvas, state);
  render(ctx, state, assets);
  syncNameInput();
}
