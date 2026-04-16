import CryptoJS from "crypto-js";

const formatReportTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Unknown";
  }
};

const escapeHtmlForReport = (value) => {
  const normalized = value == null ? "" : String(value);
  return normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDuration = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const total = Math.floor(safeSeconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatFileSize = (bytes) => {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safeBytes < 1024) return `${safeBytes} B`;
  if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFilePageCountLabel = (pageCount) => {
  const parsed = Number(pageCount);
  const totalPages = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  return `${totalPages} page${totalPages === 1 ? "" : "s"}`;
};

const decryptForReport = (encryptedValue, roomPassword) => {
  if (typeof encryptedValue !== "string") return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, roomPassword);
    return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ DECRYPT FAIL";
  } catch {
    return "🚫 ERROR";
  }
};

const decodeExportMessage = (rawMessage = {}, roomPassword) => {
  const base = {
    ...rawMessage,
    type: rawMessage.type || "text",
  };

  const decodeReply = (replyTo) => {
    if (!replyTo) return null;
    return {
      ...replyTo,
      message: decryptForReport(replyTo.message, roomPassword),
    };
  };

  if (base.type === "image") {
    return {
      ...base,
      message: decryptForReport(base.message, roomPassword),
      caption: base.caption ? decryptForReport(base.caption, roomPassword) : "",
      replyTo: decodeReply(base.replyTo),
    };
  }

  if (base.type === "image-batch") {
    return {
      ...base,
      images: (Array.isArray(base.images) ? base.images : []).map((img) =>
        decryptForReport(img, roomPassword),
      ),
      caption: base.caption ? decryptForReport(base.caption, roomPassword) : "",
      replyTo: decodeReply(base.replyTo),
    };
  }

  if (base.type === "audio") {
    return {
      ...base,
      message: decryptForReport(base.message, roomPassword),
      caption: base.caption ? decryptForReport(base.caption, roomPassword) : "",
      replyTo: decodeReply(base.replyTo),
    };
  }

  if (base.type === "file") {
    return {
      ...base,
      message: decryptForReport(base.message, roomPassword),
      fileName: decryptForReport(base.fileName, roomPassword),
      caption: base.caption ? decryptForReport(base.caption, roomPassword) : "",
      replyTo: decodeReply(base.replyTo),
    };
  }

  if (base.type === "poll" || base.poll) {
    const poll = base.poll || {};
    return {
      ...base,
      poll: {
        ...poll,
        question: decryptForReport(poll.question, roomPassword),
        options: (Array.isArray(poll.options) ? poll.options : []).map((option) => ({
          ...option,
          text: decryptForReport(option.text, roomPassword),
        })),
      },
      replyTo: decodeReply(base.replyTo),
    };
  }

  return {
    ...base,
    message: decryptForReport(base.message, roomPassword),
    caption: base.caption ? decryptForReport(base.caption, roomPassword) : "",
    replyTo: decodeReply(base.replyTo),
  };
};

const renderFilePreviewForReport = (fileData, fileType, fileName) => {
  if (!fileData || typeof fileData !== "string") return "";
  const safeFileType = (fileType || "").toLowerCase();
  const safeName = escapeHtmlForReport(fileName || "Classified File");

  if (safeFileType.startsWith("image/")) {
    return `<img src="${fileData}" alt="${safeName}" style="max-width:320px;max-height:240px;border-radius:10px;border:1px solid #27272a;" />`;
  }

  if (safeFileType.startsWith("audio/")) {
    return `<audio controls src="${fileData}" style="width:320px;max-width:100%;"></audio>`;
  }

  if (safeFileType.startsWith("video/")) {
    return `<video controls src="${fileData}" style="max-width:420px;max-height:240px;border-radius:10px;border:1px solid #27272a;"></video>`;
  }

  if (safeFileType.includes("pdf")) {
    return `<iframe src="${fileData}" title="${safeName}" style="width:100%;max-width:560px;height:280px;border:1px solid #27272a;border-radius:10px;background:#fff;"></iframe>`;
  }

  return `<a href="${fileData}" download="${safeName}" style="color:#60a5fa;font-weight:600;">Open / Download ${safeName}</a>`;
};

