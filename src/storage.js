import { GAME, TITLES } from "./config.js";

const NAME_PATTERN = /[^\w가-힣ㄱ-ㅎㅏ-ㅣ -]/g;

export function sanitizeName(value) {
  const text = String(value ?? "")
    .replace(NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8);
  return text || "KEMI";
}

export function hasValidName(value) {
  return String(value ?? "")
    .replace(NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}

export function getTitle(score) {
  const found = TITLES.find((entry) => score >= entry.score);
  return found ? found.label : "새싹 비행가";
}

export function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(GAME.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, GAME.leaderboardSize);
  } catch (error) {
    return [];
  }
}

export function qualifiesForLeaderboard(score) {
  const board = loadLeaderboard();
  return board.length < GAME.leaderboardSize || score > board[board.length - 1].score;
}

export function saveScore(name, stats) {
  const board = mergeLeaderboard(loadLeaderboard(), buildRecord(name, stats));
  return storeLeaderboard(board);
}

export async function syncLeaderboardFromServer() {
  try {
    const response = await fetch("/api/leaderboard", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return loadLeaderboard();

    const payload = await response.json();
    const board = normalizeLeaderboard(payload?.leaderboard);
    return storeLeaderboard(board);
  } catch (error) {
    return loadLeaderboard();
  }
}

export async function saveScoreRemote(name, stats) {
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRecord(name, stats)),
    });
    if (!response.ok) return loadLeaderboard();

    const payload = await response.json();
    const board = normalizeLeaderboard(payload?.leaderboard);
    return storeLeaderboard(board);
  } catch (error) {
    return loadLeaderboard();
  }
}

function buildRecord(name, stats) {
  const score = Math.max(0, Math.floor(Number(stats.score) || 0));
  return {
    name: sanitizeName(name),
    score,
    distance: Math.max(0, Math.floor(Number(stats.distance) || 0)),
    crystals: Math.max(0, Math.floor(Number(stats.crystals) || 0)),
    title: getTitle(score),
    at: new Date().toISOString(),
  };
}

function mergeLeaderboard(board, record) {
  return [...board, record].sort((a, b) => b.score - a.score).slice(0, GAME.leaderboardSize);
}

function storeLeaderboard(board) {
  try {
    window.localStorage.setItem(GAME.storageKey, JSON.stringify(board));
  } catch (error) {
    return loadLeaderboard();
  }
  return board;
}

function normalizeLeaderboard(records) {
  if (!Array.isArray(records)) return [];
  return records.map(normalizeRecord).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, GAME.leaderboardSize);
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;
  const score = Math.max(0, Math.floor(Number(record.score) || 0));
  return {
    name: sanitizeName(record.name),
    score,
    distance: Math.max(0, Math.floor(Number(record.distance) || 0)),
    crystals: Math.max(0, Math.floor(Number(record.crystals) || 0)),
    title: sanitizeName(record.title || getTitle(score)),
    at: typeof record.at === "string" ? record.at : "",
  };
}
