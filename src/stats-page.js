const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const tbody = document.querySelector("#statsRows");
const authForm = document.querySelector("#authForm");
const adminKeyInput = document.querySelector("#adminKey");
const content = document.querySelector("#statsContent");

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const adminKey = adminKeyInput.value.trim();
  if (!adminKey) {
    statusEl.textContent = "관리자 키를 입력해주세요.";
    return;
  }
  loadStats(adminKey);
});

async function loadStats(adminKey) {
  try {
    const response = await fetch("/api/stats", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Stats-Admin-Key": adminKey,
      },
    });
    if (response.status === 401) {
      statusEl.textContent = "관리자 키가 올바르지 않습니다.";
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    authForm.hidden = true;
    content.hidden = false;
    renderStats(normalizeStats(payload?.stats), normalizeTotals(payload?.totals));
  } catch (error) {
    statusEl.textContent = "통계를 불러오지 못했습니다. Vercel Blob 환경변수를 확인해주세요.";
  }
}

function renderStats(stats, totals) {
  statusEl.textContent = stats.length ? "최근 120일 기준" : "아직 수집된 통계가 없습니다.";
  summaryEl.innerHTML = "";
  [
    ["접속", totals.visits],
    ["게임 시작", totals.starts],
    ["기록 저장", totals.records],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "summary-card";
    item.innerHTML = `<span>${label}</span><strong>${formatNumber(value)}</strong>`;
    summaryEl.appendChild(item);
  });

  tbody.innerHTML = "";
  stats.forEach((row) => {
    const tr = document.createElement("tr");
    [row.date, row.visits, row.starts, row.records].forEach((value, index) => {
      const td = document.createElement(index === 0 ? "th" : "td");
      td.textContent = index === 0 ? value : formatNumber(value);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function normalizeStats(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    date: String(row?.date || ""),
    visits: toCount(row?.visits),
    starts: toCount(row?.starts),
    records: toCount(row?.records),
  })).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));
}

function normalizeTotals(totals) {
  return {
    visits: toCount(totals?.visits),
    starts: toCount(totals?.starts),
    records: toCount(totals?.records),
  };
}

function toCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
