import { GAME } from "./config.js";

export function createMissions(tier = 0) {
  const step = Math.max(0, tier);
  const sets = [
    [
      mission("crystal", `수정 ${5 + step * 2}개`, 5 + step * 2),
      mission("near", `근접 회피 ${3 + step}회`, 3 + step),
      mission("distance", `${600 + step * 220}m 비행`, 600 + step * 220),
    ],
    [
      mission("item", `아이템 ${7 + step * 2}개`, 7 + step * 2),
      mission("combo", `콤보 ${5 + step} 달성`, 5 + step),
      mission("level", `LV ${Math.min(6, 3 + step)} 도달`, Math.min(6, 3 + step)),
    ],
    [
      mission("near", `아슬아슬 ${4 + step}회`, 4 + step),
      mission("lava", `용암 도전 ${1 + Math.floor(step / 2)}회`, 1 + Math.floor(step / 2)),
      mission("distance", `${900 + step * 260}m 비행`, 900 + step * 260),
    ],
  ];
  return sets[step % sets.length].map((item) => ({ ...item }));
}

export function scoreMultiplier(state) {
  let value = state.feverTime > 0 ? 2 : 1;
  if (state.map === "lava") value *= GAME.lavaScoreMultiplier;
  if (state.boostTime > 0) value *= 1.25;
  return value;
}

export function addFever(state, amount, emit) {
  if (state.feverTime > 0) return;
  state.fever = Math.min(100, state.fever + amount);
  if (state.fever < 100) return;
  state.feverTime = 6;
  state.fever = 0;
  state.effects.push({ x: state.player.x + 70, y: state.player.y - 64, text: "FEVER x2", life: 1, good: true });
  emit(state, "fever");
}

export function updateMissions(state, emit) {
  for (const mission of state.missions) {
    if (mission.kind === "crystal") mission.progress = state.crystals;
    if (mission.kind === "item") mission.progress = state.itemsCollected;
    if (mission.kind === "near") mission.progress = state.nearMisses;
    if (mission.kind === "distance") mission.progress = Math.floor(state.distance);
    if (mission.kind === "combo") mission.progress = state.bestCombo || state.combo;
    if (mission.kind === "level") mission.progress = state.level;
    if (mission.kind === "lava") mission.progress = state.lavaRuns || 0;
    if (!mission.done && mission.progress >= mission.target) completeMission(state, mission, emit);
  }
  if (state.missions.every((mission) => mission.done)) refreshMissions(state, emit);
}

function completeMission(state, mission, emit) {
  mission.done = true;
  state.score += 500;
  state.effects.push({ x: state.player.x + 82, y: state.player.y - 86, text: "MISSION +500", life: 1, good: true });
  emit(state, "collect");
}

function refreshMissions(state, emit) {
  state.missionTier = (state.missionTier || 0) + 1;
  state.score += 350 + state.missionTier * 70;
  state.missions = createMissions(state.missionTier);
  state.effects.push({ x: state.player.x + 92, y: state.player.y - 104, text: "NEW QUEST", life: 1.1, good: true });
  emit(state, "gold");
}

function mission(kind, label, target) {
  return { kind, label, progress: 0, target, done: false };
}
