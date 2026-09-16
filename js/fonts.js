import { FONTS_URL } from "./config.js";
import { progressSet } from "./progress.js";
import { log } from "./utils.js";

export const FONTS = {};
export const FONT_BYTES = {};

export async function loadFontsManifest() {
  const url = FONTS_URL + "index.json";
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) throw new Error("Не удалось загрузить " + url + " (" + resp.status + ")");
  const data = await resp.json();

  (data.builtin || []).forEach(b => {
    FONTS[b.key] = {
      label: b.label,
      builtin: true,
      weight: 400,
      family: b.family || b.label,
      style: b.style || "Regular",
      italic: false,
    };
  });
  (data.fonts || []).forEach(f => {
    FONTS[f.key] = {
      label: f.label,
      builtin: false,
      url: FONTS_URL + f.file,
      weight: f.weight || 400,
      family: f.family || f.label,
      style: f.style || "Regular",
      italic: !!f.italic,
      alias: !!f.alias,
      file: f.file,
    };
  });
}

export async function loadFontFace(key) {
  const f = FONTS[key];
  if (!f || f.builtin || f._fontFaceLoaded) return;
  try {
    let buf = FONT_BYTES[key];
    if (!buf) {
      const r = await fetch(f.url);
      if (!r.ok) throw new Error(f.url + " " + r.status);
      buf = await r.arrayBuffer();
      FONT_BYTES[key] = buf;
    }
    const face = new FontFace(f.label, buf, {
      weight: String(f.weight || 400),
      style: f.italic ? "italic" : "normal",
    });
    await face.load();
    document.fonts.add(face);
    f._fontFaceLoaded = true;
  } catch (e) {
    console.warn("FontFace:", key, e);
  }
}

export async function loadAllFontFaces() {
  const keys = Object.keys(FONTS);
  let i = 0;
  for (const key of keys) {
    await loadFontFace(key);
    i++;
    progressSet((i / keys.length) * 40);
  }
}

export async function getFontBytes(key) {
  const f = FONTS[key];
  if (!f) throw new Error("Шрифт не найден: " + key);
  if (f.builtin) return null;
  if (FONT_BYTES[key]) return FONT_BYTES[key];
  const r = await fetch(f.url);
  if (!r.ok) throw new Error("Не удалось скачать " + f.url);
  const buf = await r.arrayBuffer();
  FONT_BYTES[key] = buf;
  return buf;
}

const SELECT_IDS = [
  "pDateFont","pDateFontOther","pRoomFont","pRoomFontOther",
  "pWdFont","pBarLine1Font","pBarLine2Font","pArtFont"
];
export function refreshFontSelects() {
  SELECT_IDS.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = "";
    Object.entries(FONTS).forEach(([key, f]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = f.label;
      sel.appendChild(opt);
    });
    if (cur && FONTS[cur]) sel.value = cur;
    else if (Object.keys(FONTS).length) sel.value = Object.keys(FONTS)[0];
  });
}

export function fontFamilyCss(name) {
  const f = FONTS[name];
  if (!f) return "Arial, sans-serif";
  if (f.builtin) {
    if (name === "helvetica") return "Helvetica, Arial, sans-serif";
    if (name === "times") return "'Times New Roman', Times, serif";
    if (name === "courier") return "'Courier New', Courier, monospace";
  }
  return `'${f.label}', Arial, sans-serif`;
}

export async function ensureTemplateFonts(tpl) {
  const used = new Set();
  const walk = obj => {
    if (!obj || typeof obj !== "object") return;
    for (const k in obj) {
      if (/font/i.test(k) && typeof obj[k] === "string") used.add(obj[k]);
      if (typeof obj[k] === "object") walk(obj[k]);
    }
  };
  walk(tpl);
  for (const f of used) await loadFontFace(f);
}

export function listFontFamilies() {
  const seen = new Set();
  const out = [];
  for (const [, f] of Object.entries(FONTS)) {
    if (f.alias) continue;
    if (!seen.has(f.family)) {
      seen.add(f.family);
      out.push(f.family);
    }
  }
  return out;
}

export function listFontStylesByFamily(family) {
  return Object.entries(FONTS)
    .filter(([, f]) => !f.alias && f.family === family)
    .sort((a, b) => (a[1].weight || 400) - (b[1].weight || 400))
    .map(([key, f]) => ({ key, label: f.style, weight: f.weight, italic: !!f.italic }));
}

export function resolveFontKey(family, style) {
  const found = Object.entries(FONTS).find(
    ([, f]) => !f.alias && f.family === family && f.style === style
  );
  if (found) return found[0];
  const first = Object.entries(FONTS).find(([, f]) => !f.alias && f.family === family);
  return first ? first[0] : null;
}

export function familyOfKey(key) {
  const f = FONTS[key];
  return f ? f.family : "";
}
export function styleOfKey(key) {
  const f = FONTS[key];
  return f ? f.style : "";
}

export function labelOf(family, style) {
  if (!family) return "Arial";
  const entry = Object.entries(FONTS).find(
    ([, f]) => !f.alias && f.family === family && f.style === style
  );
  if (entry) return entry[1].label;
  const first = Object.entries(FONTS).find(([, f]) => !f.alias && f.family === family);
  return first ? first[1].label : family;
}
export function cssFamily(family, style) {
  const label = labelOf(family, style);
  if (label === "Helvetica") return "Helvetica, Arial, sans-serif";
  if (label === "Times New Roman") return "'Times New Roman', Times, serif";
  if (label === "Courier New") return "'Courier New', Courier, monospace";
  return `'${label}', Arial, sans-serif`;
}