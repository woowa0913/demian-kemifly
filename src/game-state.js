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
    lavaTimer: 0,
    lavaRuns: 0,
    lavaSurvival: 0,
    lastLavaSurvival: 0,
    crystals: 0,
    itemsCollected: 0,
    level: 1,
    maxLevel: 1,
    levelFlash: 0,
    levelReveal: 0,
    energy: GAME.maxEnergy,
    shield: 0,
    shieldFlash: 0,
    magnetTime: 0,
    slowTime: 0,
    glideTime: 0,
    boostTime: 0,
    combo: 0,
    bestCombo: 0,
    fever: 0,
    feverTime: 0,
    nearMisses: 0,
    missionTier: 0,
    missionsCompleted: 0,
    missions: createMissions(),
    runSummary: null,
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
    lavaTimer: 0,
    lavaRuns: 0,
    lavaSurvival: 0,
    lastLavaSurvival: 0,
    crystals: 0,
    itemsCollected: 0,
    level: 1,
    maxLevel: 1,
    levelFlash: 0,
    levelReveal: 0,
    energy: GAME.maxEnergy,
    shield: 0,
    shieldFlash: 0,
    magnetTime: 0,
    slowTime: 0,
    glideTime: 0,
    boostTime: 0,
    combo: 0,
    bestCombo: 0,
    fever: 0,
    feverTime: 0,
    nearMisses: 0,
    missionTier: 0,
    missionsCompleted: 0,
    missions: createMissions(),
    message: "",
    runSummary: null,
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
  state.lavaTimer = Math.max(0, state.lavaTimer - step);
  if (state.map === "lava") state.lavaSurvival += step;
  if (state.map === "lava" && state.lavaTimer <= 0) {
    state.lastLavaSurvival = Math.max(state.lastLavaSurvival, state.lavaSurvival);
    state.lavaSurvival = 0;
    state.message = "용암 돌파!";
    state.score += 450;
    state.effects.push({ x: state.player.x + 74, y: state.player.y - 72, text: "LAVA CLEAR +450", life: 1.2, good: true });
    emit(state, "gold");
  }
  state.shieldFlash = Math.max(0, state.shieldFlash - step);
  state.magnetTime = Math.max(0, state.magnetTime - step);
  state.slowTime = Math.max(0, state.slowTime - step);
  state.glideTime = Math.max(0, state.glideTime - step);
  state.boostTime = Math.max(0, state.boostTime - step);
  state.map = state.lavaTimer > 0 ? "lava" : "sky";
  state.levelFlash = Math.max(0, state.levelFlash - step);
  state.levelReveal = Math.max(0, state.levelReveal - step);
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
  const level = Math.max(1, Math.min(6, state.level || 1));
  const gravityScale = state.glideTime > 0 ? 0.72 : 1;
  player.r = Math.max(19, 24 - Math.floor((level - 1) / 2));
  player.vy = Math.min(GAME.maxFall, player.vy + GAME.gravity * gravityScale * dt);
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
  const lavaBoost = state.map === "lava" ? GAME.lavaSpeedBonus : 0;
  const slowScale = state.slowTime > 0 ? 0.72 : 1;
  const speed = (GAME.scrollSpeed + lavaBoost + Math.min(GAME.scrollSpeedMaxBonus, state.time * 7.5 + state.distance * 0.08)) * slowScale;
  for (const group of [state.obstacles, state.items, state.effects]) {
    for (const entity of group) entity.x -= speed * dt;
  }
  applyMagnet(state, dt);
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
      state.bestCombo = Math.max(state.bestCombo || 0, state.combo);
      addFever(state, 10, emit);
      updateMissions(state, emit);
      const dodgeScore = state.combo >= 3 ? 150 + state.combo * 12 : 90 + state.combo * 8;
      state.score += dodgeScore * scoreMultiplier(state);
      state.effects.push({
        x: state.player.x + 24,
        y: state.player.y - 46,
        text: state.combo >= 3 ? `PERFECT +${dodgeScore}` : `NEAR +${dodgeScore}`,
        life: 0.8,
        good: true,
      });
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
  updateMissions(state, emit);
  state.score += (dt * 10 + state.combo * dt * 1.5) * scoreMultiplier(state);
}

function applyMagnet(state, dt) {
  if (state.magnetTime <= 0) return;
  const range = 210 + state.level * 10;
  for (const item of state.items) {
    if (item.lavaTrap || item.collected) continue;
    const dx = state.player.x - item.x;
    const dy = state.player.y - item.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0 || distance > range) continue;
    const pull = Math.min(distance, (420 + state.level * 28) * dt);
    item.x += (dx / distance) * pull;
    item.y += (dy / distance) * pull;
  }
}
