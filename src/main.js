import { createAudio } from "./audio.js";
import { loadAssets } from "./assets.js";
import { createGameState, drainAudioEvents, flap, showHall, startRun, submitRecord, togglePause, updateState } from "./game-state.js";
import { applyCanvasLayout, getView } from "./layout.js";
import { render } from "./renderer.js";
import { saveScoreRemote, syncLeaderboardFromServer } from "./storage.js";
import { renderGameToText } from "./text-state.js";

const canvas = document.querySelector("#game");
const nameInput = document.querySelector("#nameInput");
const introVideo = document.querySelector("#introVideo");
const ctx = canvas.getContext("2d", { alpha: false });
const state = createGameState();
const audio = createAudio();
let assets = null;
let lastTime = performance.now();

bootstrap();

async function bootstrap() {
  assets = await loadAssets();
  applyCanvasLayout(canvas, state);
  prepareIntroVideo();
  bindInput();
  registerServiceWorker();
  exposeTestHooks();
  render(ctx, state, assets, introVideo);
  syncRemoteLeaderboard();
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.clock += dt;
  updateState(state, dt);
  playQueuedAudio();
  render(ctx, state, assets, introVideo);
  syncNameInput();
  syncIntroVideo();
  requestAnimationFrame(loop);
}

function bindInput() {
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("pointerdown", handlePointer);
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
  nameInput.addEventListener("keydown", handleNameKey);
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
  } else if (event.code === "Escape" && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  syncIntroVideo();
}

function handleNameKey(event) {
  if (event.code !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  handleRecordSubmit();
  syncNameInput();
}

function handlePointer(event) {
  audio.unlock();
  const point = toCanvasPoint(event);
  const button = state.buttons.find((item) => isInside(point, item));
  if (button) {
    performAction(button.action);
    syncIntroVideo();
    return;
  }
  if (state.mode === "playing" || state.mode === "menu") flap(state);
  syncIntroVideo();
}

function handleEnter() {
  if (state.mode === "menu" || state.mode === "hall") startRun(state);
  else if (state.mode === "gameover" && state.isRecord && !state.saved) handleRecordSubmit();
  else if (state.mode === "gameover") startRun(state);
  else if (state.mode === "paused") togglePause(state);
  syncIntroVideo();
}

function performAction(action) {
  if (action === "start" || action === "restart") startRun(state);
  else if (action === "resume") togglePause(state);
  else if (action === "hall") showHall(state);
  else if (action === "back") state.mode = "menu";
  else if (action === "save") handleRecordSubmit();
  else if (action === "sound") state.soundMuted = audio.toggleMute();
  if (action !== "sound") audio.play("button");
  syncNameInput();
  syncIntroVideo();
}

function handleRecordSubmit() {
  const name = nameInput.value;
  const stats = {
    score: state.score,
    distance: state.distance,
    crystals: state.crystals,
  };
  const accepted = submitRecord(state, name);
  if (!accepted) return;
  saveScoreRemote(name, stats).then((leaderboard) => {
    state.leaderboard = leaderboard;
    render(ctx, state, assets, introVideo);
  });
}

function syncNameInput() {
  const visible = state.mode === "gameover" && state.isRecord && !state.saved;
  nameInput.style.display = visible ? "block" : "none";
  if (!visible) return;
  if (!nameInput.value) nameInput.value = "KEMI";
  const rect = canvas.getBoundingClientRect();
  nameInput.style.left = `${rect.left + rect.width / 2}px`;
  nameInput.style.top = `${rect.top + rect.height * 0.61}px`;
  if (document.activeElement !== nameInput) nameInput.focus({ preventScroll: true });
}

function syncRemoteLeaderboard() {
  syncLeaderboardFromServer().then((leaderboard) => {
    state.leaderboard = leaderboard;
    render(ctx, state, assets, introVideo);
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
    render(ctx, state, assets, introVideo);
    syncNameInput();
    syncIntroVideo();
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
  render(ctx, state, assets, introVideo);
  syncNameInput();
}

function prepareIntroVideo() {
  if (!introVideo) return;
  introVideo.play().catch(() => {});
}

function syncIntroVideo() {
  if (!introVideo) return;
  if (state.mode === "menu") introVideo.play().catch(() => {});
  else introVideo.pause();
}
