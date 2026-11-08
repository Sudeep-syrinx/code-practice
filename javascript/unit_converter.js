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

const LENGTH = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const MASS = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  oz: 0.028349523125,
  lb: 0.45359237,
};

const TABLES = [LENGTH, MASS];

function roundTo(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function convert(value, from, to) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error("value must be a number");
  }
  for (const table of TABLES) {
    if (from in table && to in table) {
      return (value * table[from]) / table[to];
    }
  }
  throw new Error("cannot convert " + from + " to " + to);
}

function cToF(c) {
  return (c * 9) / 5 + 32;
}

function fToC(f) {
  return ((f - 32) * 5) / 9;
}

function cToK(c) {
  return c + 273.15;
}

function kToC(k) {
  return k - 273.15;
}

function formatDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error("seconds must be a non-negative integer");
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) {
    parts.push(h + "h");
  }
  if (m > 0) {
    parts.push(m + "m");
  }
  if (s > 0) {
    parts.push(s + "s");
  }
  return parts.length === 0 ? "0s" : parts.join(" ");
}

function parseDuration(text) {
  const units = { h: 3600, m: 60, s: 1 };
  let total = 0;
  for (const part of text.trim().split(/\s+/)) {
    const match = /^(\d+)([hms])$/.exec(part);
    if (!match) {
      throw new Error("bad duration part: " + part);
    }
    total += Number(match[1]) * units[match[2]];
  }
  return total;
}

function formatBytes(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("bytes must be a non-negative integer");
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value = value / 1024;
    index++;
  }
  if (index === 0) {
    return value + " B";
  }
  return value.toFixed(1) + " " + units[index];
}

check("km to m", roundTo(convert(1, "km", "m"), 6), 1000);
check("m to cm", roundTo(convert(2, "m", "cm"), 6), 200);
check("mile to km", roundTo(convert(1, "mi", "km"), 6), 1.609344);
check("12 in to ft", roundTo(convert(12, "in", "ft"), 6), 1);
check("3 ft to yd", roundTo(convert(3, "ft", "yd"), 6), 1);
check("kg to g", roundTo(convert(1.5, "kg", "g"), 6), 1500);
check("lb to kg", roundTo(convert(1, "lb", "kg"), 6), 0.453592);
check("16 oz to lb", roundTo(convert(16, "oz", "lb"), 6), 1);
check("same unit", convert(7, "m", "m"), 7);
check("zero value", convert(0, "km", "mi"), 0);

console.log();
check("mixed units", raises(() => convert(1, "m", "kg")), true);
check("unknown unit", raises(() => convert(1, "m", "parsec")), true);
check("unknown source", raises(() => convert(1, "zzz", "m")), true);
check("text value", raises(() => convert("5", "m", "km")), true);
check("NaN value", raises(() => convert(NaN, "m", "km")), true);

let pairs = 0;
let pairsOk = true;
for (const table of TABLES) {
  const keys = Object.keys(table);
  for (const a of keys) {
    for (const b of keys) {
      const back = roundTo(convert(convert(5, a, b), b, a), 6);
      pairs++;
      if (back !== 5) {
        pairsOk = false;
      }
    }
  }
}
check("pairs checked", pairs, 89);
check("all pairs round trip", pairsOk, true);

console.log();
check("100 C to F", cToF(100), 212);
check("0 C to F", cToF(0), 32);
check("32 F to C", fToC(32), 0);
check("212 F to C", fToC(212), 100);
check("minus 40 matches", cToF(-40), -40);
check("body temperature", roundTo(cToF(37), 2), 98.6);
check("0 C to K", cToK(0), 273.15);
check("K back to C", roundTo(kToC(cToK(25)), 6), 25);
check("absolute zero", roundTo(kToC(0), 2), -273.15);

console.log();
check("duration 0", formatDuration(0), "0s");
check("duration 59", formatDuration(59), "59s");
check("duration 60", formatDuration(60), "1m");
check("duration 3661", formatDuration(3661), "1h 1m 1s");
check("duration 7200", formatDuration(7200), "2h");
check("duration 3600", formatDuration(3600), "1h");
check("duration 90", formatDuration(90), "1m 30s");
check("duration negative", raises(() => formatDuration(-1)), true);
check("duration decimal", raises(() => formatDuration(1.5)), true);
check("parse 3661", parseDuration("1h 1m 1s"), 3661);
check("parse 90", parseDuration("1m 30s"), 90);
check("parse hours", parseDuration("2h"), 7200);
check("parse spaces", parseDuration("  5m   10s "), 310);
check("parse bad text", raises(() => parseDuration("5 minutes")), true);
check("parse bad unit", raises(() => parseDuration("5x")), true);
let durationOk = true;
for (let i = 0; i <= 5000; i++) {
  if (parseDuration(formatDuration(i)) !== i) {
    durationOk = false;
  }
}
check("5001 durations round trip", durationOk, true);

console.log();
check("bytes 0", formatBytes(0), "0 B");
check("bytes 512", formatBytes(512), "512 B");
check("bytes 1023", formatBytes(1023), "1023 B");
check("bytes 1024", formatBytes(1024), "1.0 KB");
check("bytes 1536", formatBytes(1536), "1.5 KB");
check("bytes 1 MB", formatBytes(1048576), "1.0 MB");
check("bytes 1 GB", formatBytes(1073741824), "1.0 GB");
check("bytes 5 GB", formatBytes(5 * 1073741824), "5.0 GB");
check("bytes huge stays GB", formatBytes(1024 * 1073741824), "1024.0 GB");
check("bytes negative", raises(() => formatBytes(-5)), true);
check("bytes decimal", raises(() => formatBytes(1.5)), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
