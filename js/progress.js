const progressEl = document.getElementById("topProgress");
let progressTimer = null;
let progressValue = 0;

export function progressStart() {
  progressValue = 0;
  progressEl.classList.add("active");
  progressEl.style.width = "0%";
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (progressValue < 90) {
      progressValue += Math.max(0.5, (90 - progressValue) * 0.08);
      progressEl.style.width = progressValue + "%";
    }
  }, 100);
}
export function progressSet(p) {
  progressValue = Math.max(0, Math.min(100, p));
  progressEl.style.width = progressValue + "%";
}
export function progressDone() {
  clearInterval(progressTimer);
  progressTimer = null;
  progressSet(100);
  setTimeout(() => {
    progressEl.classList.remove("active");
    progressEl.style.width = "0%";
  }, 300);
}

const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlaySubEl = document.getElementById("overlaySub");

export function overlayShow(title, sub) {
  overlayTitleEl.textContent = title || "Готовим…";
  overlaySubEl.textContent = sub || "";
  overlayEl.classList.add("active");
}
export function overlayHide() {
  overlayEl.classList.remove("active");
}

const previewLoaderEl = document.getElementById("previewLoader");
export function previewLoader(on) {
  previewLoaderEl.classList.toggle("active", !!on);
}