const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

function toMinutes(text) {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) {
    throw new Error("bad time: " + text);
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) {
    throw new Error("time out of range: " + text);
  }
  return h * 60 + m;
}

function fromMinutes(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1439) {
    throw new Error("minutes must be an integer from 0 to 1439");
  }
  const h = Math.floor(n / 60);
  const m = n % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function overlaps(a, b) {
  return a[0] < b[1] && b[0] < a[1];
}

function mergeIntervals(list) {
  const sorted = list.map((x) => [x[0], x[1]]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const item of sorted) {
    if (out.length > 0 && item[0] <= out[out.length - 1][1]) {
      if (item[1] > out[out.length - 1][1]) {
        out[out.length - 1][1] = item[1];
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

function totalBusy(list) {
  let total = 0;
  for (const item of mergeIntervals(list)) {
    total += item[1] - item[0];
  }
  return total;
}

function freeSlots(busy, dayStart, dayEnd) {
  const merged = mergeIntervals(busy);
  const out = [];
  let cursor = dayStart;
  for (const item of merged) {
    if (item[1] <= cursor) {
      continue;
    }
    if (item[0] >= dayEnd) {
      break;
    }
    if (item[0] > cursor) {
      out.push([cursor, item[0]]);
    }
    cursor = Math.max(cursor, item[1]);
  }
  if (cursor < dayEnd) {
    out.push([cursor, dayEnd]);
  }
  return out;
}

class Scheduler {
  constructor() {
    this.events = [];
  }

  add(title, start, end) {
    if (typeof title !== "string" || title === "") {
      throw new Error("title must be a non-empty string");
    }
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (e <= s) {
      throw new Error("end must be after start");
    }
    for (const event of this.events) {
      if (overlaps([event.start, event.end], [s, e])) {
        throw new Error("overlaps with " + event.title);
      }
    }
    this.events.push({ title: title, start: s, end: e });
  }

  remove(title) {
    const index = this.events.findIndex((event) => event.title === title);
    if (index === -1) {
      return false;
    }
    this.events.splice(index, 1);
    return true;
  }

  list() {
    return this.events
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((event) => ({ title: event.title, start: fromMinutes(event.start), end: fromMinutes(event.end) }));
  }

  busy() {
    return this.events.map((event) => [event.start, event.end]);
  }

  nextFree(duration, dayStart, dayEnd) {
    if (!Number.isInteger(duration) || duration < 1) {
      throw new Error("duration must be a positive integer");
    }
    const slots = freeSlots(this.busy(), toMinutes(dayStart), toMinutes(dayEnd));
    for (const slot of slots) {
      if (slot[1] - slot[0] >= duration) {
        return fromMinutes(slot[0]);
      }
    }
    return null;
  }
}

check("to minutes 00:00", toMinutes("00:00"), 0);
check("to minutes 09:30", toMinutes("09:30"), 570);
check("to minutes 12:00", toMinutes("12:00"), 720);
check("to minutes 23:59", toMinutes("23:59"), 1439);
check("24:00 raises", raises(() => toMinutes("24:00")), true);
check("12:60 raises", raises(() => toMinutes("12:60")), true);
check("9:30 raises", raises(() => toMinutes("9:30")), true);
check("text raises", raises(() => toMinutes("abc")), true);
check("number raises", raises(() => toMinutes(930)), true);
check("empty raises", raises(() => toMinutes("")), true);

console.log();
check("from 0", fromMinutes(0), "00:00");
check("from 570", fromMinutes(570), "09:30");
check("from 1439", fromMinutes(1439), "23:59");
check("from 1440 raises", raises(() => fromMinutes(1440)), true);
check("from negative", raises(() => fromMinutes(-1)), true);
check("from decimal", raises(() => fromMinutes(1.5)), true);
let timeOk = true;
for (let i = 0; i < 1440; i++) {
  if (toMinutes(fromMinutes(i)) !== i) {
    timeOk = false;
  }
}
check("1440 minutes round trip", timeOk, true);

console.log();
check("overlap partial", overlaps([540, 600], [570, 630]), true);
check("overlap inside", overlaps([540, 720], [600, 660]), true);
check("overlap touching", overlaps([540, 600], [600, 660]), false);
check("overlap apart", overlaps([540, 600], [700, 760]), false);
check("overlap symmetric", overlaps([570, 630], [540, 600]), true);
check("overlap same", overlaps([540, 600], [540, 600]), true);

console.log();
check("merge basic", mergeIntervals([[60, 120], [100, 180], [200, 240]]), [[60, 180], [200, 240]]);
check("merge unsorted", mergeIntervals([[200, 240], [60, 120], [100, 180]]), [[60, 180], [200, 240]]);
check("merge touching", mergeIntervals([[0, 10], [10, 20]]), [[0, 20]]);
check("merge nested", mergeIntervals([[0, 100], [10, 20], [30, 40]]), [[0, 100]]);
check("merge empty", mergeIntervals([]), []);
check("merge single", mergeIntervals([[5, 6]]), [[5, 6]]);
const input = [[5, 10], [1, 3]];
mergeIntervals(input);
check("merge keeps input", input, [[5, 10], [1, 3]]);
check("total busy", totalBusy([[60, 120], [100, 180]]), 120);
check("total busy empty", totalBusy([]), 0);

console.log();
check("free basic", freeSlots([[600, 660], [720, 780]], 540, 1020), [[540, 600], [660, 720], [780, 1020]]);
check("free no busy", freeSlots([], 540, 1020), [[540, 1020]]);
check("free clipped start", freeSlots([[0, 600]], 540, 1020), [[600, 1020]]);
check("free clipped end", freeSlots([[900, 2000]], 540, 1020), [[540, 900]]);
check("free all busy", freeSlots([[0, 2000]], 540, 1020), []);
check("free outside busy", freeSlots([[0, 100], [1100, 1200]], 540, 1020), [[540, 1020]]);
check("free unsorted busy", freeSlots([[720, 780], [600, 660]], 540, 1020), [[540, 600], [660, 720], [780, 1020]]);

console.log();
const sch = new Scheduler();
sch.add("Standup", "09:00", "09:30");
sch.add("Lunch", "12:00", "13:00");
sch.add("Review", "15:00", "16:00");
check("list titles", sch.list().map((e) => e.title), ["Standup", "Lunch", "Review"]);
check("list first", sch.list()[0], { title: "Standup", start: "09:00", end: "09:30" });
check("overlap add raises", raises(() => sch.add("Clash", "09:15", "10:00")), true);
check("touching add ok", raises(() => sch.add("Touch", "09:30", "10:00")), false);
check("end before start", raises(() => sch.add("Bad", "11:00", "10:00")), true);
check("zero length", raises(() => sch.add("Zero", "11:00", "11:00")), true);
check("empty title", raises(() => sch.add("", "11:00", "11:30")), true);
check("bad time add", raises(() => sch.add("Bad", "99:00", "10:00")), true);
check("event count", sch.list().length, 4);
check("remove touch", sch.remove("Touch"), true);
check("remove missing", sch.remove("Touch"), false);
check("event count after", sch.list().length, 3);

console.log();
check("next free 60", sch.nextFree(60, "09:00", "17:00"), "09:30");
check("next free 150", sch.nextFree(150, "09:00", "17:00"), "09:30");
check("next free 151", sch.nextFree(151, "09:00", "17:00"), "13:00");
check("next free 120", sch.nextFree(120, "09:00", "17:00"), "09:30");
check("next free none", sch.nextFree(300, "09:00", "17:00"), null);
check("next free bad duration", raises(() => sch.nextFree(0, "09:00", "17:00")), true);
sch.remove("Lunch");
sch.remove("Review");
check("next free wide", sch.nextFree(300, "09:00", "17:00"), "09:30");

console.log();
let seed = 99;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let mergeOk = true;
let freeOk = true;
for (let n = 0; n < 300; n++) {
  const list = [];
  const count = nextRandom(8);
  for (let i = 0; i < count; i++) {
    const s = nextRandom(190);
    const e = s + 1 + nextRandom(30);
    list.push([s, e]);
  }
  const covered = new Array(300).fill(false);
  for (const item of list) {
    for (let m = item[0]; m < item[1]; m++) {
      covered[m] = true;
    }
  }
  let coveredCount = 0;
  for (const c of covered) {
    if (c) {
      coveredCount++;
    }
  }
  const merged = mergeIntervals(list);
  if (totalBusy(list) !== coveredCount) {
    mergeOk = false;
  }
  for (let i = 1; i < merged.length; i++) {
    if (merged[i][0] <= merged[i - 1][1]) {
      mergeOk = false;
    }
  }
  let coveredInDay = 0;
  for (let m = 50; m < 150; m++) {
    if (covered[m]) {
      coveredInDay++;
    }
  }
  let freeTotal = 0;
  for (const slot of freeSlots(list, 50, 150)) {
    freeTotal += slot[1] - slot[0];
  }
  if (freeTotal !== 100 - coveredInDay) {
    freeOk = false;
  }
}
check("300 random merges", mergeOk, true);
check("300 random free totals", freeOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
