import { GAME } from "./config.js";
import { getView } from "./layout.js";
import { getTitle } from "./storage.js";
import { drawImageCentered, drawWorld } from "./world-renderer.js";

export function render(ctx, state, assets) {
  state.buttons = [];
  drawWorld(ctx, state, assets);
  drawHud(ctx, state);
  if (state.mode === "playing") drawRunMoments(ctx, state);
  if (state.mode === "menu") drawMenu(ctx, state, assets);
  if (state.mode === "paused") drawPause(ctx, state);
  if (state.mode === "gameover") drawGameOver(ctx, state, assets);
  if (state.mode === "hall") drawHall(ctx, state, assets);
}

function drawHud(ctx, state) {
  if (state.mode === "menu" || state.mode === "hall" || state.mode === "gameover") return;
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
  drawActiveChips(ctx, state, view);
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
  if (state.map === "lava") label(ctx, `LAVA ${Math.ceil(state.lavaTimer)}s x${GAME.lavaScoreMultiplier}`, x + w - 18, y + 24, 13, "#ffb357", "900", "right");
  else if (state.boostTime > 0) label(ctx, `BOOST ${Math.ceil(state.boostTime)}s`, x + w - 18, y + 24, 13, "#ffd76b", "900", "right");
}

function getLevelProgressText(state) {
  const level = Math.max(1, Math.min(6, state.level || 1));
  if (level >= 6) return "MAX LV";
  const next = GAME.levelThresholds[level];
  return `다음 LV ${state.itemsCollected}/${next}`;
}

function drawActiveChips(ctx, state, view) {
  const chips = getActiveChips(state);
  if (!chips.length) return;
  const y = view.portrait ? 194 : 106;
  let x = view.portrait ? 22 : 286;
  for (const chip of chips.slice(0, view.portrait ? 3 : 4)) {
    const w = Math.max(76, chip.text.length * 8 + 24);
    chipBox(ctx, x, y, w, 28, chip.text, chip.color);
    x += w + 8;
  }
}

function getActiveChips(state) {
  const chips = [];
  if (state.magnetTime > 0) chips.push({ text: `자석 ${Math.ceil(state.magnetTime)}`, color: "#78ffca" });
  if (state.slowTime > 0) chips.push({ text: `감속 ${Math.ceil(state.slowTime)}`, color: "#9af7ff" });
  if (state.glideTime > 0) chips.push({ text: `활공 ${Math.ceil(state.glideTime)}`, color: "#d9fbff" });
  if (state.boostTime > 0) chips.push({ text: `부스트 ${Math.ceil(state.boostTime)}`, color: "#ffd76b" });
  return chips;
}

function drawRunMoments(ctx, state) {
  const view = getView(state);
  if (state.levelReveal > 0) {
    const alpha = Math.min(1, state.levelReveal / 0.8);
    drawMomentBanner(ctx, view.width / 2, view.height * 0.34, `LV ${state.level}`, getLevelPerkText(state.level), "#ffd76b", alpha);
  }
  if (state.map === "lava" && state.lavaTimer > 0) {
    const y = view.portrait ? 222 : 112;
    const text = `용암 챌린지 ${Math.ceil(state.lavaTimer)}초`;
    drawMomentBanner(ctx, view.width / 2, y, text, `생존하면 +450 · 점수 x${GAME.lavaScoreMultiplier}`, "#ff9a44", 0.82);
  }
}

function getLevelPerkText(level) {
  if (level >= 6) return "MAX 성장 · 피격 판정 최소화";
  if (level >= 5) return "실드 한도 증가";
  if (level >= 4) return "조작 안정성 향상";
  if (level >= 3) return "보너스 실드 획득";
  return "피격 내성 상승";
}

function drawMomentBanner(ctx, x, y, titleText, detail, color, alpha) {
  const w = Math.min(410, ctx.canvas.width - 54);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  roundRect(ctx, x - w / 2, y - 30, w, 60, 10, "rgba(4, 18, 42, 0.72)", color);
  ctx.shadowBlur = 0;
  label(ctx, titleText, x, y - 8, 20, "#ffffff", "900", "center");
  label(ctx, detail, x, y + 15, 12, color, "900", "center");
  ctx.restore();
}

