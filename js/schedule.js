export function parseRooms(str) {
  const rooms = [];
  str.split(",").forEach(part => {
    part = part.trim(); if (!part) return;
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (a <= b) for (let i = a; i <= b; i++) rooms.push(i);
      else        for (let i = a; i >= b; i--) rooms.push(i);
    } else if (/^\d+$/.test(part)) rooms.push(+part);
  });
  return rooms;
}

export function buildFullSchedule(rooms, lastRoom, lastDate, startDate, endDate, order) {
  const schedule = new Map();
  let idx = rooms.indexOf(lastRoom); if (idx === -1) idx = 0;
  const step = order === "backward" ? -1 : 1;
  const norm = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let cursor = norm(lastDate); cursor.setDate(cursor.getDate() + 1);
  if (cursor < startDate) cursor = new Date(startDate);
  while (cursor <= endDate) {
    idx = ((idx + step) % rooms.length + rooms.length) % rooms.length;
    const key = cursor.getFullYear() + "-" +
                String(cursor.getMonth()+1).padStart(2,"0") + "-" +
                String(cursor.getDate()).padStart(2,"0");
    schedule.set(key, rooms[idx]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return schedule;
}

export function formatRoom(room, cfg, allRooms) {
  let num = String(room);
  if (cfg.showFloor) {
    const maxLen = String(Math.max(...allRooms)).length;
    num = num.padStart(maxLen, "0");
    const floorEl = document.getElementById("pRoomFloor");
    const floorVal = floorEl ? (parseInt(floorEl.value, 10) || 0) : 0;
    num = String(floorVal) + num;
  }
  return cfg.template.replace(/НОМЕР/g, num);
}

export const MONTHS_RU = ["ЯНВАРЬ","ФЕВРАЛЬ","МАРТ","АПРЕЛЬ","МАЙ","ИЮНЬ",
                          "ИЮЛЬ","АВГУСТ","СЕНТЯБРЬ","ОКТЯБРЬ","НОЯБРЬ","ДЕКАБРЬ"];
export const WEEKDAYS_FULL = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
export const WEEKDAYS_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

export function applyCase(str, mode) {
  if (mode === "upper") return str.toUpperCase();
  if (mode === "lower") return str.toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
export function getWeekdayLabel(idx, form, caseMode) {
  return applyCase(form === "full" ? WEEKDAYS_FULL[idx] : WEEKDAYS_SHORT[idx], caseMode);
}

// Возвращает количество строк сетки для месяца.
// alwaysSix = true → всегда 6.
// alwaysSix = false → адаптивно: 5, если влезает в 5 строк, иначе 6.
export function calcRows(year, month, alwaysSix) {
  if (alwaysSix) return 6;
  const firstDay = new Date(year, month, 1);
  const startCol = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const need = Math.ceil((startCol + daysInMonth) / 7);
  return need <= 5 ? 5 : 6;
}

// Возвращает межстрочное расстояние для заданного ROWS.
// rowGapBase — «эталонное» значение для 5 строк.
// Для 6 строк калибруем так, чтобы нижняя граница сетки совпала.
// Формула: 6*CELL_H + 5*G6 = 5*CELL_H + 4*G5  ⇒  G6 = (4*G5 − CELL_H) / 5.
export function calcRowGap(rows, rowGapBase, cellH) {
  if (rows <= 5) return rowGapBase;
  return Math.max(0, (4 * rowGapBase - cellH) / 5);
}