const renderMessageBodyForReport = (message) => {
  const safeCaption = message.caption
    ? `<div style="margin-top:8px;color:#a1a1aa;"><strong>Caption:</strong> ${escapeHtmlForReport(message.caption)}</div>`
    : "";

  if (message.type === "image") {
    return `
      <div>
        <img src="${message.message}" alt="image" style="max-width:360px;max-height:260px;border-radius:10px;border:1px solid #27272a;" />
        ${safeCaption}
      </div>
    `;
  }

  if (message.type === "image-batch") {
    const items = (Array.isArray(message.images) ? message.images : [])
      .map(
        (img, index) =>
          `<img src="${img}" alt="image-${index + 1}" style="max-width:180px;max-height:160px;border-radius:10px;border:1px solid #27272a;" />`,
      )
      .join("");

    return `
      <div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${items}</div>
        ${safeCaption}
      </div>
    `;
  }

  if (message.type === "audio") {
    return `
      <div>
        <audio controls src="${message.message}" style="width:320px;max-width:100%;"></audio>
        <div style="margin-top:6px;color:#a1a1aa;"><strong>Duration:</strong> ${escapeHtmlForReport(formatDuration(Number(message.audioDuration || 0)))}</div>
        ${safeCaption}
      </div>
    `;
  }

  if (message.type === "file") {
    return `
      <div>
        <div style="margin-bottom:8px;"><strong>File:</strong> ${escapeHtmlForReport(message.fileName || "Classified File")}</div>
        <div style="margin-bottom:8px;color:#a1a1aa;">
          <span><strong>Type:</strong> ${escapeHtmlForReport(message.fileType || "Unknown")}</span>
          <span style="margin-left:12px;"><strong>Size:</strong> ${escapeHtmlForReport(formatFileSize(Number(message.fileSize || 0)))}</span>
          <span style="margin-left:12px;"><strong>Pages:</strong> ${escapeHtmlForReport(getFilePageCountLabel(message.filePageCount || 1))}</span>
        </div>
        ${renderFilePreviewForReport(message.message, message.fileType, message.fileName)}
        ${safeCaption}
      </div>
    `;
  }

  if (message.type === "poll" || message.poll) {
    const poll = message.poll || {};
    const options = (Array.isArray(poll.options) ? poll.options : [])
      .map((option) => {
        const voteCount = Array.isArray(option.votes) ? option.votes.length : 0;
        return `<li>${escapeHtmlForReport(option.text || "")}
          <span style="color:#a1a1aa;"> (${voteCount} vote${voteCount === 1 ? "" : "s"})</span>
        </li>`;
      })
      .join("");

    return `
      <div>
        <div><strong>Poll:</strong> ${escapeHtmlForReport(poll.question || "")}</div>
        <ol style="margin-top:8px;padding-left:18px;">${options}</ol>
      </div>
    `;
  }

  return `<div>${escapeHtmlForReport(message.message || "")}</div>`;
};

const bytesToBase64 = (byteArray) => {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < byteArray.length; index += chunkSize) {
    const chunk = byteArray.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

const encryptReportPayload = async (plainText, password) => {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable in this browser.");
  }

  const encoder = new TextEncoder();
  const iterations = 250000;
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"],
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText),
  );

  return {
    version: 1,
    algorithm: "AES-GCM-256",
    kdf: "PBKDF2-SHA-256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipherText: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };
};