function drawMenu(ctx, state, assets) {
  const view = getView(state);
  const cx = view.width / 2;
  drawScrim(ctx, 0.32);
  const logoY = view.portrait ? 132 : 104;
  const birdY = view.portrait ? 330 : 285;
  const startY = view.portrait ? 540 : 318;
  drawMenuKemi(ctx, state, assets, cx, birdY, view);
  drawImageCentered(ctx, assets.logo, cx, logoY, view.portrait ? 330 : 300, view.portrait ? 174 : 158);
  label(ctx, "케미의 첫 비행", cx, view.portrait ? 236 : 196, view.portrait ? 25 : 23, "#8cf6ff", "800", "center");
  button(ctx, state, "start", "START", cx - 132, startY, 264, 68);
  button(ctx, state, "hall", "명예의 전당", cx - 132, startY + 78, 264, 60);
  if (view.portrait) smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", cx - 70, startY + 170, 140, 44);
  else smallButton(ctx, state, "sound", state.soundMuted ? "SOUND OFF" : "SOUND ON", view.width - 172, 34, 134, 42);
  drawMenuMotivation(ctx, state, cx, view.portrait ? startY + 228 : 470, view);
}

function drawMenuMotivation(ctx, state, x, y, view) {
  const best = state.leaderboard[0]?.score || 0;
  const line = getMenuLine(state);
  const target = best > 0 ? `최고 기록 ${best} · 다음 목표 ${best + 800}` : "첫 기록을 명예의 전당에 남겨봐요";
  const hint = view.portrait ? "TAP" : "SPACE/TAP";
  const w = view.portrait ? Math.min(330, view.width - 70) : 390;
  drawPanel(ctx, x - w / 2, y, w, 44, 0.34);
  label(ctx, line, x, y + 15, view.portrait ? 14 : 15, "#ffffff", "900", "center");
  label(ctx, `${target} · ${hint}`, x, y + 32, 12, "#9af7ff", "800", "center");
}

function getMenuLine(state) {
  const lines = [
    "오늘은 더 높이 날아볼까요?",
    "수정 에너지가 하늘섬을 깨워요",
    "용암 포탈은 위험하지만 보상이 커요",
    "근접 회피로 피버를 빠르게 채워봐요",
  ];
  return lines[Math.floor((state.clock || 0) / 3) % lines.length];
}

function drawMenuKemi(ctx, state, assets, x, y, view) {
  const time = state.clock || 0;
  const frame = (Math.floor(time * 5.5) % 3) + 1;
  const image = assets[`kemiLv3Frame${frame}`] || assets.kemi2 || assets.happy;
  const floatY = Math.sin(time * 2.2) * 8;
  const driftX = Math.cos(time * 1.4) * 4;
  const scalePulse = 1 + Math.sin(time * 4.4) * 0.025;
  const w = (view.portrait ? 148 : 118) * scalePulse;
  const h = (view.portrait ? 118 : 94) * scalePulse;

  ctx.save();
  ctx.translate(x + driftX, y + floatY);
  ctx.rotate(Math.sin(time * 1.8) * 0.045);
  ctx.shadowColor = "rgba(56, 232, 255, 0.42)";
  ctx.shadowBlur = 18;
  drawImageCentered(ctx, image, 0, 0, w, h);
  ctx.shadowBlur = 0;
  drawWingSpark(ctx, time, -w * 0.42, -h * 0.08);
  drawWingSpark(ctx, time + 1.2, w * 0.4, -h * 0.12);
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
  const bannerY = view.portrait ? 126 : 92;
  const panelY = view.portrait ? 188 : 128;
  const panelH = view.portrait ? 268 : 214;
  const buttonY = view.portrait ? 610 : 376;
  drawScrim(ctx, 0.5);
  drawImageCentered(ctx, assets.gameOverBanner, cx, bannerY, view.portrait ? 300 : 320, view.portrait ? 112 : 120);
  drawPanel(ctx, cx - 236, panelY, 472, panelH, 0.74);
  label(ctx, `점수 ${Math.floor(state.score)}`, cx, panelY + 42, 34, "#ffffff", "900", "center");
  label(ctx, `${getTitle(state.score)} · 거리 ${state.distance} · 수정 ${state.crystals}`, cx, panelY + 84, 18, "#9af7ff", "800", "center");
  drawRunSummary(ctx, state, cx, panelY + 122);
  const prompt = state.saved ? "기록 완료! 명예의 전당에서 확인하세요" : "명예의 전당에 기록할 이름을 입력하세요";
  if (!(state.isRecord && !state.saved)) {
    label(ctx, state.isRecord ? state.message || prompt : state.message, cx, panelY + panelH - 26, 16, "#ffd76b", "800", "center");
  } else if (state.message) {
    label(ctx, state.message, cx, panelY + panelH - 28, 16, "#ffd76b", "800", "center");
  }
  drawGameOverActions(ctx, state, view, cx, buttonY);
}

