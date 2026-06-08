const VISIT_SESSION_KEY = "kemi-fly-visit-counted";
const VALID_EVENTS = new Set(["visit", "start", "record"]);

export function trackVisitOnce() {
  if (readSessionFlag(VISIT_SESSION_KEY)) return;
  writeSessionFlag(VISIT_SESSION_KEY);
  trackStatsEvent("visit");
}

export function trackStatsEvent(event) {
  if (!VALID_EVENTS.has(event) || !shouldUseRemoteStats()) return;
  const body = JSON.stringify({ event });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/stats", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/stats", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

function shouldUseRemoteStats() {
  const hostname = window.location.hostname;
  return !["127.0.0.1", "localhost", "::1", ""].includes(hostname);
}

function readSessionFlag(key) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch (error) {
    return false;
  }
}

function writeSessionFlag(key) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch (error) {
    // 통계는 보조 기능이므로 세션 저장소가 막힌 환경에서는 조용히 중복 방지를 포기합니다.
  }
}
