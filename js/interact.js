import { state } from "./store.js";
import { render } from "./render-svg.js";
import { exportPdf } from "./render-pdf.js";
import { exportPng } from "./render-png.js";
import { initFontPickers, syncPageFormatSelect, updateHorizDeps } from "./params.js";
import { PAGE_FORMATS } from "./config.js";
import { applyAccentFromBar, clamp, log, showToast } from "./utils.js";
import {
  applyTemplateById, downloadTemplateFile, pickTemplateFile, handleTemplateFileInput,
  snapshotTemplate,
} from "./templates.js";
import { listFontStylesByFamily } from "./fonts.js";
import { renderColorSummary, COLOR_FIELDS } from "./colors.js";
import { renderFontSummary } from "./font-summary.js";

const NON_RENDER_IDS = new Set([
  "tplSelect", "tplFileInput",
  "btnTplSave", "btnTplLoad",
  "btnPdf", "btnPng",
  "btnPrevMonth", "btnNextMonth",
  "pngOk", "pngCancel", "pngScale", "pngMode",
  "pPageFormat",
  "pPageW", "pPageH",
  "pLineHoriz",
  "pAlwaysSix",
  // чекбоксы «Этаж» — синхронизируются через bindMirror, чтобы не было двойного render()
  "pRoomShowFloor", "pRoomShowFloor2",
]);

export function initUI() {
  applyAccentFromBar();
  initFontPickers();
  syncPageFormatSelect();

  // --- Экспорт ---
  document.getElementById("btnPdf").addEventListener("click", () => exportPdf());
  document.getElementById("btnPng").addEventListener("click", () => {
    document.getElementById("pngDialog").classList.add("active");
  });

  document.getElementById("pngCancel").addEventListener("click", () => {
    document.getElementById("pngDialog").classList.remove("active");
  });
  document.getElementById("pngOk").addEventListener("click", () => {
    const quality = parseInt(document.getElementById("pngScale").value, 10);
    const mode  = document.getElementById("pngMode").value;
    document.getElementById("pngDialog").classList.remove("active");
    exportPng(quality, mode);
  });

  // --- Шаблоны ---
  document.getElementById("tplSelect").addEventListener("change", async e => {
    const id = e.target.value;
    if (!id) return;
    try { await applyTemplateById(id); }
    catch (err) { log("Ошибка шаблона: " + err.message, "err"); }
  });
  document.getElementById("btnTplSave").addEventListener("click", () => downloadTemplateFile());
  document.getElementById("btnTplLoad").addEventListener("click", () => pickTemplateFile());
  document.getElementById("tplFileInput").addEventListener("change", async e => {
    const f = e.target.files[0];
    e.target.value = "";
    await handleTemplateFileInput(f);
  });

  // --- Валидация периода ---
  const mFrom = document.getElementById("tMonthFrom");
  const mTo   = document.getElementById("tMonthTo");
  function validatePeriod() {
    if (mFrom.value && mTo.value && mTo.value < mFrom.value) {
      showToast("Месяц «по» не может быть раньше месяца «с». Значение скорректировано.", 3200);
      mTo.value = mFrom.value;
    }
  }
  mFrom.addEventListener("change", () => { validatePeriod(); if (state.autoUpdate) render(); });
  mTo.addEventListener("change", () => { validatePeriod(); if (state.autoUpdate) render(); });

  // --- Кнопки ←/→ месяца превью ---
  document.getElementById("btnPrevMonth").addEventListener("click", () => shiftPreviewMonth(-1));
  document.getElementById("btnNextMonth").addEventListener("click", () => shiftPreviewMonth(+1));

  // --- Формат листа ---
  document.getElementById("pPageFormat").addEventListener("change", e => {
    const v = e.target.value;
    if (v === "custom") return;
    const f = PAGE_FORMATS[v]; if (!f) return;
    document.getElementById("pPageW").value = f.w;
    document.getElementById("pPageH").value = f.h;
    render();
  });
  document.getElementById("pPageW").addEventListener("input", syncPageFormatSelect);
  document.getElementById("pPageH").addEventListener("input", syncPageFormatSelect);

  // --- Горизонтальные линии ---
  const lineHorizChk = document.getElementById("pLineHoriz");
  if (lineHorizChk) lineHorizChk.addEventListener("change", updateHorizDeps);

  // --- .fontPicker ---
  document.querySelectorAll(".fontPicker").forEach(el => {
    const famSel = el.querySelector(".fontFamily");
    const stySel = el.querySelector(".fontStyle");

    famSel.addEventListener("change", () => {
      const styles = listFontStylesByFamily(famSel.value);
      stySel.innerHTML = "";
      styles.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.label; opt.textContent = s.label;
        stySel.appendChild(opt);
      });
      if (styles.length) stySel.value = styles[0].label;
      renderFontSummary();
      if (state.autoUpdate) render();
    });

    stySel.addEventListener("change", () => {
      renderFontSummary();
      if (state.autoUpdate) render();
    });
  });

  // --- Выравнивание ---
  document.querySelectorAll(".fontAlignStandalone").forEach(el => {
    el.querySelectorAll(".alignBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        el.querySelectorAll(".alignBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (state.autoUpdate) render();
      });
    });
  });
  
