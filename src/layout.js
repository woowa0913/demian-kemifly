import { GAME } from "./config.js";

export function createView() {
  return { width: GAME.width, height: GAME.height, portrait: false };
}

export function getView(state) {
  return state?.view || createView();
}

export function setView(state, next) {
  const previous = getView(state);
  const ratio = previous.height > 0 ? state.player.y / previous.height : 0.48;
  state.view = { ...next };
  state.player.x = playerX(state.view);
  state.player.y = clamp(state.view.height * ratio, 58, state.view.height - 58);
}

export function playerX(view) {
  return view.portrait ? 132 : 190;
}

export function applyCanvasLayout(canvas, state) {
  const portrait = window.innerHeight > window.innerWidth * 1.12;
  const view = portrait ? { width: 540, height: 960, portrait: true } : { width: 960, height: 540, portrait: false };
  if (canvas.width !== view.width) canvas.width = view.width;
  if (canvas.height !== view.height) canvas.height = view.height;
  canvas.style.setProperty("--canvas-ratio", String(view.width / view.height));
  if (!state.view) state.view = view;
  else if (state.view.width !== view.width || state.view.height !== view.height) setView(state, view);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
