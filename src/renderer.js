import { GAME } from "./config.js";
import { getView } from "./layout.js";
import { getTitle } from "./storage.js";
import { drawImageCentered, drawWorld } from "./world-renderer.js";

export function render(ctx, state, assets) {
  state.buttons = [];
  drawWorld(ctx, state, assets);
  drawHud(ctx, state);
  if (state.mode === "menu") drawMenu(ctx, state, assets);
  if (state.mode === "paused") drawPause(ctx, state);
  if (state.mode === "gameover") drawGameOver(ctx, state, assets);
  if (state.mode === "hall") drawHall(ctx, state, assets);
}

function drawHud(ctx, state) {
  if (state.mode === "menu" || state.mode === "hall") return;
  const view = getView(state);
  const top = view.portrait ? 18 : 18;
  const soundY = view.portrait ? view.height - 76 : view.height - 68;
  const soundX = view.width - 158;
  const pauseX = soundX - 58;
  drawPanel(ctx, 20, 18, 238, 76, 0.58);
  label(ctx, "SCORE", 42, 45, 15, "#9af7ff", "700");
  label(ctx, String(Math.floor(state.score)), 42, 75, 28, "#ffffff", "900");
  label(ctx, `LV ${state.level || 1}`, 226, 45, 18, "#ffd76b", "900", "right");
  const energyW = view.portrait ? 250 : 266;
  drawPanel(ctx, view.width - energyW - 20, top, energyW, 76, 0.58);
  label(ctx, "ENERGY", view.width - energyW + 2, 45, 15, "#9af7ff", "700");
  drawBar(ctx, view.width - energyW + 2, 58, energyW - 52, 16, state.energy / GAME.maxEnergy);
  label(ctx, `SHIELD ${state.shield}`, view.width - 74, 89, 13, "#ffd76b", "800", "center");
  drawProgressHud(ctx, state, view);
  iconButton(ctx, state, "pause", state.mode === "paused" ? "▶" : "Ⅱ", pauseX, soundY, 46, 42);
  smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", soundX, soundY, 136, 42);
}

function drawProgressHud(ctx, state, view) {
  const x = view.portrait ? 20 : 286;
  const y = view.portrait ? 108 : 18;
  const w = view.portrait ? view.width - 40 : 326;
  drawPanel(ctx, x, y, w, 76, 0.5);
  const feverRatio = state.feverTime > 0 ? state.feverTime / 6 : state.fever / 100;
  label(ctx, state.feverTime > 0 ? "FEVER x2" : `COMBO ${state.combo}`, x + 18, y + 24, 14, "#ffd76b", "900");
  drawBar(ctx, x + 18, y + 39, w - 36, 13, feverRatio, state.feverTime > 0 ? "#ffd76b" : "#78ffca");
  const mission = state.missions.find((item) => !item.done) || state.missions[state.missions.length - 1];
  const progress = Math.min(mission.target, Math.floor(mission.progress));
  const levelText = getLevelProgressText(state);
  const text = mission.done ? levelText : `${mission.label} ${progress}/${mission.target} · ${levelText}`;
  label(ctx, text, x + 18, y + 63, 13, mission.done ? "#78ffca" : "#d9fbff", "800");
  if (state.map === "lava") label(ctx, `LAVA ${Math.ceil(state.lavaTimer)}s`, x + w - 18, y + 24, 13, "#ffb357", "900", "right");
}

function getLevelProgressText(state) {
  const level = Math.max(1, Math.min(6, state.level || 1));
  if (level >= 6) return "MAX LV";
  const next = GAME.levelThresholds[level];
  return `다음 LV ${state.itemsCollected}/${next}`;
}

function drawMenu(ctx, state, assets) {
  const view = getView(state);
  const cx = view.width / 2;
  drawScrim(ctx, 0.32);
  const logoY = view.portrait ? 132 : 104;
  const birdY = view.portrait ? 330 : 285;
  const startY = view.portrait ? 540 : 318;
  drawImageCentered(ctx, assets.happy, cx, birdY, view.portrait ? 136 : 106, view.portrait ? 122 : 94);
  drawImageCentered(ctx, assets.logo, cx, logoY, view.portrait ? 330 : 300, view.portrait ? 174 : 158);
  label(ctx, "케미의 첫 비행", cx, view.portrait ? 236 : 196, view.portrait ? 25 : 23, "#8cf6ff", "800", "center");
  button(ctx, state, "start", "START", cx - 132, startY, 264, 68);
  button(ctx, state, "hall", "명예의 전당", cx - 132, startY + 78, 264, 60);
  if (view.portrait) smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", cx - 70, startY + 170, 140, 44);
  else smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", view.width - 172, 34, 134, 42);
  label(ctx, view.portrait ? "TAP TO FLY" : "SPACE / TAP", cx, view.portrait ? startY + 244 : 505, 15, "#d9fbff", "700", "center");
}