// --- Синхронизация полей «Отображать этаж» и «Этаж» между секциями ---
function bindMirror(srcId, dstId) {
  const src = document.getElementById(srcId);
  const dst = document.getElementById(dstId);
  if (!src || !dst) return;

  const isCheckbox = src.type === "checkbox";

  function sync(from, to) {
    if (isCheckbox) to.checked = from.checked;
    else to.value = from.value;
    if (state.autoUpdate) render();
  }

  const evt = isCheckbox ? "change" : "input";
  src.addEventListener(evt, () => sync(src, dst));
  dst.addEventListener(evt, () => sync(dst, src));

  // Начальная синхронизация
  if (isCheckbox) dst.checked = src.checked;
  else dst.value = src.value;
}

bindMirror("pRoomShowFloor", "pRoomShowFloor2");

  
  // --- Изменения на панели ---
  const panel = document.getElementById("panel");

  panel.addEventListener("input", e => {
    if (!e.target) return;
    if (NON_RENDER_IDS.has(e.target.id)) return;

    if (e.target.id === "pBarBg") applyAccentFromBar();
    if (e.target.id === "pArtOpacity") {
      const v = clamp(e.target.value, 20, 100);
      e.target.value = v;
      const lbl = document.getElementById("pArtOpacityVal");
      if (lbl) lbl.textContent = Math.round(v) + "%";
    }
    if (COLOR_FIELDS.some(f => f.id === e.target.id)) renderColorSummary();
    if (state.autoUpdate) render();
  });

  panel.addEventListener("change", e => {
    if (!e.target) return;
    if (NON_RENDER_IDS.has(e.target.id)) return;

    if (e.target.id === "pBarBg") applyAccentFromBar();
    if (COLOR_FIELDS.some(f => f.id === e.target.id)) renderColorSummary();
    if (state.autoUpdate) render();
  });

  // --- Аккордеон ---
  const allDetails = document.querySelectorAll("#panel details");
  allDetails.forEach(d => {
    d.addEventListener("toggle", () => {
      if (d.open) {
        allDetails.forEach(o => { if (o !== d && o.open) o.open = false; });
      }
    });
  });

  // --- Клик по телефону: копировать в буфер ---
  document.querySelectorAll(".copyPhone").forEach(el => {
    el.addEventListener("click", async e => {
      e.preventDefault();
      const phone = el.dataset.phone || el.textContent.trim();
      try {
        await navigator.clipboard.writeText(phone);
        showToast("Номер " + phone + " скопирован в буфер обмена", 2200);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = phone;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        showToast("Номер " + phone + " скопирован", 2200);
      }
    });
  });

  // --- Закрытие диалога благодарности ---
  const thanksDialog = document.getElementById("thanksDialog");
  const thanksClose = document.getElementById("thanksClose");
  if (thanksClose) {
    thanksClose.addEventListener("click", () => thanksDialog.classList.remove("active"));
  }
  if (thanksDialog) {
    thanksDialog.addEventListener("click", e => {
      if (e.target === thanksDialog) thanksDialog.classList.remove("active");
    });
  }

  // --- Ctrl/Cmd+Shift+C ---
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      const json = JSON.stringify(snapshotTemplate(), null, 2);
      navigator.clipboard.writeText(json).then(
        () => log("Шаблон скопирован (" + Math.round(json.length/1024) + " КБ)"),
        () => log("Не удалось скопировать", "err")
      );
    }
  });
}

function shiftPreviewMonth(delta) {
  const el = document.getElementById("tPreviewMonth");
  const cur = el.value || new Date().toISOString().slice(0, 7);
  const [y, m] = cur.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = idx % 12;
  el.value = `${ny}-${String(nm + 1).padStart(2, "0")}`;
  if (state.autoUpdate) render();
}