function drawGameOverActions(ctx, state, view, cx, y) {
  const primaryAction = state.isRecord && !state.saved ? "save" : "restart";
  const primaryText = state.isRecord && !state.saved ? "기록 저장" : "다시하기";
  if (view.portrait) {
    button(ctx, state, primaryAction, primaryText, cx - 230, y, 220, 58);
    button(ctx, state, "hall", "명예의 전당", cx + 10, y, 220, 58);
    button(ctx, state, "support", "데미안 지원하기", cx - 160, y + 72, 320, 54);
    return;
  }
  button(ctx, state, primaryAction, primaryText, cx - 224, y, 216, 58);
  button(ctx, state, "hall", "명예의 전당", cx + 8, y, 216, 58);
  smallButton(ctx, state, "support", "데미안 지원하기", cx - 110, y + 72, 220, 44);
}

function drawRunSummary(ctx, state, cx, y) {
  const summary = state.runSummary || {};
  const gapText = summary.bestGap > 0 ? `최고 기록까지 ${summary.bestGap}` : "새로운 최고 기록!";
  const nextText = summary.nextLevelNeed > 0 ? `다음 LV까지 ${summary.nextLevelNeed}개` : "MAX LV 도달";
  const rows = [
    [`콤보 ${summary.bestCombo || 0}`, `최고 LV ${summary.maxLevel || state.level || 1}`],
    [`용암 ${summary.lavaSurvival || 0}초`, `미션 ${summary.missionsCompleted || 0}개`],
    [gapText, nextText],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const rowY = y + i * 21;
    label(ctx, rows[i][0], cx - 104, rowY, 13, i === 2 ? "#ffd76b" : "#d9fbff", "900", "center");
    label(ctx, rows[i][1], cx + 104, rowY, 13, i === 2 ? "#ffd76b" : "#d9fbff", "900", "center");
  }
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

function drawWingSpark(ctx, time, x, y) {
  const pulse = 0.45 + Math.sin(time * 5.2) * 0.28;
  ctx.save();
  ctx.globalAlpha = Math.max(0.12, pulse);
  ctx.strokeStyle = "rgba(154, 247, 255, 0.72)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 215, 107, 0.65)";
  ctx.beginPath();
  ctx.arc(x + 9, y - 10, 1.8, 0, Math.PI * 2);
  ctx.fill();
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

function chipBox(ctx, x, y, w, h, text, color) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  roundRect(ctx, x, y, w, h, 7, "rgba(4, 24, 58, 0.72)", color);
  label(ctx, text, x + w / 2, y + h / 2 + 1, 12, "#ffffff", "900", "center");
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, ratio, overrideColor = null) {
  roundRect(ctx, x, y, w, h, 7, "rgba(255,255,255,0.18)", "rgba(255,255,255,0.38)");
  const color = overrideColor || (ratio > 0.45 ? "#33eeff" : ratio > 0.22 ? "#ffd76b" : "#ff6b6b");
  roundRect(ctx, x + 2, y + 2, Math.max(4, (w - 4) * Math.max(0, Math.min(1, ratio))), h - 4, 5, color, color);
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
