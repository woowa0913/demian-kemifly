import { GAME } from "./config.js";
import { getView, playerX } from "./layout.js";
import { securePick, secureRange } from "./random.js";

const OBSTACLES = Object.freeze([
  { kind: "stoneIsland", r: 31, damage: 17, score: 60, ground: true },
  { kind: "stoneCluster", r: 36, damage: 19, score: 65, ground: true },
  { kind: "boulder", r: 39, damage: 24, score: 78 },
  { kind: "purpleCrystal", r: 34, damage: 22, score: 76 },
  { kind: "iceSpike", r: 33, damage: 20, score: 72 },
  { kind: "purpleStorm", r: 41, damage: 27, score: 86 },
  { kind: "thornRing", r: 38, damage: 24, score: 84 },
  { kind: "ruinArch", r: 38, damage: 23, score: 82, ground: true },
  { kind: "stoneCube", r: 34, damage: 22, score: 80, ground: true },
  { kind: "lavaComet", r: 34, damage: 25, score: 90 },
  { kind: "lavaBall", r: 37, damage: 28, score: 96 },
  { kind: "purplePlatform", r: 36, damage: 22, score: 82, ground: true },
]);

const VERTICAL_MOVERS = new Set(["purpleCrystal", "iceSpike"]);

const ITEMS = Object.freeze([
  { kind: "crystal", r: 20, score: 180 },
  { kind: "goldCrystal", r: 21, score: 320 },
  { kind: "smileCloud", r: 25, heal: 14, score: 70 },
  { kind: "shield", r: 26, shield: 1, score: 90 },
  { kind: "star", r: 25, score: 240, fever: 28 },
  { kind: "feather", r: 23, score: 150, heal: 8, glide: true },
  { kind: "magnet", r: 25, score: 210, magnet: true },
  { kind: "hourglass", r: 25, score: 180, heal: 6, slow: true },
  { kind: "energyBolt", r: 24, score: 220, heal: 10, boost: true },
  { kind: "heart", r: 25, score: 100, heal: 22 },
  { kind: "lavaPortal", r: 27, score: 0, lavaTrap: true },
]);

export function createPlayer(view = GAME) {
  return { x: playerX(view), y: view.height * 0.48, vy: 0, r: 24, frameKick: 0 };
}

export function spawnObstacle(state) {
  const view = getView(state);
  const top = view.portrait ? 208 : 132;
  const base = pickObstacle(state);
  const first = buildObstacle(base, view.width + 80, getObstacleY(base, view, top), state, view, top);
  state.obstacles.push(first);
  if (shouldSpawnPattern(state)) {
    const pair = pickPairedObstacle(state, base);
    const pairY = getPairedY(first, pair, view, top);
    state.obstacles.push(buildObstacle(pair, view.width + secureRange(150, 230), pairY, state, view, top));
  }
}

function getObstacleY(base, view, top) {
  if (!base.ground) return chooseAirLane(view, top);
  const floor = view.height - (view.portrait ? 88 : 54);
  return secureRange(floor - 18, floor + 6) - base.r * 0.18;
}

function buildObstacle(base, x, y, state, view, top) {
  const obstacle = {
    ...base,
    x,
    y,
    baseY: y,
    wobble: secureRange(0, Math.PI * 2),
    hit: false,
  };
  return withLateMotion(obstacle, state, view, top);
}

function pickObstacle(state) {
  if (state.map === "lava") return securePick(OBSTACLES.filter((item) => item.kind.includes("lava") || !item.ground));
  if (state.time < 12) return securePick(OBSTACLES.filter((item) => !["lavaBall", "lavaComet", "thornRing"].includes(item.kind)));
  return securePick(OBSTACLES);
}

