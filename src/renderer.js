import { GAME } from "./config.js";
import { getView } from "./layout.js";
import { getTitle } from "./storage.js";
import { drawImageCentered, drawWorld } from "./world-renderer.js";

export function render(ctx, state, assets, introVideo = null) {
  state.buttons = [];
  drawWorld(ctx, state, assets);
  drawHud(ctx, state);
  if (state.mode === "menu") drawMenu(ctx, state, assets, introVideo);
  if (state.mode === "paused") drawPause(ctx, state);
  if (state.mode === "gameover") drawGameOver(ctx, state, assets);
  if (state.mode === "hall") drawHall(ctx, state);
}

function drawHud(ctx, state) {
  if (state.mode === "menu" || state.mode === "hall") return;
  const view = getView(state);
  const top = view.portrait ? 18 : 18;
  const soundY = view.portrait ? view.height - 76 : view.height - 68;
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
  smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", view.width - 158, soundY, 136, 42);
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
  if (state.map === "lava") label(ctx, "LAVA ZONE", x + w - 18, y + 24, 13, "#ffb357", "900", "right");
}

function getLevelProgressText(state) {
  const level = Math.max(1, Math.min(6, state.level || 1));
  if (level >= 6) return "MAX LV";
  const next = GAME.levelThresholds[level];
  return `다음 LV ${state.itemsCollected}/${next}`;
}

function drawMenu(ctx, state, assets, introVideo) {
  const view = getView(state);
  const cx = view.width / 2;
  drawIntroFrame(ctx, introVideo, view);
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
  drawLegend(ctx, view, startY + (view.portrait ? 300 : -266));
}

function drawIntroFrame(ctx, video, view) {
  if (!video || video.readyState < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.52;
  drawCoverVideo(ctx, video, 0, 0, view.width, view.height);
  ctx.restore();
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
  label(ctx, state.isRecord ? prompt : state.message, cx, panelY + 126, 17, "#ffd76b", "800", "center");
  button(ctx, state, state.isRecord && !state.saved ? "save" : "restart", state.isRecord && !state.saved ? "기록 저장" : "RETRY", cx - 136, buttonY, 272, 62);
  button(ctx, state, "hall", "명예의 전당", cx - 136, buttonY + 76, 272, 58);
}

function drawLegend(ctx, view, y) {
  if (!view.portrait) {
    drawPanel(ctx, 38, 118, 200, 94, 0.42);
    label(ctx, "+ 링 = 수집", 62, 150, 15, "#78ffca", "900");
    label(ctx, "! 링 = 회피", 62, 184, 15, "#ff8585", "900");
    return;
  }
  drawPanel(ctx, 54, y, view.width - 108, 86, 0.42);
  label(ctx, "+ 링은 먹고", view.width / 2 - 78, y + 34, 16, "#78ffca", "900", "center");
  label(ctx, "! 링은 피해요", view.width / 2 + 80, y + 34, 16, "#ff8585", "900", "center");
  label(ctx, "근접 회피와 미션으로 피버를 채우세요", view.width / 2, y + 64, 13, "#d9fbff", "800", "center");
}

function drawHall(ctx, state) {
  const view = getView(state);
  const cx = view.width / 2;
  const panel = view.portrait ? { x: 34, y: 154, w: view.width - 68, h: 604, row: 48 } : { x: 210, y: 116, w: 540, h: 318, row: 27 };
  drawScrim(ctx, 0.42);
  title(ctx, "명예의 전당", cx, view.portrait ? 94 : 80, view.portrait ? 40 : 44);
  drawPanel(ctx, panel.x, panel.y, panel.w, panel.h, 0.74);
  const rows = state.leaderboard.length ? state.leaderboard : [{ name: "첫 기록을 기다려요", score: 0, title: "새싹 비행가" }];
  rows.slice(0, 10).forEach((entry, index) => {
    const y = panel.y + 48 + index * panel.row;
    label(ctx, `${index + 1}`, panel.x + 40, y, 17, "#ffd76b", "900", "center");
    label(ctx, entry.name, panel.x + 84, y, 17, "#ffffff", "800");
    label(ctx, String(entry.score), panel.x + panel.w - 156, y, 17, "#ffffff", "900", "right");
    label(ctx, entry.title, panel.x + panel.w - 126, y, 15, "#8cf6ff", "700");
  });
  button(ctx, state, "back", "BACK", cx - 120, view.portrait ? 800 : 462, 240, 58);
}

function button(ctx, state, action, text, x, y, w, h) {
  state.buttons.push({ action, x, y, w, h });
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#087ed2");
  grad.addColorStop(1, "#032c67");
  roundRect(ctx, x, y, w, h, 8, grad, "#38e8ff");
  label(ctx, text, x + w / 2, y + h / 2 + 2, h > 60 ? 32 : 24, "#ffffff", "900", "center");
}

function smallButton(ctx, state, action, text, x, y, w, h) {
  state.buttons.push({ action, x, y, w, h });
  roundRect(ctx, x, y, w, h, 8, "rgba(4, 24, 58, 0.58)", "rgba(56, 232, 255, 0.65)");
  label(ctx, text, x + w / 2, y + h / 2 + 1, 13, "#d9fbff", "900", "center");
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

function drawCoverVideo(ctx, video, x, y, w, h) {
  if (!video.videoWidth || !video.videoHeight) return;
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, x, y, w, h);
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
