import { state } from "./store.js";
import { render } from "./render-svg.js";
import { FONTS, listFontFamilies, listFontStylesByFamily } from "./fonts.js";
import { writeFontPicker } from "./params.js";

export const FONT_TARGETS = [
  { target: "date.font",      label: "Даты (основной)" },
  { target: "date.fontOther", label: "Даты (доп.)" },
  { target: "room.font",      label: "Комнаты (основной)" },
  { target: "room.fontOther", label: "Комнаты (доп.)" },
  { target: "weekday.font",   label: "Дни недели" },
  { target: "bar.line1Font",  label: "Плашка: строка 1" },
  { target: "bar.line2Font",  label: "Плашка: строка 2" },
  { target: "art.font",       label: "ARTemaARTema" },
];

function readPair(target) {
  const el = document.querySelector(`.fontPicker[data-target="${target}"]`);
  if (!el) return { family: "", style: "" };
  return {
    family: el.querySelector(".fontFamily")?.value || "",
    style:  el.querySelector(".fontStyle")?.value || "",
  };
}

export function renderFontSummary() {
  const wrap = document.getElementById("fontSummary");
  if (!wrap) return;

  const groups = new Map();
  for (const t of FONT_TARGETS) {
    const { family, style } = readPair(t.target);
    const key = family + " / " + style;
    if (!groups.has(key)) groups.set(key, { family, style, fields: [] });
    groups.get(key).fields.push(t);
  }

  wrap.innerHTML = "";
  for (const [key, g] of groups.entries()) {
    const row = document.createElement("div");
    row.className = "summaryRow";

    const famSel = document.createElement("select");
    listFontFamilies().forEach(fam => {
      const opt = document.createElement("option");
      opt.value = fam; opt.textContent = fam;
      if (fam === g.family) opt.selected = true;
      famSel.appendChild(opt);
    });

    const stySel = document.createElement("select");
    listFontStylesByFamily(g.family).forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.label; opt.textContent = s.label;
      if (s.label === g.style) opt.selected = true;
      stySel.appendChild(opt);
    });

    const usage = document.createElement("div");
    usage.className = "usage";
    usage.innerHTML = g.fields.map(f => `<b>${f.label}</b>`).join(", ");

    const cnt = document.createElement("span");
    cnt.className = "cnt";
    cnt.textContent = "×" + g.fields.length;

    famSel.addEventListener("change", () => {
      const newFamily = famSel.value;
      const newStyle = listFontStylesByFamily(newFamily)[0]?.label || "";
      for (const f of g.fields) writeFontPicker(f.target, newFamily, newStyle);
      renderFontSummary();
      if (state.autoUpdate) render();
    });

    stySel.addEventListener("change", () => {
      const newStyle = stySel.value;
      for (const f of g.fields) writeFontPicker(f.target, g.family, newStyle);
      renderFontSummary();
      if (state.autoUpdate) render();
    });

    row.appendChild(famSel);
    row.appendChild(stySel);
    row.appendChild(usage);
    row.appendChild(cnt);
    wrap.appendChild(row);
  }
}