function withLateMotion(obstacle, state, view, top) {
  if (!isLateFlight(state)) return obstacle;
  if (obstacle.kind === "lavaComet") {
    return {
      ...obstacle,
      motion: "diagonalDive",
      vy: secureRange(44, state.map === "lava" ? 92 : 72),
      trail: true,
    };
  }
  if (VERTICAL_MOVERS.has(obstacle.kind)) {
    const bottom = view.height - 108;
    const room = Math.max(28, Math.min(obstacle.y - top, bottom - obstacle.y));
    return {
      ...obstacle,
      motion: "vertical",
      baseY: obstacle.y,
      amplitude: Math.min(room, secureRange(30, 58)),
      motionSpeed: secureRange(1.45, state.map === "lava" ? 2.25 : 1.9),
      motionPhase: secureRange(0, Math.PI * 2),
    };
  }
  return obstacle;
}

function isLateFlight(state) {
  return state.distance >= 620 || state.time >= 34 || (state.stageIndex || 0) >= 2;
}

function pickPairedObstacle(state, base) {
  const pool = OBSTACLES.filter((item) => item.kind !== base.kind && (!item.ground || state.time > 24));
  return securePick(pool.length ? pool : OBSTACLES);
}

function shouldSpawnPattern(state) {
  if (state.time < 12) return false;
  const pressure = state.map === "lava" ? 0.56 : Math.min(0.39, state.time / 125);
  return secureRange(0, 1) < pressure;
}

function chooseAirLane(view, top) {
  const bottom = view.height - 96;
  const lanes = [top + 20, top + (bottom - top) * 0.42, bottom - 24];
  const index = Math.min(lanes.length - 1, Math.floor(secureRange(0, lanes.length)));
  return lanes[index] + secureRange(-20, 20);
}

function getPairedY(first, pair, view, top) {
  if (pair.ground) return getObstacleY(pair, view, top);
  const bottom = view.height - 96;
  const high = top + 26;
  const low = bottom - 24;
  return first.y < view.height * 0.5 ? secureRange(low - 22, low + 10) : secureRange(high - 8, high + 24);
}

export function spawnItem(state) {
  const base = pickItem(state);
  const view = getView(state);
  const top = view.portrait ? 214 : 132;
  const x = view.width + secureRange(80, 220);
  const y = chooseItemY(state, view, top);
  const trail = shouldSpawnItemTrail(state, base);
  const count = trail ? 3 : 1;
  for (let i = 0; i < count; i += 1) {
    const arc = trail ? Math.sin((i / 2) * Math.PI) * -34 : 0;
    state.items.push({
      ...base,
      x: x + i * 56,
      y: clampValue(y + arc + secureRange(-8, 8), top, view.height - 88),
      wobble: secureRange(0, Math.PI * 2),
      collected: false,
      trail,
    });
  }
}

function pickItem(state) {
  if (shouldSpawnRecovery(state)) return securePick(ITEMS.filter((item) => ["heart", "smileCloud", "shield"].includes(item.kind)));
  if (shouldSpawnLavaPortal(state)) return ITEMS.find((item) => item.kind === "lavaPortal");
  return securePick(ITEMS.filter((item) => item.kind !== "lavaPortal"));
}

function shouldSpawnRecovery(state) {
  if (state.map === "lava" || state.energy > GAME.lowEnergyThreshold) return false;
  return !state.items.some((item) => ["heart", "smileCloud", "shield"].includes(item.kind) && !item.collected);
}

function chooseItemY(state, view, top) {
  if (state.energy <= GAME.lowEnergyThreshold && state.player) {
    return clampValue(state.player.y + secureRange(-62, 62), top + 14, view.height - 106);
  }
  return secureRange(top, view.height - 88);
}

function shouldSpawnItemTrail(state, base) {
  if (base.lavaTrap || state.energy <= GAME.lowEnergyThreshold) return false;
  if (!["crystal", "goldCrystal", "star", "feather"].includes(base.kind)) return false;
  const chance = state.time < 18 ? 0.32 : 0.22;
  return secureRange(0, 1) < chance;
}

function shouldSpawnLavaPortal(state) {
  if (state.map === "lava" || state.lavaTimer > 0 || state.time < 8) return false;
  return secureRange(0, 1) > 0.78;
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function intersects(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.r + b.r;
  return dx * dx + dy * dy <= radius * radius;
}
