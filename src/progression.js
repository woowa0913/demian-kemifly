export function createMissions() {
  return [
    { kind: "crystal", label: "수정 5개", progress: 0, target: 5, done: false },
    { kind: "near", label: "근접 회피 3회", progress: 0, target: 3, done: false },
    { kind: "distance", label: "600m 비행", progress: 0, target: 600, done: false },
  ];
}

export function scoreMultiplier(state) {
  return state.feverTime > 0 ? 2 : 1;
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
    if (mission.kind === "near") mission.progress = state.nearMisses;
    if (mission.kind === "distance") mission.progress = Math.floor(state.distance);
    if (!mission.done && mission.progress >= mission.target) completeMission(state, mission, emit);
  }
}

function completeMission(state, mission, emit) {
  mission.done = true;
  state.score += 500;
  state.effects.push({ x: state.player.x + 82, y: state.player.y - 86, text: "MISSION +500", life: 1, good: true });
  emit(state, "collect");
}
