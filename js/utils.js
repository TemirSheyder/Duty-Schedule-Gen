import { MM } from "./config.js";

export function clamp(v, min, max) {
  v = Number(v);
  if (!isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function log(msg, cls) {
  const el = document.getElementById("log");
  if (!el) return;
  const div = document.createElement("div");
  if (cls === "err") div.style.color = "red";
  else if (cls === "ok") div.style.color = "green";
  div.textContent = msg;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
export function clearLog() {
  const el = document.getElementById("log");
  if (el) el.innerHTML = "";
}

let toastTimer = null;
export function showToast(msg, ms = 2600) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("active");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("active"), ms);
}

export function showThanks() {
  const el = document.getElementById("thanksDialog");
  if (el) el.classList.add("active");
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substr(0,2), 16),
    g: parseInt(h.substr(2,2), 16),
    b: parseInt(h.substr(4,2), 16),
  };
}
export function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
export function mixWithWhite(hex, ratio) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}
export function applyAccentFromBar() {
  const el = document.getElementById("pBarBg");
  if (!el) return;
  const hex = el.value;
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-soft", mixWithWhite(hex, 0.95));
  document.documentElement.style.setProperty("--accent-hover", mixWithWhite(hex, 0.88));
}

export function arrayBufferToDataUrl(buf, mime) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mime || "image/png"};base64,${btoa(binary)}`;
}
export function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function processImage(dataUrl, bright, contrast, sat) {
  if (!dataUrl) return Promise.resolve(null);
  if (bright === 0 && contrast === 100 && sat === 100) return Promise.resolve(dataUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.filter = `brightness(${100+bright}%) contrast(${contrast}%) saturate(${sat}%)`;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
export function getImageDimensions(dataUrl) {
  return new Promise(resolve => {
    if (!dataUrl) return resolve({ w: 1, h: 1 });
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

export function roomsForFileName(roomsStr) {
  const parts = [];
  const tokens = String(roomsStr).split(",").map(s => s.trim()).filter(Boolean);
  tokens.forEach(t => parts.push(t));
  return parts.join("_");
}

export function buildFileName(roomsStr, monthFrom, monthTo, ext) {
  const MONTHS = ["январь","февраль","март","апрель","май","июнь",
                  "июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const [fy, fm] = (monthFrom || "").split("-").map(Number);
  const [ty, tm] = (monthTo || "").split("-").map(Number);
  const fromStr = fy ? `${MONTHS[fm-1]} ${fy}` : "";
  const toStr   = ty ? `${MONTHS[tm-1]} ${ty}` : "";
  const period = fromStr === toStr ? fromStr : `${fromStr} по ${toStr}`;
  const rooms = roomsForFileName(roomsStr);
  return `График дежурств(${rooms})(${period}).${ext}`;
}