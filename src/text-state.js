export function renderGameToText(state) {
  const payload = {
    note: "Canvas coordinates: origin top-left, x right, y down.",
    mode: state.mode,
    view: {
      width: state.view.width,
      height: state.view.height,
      portrait: state.view.portrait,
    },
    score: Math.floor(state.score),
    map: state.map,
    lavaTimer: Number((state.lavaTimer || 0).toFixed(1)),
    lavaRuns: state.lavaRuns || 0,
    lavaSurvival: Number((state.lavaSurvival || 0).toFixed(1)),
    level: state.level,
    maxLevel: state.maxLevel || state.level,
    levelReveal: Number((state.levelReveal || 0).toFixed(1)),
    itemsCollected: state.itemsCollected,
    energy: Math.floor(state.energy),
    shield: state.shield,
    magnetTime: Number((state.magnetTime || 0).toFixed(1)),
    slowTime: Number((state.slowTime || 0).toFixed(1)),
    glideTime: Number((state.glideTime || 0).toFixed(1)),
    boostTime: Number((state.boostTime || 0).toFixed(1)),
    soundMuted: state.soundMuted,
    combo: state.combo,
    bestCombo: state.bestCombo || 0,
    fever: Math.round(state.fever),
    feverTime: Number(state.feverTime.toFixed(1)),
    message: state.message,
    runSummary: state.runSummary,
    missions: state.missions.map((mission) => ({
      label: mission.label,
      progress: Math.floor(mission.progress),
      target: mission.target,
      done: mission.done,
    })),
    player: roundEntity(state.player),
    obstacles: state.obstacles.slice(0, 5).map(roundEntity),
    items: state.items.slice(0, 5).map(roundEntity),
    leaderboard: state.leaderboard.slice(0, 3).map((entry) => ({
      name: entry.name,
      score: entry.score,
      title: entry.title,
    })),
    buttons: state.buttons.slice(0, 6).map((button) => ({
      action: button.action,
      x: Math.round(button.x),
      y: Math.round(button.y),
      w: Math.round(button.w),
      h: Math.round(button.h),
    })),
  };
  return JSON.stringify(payload);
}

function roundEntity(entity) {
  return {
    kind: entity.kind || "kemi",
    x: Math.round(entity.x),
    y: Math.round(entity.y),
    r: Math.round(entity.r),
  };
}
