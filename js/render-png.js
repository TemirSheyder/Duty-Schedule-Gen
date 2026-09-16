import { state } from "./store.js";
import { readParams } from "./params.js";
import { parseRooms, MONTHS_RU } from "./schedule.js";
import {
  processImage, getImageDimensions, log, clearLog, buildFileName, roomsForFileName,
  showThanks,
} from "./utils.js";
import {
  progressStart, progressSet, progressDone, overlayShow, overlayHide,
} from "./progress.js";
import { buildSvgForMonth } from "./render-svg.js";
import { MM } from "./config.js";

function svgStringToPngBlob(svgStr, pxW, pxH) {
  return new Promise((resolve, reject) => {
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pxW, pxH);
        ctx.drawImage(img, 0, 0, pxW, pxH);
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error("canvas.toBlob вернул null"));
        }, "image/png");
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Не удалось загрузить SVG в Image"));
    img.src = dataUrl;
  });
}

function downloadBlob(blob, filename) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
      resolve();
    }, 300);
  });
}

async function buildAllMonthSvgs(P) {
  const rooms = parseRooms(P.work.rooms);
  if (!rooms.length) throw new Error("Нет комнат");

  const [fromY, fromM] = P.work.monthFrom.split("-").map(Number);
  const [toY, toM]     = P.work.monthTo.split("-").map(Number);
  const fromIdx = fromY * 12 + (fromM - 1);
  const toIdx   = toY   * 12 + (toM   - 1);
  if (fromIdx > toIdx) throw new Error("Месяц «с» больше, чем месяц «по»");

  const processedImages = [];
  for (const im of state.images) {
    if (!im.dataUrl) continue;
    const dataUrl = await processImage(im.dataUrl, im.bright, im.contrast, im.sat);
    const dim = await getImageDimensions(im.dataUrl);
    processedImages.push({ ...im, _dataUrl: dataUrl, _dim: dim });
  }

  const out = [];
  for (let idx = fromIdx; idx <= toIdx; idx++) {
    const year  = Math.floor(idx / 12);
    const month = idx % 12;
    const svgStr = buildSvgForMonth(P, year, month, 1, processedImages);
    out.push({ year, month, svgStr });
  }
  return out;
}

export async function exportPng(quality, mode) {
  clearLog();
  progressStart();
  overlayShow("Готовим PNG…", "Подготовка данных");
  try {
    const P = readParams();
    const items = await buildAllMonthSvgs(P);
    progressSet(20);

    const pxPerMm = 96 / 25.4;
    const pxW = Math.round(P.page.w / MM * pxPerMm * quality);
    const pxH = Math.round(P.page.h / MM * pxPerMm * quality);

    const total = items.length;
    let done = 0;

    const baseName = buildFileName(P.work.rooms, P.work.monthFrom, P.work.monthTo, "").replace(/\.$/, "");
    const roomsForName = roomsForFileName(P.work.rooms);

    if (mode === "zip") {
      if (typeof JSZip === "undefined") throw new Error("JSZip не загружен");
      const zip = new JSZip();

      for (const it of items) {
        overlayShow("Готовим PNG…", `${MONTHS_RU[it.month]} ${it.year} (${done + 1} из ${total})`);
        const blob = await svgStringToPngBlob(it.svgStr, pxW, pxH);
        const mm = String(it.month + 1).padStart(2, "0");
        zip.file(`ГрафикДежурств(${roomsForName})(${it.year}-${mm}).png`, blob);
        done++;
        progressSet(20 + (done / total) * 75);
      }

      overlayShow("Готовим архив…", "Собираем ZIP");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      await downloadBlob(zipBlob, baseName + ".zip");
      log(`ZIP сохранён (${total} файлов)`, "ok");
      overlayShow("Готово", "Архив сохранён");
      setTimeout(overlayHide, 700);
      showThanks();
    } else {
      for (const it of items) {
        overlayShow("Готовим PNG…", `${MONTHS_RU[it.month]} ${it.year} (${done + 1} из ${total})`);
        const blob = await svgStringToPngBlob(it.svgStr, pxW, pxH);
        const mm = String(it.month + 1).padStart(2, "0");
        await downloadBlob(blob, `ГрафикДежурств(${roomsForName})(${it.year}-${mm}).png`);
        done++;
        progressSet(20 + (done / total) * 75);
        log(`PNG сохранён: ${it.year}-${mm}`);
      }
      overlayShow("Готово", `Сохранено ${total} PNG`);
      setTimeout(overlayHide, 700);
      showThanks();
    }
  } catch (e) {
    console.error(e);
    overlayHide();
    log("Ошибка PNG: " + e.message, "err");
  } finally {
    progressDone();
  }
}