import { GAME } from "./config.js";
import { getView } from "./layout.js";

const ITEM_KINDS = new Set(["crystal", "goldCrystal", "smileCloud", "shield", "star", "feather", "magnet", "hourglass", "energyBolt", "heart", "lavaPortal"]);
const GOLD_KINDS = new Set(["goldCrystal", "star", "hourglass"]);
const TRAP_KINDS = new Set(["lavaPortal"]);
const IMAGE_BY_KIND = {
  crystal: "crystal",
  goldCrystal: "goldCrystal",
  smileCloud: "smileCloud",
  shield: "shield",
  star: "star",
  feather: "feather",
  magnet: "magnet",
  hourglass: "hourglass",
  energyBolt: "energyBolt",
  heart: "heart",
  lavaPortal: "lavaPortal",
  stoneIsland: "stoneIsland",
  stoneCluster: "stoneCluster",
  boulder: "boulder",
  purpleCrystal: "purpleCrystal",
  iceSpike: "iceSpike",
  purpleStorm: "purpleStorm",
  thornRing: "thornRing",
  ruinArch: "ruinArch",
  stoneCube: "stoneCube",
  lavaComet: "lavaComet",
  lavaBall: "lavaBall",
  purplePlatform: "purplePlatform",
};

export function drawWorld(ctx, state, assets) {
  const view = getView(state);
  const lava = state.map === "lava";
  const image = getBackgroundImage(state, assets, lava);
  drawBackground(ctx, image, state.clock || state.time, state.mode, view, lava);
  if (!["playing", "paused"].includes(state.mode)) return;
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(Math.sin(state.clock * 80) * state.shake, Math.cos(state.clock * 71) * state.shake);
  }
  for (const obstacle of state.obstacles) drawEntity(ctx, assets, obstacle, state);
  for (const item of state.items) drawEntity(ctx, assets, item, state);
  drawKemi(ctx, state, assets);
  for (const effect of state.effects) drawFloatText(ctx, effect);
  ctx.restore();
}

function getBackgroundImage(state, assets, lava) {
  if (lava) return assets.lavaBackground || assets.background;
  const stages = GAME.stages || [];
  const stage = stages[Math.max(0, Math.min(stages.length - 1, state.stageIndex || 0))];
  return assets[stage?.backgroundKey] || assets.background;
}

export function drawImageCentered(ctx, image, x, y, w, h) {
  if (!image) return;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}

export function drawImageFitCentered(ctx, image, x, y, maxW, maxH) {
  if (!image) return;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}

function drawBackground(ctx, image, time, mode, view, lava) {
  ctx.clearRect(0, 0, view.width, view.height);
  if (!image) return;
  if (mode === "menu") {
    drawMenuBackground(ctx, image, time, view);
    return;
  }
  drawScrollingBackground(ctx, image, time, mode, view, lava);
  drawDrift(ctx, time, mode, view, lava);
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, lava ? "rgba(70, 8, 10, 0.18)" : "rgba(4, 20, 50, 0.1)");
  gradient.addColorStop(1, lava ? "rgba(28, 5, 10, 0.38)" : "rgba(2, 25, 44, 0.22)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawScrollingBackground(ctx, image, time, mode, view, lava) {
  const speed = mode === "playing" ? (lava ? 18 : 10) : 3;
  const width = view.width * (view.portrait ? 1.44 : 1.18);
  const height = view.height * (view.portrait ? 1.12 : 1.1);
  const xOffset = (time * speed) % width;
  const y = (view.height - height) / 2 + Math.sin(time * 0.07) * view.height * 0.01;
  for (let i = -1; i <= 1; i += 1) {
    drawCoverTile(ctx, image, i * width - xOffset, y, width, height, i % 2 !== 0);
  }
}

function drawMenuBackground(ctx, image, time, view) {
  if (view.portrait) {
    drawPortraitBackground(ctx, image, time, view, false, 1);
    drawMenuSparkles(ctx, time, view);
    drawMenuGradient(ctx, view);
    return;
  }
  const scale = 1.08;
  const width = view.width * scale;
  const height = view.height * scale;
  const x = (view.width - width) / 2 + Math.sin(time * 0.16) * view.width * 0.035;
  const y = (view.height - height) / 2 + Math.cos(time * 0.12) * view.height * 0.018;
  drawCoverTile(ctx, image, x, y, width, height, false);
  drawMenuSparkles(ctx, time, view);
  drawMenuGradient(ctx, view);
}

