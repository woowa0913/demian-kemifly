import { GAME } from "./config.js";
import { addFever, scoreMultiplier, updateMissions } from "./progression.js";
import { getTitle, loadLeaderboard, qualifiesForLeaderboard } from "./storage.js";

export function drainAudioEvents(state) {
  const events = state.audioEvents;
  state.audioEvents = [];
  return events;
}

export function emit(state, type) {
  state.audioEvents.push({ type });
}

export function collect(state, item) {
  state.combo += 1;
  state.itemsCollected += 1;
  updateLevel(state, item);
  addFever(state, item.kind === "goldCrystal" || item.kind === "star" ? 18 : 12, emit);
  state.score += (item.score + state.combo * 12) * scoreMultiplier(state);
  if (item.kind === "crystal" || item.kind === "goldCrystal") state.crystals += 1;
  if (item.heal) state.energy = Math.min(GAME.maxEnergy, state.energy + item.heal);
  if (item.shield) state.shield = Math.min(3, state.shield + item.shield);
  updateMissions(state, emit);
  state.effects.push({ x: item.x, y: item.y, text: `+${item.score}`, life: 0.7, good: true });
  if (item.shield) emit(state, "shield");
  else if (item.heal) emit(state, "heal");
  else emit(state, "collect");
}

function updateLevel(state, item) {
  const next = GAME.levelThresholds.reduce((level, threshold, index) => {
    return state.itemsCollected >= threshold ? index + 1 : level;
  }, 1);
  if (next <= state.level) return;
  state.level = Math.min(6, next);
  state.levelFlash = 1.2;
  state.score += state.level * 180;
  state.energy = Math.min(GAME.maxEnergy, state.energy + 8);
  state.effects.push({ x: item.x, y: item.y - 34, text: `LV ${state.level}!`, life: 1.1, good: true });
  emit(state, "levelup");
}

export function damage(state, amount, label) {
  if (state.damageTimer > 0) return;
  if (state.shield > 0) {
    state.shield -= 1;
    state.message = "보호막!";
    emit(state, "shield");
  } else {
    state.energy = Math.max(0, state.energy - amount);
    state.fever = Math.max(0, state.fever - 18);
    state.message = `${label} -${amount}`;
    state.shake = 8;
    emit(state, "damage");
  }
  state.damageTimer = GAME.damageCooldown;
}

export function finishRun(state, reason) {
  state.mode = "gameover";
  state.score = Math.floor(state.score);
  state.distance = Math.floor(state.distance);
  state.message = reason;
  state.leaderboard = loadLeaderboard();
  state.isRecord = qualifiesForLeaderboard(state.score);
  state.effects.push({ x: state.player.x + 52, y: state.player.y - 40, text: getTitle(state.score), life: 1, good: false });
  emit(state, "gameover");
}
