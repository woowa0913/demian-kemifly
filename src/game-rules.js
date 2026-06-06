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
  const first = buildObstacle(base, view.width + 80, getObstacleY(base, view, top));
  state.obstacles.push(first);
  if (shouldSpawnPattern(state)) {
    const pair = pickPairedObstacle(state, base);
    const pairY = getPairedY(first, pair, view, top);
    state.obstacles.push(buildObstacle(pair, view.width + secureRange(150, 230), pairY));
  }
}

function getObstacleY(base, view, top) {
  if (!base.ground) return chooseAirLane(view, top);
  const floor = view.height - (view.portrait ? 88 : 54);
  return secureRange(floor - 18, floor + 6) - base.r * 0.18;
}

function buildObstacle(base, x, y) {
  return {
    ...base,
    x,
    y,
    wobble: secureRange(0, Math.PI * 2),
    hit: false,
  };
}

function pickObstacle(state) {
  if (state.map === "lava") return securePick(OBSTACLES.filter((item) => item.kind.includes("lava") || !item.ground));
  if (state.time < 12) return securePick(OBSTACLES.filter((item) => !["lavaBall", "lavaComet", "thornRing"].includes(item.kind)));
  return securePick(OBSTACLES);
}

function pickPairedObstacle(state, base) {
  const pool = OBSTACLES.filter((item) => item.kind !== base.kind && (!item.ground || state.time > 24));
  return securePick(pool.length ? pool : OBSTACLES);
}

function shouldSpawnPattern(state) {
  if (state.time < 15) return false;
  const pressure = state.map === "lava" ? 0.5 : Math.min(0.34, state.time / 140);
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
  const base = shouldSpawnLavaPortal(state) ? ITEMS.find((item) => item.kind === "lavaPortal") : securePick(ITEMS.filter((item) => item.kind !== "lavaPortal"));
  const view = getView(state);
  const top = view.portrait ? 214 : 132;
  state.items.push({
    ...base,
    x: view.width + secureRange(80, 220),
    y: secureRange(top, view.height - 88),
    wobble: secureRange(0, Math.PI * 2),
    collected: false,
  });
}

function shouldSpawnLavaPortal(state) {
  if (state.map === "lava" || state.lavaTimer > 0 || state.time < 8) return false;
  return secureRange(0, 1) > 0.78;
}

export function intersects(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.r + b.r;
  return dx * dx + dy * dy <= radius * radius;
}