const buildCompactBarChart = ({
  title,
  items,
  total,
  accentColor,
  emptyText = "No data available.",
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="compact-chart">
        <h4>${escapeHtmlForReport(title)}</h4>
        <p class="muted small">${escapeHtmlForReport(emptyText)}</p>
      </div>
    `;
  }

  const rows = items
    .map((item) => {
      const rawValue = Number(item.value || 0);
      const safeValue = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 0;
      const pct = total > 0 ? (safeValue / total) * 100 : 0;
      const pctLabel = `${pct.toFixed(1)}%`;
      const widthPct = Math.max(0, Math.min(100, pct));

      return `
        <div class="bar-row">
          <div class="bar-meta">
            <span class="bar-label">${escapeHtmlForReport(item.label || "Unknown")}</span>
            <span class="bar-value">${escapeHtmlForReport(safeValue)} <span class="muted">(${escapeHtmlForReport(pctLabel)})</span></span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${widthPct}%;background:${accentColor};"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="compact-chart">
      <h4>${escapeHtmlForReport(title)}</h4>
      ${rows}
    </div>
  `;
};

const buildProgressListCard = ({ title, items, total, emptyText }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="compact-chart">
        <h4>${escapeHtmlForReport(title)}</h4>
        <p class="muted small">${escapeHtmlForReport(emptyText || "No data available.")}</p>
      </div>
    `;
  }

  const rows = items
    .map((item) => {
      const safeValue = Number.isFinite(Number(item.value))
        ? Number(item.value)
        : 0;
      const pct = total > 0 ? (safeValue / total) * 100 : 0;
      const widthPct = Math.max(0, Math.min(100, pct));
      return `
        <div class="progress-item">
          <div class="progress-head">
            <span>${escapeHtmlForReport(item.label || "Unknown")}</span>
            <span class="muted">${escapeHtmlForReport(safeValue)} • ${escapeHtmlForReport(`${pct.toFixed(1)}%`)}</span>
          </div>
          <div class="progress-rail">
            <span class="progress-fill" style="width:${widthPct}%;"></span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="compact-chart">
      <h4>${escapeHtmlForReport(title)}</h4>
      <div class="progress-list">${rows}</div>
    </div>
  `;
};

const buildHeatmapCard = ({ title, buckets = [] }) => {
  const safeBuckets = Array.isArray(buckets) ? buckets.slice(0, 24) : [];
  if (safeBuckets.length === 0) {
    return `
      <div class="compact-chart">
        <h4>${escapeHtmlForReport(title)}</h4>
        <p class="muted small">No timeline data available.</p>
      </div>
    `;
  }

  const peak = Math.max(...safeBuckets, 0);
  const cells = safeBuckets
    .map((count, hour) => {
      const normalized = peak > 0 ? count / peak : 0;
      const tone = 28 + Math.round(normalized * 210);
      return `<div class="heat-cell" title="${escapeHtmlForReport(`${String(hour).padStart(2, "0")}:00 — ${count} message${count === 1 ? "" : "s"}`)}" style="background: rgb(${tone}, ${tone}, ${tone});"></div>`;
    })
    .join("");

  return `
    <div class="compact-chart">
      <h4>${escapeHtmlForReport(title)}</h4>
      <div class="heat-grid">${cells}</div>
      <div class="heat-legend muted small">
        <span>00:00</span>
        <span>Intensity by hour</span>
        <span>23:00</span>
      </div>
    </div>
  `;
};

const buildEncryptedReportHtml = ({ serializedPayload }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Encrypted Chat Report</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #09090b; color: #fafafa; font-family: Inter, Segoe UI, Arial, sans-serif; padding: 20px; line-height: 1.5; word-break: break-word; }
      main { max-width: 1180px; margin: 0 auto; width: 100%; }
      .panel { padding: 16px; border: 1px solid #27272a; border-radius: 12px; background: #111113; margin-bottom: 16px; }
      h1, h2 { margin: 0 0 10px 0; }
      h3 { margin: 0 0 8px 0; font-size: 16px; }
      .muted { color: #a1a1aa; }
      .meta-line { margin: 4px 0; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
      .stat-card { border: 1px solid #27272a; border-radius: 10px; background: #18181b; padding: 10px; }
      .stat-card .label { color: #a1a1aa; font-size: 12px; margin-bottom: 4px; }
      .stat-card .value { font-size: 20px; font-weight: 700; }
      .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { text-align: left; border-bottom: 1px solid #27272a; padding: 8px; vertical-align: top; }
      thead tr { background: #18181b; }
      .table-wrap { width: 100%; overflow-x: auto; border: 1px solid #27272a; border-radius: 10px; }
      .table-wrap table { min-width: 680px; }
      .message-card { border: 1px solid #27272a; border-radius: 12px; padding: 12px; margin-bottom: 10px; background: #111113; }
      .message-card-header { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
      .reply-box { margin-bottom: 8px; padding: 8px; border-radius: 8px; background: #18181b; border: 1px dashed #3f3f46; color: #d4d4d8; }
      .small { font-size: 12px; }
      .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; margin-bottom: 12px; }
      .compact-chart { border: 1px solid #27272a; border-radius: 10px; background: #141417; padding: 10px; }
      .compact-chart h4 { margin: 0 0 8px 0; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #d4d4d8; }
      .bar-row { margin-bottom: 8px; }
      .bar-row:last-child { margin-bottom: 0; }
      .bar-meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; font-size: 12px; }
      .bar-label { color: #f4f4f5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bar-value { color: #d4d4d8; flex-shrink: 0; font-variant-numeric: tabular-nums; }
      .bar-track { width: 100%; height: 8px; border-radius: 999px; background: #27272a; overflow: hidden; }
      .bar-fill { height: 100%; border-radius: 999px; }
      .visual-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin-top: 10px; }
      .progress-list { display: grid; gap: 8px; }
      .progress-item { display: grid; gap: 4px; }
      .progress-head { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
      .progress-rail { width: 100%; height: 8px; border-radius: 999px; background: #27272a; overflow: hidden; border: 1px solid #3f3f46; }
      .progress-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3f3f46, #fafafa); }
      .heat-grid { display: grid; grid-template-columns: repeat(12, minmax(12px, 1fr)); gap: 4px; }
      .heat-cell { width: 100%; aspect-ratio: 1 / 1; border-radius: 3px; border: 1px solid #27272a; }
      .heat-legend { display: flex; justify-content: space-between; margin-top: 8px; }
      .message-card img, .message-card video, .message-card iframe, .message-card audio { max-width: 100%; width: auto; }
      .unlock-shell { max-width: 560px; margin: 8vh auto 0 auto; background: radial-gradient(circle at 10% 0%, rgba(255,255,255,0.05), transparent 55%), #111113; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 18px 70px rgba(0, 0, 0, 0.55); }
      .unlock-badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #e5e7eb; }
      .unlock-title { margin: 0 0 6px 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.08em; }
      .unlock-subtitle { margin: 0 0 14px 0; color: #a1a1aa; font-size: 14px; }
      .unlock-form { display: grid; gap: 10px; }
      .unlock-key-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .unlock-input { flex: 1; min-width: 230px; border: 1px solid #3f3f46; border-radius: 10px; background: #09090b; color: #fafafa; padding: 10px 12px; font-size: 14px; }
      .unlock-input:focus { outline: none; border-color: #ffffff; box-shadow: 0 0 0 2px rgba(255,255,255,0.12); }
      .unlock-toggle { border: 1px solid #3f3f46; background: #18181b; color: #e4e4e7; font-weight: 700; padding: 10px 12px; border-radius: 10px; cursor: pointer; min-width: 98px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
      .unlock-btn { border: 1px solid #ffffff; background: #ffffff; color: #09090b; font-weight: 700; padding: 10px 14px; border-radius: 10px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
      .unlock-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      .unlock-hint { margin-top: -2px; margin-bottom: 0; font-size: 12px; color: #a1a1aa; }
      .unlock-status { margin-top: 10px; font-size: 13px; color: #fca5a5; }

      @media (max-width: 900px) {
        body { padding: 14px; }
        .panel { padding: 12px; margin-bottom: 12px; }
        .stats-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .kpi-row { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .chart-grid, .visual-grid { grid-template-columns: 1fr; }
        .message-card-header { flex-direction: column; align-items: flex-start; }
        .bar-meta, .progress-head { flex-wrap: wrap; }
        .table-wrap table { min-width: 620px; }
      }

      @media (max-width: 640px) {
        body { padding: 10px; line-height: 1.45; }
        h1 { font-size: 18px; }
        h2 { font-size: 16px; }
        h3 { font-size: 14px; }
        .stat-card { padding: 9px; }
        .stat-card .value { font-size: 18px; }
        .table-wrap table { min-width: 560px; font-size: 12px; }
        th, td { padding: 6px; }
        .unlock-shell { margin-top: 3vh; }
        .unlock-key-row { flex-direction: column; }
        .unlock-input { min-width: 0; width: 100%; }
        .unlock-toggle, .unlock-btn { width: 100%; }
        .heat-grid { grid-template-columns: repeat(8, minmax(12px, 1fr)); }
      }
    </style>
  </head>
  <body>
    <section id="unlock-shell" class="panel unlock-shell">
      <span class="unlock-badge">Classified Access</span>
      <h1 class="unlock-title">Encrypted Room Report</h1>
      <p class="unlock-subtitle">Enter the room encryption key used during room creation to decrypt and view this report.</p>
      <form id="unlock-form" class="unlock-form">
        <div class="unlock-key-row">
          <input id="unlock-password" class="unlock-input" type="password" autocomplete="off" placeholder="Room encryption key" />
          <button id="unlock-toggle" class="unlock-toggle" type="button">Show Key</button>
        </div>
        <button id="unlock-button" class="unlock-btn" type="submit">Decrypt Report</button>
      </form>
      <p id="unlock-hint" class="unlock-hint">For security, repeated invalid attempts trigger a short cooldown.</p>
      <p id="unlock-status" class="unlock-status" aria-live="polite"></p>
    </section>

    <div id="report-root" hidden></div>

    <script>
      const encryptedPayload = ${serializedPayload};
      const unlockShell = document.getElementById("unlock-shell");
      const unlockForm = document.getElementById("unlock-form");
      const unlockPasswordInput = document.getElementById("unlock-password");
      const unlockToggle = document.getElementById("unlock-toggle");
      const unlockButton = document.getElementById("unlock-button");
      const unlockHint = document.getElementById("unlock-hint");
      const unlockStatus = document.getElementById("unlock-status");
      const reportRoot = document.getElementById("report-root");
      const RATE_LIMIT_MAX_ATTEMPTS = 3;
      const RATE_LIMIT_COOLDOWN_MS = 15000;
      let failedAttempts = 0;
      let cooldownUntil = 0;
      let cooldownTimerId = null;

      const setStatus = (message, color) => {
        unlockStatus.textContent = message;
        unlockStatus.style.color = color || "#fca5a5";
      };

      const formatSeconds = (milliseconds) => {
        return Math.max(1, Math.ceil(milliseconds / 1000));
      };

      const clearCooldownTicker = () => {
        if (cooldownTimerId) {
          window.clearInterval(cooldownTimerId);
          cooldownTimerId = null;
        }
      };

      const applyCooldownState = () => {
        const remainingMs = cooldownUntil - Date.now();
        const inCooldown = remainingMs > 0;

        unlockButton.disabled = inCooldown;
        unlockPasswordInput.disabled = inCooldown;
        unlockToggle.disabled = inCooldown;

        if (inCooldown) {
          unlockHint.textContent =
            "Cooldown active. Retry in " +
            formatSeconds(remainingMs) +
            "s.";
        } else {
          unlockHint.textContent =
            "For security, repeated invalid attempts trigger a short cooldown.";
        }

        return inCooldown;
      };

      const startCooldownTicker = () => {
        clearCooldownTicker();
        cooldownTimerId = window.setInterval(() => {
          const active = applyCooldownState();
          if (!active) {
            clearCooldownTicker();
            setStatus("", "#fca5a5");
          }
        }, 250);
      };

      const base64ToBytes = (base64Value) => {
        const binary = atob(base64Value);
        const length = binary.length;
        const bytes = new Uint8Array(length);
        for (let index = 0; index < length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
      };

      const decryptReport = async (password) => {
        if (!window.crypto || !window.crypto.subtle) {
          throw new Error("Web Crypto API is unavailable in this browser.");
        }

        const encoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
          "raw",
          encoder.encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveKey"],
        );

        const key = await window.crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: base64ToBytes(encryptedPayload.salt),
            iterations: encryptedPayload.iterations,
            hash: "SHA-256",
          },
          passwordKey,
          {
            name: "AES-GCM",
            length: 256,
          },
          false,
          ["decrypt"],
        );

        const plainBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: base64ToBytes(encryptedPayload.iv) },
          key,
          base64ToBytes(encryptedPayload.cipherText),
        );

        return new TextDecoder().decode(plainBuffer);
      };

      unlockToggle.addEventListener("click", () => {
        const shouldShow = unlockPasswordInput.type === "password";
        unlockPasswordInput.type = shouldShow ? "text" : "password";
        unlockToggle.textContent = shouldShow ? "Hide Key" : "Show Key";
      });

      unlockForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (Date.now() < cooldownUntil) {
          const remainingMs = cooldownUntil - Date.now();
          setStatus(
            "Too many failed attempts. Retry in " +
              formatSeconds(remainingMs) +
              "s.",
            "#fca5a5",
          );
          applyCooldownState();
          return;
        }

        const candidatePassword = unlockPasswordInput.value || "";

        if (!candidatePassword) {
          setStatus("Encryption key is required.", "#fca5a5");
          return;
        }

        setStatus("Decrypting report...", "#a1a1aa");
        unlockButton.disabled = true;
        unlockToggle.disabled = true;

        try {
          const reportMarkup = await decryptReport(candidatePassword);
          failedAttempts = 0;
          cooldownUntil = 0;
          clearCooldownTicker();
          reportRoot.innerHTML = reportMarkup;
          reportRoot.hidden = false;
          unlockShell.hidden = true;
          document.title = "Secure Chat History Report";
        } catch (error) {
          failedAttempts += 1;

          if (failedAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
            cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            failedAttempts = 0;
            setStatus(
              "Too many failed attempts. Cooldown started for " +
                formatSeconds(RATE_LIMIT_COOLDOWN_MS) +
                "s.",
              "#fca5a5",
            );
            applyCooldownState();
            startCooldownTicker();
          } else {
            const attemptsLeft = RATE_LIMIT_MAX_ATTEMPTS - failedAttempts;
            setStatus(
              "Invalid encryption key. " +
                attemptsLeft +
                " attempt" +
                (attemptsLeft === 1 ? "" : "s") +
                " remaining before cooldown.",
              "#fca5a5",
            );
          }
        } finally {
          const cooldownActive = applyCooldownState();
          if (!cooldownActive) {
            unlockButton.disabled = false;
            unlockToggle.disabled = false;
          }
        }
      });

      applyCooldownState();
    </script>
  </body>
</html>
`;

export const downloadChatHistoryReport = async ({
  exportPayload,
  approvalSnapshot = null,
  roomId,
  roomPassword,
}) => {
  if (!exportPayload) return;
  if (!roomPassword) {
    throw new Error("Missing room encryption key.");
  }

  const rawMessages = Array.isArray(exportPayload.messages)
    ? exportPayload.messages
    : [];

  const orderingAnomalies = rawMessages.reduce((count, current, index) => {
    if (index === 0) return count;
    const previousSentAt = Number(rawMessages[index - 1]?.sentAt || 0);
    const currentSentAt = Number(current?.sentAt || 0);
    return currentSentAt < previousSentAt ? count + 1 : count;
  }, 0);

  const decodedMessages = rawMessages
    .map((message) => decodeExportMessage(message, roomPassword))
    .sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));

  const activityLog = Array.isArray(exportPayload.activityLog)
    ? exportPayload.activityLog
    : [];

  const currentUsers = Array.isArray(exportPayload.currentUsers)
    ? exportPayload.currentUsers
    : [];

  const departedUsernameToAnon = new Map();
  let anonCounter = 1;
  activityLog.forEach((entry) => {
    if (entry.eventType === "agent_left" || entry.eventType === "agent_removed") {
      const username = entry.username;
      if (username && !departedUsernameToAnon.has(username)) {
        departedUsernameToAnon.set(
          username,
          `Anonymous_${String(anonCounter).padStart(3, "0")}`,
        );
        anonCounter += 1;
      }
    }
  });

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const toDisplayName = (username) => {
    if (!username) return "UNKNOWN";
    return departedUsernameToAnon.get(username) || username;
  };

  const anonifyTextForDeparted = (text) => {
    let result = typeof text === "string" ? text : String(text || "");
    departedUsernameToAnon.forEach((anonName, realName) => {
      const regex = new RegExp(`\\b${escapeRegex(realName)}\\b`, "g");
      result = result.replace(regex, anonName);
    });
    return result;
  };

  const asTimestamp = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const formatDurationFromMs = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return "0m";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const containsDecryptFailure = (value) => {
    if (typeof value !== "string") return false;
    return value.includes("⚠️ DECRYPT FAIL") || value.includes("🚫 ERROR");
  };

  const messageHasDecryptFailure = (message) => {
    const poll = message.poll || {};
    const pollOptions = Array.isArray(poll.options) ? poll.options : [];
    const imageList = Array.isArray(message.images) ? message.images : [];

    if (
      containsDecryptFailure(message.message) ||
      containsDecryptFailure(message.caption) ||
      containsDecryptFailure(message.fileName) ||
      containsDecryptFailure(message.replyTo?.message) ||
      containsDecryptFailure(poll.question)
    ) {
      return true;
    }

    if (pollOptions.some((option) => containsDecryptFailure(option.text))) {
      return true;
    }

    if (imageList.some((image) => containsDecryptFailure(image))) {
      return true;
    }

    return false;
  };

  const decryptFailureCount = decodedMessages.filter((message) =>
    messageHasDecryptFailure(message),
  ).length;

  const entryEvents = activityLog.filter(
    (entry) => entry.eventType === "agent_joined",
  );

  const messageTypeCounts = decodedMessages.reduce((acc, message) => {
    const normalizedType = (message.type || "text").toLowerCase();
    acc[normalizedType] = (acc[normalizedType] || 0) + 1;
    return acc;
  }, {});

  const activityEventCounts = activityLog.reduce((acc, entry) => {
    const key = entry.eventType || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalMessages = decodedMessages.length;
  const totalActivityEvents = activityLog.length;
  const totalJoins = entryEvents.length;
  const replyCount = decodedMessages.filter((message) => !!message.replyTo).length;
  const totalPolls = decodedMessages.filter(
    (message) => message.type === "poll" || !!message.poll,
  ).length;
  const totalAudio = decodedMessages.filter((message) => message.type === "audio").length;
  const totalFiles = decodedMessages.filter((message) => message.type === "file").length;
  const totalImagePosts = decodedMessages.filter(
    (message) => message.type === "image" || message.type === "image-batch",
  ).length;
  const totalImagesShared = decodedMessages.reduce((count, message) => {
    if (message.type === "image") return count + 1;
    if (message.type === "image-batch") {
      return count + (Array.isArray(message.images) ? message.images.length : 0);
    }
    return count;
  }, 0);

  const participantStats = new Map();
  const ensureParticipant = (name) => {
    const normalizedName = name || "UNKNOWN";
    if (!participantStats.has(normalizedName)) {
      participantStats.set(normalizedName, {
        name: normalizedName,
        messages: 0,
        joinedAt: null,
        lastSentAt: null,
        isHost: false,
        isCurrentMember: false,
      });
    }
    return participantStats.get(normalizedName);
  };

  currentUsers.forEach((user) => {
    const displayName = toDisplayName(user.username || "UNKNOWN");
    const stat = ensureParticipant(displayName);
    stat.isCurrentMember = true;
    stat.isHost = !!user.isHost;
    const joinedAt = asTimestamp(user.joinedAt);
    if (joinedAt && (!stat.joinedAt || joinedAt < stat.joinedAt)) {
      stat.joinedAt = joinedAt;
    }
  });

  entryEvents.forEach((entry) => {
    const displayName = toDisplayName(entry.username || "UNKNOWN");
    const stat = ensureParticipant(displayName);
    const joinedAt = asTimestamp(entry.timestamp);
    if (joinedAt && (!stat.joinedAt || joinedAt < stat.joinedAt)) {
      stat.joinedAt = joinedAt;
    }
  });

  decodedMessages.forEach((message) => {
    const displayName = toDisplayName(message.username || "UNKNOWN");
    const stat = ensureParticipant(displayName);
    stat.messages += 1;
    const sentAt = asTimestamp(message.sentAt);
    if (sentAt && (!stat.lastSentAt || sentAt > stat.lastSentAt)) {
      stat.lastSentAt = sentAt;
    }
  });

  const participantRowsData = Array.from(participantStats.values()).sort((a, b) => {
    if (b.messages !== a.messages) return b.messages - a.messages;
    return a.name.localeCompare(b.name);
  });

  const activeSenders = participantRowsData.filter(
    (participant) => participant.messages > 0,
  ).length;
  const uniqueParticipants = participantRowsData.length;
  const avgMessagesPerSender = activeSenders
    ? (totalMessages / activeSenders).toFixed(2)
    : "0.00";

  const timelineTimestamps = [
    asTimestamp(exportPayload.createdAt),
    asTimestamp(exportPayload.generatedAt),
    ...decodedMessages.map((message) => asTimestamp(message.sentAt)),
    ...activityLog.map((entry) => asTimestamp(entry.timestamp)),
  ].filter(Boolean);

  const firstTimelineAt = timelineTimestamps.length
    ? Math.min(...timelineTimestamps)
    : null;
  const lastTimelineAt = timelineTimestamps.length
    ? Math.max(...timelineTimestamps)
    : null;
  const reportCoverage =
    firstTimelineAt && lastTimelineAt
      ? formatDurationFromMs(lastTimelineAt - firstTimelineAt)
      : "Unavailable";

  const approvalMeta = approvalSnapshot
    ? `<p class="meta-line"><strong>Approval:</strong> ${escapeHtmlForReport(approvalSnapshot.approvedCount || 0)} / ${escapeHtmlForReport(approvalSnapshot.totalRequired || 0)} agents approved</p>`
    : "";

  const messageDistributionRows = Object.entries(messageTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count], index) => {
      const share = totalMessages
        ? `${((count / totalMessages) * 100).toFixed(1)}%`
        : "0.0%";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlForReport(type.toUpperCase())}</td>
          <td>${escapeHtmlForReport(count)}</td>
          <td>${escapeHtmlForReport(share)}</td>
        </tr>
      `;
    })
    .join("");

  const participantRows = participantRowsData
    .map((participant, index) => {
      const role = participant.isHost ? "Host" : "Agent";
      const status = participant.isCurrentMember ? "Present" : "Departed";
      const share = totalMessages
        ? `${((participant.messages / totalMessages) * 100).toFixed(1)}%`
        : "0.0%";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlForReport(participant.name)}</td>
          <td>${escapeHtmlForReport(role)}</td>
          <td>${escapeHtmlForReport(status)}</td>
          <td>${escapeHtmlForReport(participant.messages)}</td>
          <td>${escapeHtmlForReport(share)}</td>
          <td>${escapeHtmlForReport(formatReportTimestamp(participant.joinedAt))}</td>
          <td>${escapeHtmlForReport(formatReportTimestamp(participant.lastSentAt))}</td>
        </tr>
      `;
    })
    .join("");

  const messageRows = decodedMessages
    .map((message, index) => {
      const displayUsername = toDisplayName(message.username || "UNKNOWN");
      const replyToUsername = toDisplayName(message.replyTo?.username || "UNKNOWN");

      const replyTo = message.replyTo
        ? `<div class="reply-box"><strong>Reply To:</strong> ${escapeHtmlForReport(replyToUsername)} — ${escapeHtmlForReport(anonifyTextForDeparted(message.replyTo.message || ""))}</div>`
        : "";

      return `
        <article class="message-card">
          <header class="message-card-header">
            <div><strong>#${index + 1}</strong> • ${escapeHtmlForReport(displayUsername)}</div>
            <div class="muted">${escapeHtmlForReport(formatReportTimestamp(message.sentAt))} • ${escapeHtmlForReport((message.type || "text").toUpperCase())}</div>
          </header>
          ${replyTo}
          ${renderMessageBodyForReport(message)}
        </article>
      `;
    })
    .join("");

  const entryRows = entryEvents
    .map((entry, index) => {
      const displayUsername = toDisplayName(entry.username || "UNKNOWN");
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlForReport(displayUsername)}</td>
          <td>${escapeHtmlForReport(formatReportTimestamp(entry.timestamp))}</td>
        </tr>
      `;
    })
    .join("");

  const activityRows = activityLog
    .map((entry, index) => {
      const actor =
        entry.username || entry.newHostUsername || entry.rejectedBy || entry.approvedBy;
      const detailsEntries = Object.entries(entry || {})
        .filter(
          ([key, value]) =>
            ![
              "id",
              "eventType",
              "timestamp",
              "username",
              "newHostUsername",
              "rejectedBy",
              "approvedBy",
            ].includes(key) &&
            value != null &&
            value !== "",
        )
        .map(([key, value]) => `${key}: ${String(value)}`)
        .slice(0, 3);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlForReport(entry.eventType || "unknown")}</td>
          <td>${escapeHtmlForReport(toDisplayName(actor || "-"))}</td>
          <td>${escapeHtmlForReport(formatReportTimestamp(entry.timestamp))}</td>
          <td>${escapeHtmlForReport(detailsEntries.join(" | ") || "-")}</td>
        </tr>
      `;
    })
    .join("");

  const activitySummaryRows = Object.entries(activityEventCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([eventType, count], index) => {
      const share = totalActivityEvents
        ? `${((count / totalActivityEvents) * 100).toFixed(1)}%`
        : "0.0%";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlForReport(eventType)}</td>
          <td>${escapeHtmlForReport(count)}</td>
          <td>${escapeHtmlForReport(share)}</td>
        </tr>
      `;
    })
    .join("");

  const messageDistributionChart = buildCompactBarChart({
    title: "Message Types (Top)",
    items: Object.entries(messageTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count]) => ({
        label: String(type || "text").toUpperCase(),
        value: count,
      })),
    total: totalMessages,
    accentColor: "linear-gradient(90deg, #3f3f46, #fafafa)",
    emptyText: "No message types available.",
  });

  const participantContributionChart = buildCompactBarChart({
    title: "Top Participant Share",
    items: participantRowsData
      .filter((participant) => participant.messages > 0)
      .slice(0, 6)
      .map((participant) => ({
        label: participant.name,
        value: participant.messages,
      })),
    total: totalMessages,
    accentColor: "linear-gradient(90deg, #52525b, #f4f4f5)",
    emptyText: "No participant message activity.",
  });

  const activityDistributionChart = buildCompactBarChart({
    title: "Activity Events (Top)",
    items: Object.entries(activityEventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([eventType, count]) => ({
        label: eventType,
        value: count,
      })),
    total: totalActivityEvents,
    accentColor: "linear-gradient(90deg, #27272a, #e4e4e7)",
    emptyText: "No activity events available.",
  });

  const textMessages = Number(messageTypeCounts.text || 0);
  const mediaMessages = Number(totalImagePosts || 0);
  const fileMessages = Number(totalFiles || 0);
  const audioMessages = Number(totalAudio || 0);
  const pollMessages = Number(totalPolls || 0);

  const messageCompositionCard = buildProgressListCard({
    title: "Message Composition",
    items: [
      { label: "Text", value: textMessages },
      { label: "Images", value: mediaMessages },
      { label: "Files", value: fileMessages },
      { label: "Audio", value: audioMessages },
      { label: "Polls", value: pollMessages },
    ],
    total: totalMessages,
    emptyText: "No message composition available.",
  });

  const hourlyBuckets = Array.from({ length: 24 }, () => 0);
  decodedMessages.forEach((message) => {
    const ts = Number(message.sentAt || 0);
    if (!Number.isFinite(ts) || ts <= 0) return;
    const hour = new Date(ts).getHours();
    if (hour >= 0 && hour <= 23) {
      hourlyBuckets[hour] += 1;
    }
  });

  const hourlyHeatmapCard = buildHeatmapCard({
    title: "Hourly Message Intensity",
    buckets: hourlyBuckets,
  });

  const integrityCard = buildProgressListCard({
    title: "Integrity Snapshot",
    items: [
      { label: "Decrypt Failures", value: decryptFailureCount },
      { label: "Ordering Anomalies", value: orderingAnomalies },
      { label: "Replies", value: replyCount },
    ],
    total: Math.max(totalMessages, 1),
    emptyText: "No integrity telemetry available.",
  });

  const reportMainContent = `
    <main>
      <section class="panel">
        <h1>Ghost Tunnel Intelligence Report</h1>
        <p class="meta-line"><strong>Room:</strong> ${escapeHtmlForReport(exportPayload.roomName || exportPayload.roomId || "Unknown")}</p>
        <p class="meta-line"><strong>Room ID:</strong> ${escapeHtmlForReport(exportPayload.roomId || "Unknown")}</p>
        <p class="meta-line"><strong>Created:</strong> ${escapeHtmlForReport(formatReportTimestamp(exportPayload.createdAt))}</p>
        <p class="meta-line"><strong>Generated:</strong> ${escapeHtmlForReport(formatReportTimestamp(exportPayload.generatedAt))}</p>
        <p class="meta-line"><strong>Coverage Window:</strong> ${escapeHtmlForReport(reportCoverage)}</p>
        ${approvalMeta}
      </section>

      <section class="panel">
        <h2>Room Summary</h2>
        <div class="stats-grid">
          <div class="stat-card"><div class="label">Participants (Known)</div><div class="value">${escapeHtmlForReport(uniqueParticipants)}</div></div>
          <div class="stat-card"><div class="label">Active Senders</div><div class="value">${escapeHtmlForReport(activeSenders)}</div></div>
          <div class="stat-card"><div class="label">Total Messages</div><div class="value">${escapeHtmlForReport(totalMessages)}</div></div>
          <div class="stat-card"><div class="label">Activity Records</div><div class="value">${escapeHtmlForReport(totalActivityEvents)}</div></div>
          <div class="stat-card"><div class="label">Agent Joins Logged</div><div class="value">${escapeHtmlForReport(totalJoins)}</div></div>
          <div class="stat-card"><div class="label">Avg Msg / Sender</div><div class="value">${escapeHtmlForReport(avgMessagesPerSender)}</div></div>
        </div>
        <div class="visual-grid">
          ${hourlyHeatmapCard}
          ${integrityCard}
        </div>
      </section>

      <section class="panel">
        <h2>Message Analytics</h2>
        <div class="kpi-row" style="margin-bottom:10px;">
          <div class="stat-card"><div class="label">Image Posts</div><div class="value">${escapeHtmlForReport(totalImagePosts)}</div><div class="small muted">Total Images Shared: ${escapeHtmlForReport(totalImagesShared)}</div></div>
          <div class="stat-card"><div class="label">Files</div><div class="value">${escapeHtmlForReport(totalFiles)}</div></div>
          <div class="stat-card"><div class="label">Audio Clips</div><div class="value">${escapeHtmlForReport(totalAudio)}</div></div>
          <div class="stat-card"><div class="label">Poll Messages</div><div class="value">${escapeHtmlForReport(totalPolls)}</div></div>
          <div class="stat-card"><div class="label">Replies</div><div class="value">${escapeHtmlForReport(replyCount)}</div></div>
          <div class="stat-card"><div class="label">Decrypt Failures</div><div class="value">${escapeHtmlForReport(decryptFailureCount)}</div><div class="small muted">Ordering Anomalies: ${escapeHtmlForReport(orderingAnomalies)}</div></div>
        </div>

        <div class="chart-grid">
          ${messageDistributionChart}
          ${participantContributionChart}
        </div>

        <div class="visual-grid" style="margin-bottom:12px;">
          ${messageCompositionCard}
        </div>

        <h3>Message Type Distribution</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Message Type</th>
                <th>Count</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              ${messageDistributionRows || '<tr><td colspan="4" class="muted">No messages found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Participant Analytics</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Participant</th>
                <th>Role</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Share</th>
                <th>First Joined</th>
                <th>Last Message</th>
              </tr>
            </thead>
            <tbody>
              ${participantRows || '<tr><td colspan="8" class="muted">No participant analytics available.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Agent Entry Timeline</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent</th>
                <th>Entered At</th>
              </tr>
            </thead>
            <tbody>
              ${entryRows || '<tr><td colspan="3" class="muted">No agent entry records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Activity Intelligence</h2>
        <div class="chart-grid">
          ${activityDistributionChart}
        </div>
        <h3>Event Distribution</h3>
        <div class="table-wrap" style="margin-bottom:12px;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Event Type</th>
                <th>Count</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              ${activitySummaryRows || '<tr><td colspan="4" class="muted">No activity records found.</td></tr>'}
            </tbody>
          </table>
        </div>

        <h3>Detailed Activity Log</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Timestamp</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows || '<tr><td colspan="5" class="muted">No activity records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Full Message Chronicle</h2>
        ${messageRows || '<p class="muted">No messages found.</p>'}
      </section>
    </main>
  `;

  const encryptedPayload = await encryptReportPayload(reportMainContent, roomPassword);
  const serializedPayload = JSON.stringify(encryptedPayload).replace(/</g, "\\u003c");
  const html = buildEncryptedReportHtml({ serializedPayload });

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `secure-chat-history-${roomId}-${stamp}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
