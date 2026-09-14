import { state } from "./store.js";
import { loadFontsManifest, loadAllFontFaces, refreshFontSelects } from "./fonts.js";
import { renderImagesList, setupAddImageButton } from "./images.js";
import { loadTemplatesManifest, applyTemplateById } from "./templates.js";
import { initUI } from "./interact.js";
import { render } from "./render-svg.js";
import { progressStart, progressDone } from "./progress.js";
import { log } from "./utils.js";
import { renderColorSummary } from "./colors.js";
import { renderFontSummary } from "./font-summary.js";
import { loadImagesManifest } from "./config.js";

(async () => {
  progressStart();

  try { await loadFontsManifest(); }
  catch (e) { log("Ошибка загрузки шрифтов: " + e.message, "err"); }
  refreshFontSelects();

  try {
    state.folderImages = await loadImagesManifest();
  } catch { /* silent */ }

  renderImagesList();
  setupAddImageButton();

  try { await loadAllFontFaces(); }
  catch (e) { log("Ошибка FontFace: " + e.message, "err"); }

  initUI();
  renderColorSummary();
  renderFontSummary();

  try { await loadTemplatesManifest(); }
  catch (e) { log("Ошибка загрузки шаблонов: " + e.message, "err"); }

  const firstKey = Object.keys(state.savedTemplates)[0];
  if (firstKey) {
    try { await applyTemplateById(firstKey); }
    catch (e) { log("Ошибка применения шаблона: " + e.message, "err"); render(); }
  } else {
    render();
  }

  progressDone();
})();