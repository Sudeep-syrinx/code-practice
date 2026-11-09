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

function parseField(text, min, max) {
  if (typeof text !== "string" || text === "") {
    throw new Error("field must be a non-empty string");
  }
  const set = new Set();
  for (const part of text.split(",")) {
    const pieces = part.split("/");
    if (pieces.length > 2) {
      throw new Error("bad field: " + text);
    }
    const range = pieces[0];
    let step = 1;
    if (pieces.length === 2) {
      if (!/^\d+$/.test(pieces[1]) || Number(pieces[1]) < 1) {
        throw new Error("bad step: " + text);
      }
      step = Number(pieces[1]);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = min;
      hi = max;
    } else if (/^\d+-\d+$/.test(range)) {
      const ends = range.split("-").map(Number);
      lo = ends[0];
      hi = ends[1];
    } else if (/^\d+$/.test(range)) {
      lo = Number(range);
      hi = pieces.length === 2 ? max : lo;
    } else {
      throw new Error("bad field: " + text);
    }
    if (lo < min || hi > max || lo > hi) {
      throw new Error("value out of range: " + text);
    }
    for (let v = lo; v <= hi; v += step) {
      set.add(v);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function parseCron(text) {
  if (typeof text !== "string") {
    throw new Error("cron must be a string");
  }
  const f = text.trim().split(/\s+/);
  if (f.length !== 5) {
    throw new Error("cron needs exactly 5 fields");
  }
  const dow = parseField(f[4], 0, 7).map((x) => x % 7);
  return {
    minute: parseField(f[0], 0, 59),
    hour: parseField(f[1], 0, 23),
    dom: parseField(f[2], 1, 31),
    month: parseField(f[3], 1, 12),
    dow: Array.from(new Set(dow)).sort((a, b) => a - b),
    domStar: f[2].startsWith("*"),
    dowStar: f[4].startsWith("*"),
  };
}

function dayMatches(cron, date) {
  if (!cron.month.includes(date.getUTCMonth() + 1)) {
    return false;
  }
  const domOk = cron.dom.includes(date.getUTCDate());
  const dowOk = cron.dow.includes(date.getUTCDay());
  if (cron.domStar || cron.dowStar) {
    return domOk && dowOk;
  }
  return domOk || dowOk;
}

function matches(cron, ms) {
  const d = new Date(ms);
  return cron.minute.includes(d.getUTCMinutes()) && cron.hour.includes(d.getUTCHours()) && dayMatches(cron, d);
}

function nextRun(cron, fromMs) {
  const start = new Date(Math.floor(fromMs / 60000) * 60000 + 60000);
  let day = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  let minOfDay = start.getUTCHours() * 60 + start.getUTCMinutes();
  for (let i = 0; i < 366 * 8; i++) {
    if (dayMatches(cron, new Date(day))) {
      for (const h of cron.hour) {
        for (const mi of cron.minute) {
          const mod = h * 60 + mi;
          if (mod >= minOfDay) {
            return day + mod * 60000;
          }
        }
      }
    }
    day += 86400000;
    minOfDay = 0;
  }
  return null;
}

function nextRuns(cron, fromMs, count) {
  const out = [];
  let t = fromMs;
  for (let i = 0; i < count; i++) {
    t = nextRun(cron, t);
    if (t === null) {
      break;
    }
    out.push(t);
  }
  return out;
}

const utc = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h, mi);
const iso = (ms) => (ms === null ? null : new Date(ms).toISOString());

check("field star", parseField("*", 0, 5), [0, 1, 2, 3, 4, 5]);
check("field step", parseField("*/15", 0, 59), [0, 15, 30, 45]);
check("field range", parseField("1-5", 0, 59), [1, 2, 3, 4, 5]);
check("field list", parseField("1,3,5", 0, 59), [1, 3, 5]);
check("field range step", parseField("10-20/5", 0, 59), [10, 15, 20]);
check("field start step", parseField("5/20", 0, 59), [5, 25, 45]);
check("field dedupes", parseField("1,1,2", 0, 59), [1, 2]);
check("field sorts", parseField("5,1,3", 0, 59), [1, 3, 5]);
check("field single", parseField("7", 0, 59), [7]);
check("field zero step", raises(() => parseField("*/0", 0, 59)), true);
check("field too high", raises(() => parseField("60", 0, 59)), true);
check("field too low", raises(() => parseField("0", 1, 31)), true);
check("field reversed", raises(() => parseField("5-2", 0, 59)), true);
check("field empty", raises(() => parseField("", 0, 59)), true);
check("field letters", raises(() => parseField("a", 0, 59)), true);
check("field double step", raises(() => parseField("1/2/3", 0, 59)), true);
check("field empty part", raises(() => parseField("1,,2", 0, 59)), true);

console.log();
const parsed = parseCron("*/15 0-5 1,15 * 1-5");
check("parsed minute", parsed.minute, [0, 15, 30, 45]);
check("parsed hour", parsed.hour, [0, 1, 2, 3, 4, 5]);
check("parsed dom", parsed.dom, [1, 15]);
check("parsed month count", parsed.month.length, 12);
check("parsed dow", parsed.dow, [1, 2, 3, 4, 5]);
check("parsed stars", [parsed.domStar, parsed.dowStar], [false, false]);
check("seven is sunday", parseCron("0 0 * * 7").dow, [0]);
check("star fields", [parseCron("* * * * *").domStar, parseCron("* * * * *").dowStar], [true, true]);
check("sunday both forms", parseCron("0 0 * * 0,7").dow, [0]);
check("too few fields", raises(() => parseCron("* * * *")), true);
check("too many fields", raises(() => parseCron("* * * * * *")), true);
check("cron not string", raises(() => parseCron(5)), true);
check("cron bad month", raises(() => parseCron("0 0 1 13 *")), true);

console.log();
const mon = utc(2024, 1, 1, 0, 0);
check("every minute", iso(nextRun(parseCron("* * * * *"), mon)), "2024-01-01T00:01:00.000Z");
check("daily before", iso(nextRun(parseCron("0 9 * * *"), utc(2024, 1, 1, 8, 0))), "2024-01-01T09:00:00.000Z");
check("daily at time", iso(nextRun(parseCron("0 9 * * *"), utc(2024, 1, 1, 9, 0))), "2024-01-02T09:00:00.000Z");
check("daily after", iso(nextRun(parseCron("0 9 * * *"), utc(2024, 1, 1, 9, 30))), "2024-01-02T09:00:00.000Z");
check("quarter hours", iso(nextRun(parseCron("*/15 * * * *"), utc(2024, 1, 1, 10, 7))), "2024-01-01T10:15:00.000Z");
check("seconds ignored", iso(nextRun(parseCron("*/15 * * * *"), utc(2024, 1, 1, 10, 15) + 30000)), "2024-01-01T10:30:00.000Z");
check("weekly monday", iso(nextRun(parseCron("30 2 * * 1"), utc(2024, 1, 1, 3, 0))), "2024-01-08T02:30:00.000Z");
check("monthly first", iso(nextRun(parseCron("0 0 1 * *"), utc(2024, 1, 15, 0, 0))), "2024-02-01T00:00:00.000Z");
check("weekday noon", iso(nextRun(parseCron("0 12 * * 1-5"), utc(2024, 1, 5, 13, 0))), "2024-01-08T12:00:00.000Z");
check("sunday as seven", iso(nextRun(parseCron("0 0 * * 7"), mon)), "2024-01-07T00:00:00.000Z");
check("leap day this year", iso(nextRun(parseCron("0 0 29 2 *"), mon)), "2024-02-29T00:00:00.000Z");
check("leap day later", iso(nextRun(parseCron("0 0 29 2 *"), utc(2024, 3, 1, 0, 0))), "2028-02-29T00:00:00.000Z");
check("skips short month", iso(nextRun(parseCron("0 0 31 * *"), utc(2024, 2, 1, 0, 0))), "2024-03-31T00:00:00.000Z");
check("skips april", iso(nextRun(parseCron("0 0 31 * *"), utc(2024, 4, 1, 0, 0))), "2024-05-31T00:00:00.000Z");
check("year end", iso(nextRun(parseCron("59 23 31 12 *"), mon)), "2024-12-31T23:59:00.000Z");
check("never happens", nextRun(parseCron("0 0 31 2 *"), mon), null);
check("dom or dow", iso(nextRun(parseCron("0 0 13 * 5"), mon)), "2024-01-05T00:00:00.000Z");
check("dom or dow next friday", iso(nextRun(parseCron("0 0 13 * 5"), utc(2024, 1, 5, 0, 0))), "2024-01-12T00:00:00.000Z");
check("dom or dow thirteenth", iso(nextRun(parseCron("0 0 13 * 5"), utc(2024, 1, 12, 0, 0))), "2024-01-13T00:00:00.000Z");
check("several runs", nextRuns(parseCron("0 */6 * * *"), mon, 4).map(iso), ["2024-01-01T06:00:00.000Z", "2024-01-01T12:00:00.000Z", "2024-01-01T18:00:00.000Z", "2024-01-02T00:00:00.000Z"]);
check("runs stop at never", nextRuns(parseCron("0 0 31 2 *"), mon, 3), []);

console.log();
const every = parseCron("*/10 8-9 * * 1-5");
check("matches yes", matches(every, utc(2024, 1, 1, 8, 20)), true);
check("matches wrong minute", matches(every, utc(2024, 1, 1, 8, 25)), false);
check("matches wrong hour", matches(every, utc(2024, 1, 1, 10, 20)), false);
check("matches weekend", matches(every, utc(2024, 1, 6, 8, 20)), false);
check("matches wrong month", matches(parseCron("0 0 * 6 *"), utc(2024, 1, 1, 0, 0)), false);
check("matches right month", matches(parseCron("0 0 * 6 *"), utc(2024, 6, 1, 0, 0)), true);

console.log();
let seed = 1977;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function pick(list) {
  return list[nextRandom(list.length)];
}
let afterOk = true;
let matchOk = true;
let earliestOk = true;
for (let round = 0; round < 150; round++) {
  const expr = [
    pick(["*", "0", "*/15", "5,35", "10-20"]),
    pick(["*", "0", "9-17", "*/6"]),
    pick(["*", "1", "15", "1,15"]),
    pick(["*", "1-6", "12"]),
    pick(["*", "1-5", "0", "6"]),
  ].join(" ");
  const cron = parseCron(expr);
  const from = Date.UTC(2024, nextRandom(12), 1 + nextRandom(28), nextRandom(24), nextRandom(60)) + nextRandom(60) * 1000;
  const r = nextRun(cron, from);
  if (r === null) {
    continue;
  }
  if (r <= from || r % 60000 !== 0) {
    afterOk = false;
  }
  if (!matches(cron, r)) {
    matchOk = false;
  }
  if (r - from <= 3 * 86400000) {
    for (let t = Math.floor(from / 60000) * 60000 + 60000; t < r; t += 60000) {
      if (matches(cron, t)) {
        earliestOk = false;
      }
    }
  }
}
check("150 results after start", afterOk, true);
check("150 results match cron", matchOk, true);
check("150 results are earliest", earliestOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
