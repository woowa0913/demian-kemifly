import { GAME } from "./config.js";
import { collect, damage, emit, finishRun } from "./game-actions.js";
import { createPlayer, intersects, spawnItem, spawnObstacle } from "./game-rules.js";
import { createView, getView } from "./layout.js";
import { addFever, createMissions, scoreMultiplier, updateMissions } from "./progression.js";
import { secureRange } from "./random.js";
import { loadLeaderboard, saveScore } from "./storage.js";

export { drainAudioEvents } from "./game-actions.js";

export function createGameState() {
  return {
    mode: "menu",
    view: createView(),
    clock: 0,
    time: 0,
    score: 0,
    distance: 0,
    map: "sky",
    crystals: 0,
    itemsCollected: 0,
    level: 1,
    levelFlash: 0,
    energy: GAME.maxEnergy,
    shield: 0,
    combo: 0,
    fever: 0,
    feverTime: 0,
    nearMisses: 0,
    missions: createMissions(),
    message: "",
    saved: false,
    isRecord: false,
    leaderboard: loadLeaderboard(),
    buttons: [],
    audioEvents: [],
    soundMuted: false,
    shake: 0,
    player: createPlayer(createView()),
    obstacles: [],
    items: [],
    effects: [],
    spawnTimer: 0,
    itemTimer: 0,
    damageTimer: 0,
  };
}

export function startRun(state) {
  Object.assign(state, {
    mode: "playing",
    time: 0,
    score: 0,
    distance: 0,
    map: "sky",
    crystals: 0,
    itemsCollected: 0,
    level: 1,
    levelFlash: 0,
    energy: GAME.maxEnergy,
    shield: 0,
    combo: 0,
    fever: 0,
    feverTime: 0,
    nearMisses: 0,
    missions: createMissions(),
    message: "",
    saved: false,
    isRecord: false,
    player: createPlayer(getView(state)),
    obstacles: [],
    items: [],
    effects: [],
    spawnTimer: 0.5,
    itemTimer: 0.8,
    damageTimer: 0,
  });
  emit(state, "start");
}

export function flap(state) {
  if (state.mode === "menu") {
    startRun(state);
    return;
  }
  if (state.mode !== "playing") return;
  state.player.vy = GAME.flapVelocity;
  state.player.frameKick = 0.16;
  emit(state, "flap");
}

export function togglePause(state) {
  if (state.mode === "playing") state.mode = "paused";
  else if (state.mode === "paused") state.mode = "playing";
}

export function updateState(state, dt) {
  if (state.mode !== "playing") return;
  const step = Math.min(dt, 1 / 30);
  state.time += step;
  state.damageTimer = Math.max(0, state.damageTimer - step);
  state.feverTime = Math.max(0, state.feverTime - step);
  state.levelFlash = Math.max(0, state.levelFlash - step);
  updatePlayer(state, step);
  updateSpawns(state, step);
  updateEntities(state, step);
  updateCollisions(state);
  updateScore(state, step);
  state.shake = Math.max(0, state.shake - step * 12);
  if (state.energy <= 0) finishRun(state, "에너지가 모두 소진됐어요");
}

export function submitRecord(state, name) {
  if (state.mode !== "gameover" || state.saved || !state.isRecord) return false;
  state.leaderboard = saveScore(name, state);
  state.saved = true;
  emit(state, "button");
  return true;
}

export function showHall(state) {
  state.mode = "hall";
  state.leaderboard = loadLeaderboard();
}

function updatePlayer(state, dt) {
  const player = state.player;
  const view = getView(state);
  player.vy = Math.min(GAME.maxFall, player.vy + GAME.gravity * dt);
  player.y += player.vy * dt;
  player.frameKick = Math.max(0, player.frameKick - dt);
  const topLimit = view.portrait ? 204 : 116;
  if (player.y < topLimit) {
    player.y = topLimit;
    player.vy = Math.max(0, player.vy);
    damage(state, 8, "상단 기류 충돌");
  }
  if (player.y > view.height - 56) {
    player.y = view.height - 56;
    player.vy = Math.min(0, player.vy);
    damage(state, 10, "하단 기류 충돌");
  }
}

function updateSpawns(state, dt) {
  state.spawnTimer -= dt;
  state.itemTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle(state);
    state.spawnTimer = Math.max(0.56, GAME.spawnEvery - state.time * 0.008);
  }
  if (state.itemTimer <= 0) {
    spawnItem(state);
    state.itemTimer = GAME.itemEvery + secureRange(0.15, 0.7);
  }
}

function updateEntities(state, dt) {
  const speed = GAME.scrollSpeed + Math.min(GAME.scrollSpeedMaxBonus, state.time * 7.5 + state.distance * 0.08);
  for (const group of [state.obstacles, state.items, state.effects]) {
    for (const entity of group) entity.x -= speed * dt;
  }
  state.obstacles = state.obstacles.filter((entity) => entity.x > -120);
  state.items = state.items.filter((entity) => entity.x > -90 && !entity.collected);
  state.effects = state.effects.filter((entity) => entity.life > 0);
  for (const effect of state.effects) effect.life -= dt;
}

function updateCollisions(state) {
  for (const obstacle of state.obstacles) {
    if (obstacle.hit || !intersects(state.player, obstacle)) continue;
    obstacle.hit = true;
    damage(state, obstacle.damage, obstacle.kind);
    state.combo = 0;
  }
  for (const obstacle of state.obstacles) {
    if (obstacle.hit || obstacle.passed || obstacle.x + obstacle.r > state.player.x - state.player.r) continue;
    obstacle.passed = true;
    if (Math.abs(obstacle.y - state.player.y) < 96) {
      state.combo += 1;
      state.nearMisses += 1;
      addFever(state, 10, emit);
      updateMissions(state, emit);
      state.score += (90 + state.combo * 8) * scoreMultiplier(state);
      state.effects.push({ x: state.player.x + 24, y: state.player.y - 46, text: "NEAR +90", life: 0.7, good: true });
      emit(state, "near");
    }
  }
  for (const item of state.items) {
    if (item.collected || !intersects(state.player, item)) continue;
    item.collected = true;
    collect(state, item);
  }
}

function updateScore(state, dt) {
  state.distance += dt * 18;
  state.map = state.distance >= GAME.lavaDistance ? "lava" : "sky";
  updateMissions(state, emit);
  state.score += (dt * 10 + state.combo * dt * 1.5) * scoreMultiplier(state);
}
