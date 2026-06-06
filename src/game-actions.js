import { GAME } from "./config.js";
import { addFever, scoreMultiplier, updateMissions } from "./progression.js";
import { getTitle, loadLeaderboard, qualifiesForLeaderboard } from "./storage.js";

const GOLD_SOUND_ITEMS = new Set(["goldCrystal", "star", "hourglass"]);

export function drainAudioEvents(state) {
  const events = state.audioEvents;
  state.audioEvents = [];
  return events;
}

export function emit(state, type) {
  state.audioEvents.push({ type });
}

export function collect(state, item) {
  if (item.lavaTrap) {
    activateLavaTrap(state, item);
    return;
  }
  state.combo += 1;
  rewardComboMilestone(state);
  state.itemsCollected += 1;
  updateLevel(state, item);
  addFever(state, item.fever || (item.kind === "goldCrystal" || item.kind === "star" ? 18 : 12), emit);
  state.score += (item.score + state.combo * 12) * scoreMultiplier(state);
  if (item.kind === "crystal" || item.kind === "goldCrystal") state.crystals += 1;
  if (item.heal) state.energy = Math.min(GAME.maxEnergy, state.energy + item.heal);
  if (item.shield) {
    state.shield = Math.min(maxShieldForLevel(state), state.shield + item.shield);
    state.shieldFlash = 4.5;
  }
  if (item.magnet) state.magnetTime = Math.max(state.magnetTime, GAME.magnetDuration);
  if (item.slow) state.slowTime = Math.max(state.slowTime, GAME.slowDuration);
  if (item.glide) state.glideTime = Math.max(state.glideTime, GAME.glideDuration);
  if (item.boost) state.boostTime = Math.max(state.boostTime, GAME.boostDuration);
  updateMissions(state, emit);
  state.effects.push({ x: item.x, y: item.y, text: getItemEffectText(item), life: 0.8, good: true });
  if (item.shield) emit(state, "shield");
  else if (item.magnet) emit(state, "magnet");
  else if (item.slow) emit(state, "slow");
  else if (item.boost || item.glide) emit(state, "boost");
  else if (item.heal) emit(state, "heal");
  else if (GOLD_SOUND_ITEMS.has(item.kind)) emit(state, "gold");
  else emit(state, "collect");
}

function activateLavaTrap(state, item) {
  item.collected = true;
  state.combo = 0;
  state.map = "lava";
  state.lavaTimer = GAME.lavaDuration;
  state.lavaRuns = (state.lavaRuns || 0) + 1;
  state.message = `용암 포탈! 점수 x${GAME.lavaScoreMultiplier}`;
  state.shake = 10;
  state.score += 220;
  state.effects.push({ x: item.x, y: item.y - 8, text: `RISK x${GAME.lavaScoreMultiplier}`, life: 1, good: false });
  damage(state, 12, "용암 포탈");
  emit(state, "lava");
}

function updateLevel(state, item) {
  const next = GAME.levelThresholds.reduce((level, threshold, index) => {
    return state.itemsCollected >= threshold ? index + 1 : level;
  }, 1);
  if (next <= state.level) return;
  state.level = Math.min(6, next);
  state.maxLevel = Math.max(state.maxLevel || 1, state.level);
  state.levelFlash = 1.2;
  state.levelReveal = 1.45;
  state.score += state.level * 180;
  state.energy = Math.min(GAME.maxEnergy, state.energy + 8);
  if (state.level >= 3 && state.level % 2 === 1) {
    state.shield = Math.min(maxShieldForLevel(state), state.shield + 1);
    state.shieldFlash = 2.4;
  }
  state.effects.push({ x: item.x, y: item.y - 34, text: `LV ${state.level}!`, life: 1.1, good: true });
  emit(state, "levelup");
}

