import { get, put } from "@vercel/blob";

const BLOB_PATH = "kemi-fly/leaderboard.json";
const MAX_RECORDS = 10;
const MAX_BODY_BYTES = 4096;
const NAME_PATTERN = /[^\w가-힣ㄱ-ㅎㅏ-ㅣ -]/g;
const ALLOWED_METHODS = "GET, POST, OPTIONS";

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", ALLOWED_METHODS);
    res.status(405).json({ error: "허용되지 않는 요청입니다." });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: "명예의 전당 저장소가 아직 설정되지 않았습니다." });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json({ leaderboard: await readBoard() });
      return;
    }

    const record = normalizeRecord(await readJsonBody(req));
    if (!record) {
      res.status(400).json({ error: "기록 형식이 올바르지 않습니다." });
      return;
    }

    const leaderboard = mergeRecord(await readBoard(), record);
    await writeBoard(leaderboard);
    res.status(200).json({ leaderboard });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: "명예의 전당 처리 중 문제가 발생했습니다." });
  }
}

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

async function readBoard() {
  const blob = await get(BLOB_PATH, { access: "private" }).catch((error) => {
    if (error?.status === 404 || error?.statusCode === 404) return null;
    throw error;
  });
  if (!blob?.stream) return [];
  const text = await new Response(blob.stream).text();
  const parsed = JSON.parse(text || "[]");
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeRecord).filter(Boolean).sort(sortRecords).slice(0, MAX_RECORDS);
}

async function writeBoard(leaderboard) {
  await put(BLOB_PATH, JSON.stringify(leaderboard), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
  }
  return JSON.parse(body || "{}");
}

function mergeRecord(leaderboard, record) {
  return [...leaderboard, record].sort(sortRecords).slice(0, MAX_RECORDS);
}

function sortRecords(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return b.distance - a.distance;
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;
  const score = toScore(record.score, 999999999);
  const distance = toScore(record.distance, 999999);
  const crystals = toScore(record.crystals, 99999);
  const name = sanitizeName(record.name, false);
  if (score <= 0) return null;
  if (!name) return null;
  return {
    name,
    score,
    distance,
    crystals,
    title: sanitizeName(record.title || getTitle(score)),
    at: sanitizeDate(record.at),
  };
}

function sanitizeName(value, fallback = true) {
  const text = String(value ?? "")
    .replace(NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8);
  return text || (fallback ? "KEMI" : "");
}

function toScore(value, max) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

function sanitizeDate(value) {
  const date = typeof value === "string" ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function getTitle(score) {
  if (score >= 9000) return "케미 마스터";
  if (score >= 6500) return "하늘섬의 영웅";
  if (score >= 4200) return "수정 수집가";
  if (score >= 2200) return "구름 탐험가";
  return "첫 날갯짓";
}