function drawPause(ctx, state) {
  const view = getView(state);
  const cx = view.width / 2;
  const cy = view.height / 2;
  drawScrim(ctx, 0.44);
  title(ctx, "PAUSE", cx, cy - 80, 52);
  button(ctx, state, "resume", "RESUME", cx - 120, cy - 20, 240, 62);
  button(ctx, state, "restart", "RETRY", cx - 120, cy + 55, 240, 62);
}

function drawGameOver(ctx, state, assets) {
  const view = getView(state);
  const cx = view.width / 2;
  const bannerY = view.portrait ? 150 : 92;
  const panelY = view.portrait ? 210 : 128;
  const buttonY = view.portrait ? 498 : 376;
  drawScrim(ctx, 0.5);
  drawImageCentered(ctx, assets.gameOverBanner, cx, bannerY, 320, 120);
  drawPanel(ctx, cx - 230, panelY, 460, 168, 0.72);
  label(ctx, `점수 ${Math.floor(state.score)}`, cx, panelY + 42, 34, "#ffffff", "900", "center");
  label(ctx, `${getTitle(state.score)} · 거리 ${state.distance} · 수정 ${state.crystals}`, cx, panelY + 84, 18, "#9af7ff", "800", "center");
  const prompt = state.saved ? "기록 완료! 명예의 전당에서 확인하세요" : "명예의 전당에 기록할 이름을 입력하세요";
  label(ctx, state.isRecord ? state.message || prompt : state.message, cx, panelY + 126, 17, "#ffd76b", "800", "center");
  button(ctx, state, state.isRecord && !state.saved ? "save" : "restart", state.isRecord && !state.saved ? "기록 저장" : "RETRY", cx - 136, buttonY, 272, 62);
  button(ctx, state, "hall", "명예의 전당", cx - 136, buttonY + 76, 272, 58);
}

function drawHall(ctx, state, assets) {
  const view = getView(state);
  const cx = view.width / 2;
  const panel = view.portrait
    ? { x: 34, y: 144, w: view.width - 68, h: 620, row: 54, avatar: 42, compact: false }
    : { x: 180, y: 104, w: 600, h: 344, row: 30, avatar: 32, compact: true };
  drawScrim(ctx, 0.42);
  title(ctx, "명예의 전당", cx, view.portrait ? 94 : 80, view.portrait ? 40 : 44);
  drawPanel(ctx, panel.x, panel.y, panel.w, panel.h, 0.74);
  const rows = state.leaderboard.length ? state.leaderboard : [{ name: "첫 기록을 기다려요", score: 0, title: "새싹 비행가" }];
  rows.slice(0, 10).forEach((entry, index) => {
    const y = panel.y + 48 + index * panel.row;
    const tier = getHallTier(entry.score);
    drawHallRow(ctx, panel, y, tier);
    label(ctx, `${index + 1}`, panel.x + 34, y, 16, "#ffd76b", "900", "center");
    drawImageFit(ctx, assets[getHallAvatarKey(tier.level)] || assets.happy, panel.x + 72, y, panel.avatar, panel.avatar);
    if (panel.compact) {
      label(ctx, entry.name, panel.x + 104, y, 16, "#ffffff", "900");
      label(ctx, `LV ${tier.level} · ${entry.title}`, panel.x + 190, y, 13, tier.color, "800");
    } else {
      label(ctx, entry.name, panel.x + 104, y - 7, 16, "#ffffff", "900");
      label(ctx, `LV ${tier.level} · ${entry.title}`, panel.x + 104, y + 11, 12, tier.color, "800");
    }
    label(ctx, String(entry.score), panel.x + panel.w - 24, y, 17, "#ffffff", "900", "right");
  });
  button(ctx, state, "back", "BACK", cx - 120, view.portrait ? 800 : 462, 240, 58);
}

function drawHallRow(ctx, panel, y, tier) {
  const x = panel.x + 18;
  const w = panel.w - 36;
  const h = Math.max(26, panel.row - 8);
  ctx.save();
  ctx.globalAlpha = 0.34;
  roundRect(ctx, x, y - h / 2, w, h, 8, tier.fill, tier.stroke);
  ctx.restore();
}

function getHallTier(score) {
  if (score >= 20000) return { level: 6, color: "#ffd76b", fill: "rgba(255, 215, 107, 0.22)", stroke: "rgba(255, 215, 107, 0.55)" };
  if (score >= 10000) return { level: 5, color: "#9af7ff", fill: "rgba(56, 232, 255, 0.18)", stroke: "rgba(56, 232, 255, 0.48)" };
  if (score >= 5000) return { level: 4, color: "#a4ffcb", fill: "rgba(120, 255, 202, 0.16)", stroke: "rgba(120, 255, 202, 0.42)" };
  if (score >= 3000) return { level: 3, color: "#c7d8ff", fill: "rgba(153, 185, 255, 0.15)", stroke: "rgba(153, 185, 255, 0.38)" };
  if (score >= 1000) return { level: 2, color: "#d9fbff", fill: "rgba(217, 251, 255, 0.13)", stroke: "rgba(217, 251, 255, 0.32)" };
  return { level: 1, color: "#d9fbff", fill: "rgba(255, 255, 255, 0.1)", stroke: "rgba(255, 255, 255, 0.24)" };
}

