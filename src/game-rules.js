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
  { kind: "star", r: 25, score: 240 },
  { kind: "feather", r: 23, score: 150, heal: 8 },
  { kind: "magnet", r: 25, score: 210, shield: 1 },
  { kind: "hourglass", r: 25, score: 180, heal: 6 },
  { kind: "energyBolt", r: 24, score: 220, heal: 10 },
  { kind: "heart", r: 25, score: 100, heal: 22 },
]);

export function createPlayer(view = GAME) {
  return { x: playerX(view), y: view.height * 0.48, vy: 0, r: 24, frameKick: 0 };
}

export function spawnObstacle(state) {
  const base = securePick(OBSTACLES);
  const view = getView(state);
  const top = view.portrait ? 208 : 132;
  state.obstacles.push({
    ...base,
    x: view.width + 80,
    y: getObstacleY(base, view, top),
    wobble: secureRange(0, Math.PI * 2),
    hit: false,
  });
}

function getObstacleY(base, view, top) {
  if (!base.ground) return secureRange(top, view.height - 92);
  const floor = view.height - (view.portrait ? 88 : 54);
  return secureRange(floor - 18, floor + 6) - base.r * 0.18;
}

export function spawnItem(state) {
  const base = securePick(ITEMS);
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

export function intersects(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.r + b.r;
  return dx * dx + dy * dy <= radius * radius;
}
