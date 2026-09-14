import { state } from "./store.js";
import { render } from "./render-svg.js";

export const COLOR_FIELDS = [
  { id: "pDateColor",      label: "Даты: цвет основного текста" },
  { id: "pDateColorOther", label: "Даты: цвет дополнительного текста" },
  { id: "pRoomColor",      label: "Комнаты: цвет основного текста" },
  { id: "pRoomColorOther", label: "Комнаты: цвет дополнительного текста" },
  { id: "pBarBg",          label: "Плашка: фон" },
  { id: "pBarLine1Color",  label: "Плашка: строка 1" },
  { id: "pBarLine2Color",  label: "Плашка: строка 2" },
  { id: "pWdColor",        label: "Дни недели" },
  { id: "pLineColor",      label: "Линии" },
  { id: "pArtColor",       label: "ARTemaARTema" },
];

export function renderColorSummary() {
  const wrap = document.getElementById("colorSummary");
  if (!wrap) return;

  const groups = new Map();
  for (const f of COLOR_FIELDS) {
    const el = document.getElementById(f.id);
    if (!el) continue;
    const hex = (el.value || "").toLowerCase();
    if (!groups.has(hex)) groups.set(hex, []);
    groups.get(hex).push(f);
  }

  wrap.innerHTML = "";
  for (const [hex, fields] of groups.entries()) {
    const row = document.createElement("div");
    row.className = "summaryRow";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = hex;

    const usage = document.createElement("div");
    usage.className = "usage";
    usage.innerHTML = fields.map(f => `<b>${f.label}</b>`).join(", ");

    const cnt = document.createElement("span");
    cnt.className = "cnt";
    cnt.textContent = "×" + fields.length;

    colorInput.addEventListener("input", () => {
      const newHex = colorInput.value;
      for (const f of fields) {
        const el = document.getElementById(f.id);
        if (el) el.value = newHex;
      }
      if (fields.some(f => f.id === "pBarBg")) {
        document.documentElement.style.setProperty("--accent", newHex);
      }
      renderColorSummary();
      if (state.autoUpdate) render();
    });

    row.appendChild(colorInput);
    row.appendChild(usage);
    row.appendChild(cnt);
    wrap.appendChild(row);
  }
}