function getHallAvatarKey(level) {
  return `kemiLv${Math.max(1, Math.min(6, level))}Frame1`;
}

function button(ctx, state, action, text, x, y, w, h) {
  state.buttons.push({ action, x, y, w, h });
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#10c8ff");
  grad.addColorStop(0.48, "#0866bc");
  grad.addColorStop(1, "#021f58");
  ctx.save();
  ctx.shadowColor = "rgba(56, 232, 255, 0.68)";
  ctx.shadowBlur = 18;
  roundRect(ctx, x, y, w, h, 10, grad, "#66f1ff");
  ctx.shadowBlur = 0;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 7, "rgba(2, 25, 72, 0.28)", "rgba(160, 252, 255, 0.45)");
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  roundRect(ctx, x + 14, y + 9, w - 28, Math.max(8, h * 0.16), 5, "rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)");
  drawButtonCaps(ctx, x, y, w, h);
  drawButtonDiamond(ctx, x + w / 2, y + h - 2, h > 60 ? 15 : 11);
  title(ctx, text, x + w / 2, y + h / 2 + 2, h > 60 ? 31 : 23);
  ctx.restore();
}

function smallButton(ctx, state, action, text, x, y, w, h) {
  state.buttons.push({ action, x, y, w, h });
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(15, 124, 190, 0.82)");
  grad.addColorStop(1, "rgba(4, 24, 66, 0.82)");
  ctx.save();
  ctx.shadowColor = "rgba(56, 232, 255, 0.44)";
  ctx.shadowBlur = 10;
  roundRect(ctx, x, y, w, h, 8, grad, "rgba(116, 244, 255, 0.82)");
  ctx.shadowBlur = 0;
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6, "rgba(1, 15, 45, 0.24)", "rgba(255,255,255,0.22)");
  label(ctx, text, x + w / 2, y + h / 2 + 1, 13, "#ffffff", "900", "center");
  ctx.restore();
}

function iconButton(ctx, state, action, text, x, y, w, h) {
  state.buttons.push({ action, x, y, w, h });
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(20, 165, 220, 0.9)");
  grad.addColorStop(1, "rgba(4, 26, 72, 0.9)");
  ctx.save();
  ctx.shadowColor = "rgba(56, 232, 255, 0.5)";
  ctx.shadowBlur = 11;
  roundRect(ctx, x, y, w, h, 8, grad, "rgba(116, 244, 255, 0.85)");
  ctx.shadowBlur = 0;
  label(ctx, text, x + w / 2, y + h / 2 + 1, 20, "#ffffff", "900", "center");
  ctx.restore();
}

function drawButtonCaps(ctx, x, y, w, h) {
  ctx.strokeStyle = "rgba(130, 246, 255, 0.7)";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const px = side < 0 ? x + 18 : x + w - 18;
    ctx.beginPath();
    ctx.moveTo(px, y + 11);
    ctx.lineTo(px + side * 18, y + h * 0.5);
    ctx.lineTo(px, y + h - 11);
    ctx.stroke();
  }
}

function drawButtonDiamond(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  const grad = ctx.createLinearGradient(-size, -size, size, size);
  grad.addColorStop(0, "#dffcff");
  grad.addColorStop(0.52, "#38e8ff");
  grad.addColorStop(1, "#034f9f");
  roundRect(ctx, -size / 2, -size / 2, size, size, 2, grad, "#ffffff");
  ctx.restore();
}

function drawImageFit(ctx, image, x, y, maxW, maxH) {
  if (!image) return;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}

function drawPanel(ctx, x, y, w, h, alpha) {
  roundRect(ctx, x, y, w, h, 8, `rgba(4, 24, 58, ${alpha})`, "rgba(56, 232, 255, 0.72)");
}

function drawBar(ctx, x, y, w, h, ratio, overrideColor = null) {
  roundRect(ctx, x, y, w, h, 7, "rgba(255,255,255,0.18)", "rgba(255,255,255,0.38)");
  const color = overrideColor || (ratio > 0.45 ? "#33eeff" : ratio > 0.22 ? "#ffd76b" : "#ff6b6b");
  roundRect(ctx, x + 2, y + 2, Math.max(4, (w - 4) * ratio), h - 4, 5, color, color);
}

function drawScrim(ctx, alpha) {
  ctx.fillStyle = `rgba(3, 10, 30, ${alpha})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function title(ctx, text, x, y, size) {
  label(ctx, text, x, y, size, "#ffffff", "900", "center");
  label(ctx, text, x, y + 2, size, "rgba(56, 232, 255, 0.2)", "900", "center");
}

function label(ctx, text, x, y, size, color, weight = "700", align = "left") {
  ctx.font = `${weight} ${size}px Arial, Apple SD Gothic Neo, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}