export function damage(state, amount, label) {
  if (state.damageTimer > 0) return;
  if (state.shield > 0) {
    state.shield -= 1;
    state.message = "보호막!";
    state.shieldFlash = 1.6;
    emit(state, "shield");
  } else {
    const reduced = Math.max(4, amount - Math.floor((state.level || 1) * 1.3));
    state.energy = Math.max(0, state.energy - reduced);
    state.fever = Math.max(0, state.fever - 18);
    state.message = `${label} -${reduced}`;
    state.shake = 8;
    emit(state, "damage");
  }
  state.damageTimer = GAME.damageCooldown;
  state.lastComboReward = 0;
}

export function rewardComboMilestone(state) {
  const milestone = Math.floor((state.combo || 0) / GAME.comboMilestone) * GAME.comboMilestone;
  if (milestone <= 0 || milestone <= (state.lastComboReward || 0)) return;
  state.lastComboReward = milestone;
  const energyGain = Math.min(18, 6 + Math.floor(milestone / GAME.comboMilestone) * 2);
  const feverGain = Math.min(18, 8 + Math.floor(milestone / 10) * 3);
  state.energy = Math.min(GAME.maxEnergy, state.energy + energyGain);
  state.score += milestone * 18 * scoreMultiplier(state);
  if (milestone % 10 === 0) {
    state.shield = Math.min(maxShieldForLevel(state), state.shield + 1);
    state.shieldFlash = 2.2;
  }
  addFever(state, feverGain, emit);
  state.effects.push({ x: state.player.x + 78, y: state.player.y - 72, text: `COMBO ${milestone}!`, life: 1, good: true });
  emit(state, milestone % 10 === 0 ? "shield" : "gold");
}

export function finishRun(state, reason) {
  state.mode = "gameover";
  state.score = Math.floor(state.score);
  state.distance = Math.floor(state.distance);
  state.message = reason;
  state.leaderboard = loadLeaderboard();
  state.lastLavaSurvival = Math.max(state.lastLavaSurvival || 0, state.lavaSurvival || 0);
  state.runSummary = buildRunSummary(state);
  state.isRecord = qualifiesForLeaderboard(state.score);
  state.effects.push({ x: state.player.x + 52, y: state.player.y - 40, text: getTitle(state.score), life: 1, good: false });
  emit(state, "gameover");
}

function getItemEffectText(item) {
  if (item.magnet) return "MAGNET";
  if (item.slow) return "SLOW";
  if (item.glide) return "GLIDE";
  if (item.boost) return "BOOST";
  if (item.shield) return "SHIELD";
  if (item.heal) return `+${item.heal} ENERGY`;
  return `+${item.score}`;
}

function maxShieldForLevel(state) {
  return Math.min(5, 2 + Math.floor((state.level || 1) / 2));
}

function buildRunSummary(state) {
  const best = state.leaderboard[0]?.score || 0;
  const nextLevelIndex = Math.max(1, Math.min(5, state.level || 1));
  const nextLevelNeed = state.level >= 6 ? 0 : Math.max(0, GAME.levelThresholds[nextLevelIndex] - state.itemsCollected);
  return {
    score: state.score,
    bestGap: Math.max(0, best - state.score),
    bestCombo: state.bestCombo || state.combo || 0,
    maxLevel: state.maxLevel || state.level || 1,
    nextLevelNeed,
    lavaSurvival: Math.floor(state.lastLavaSurvival || 0),
    missionsCompleted: state.missionsCompleted || 0,
    title: getTitle(state.score),
    coachTip: getCoachTip(state),
  };
}

function getCoachTip(state) {
  if ((state.bestCombo || 0) < 3) return "팁: 장애물 가장자리를 스치듯 피하면 콤보와 피버가 빨라져요";
  if ((state.maxLevel || 1) < 3) return "팁: 초록/금색 링 아이템을 이어 먹으면 케미가 빠르게 성장해요";
  if ((state.lavaRuns || 0) === 0 && state.distance >= 500) return "팁: 포탈은 위험하지만 짧은 고득점 찬스예요";
  if (state.energy < 25) return "팁: 에너지가 낮을 땐 하트와 구름을 우선 노려요";
  return "좋아요: 다음 판은 콤보 10 이상으로 실드 보상을 노려봐요";
}