function drawMenuGradient(ctx, view) {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "rgba(4, 18, 46, 0.14)");
  gradient.addColorStop(0.55, "rgba(3, 18, 38, 0.06)");
  gradient.addColorStop(1, "rgba(2, 14, 30, 0.32)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawPortraitBackground(ctx, image, time, view, lava, alpha) {
  if (!image) return;
  const scale = view.height / image.height;
  const sw = Math.min(image.width, view.width / scale);
  const maxSx = Math.max(0, image.width - sw);
  const baseAnchor = lava ? 0.52 : 0.16;
  const sway = Math.sin(time * 0.045) * (lava ? 0.055 : 0.065);
  const anchor = Math.max(0, Math.min(1, baseAnchor + sway));
  const sx = maxSx * anchor;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, sx, 0, sw, image.height, 0, 0, view.width, view.height);
  ctx.globalAlpha *= lava ? 0.34 : 0.42;
  const sideAnchor = lava ? 0.82 : 0.9;
  const sideSx = maxSx * sideAnchor;
  ctx.drawImage(image, sideSx, 0, sw, image.height, view.width * 0.08, 0, view.width, view.height);
  ctx.restore();
}

function drawMenuSparkles(ctx, time, view) {
  ctx.save();
  for (let i = 0; i < 24; i += 1) {
    const x = ((i * 157 + 41) % view.width) + Math.sin(time * 0.22 + i) * 10;
    const y = 32 + ((i * 83 + 29) % Math.max(1, view.height - 84));
    const pulse = 0.35 + Math.sin(time * (0.9 + (i % 5) * 0.13) + i * 1.7) * 0.35;
    if (pulse <= 0.08) continue;
    const radius = 1.4 + (i % 4) * 0.55;
    ctx.globalAlpha = Math.min(0.7, pulse);
    ctx.fillStyle = i % 6 === 0 ? "#ffd76b" : "#b9fbff";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = i % 6 === 0 ? "rgba(255, 215, 107, 0.45)" : "rgba(120, 240, 255, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius * 3, y);
    ctx.lineTo(x + radius * 3, y);
    ctx.moveTo(x, y - radius * 3);
    ctx.lineTo(x, y + radius * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDrift(ctx, time, mode, view, lava) {
  const speed = mode === "playing" ? 180 : 34;
  const count = mode === "playing" ? 22 : 34;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const baseY = 34 + ((i * 73) % Math.max(1, view.height - 72));
    const x = (view.width + 120 - ((time * speed + i * 151) % (view.width + 240)));
    const len = 24 + ((i * 17) % 56);
    const alpha = mode === "playing" ? 0.08 : 0.06;
    ctx.strokeStyle = lava ? `rgba(255, 185, 96, ${alpha + 0.05})` : `rgba(166, 246, 255, ${alpha})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + len, baseY - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKemi(ctx, state, assets) {
  const player = state.player;
  const level = Math.max(1, Math.min(6, state.level || 1));
  const frame = getKemiFlightFrame(state);
  const key = `kemiLv${level}Frame${frame}`;
  const image = assets[key] || assets.kemi2;
  const maxHeight = player.frameKick > 0 ? 74 : 68;
  const maxWidth = player.frameKick > 0 ? 116 : 108;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.max(-0.32, Math.min(0.32, player.vy / 900)));
  if (state.damageTimer > 0) {
    ctx.globalAlpha = 0.78 + Math.sin(state.clock * 44) * 0.18;
    ctx.shadowColor = "rgba(255, 90, 90, 0.65)";
    ctx.shadowBlur = 18;
  }
  if (state.shield > 0 || state.shieldFlash > 0) drawShieldAura(ctx, state);
  drawImageFitCentered(ctx, image, 0, 4, maxWidth, maxHeight);
  ctx.restore();
}

function getKemiFlightFrame(state) {
  if (state.player.frameKick > 0) return 2;
  return Math.floor(state.time * 8) % 2 === 0 ? 1 : 2;
}

function drawShieldAura(ctx, state) {
  const pulse = 0.52 + Math.sin(state.clock * 7) * 0.16;
  const glow = Math.min(1, 0.4 + state.shield * 0.18 + state.shieldFlash * 0.22);
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.strokeStyle = `rgba(116, 244, 255, ${pulse})`;
  ctx.fillStyle = "rgba(88, 225, 255, 0.11)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 4, 54 + pulse * 8, 42 + pulse * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 4, 62 + pulse * 7, 48 + pulse * 5, 0, -0.5, Math.PI * 1.35);
  ctx.stroke();
  ctx.restore();
}

function drawEntity(ctx, assets, entity, state) {
  const image = assets[IMAGE_BY_KIND[entity.kind]];
  const bob = entity.ground ? 0 : Math.sin(entity.wobble + state.clock * 4.2) * 5;
  const y = entity.y + bob;
  const item = ITEM_KINDS.has(entity.kind);
  if (entity.motion === "diagonalDive") drawDiveTrail(ctx, entity, y, state.clock);
  if (entity.motion === "vertical") drawMotionCue(ctx, entity, y, state.clock);
  if (TRAP_KINDS.has(entity.kind)) drawTrapAura(ctx, entity, y, state.clock);
  else if (item) drawCollectibleAura(ctx, entity, y, state.clock);
  else drawHazardSignal(ctx, entity, y, state.clock);
  const size = entity.r * (entity.ground ? 2.55 : 2.45);
  drawImageFitCentered(ctx, image, entity.x, y, size, size);
}

function drawDiveTrail(ctx, entity, y, time) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  const gradient = ctx.createLinearGradient(entity.x + 36, y - 36, entity.x - 22, y + 22);
  gradient.addColorStop(0, "rgba(255, 235, 120, 0.75)");
  gradient.addColorStop(0.45, "rgba(255, 100, 28, 0.42)");
  gradient.addColorStop(1, "rgba(255, 46, 20, 0)");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(entity.x + 48, y - 44);
  ctx.quadraticCurveTo(entity.x + 18, y - 16 + Math.sin(time * 7) * 4, entity.x - 14, y + 16);
  ctx.stroke();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "rgba(255, 218, 92, 0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(entity.x + 52, y - 58);
  ctx.lineTo(entity.x - 8, y + 4);
  ctx.stroke();
  ctx.restore();
}

function drawMotionCue(ctx, entity, y, time) {
  const pulse = 0.35 + Math.sin(time * 6) * 0.12;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "rgba(255, 115, 115, 0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(entity.x + entity.r + 16, y - (entity.amplitude || 34));
  ctx.lineTo(entity.x + entity.r + 16, y + (entity.amplitude || 34));
  ctx.stroke();
  ctx.restore();
}

function drawCollectibleAura(ctx, entity, y, time) {
  const gold = GOLD_KINDS.has(entity.kind);
  const color = gold ? "rgba(255, 220, 88, 0.95)" : "rgba(84, 255, 176, 0.95)";
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(entity.x, y, entity.r + 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawRing(ctx, entity.x, y, entity.r + 14 + Math.sin(time * 6) * 2, color, 4);
  drawRing(ctx, entity.x, y, entity.r + 27, gold ? "rgba(255, 245, 160, 0.45)" : "rgba(150, 255, 220, 0.45)", 2);
  ctx.fillStyle = gold ? "rgba(255, 232, 110, 0.98)" : "rgba(116, 255, 205, 0.98)";
  ctx.font = "900 20px Arial, Apple SD Gothic Neo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", entity.x, y - entity.r - 23);
}

function drawTrapAura(ctx, entity, y, time) {
  const pulse = 0.55 + Math.sin(time * 7) * 0.2;
  ctx.save();
  ctx.globalAlpha = 0.2 + pulse * 0.18;
  ctx.fillStyle = "rgba(255, 104, 26, 0.9)";
  ctx.beginPath();
  ctx.arc(entity.x, y, entity.r + 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawRing(ctx, entity.x, y, entity.r + 14, `rgba(255, 132, 40, ${pulse})`, 4);
  ctx.fillStyle = `rgba(255, 218, 92, ${pulse + 0.16})`;
  ctx.font = "900 17px Arial, Apple SD Gothic Neo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LAVA", entity.x, y - entity.r - 23);
}

function drawHazardSignal(ctx, entity, y, time) {
  ctx.save();
  const pulse = 0.5 + Math.sin(time * 8) * 0.18;
  ctx.shadowColor = `rgba(255, 72, 72, ${pulse})`;
  ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(255, 74, 74, ${pulse + 0.12})`;
  ctx.font = "900 18px Arial, Apple SD Gothic Neo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", entity.x, y - entity.r - 20);
  ctx.restore();
}

function drawFloatText(ctx, effect) {
  ctx.font = "900 18px Arial, Apple SD Gothic Neo, sans-serif";
  ctx.fillStyle = effect.good ? "#78ffca" : "#ffd76b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(effect.text, effect.x, effect.y - (1 - effect.life) * 38);
}

function drawRing(ctx, x, y, radius, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoverTile(ctx, image, x, y, w, h, mirror) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, w, h);
  } else {
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  }
  ctx.restore();
}
