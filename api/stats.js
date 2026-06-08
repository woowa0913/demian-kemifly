import { get, put } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

const BLOB_PATH = "kemi-fly/stats.json";
const MAX_BODY_BYTES = 1024;
const MAX_DAYS = 120;
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const EVENT_TO_FIELD = Object.freeze({
  visit: "visits",
  start: "starts",
  record: "records",
});

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

  try {
    if (req.method === "GET") {
      if (!isAuthorized(req)) {
        res.status(401).json({ error: "통계 조회 권한이 없습니다." });
        return;
      }
      if (!hasBlobToken()) {
        res.status(503).json({ error: "통계 저장소가 아직 설정되지 않았습니다." });
        return;
      }
      const stats = await readStats();
      res.status(200).json(buildStatsResponse(stats));
      return;
    }

    if (!hasBlobToken()) {
      res.status(503).json({ error: "통계 저장소가 아직 설정되지 않았습니다." });
      return;
    }
    const stats = await readStats();
    const event = normalizeEvent(await readJsonBody(req));
    if (!event) {
      res.status(400).json({ error: "통계 이벤트 형식이 올바르지 않습니다." });
      return;
    }

    const updated = incrementStats(stats, event);
    await writeStats(updated);
    res.status(204).end();
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: "통계 처리 중 문제가 발생했습니다." });
  }
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isAuthorized(req) {
  const expected = process.env.STATS_ADMIN_KEY;
  if (!expected || expected.length < 8) return false;
  const actual = String(req.headers?.["x-stats-admin-key"] || "");
  if (!actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

async function readStats() {
  const blob = await get(BLOB_PATH, { access: "private" }).catch((error) => {
    if (error?.status === 404 || error?.statusCode === 404) return null;
    throw error;
  });
  if (!blob?.stream) return [];
  const text = await new Response(blob.stream).text();
  const parsed = JSON.parse(text || "[]");
  if (!Array.isArray(parsed)) return [];
  return normalizeStats(parsed);
}

async function writeStats(stats) {
  await put(BLOB_PATH, JSON.stringify(normalizeStats(stats)), {
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

function normalizeEvent(body) {
  if (!body || typeof body !== "object") return "";
  const event = String(body.event || "").trim();
  return Object.hasOwn(EVENT_TO_FIELD, event) ? event : "";
}

function incrementStats(stats, event) {
  const date = getKoreaDateKey();
  const field = EVENT_TO_FIELD[event];
  const rows = normalizeStats(stats);
  const row = rows.find((item) => item.date === date);
  if (row) {
    row[field] = Math.min(999999999, row[field] + 1);
  } else {
    rows.push({ date, visits: 0, starts: 0, records: 0, [field]: 1 });
  }
  return normalizeStats(rows);
}

function normalizeStats(rows) {
  return rows
    .map(normalizeRow)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_DAYS);
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return null;
  const date = sanitizeDateKey(row.date);
  if (!date) return null;
  return {
    date,
    visits: toCount(row.visits),
    starts: toCount(row.starts),
    records: toCount(row.records),
  };
}

function sanitizeDateKey(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function toCount(value) {
  return Math.max(0, Math.min(999999999, Math.floor(Number(value) || 0)));
}

function getKoreaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildStatsResponse(stats) {
  const rows = normalizeStats(stats);
  return {
    stats: rows,
    totals: rows.reduce(
      (sum, row) => ({
        visits: sum.visits + row.visits,
        starts: sum.starts + row.starts,
        records: sum.records + row.records,
      }),
      { visits: 0, starts: 0, records: 0 }
    ),
  };
}
