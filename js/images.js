import { IMAGES_URL } from "./config.js";
import { state } from "./store.js";
import { arrayBufferToDataUrl, clamp, log } from "./utils.js";
import { progressSet } from "./progress.js";
import { render } from "./render-svg.js";

const BLEND_MODES = [
  { value: "normal",   label: "Обычный" },
  { value: "multiply", label: "Умножение" },
  { value: "screen",   label: "Экран" },
  { value: "overlay",  label: "Наложение" },
  { value: "darken",   label: "Затемнение" },
  { value: "lighten",  label: "Осветление" },
  { value: "invert",   label: "Инверсия" },
];

export function renderImagesList() {
  const list = document.getElementById("imagesList");
  list.innerHTML = "";

  state.images.forEach(img => {
    const card = document.createElement("div");
    card.className = "imgCard";

    // Folder-селект
    const folderOpts = ['<option value="">— Шаблонные изображения —</option>']
      .concat(state.folderImages.map(f =>
        `<option value="${f}" ${img.file === f ? "selected" : ""}>${f}</option>`))
      .join("");

    const thumbHtml = img.dataUrl
      ? `<img class="thumb" src="${img.dataUrl}" alt="">`
      : `<div class="thumbPlaceholder">Нет изображения</div>`;

    card.innerHTML = `
      <div class="imgHeader">
        <span class="name">${img.name}</span>
        <button class="mini secondary" data-act="del">✕</button>
      </div>
      ${thumbHtml}
      <div class="field"><label>Из Шаблонные изображения</label>
        <select data-act="folder">${folderOpts}</select>
      </div>
      <div class="field"><label>Загрузить своё изображение</label><input type="file" data-act="file" accept="image/*"></div>
      <div class="field"><label>Имя</label><input type="text" data-act="name" value="${img.name}"></div>
      <div class="field"><label>X (центр)</label><input type="number" data-act="x" value="${img.x}" step="0.5"><span class="unit">мм</span></div>
      <div class="field"><label>Y (центр)</label><input type="number" data-act="y" value="${img.y}" step="0.5"><span class="unit">мм</span></div>
      <div class="field"><label>Базовая ширина</label><input type="number" data-act="baseW" value="${img.baseW}" step="1"><span class="unit">мм</span></div>
      <div class="field"><label>Масштаб</label><input type="number" data-act="scale" value="${img.scale}" step="0.05"><span class="unit">×</span></div>
      <div class="field"><label>Прозрачность</label><input type="range" data-act="opacity" min="0" max="100" value="${clamp(img.opacity*100,0,100)}"><span data-act="opacityVal" style="width:34px;font-size:11px;color:#888;text-align:right">${Math.round(clamp(img.opacity*100,0,100))}%</span></div>
      <div class="field"><label>Режим наложения</label>
        <select data-act="blend">
          ${BLEND_MODES.map(b =>
            `<option value="${b.value}" ${img.blend===b.value?"selected":""}>${b.label}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Яркость</label><input type="range" data-act="bright" min="-100" max="100" value="${img.bright}"><span data-act="brightVal" style="width:34px;font-size:11px;color:#888;text-align:right">${img.bright}</span></div>
      <div class="field"><label>Контраст</label><input type="range" data-act="contrast" min="0" max="200" value="${img.contrast}"><span data-act="contrastVal" style="width:34px;font-size:11px;color:#888;text-align:right">${img.contrast}</span></div>
      <div class="field"><label>Насыщенность</label><input type="range" data-act="sat" min="0" max="200" value="${img.sat}"><span data-act="satVal" style="width:34px;font-size:11px;color:#888;text-align:right">${img.sat}</span></div>
      <div class="field"><label>Обрезать по плашке</label><input type="checkbox" data-act="clip" ${img.clip?"checked":""}></div>
    `;
    list.appendChild(card);

    card.querySelector('[data-act="del"]').onclick = () => {
      state.images = state.images.filter(i => i.id !== img.id);
      renderImagesList(); render();
    };
    card.querySelector('[data-act="folder"]').onchange = async e => {
      const f = e.target.value;
      if (!f) return;
      img.file = f;
      img.dataUrl = null;
      try {
        const r = await fetch(IMAGES_URL + f);
        if (!r.ok) throw new Error(r.status);
        const buf = await r.arrayBuffer();
        img.dataUrl = arrayBufferToDataUrl(buf, r.headers.get("content-type") || "image/png");
      } catch (err) {
        log("Не удалось загрузить " + f + ": " + err.message, "err");
      }
      renderImagesList();
      render();
    };
    card.querySelector('[data-act="file"]').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const buf = await f.arrayBuffer();
      img.dataUrl = arrayBufferToDataUrl(buf, f.type);
      img.file = null;
      renderImagesList();
      render();
    };
    card.querySelector('[data-act="name"]').oninput = e => { img.name = e.target.value; };

    const bindNum = (key, sub="") => {
      const el = card.querySelector(`[data-act="${key}"]`);
      el.oninput = e => {
        let v = parseFloat(e.target.value);
        if (key === "opacity") {
          v = clamp(v, 0, 100);
          e.target.value = v;
          img.opacity = v / 100;
        } else {
          img[key] = v;
        }
        if (sub) {
          card.querySelector(`[data-act="${sub}"]`).textContent =
            key === "opacity" ? Math.round(img.opacity*100) + "%" : img[key];
        }
        if (state.autoUpdate) render();
      };
    };
    bindNum("x"); bindNum("y"); bindNum("baseW"); bindNum("scale");
    bindNum("opacity","opacityVal"); bindNum("bright","brightVal");
    bindNum("contrast","contrastVal"); bindNum("sat","satVal");

    card.querySelector('[data-act="blend"]').onchange = e => { img.blend = e.target.value; if (state.autoUpdate) render(); };
    card.querySelector('[data-act="clip"]').onchange = e => { img.clip = e.target.checked; if (state.autoUpdate) render(); };
  });

  // Кнопка добавления блокируется при 2 изображениях
  const btn = document.getElementById("btnAddImage");
  if (btn) btn.disabled = state.images.length >= 2;
}

export function setupAddImageButton() {
  document.getElementById("btnAddImage").addEventListener("click", () => {
    if (state.images.length >= 2) return;
    state.images.push({
      id: "img" + (state.imgCounter++),
      name: "Изображение " + state.imgCounter,
      dataUrl: null, file: null,
      x: 148, y: 22, scale: 1, baseW: 40,
      opacity: 1, blend: "normal",
      bright: 0, contrast: 100, sat: 100, clip: true,
    });
    renderImagesList();
  });
}

async function resolveImage(imgCfg) {
  if (imgCfg.dataUrl) return imgCfg.dataUrl;
  if (!imgCfg.file) return null;
  const url = IMAGES_URL + imgCfg.file;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Не найдено: " + url);
  const buf = await resp.arrayBuffer();
  return arrayBufferToDataUrl(buf, resp.headers.get("content-type") || "image/png");
}

export async function preloadImages(imagesCfg) {
  const out = [];
  let i = 0;
  for (const cfg of imagesCfg) {
    try {
      const dataUrl = await resolveImage(cfg);
      out.push({ ...cfg, dataUrl });
    } catch (e) {
      log("Изображение не загружено: " + (cfg.file || cfg.name) + " — " + e.message, "err");
      out.push({ ...cfg, dataUrl: null });
    }
    i++;
    progressSet(40 + (i / imagesCfg.length) * 20);
  }
  return out;
}

export function adoptImages(list) {
  // Ограничение max 2
  state.images = list.slice(0, 2).map((im, i) => ({
    id: im.id || ("img" + (i+1)),
    name: im.name || ("Изображение " + (i+1)),
    dataUrl: im.dataUrl || null,
    file: im.file || null,
    x: im.x, y: im.y,
    scale: im.scale ?? 1,
    baseW: im.baseW ?? 40,
    opacity: (() => {
      let o = Number(im.opacity);
      if (!isFinite(o)) return 1;
      if (o > 1) o = o / 100;
      return clamp(o, 0, 1);
    })(),
    blend: im.blend || "normal",
    bright: im.bright ?? 0,
    contrast: im.contrast ?? 100,
    sat: im.sat ?? 100,
    clip: im.clip !== false,
  }));
  renderImagesList();
}
