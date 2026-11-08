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

const NAMED = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  orange: "#ff8000",
};

function needChannel(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error("channel must be an integer from 0 to 255");
  }
}

function needRgb(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3) {
    throw new Error("rgb must have three values");
  }
  rgb.forEach(needChannel);
}

function hexToRgb(hex) {
  let text = String(hex).trim().toLowerCase();
  if (text.startsWith("#")) {
    text = text.slice(1);
  }
  if (!/^[0-9a-f]+$/.test(text)) {
    throw new Error("bad hex color: " + hex);
  }
  if (text.length === 3) {
    text = text[0] + text[0] + text[1] + text[1] + text[2] + text[2];
  }
  if (text.length !== 6) {
    throw new Error("bad hex length: " + hex);
  }
  return [
    parseInt(text.slice(0, 2), 16),
    parseInt(text.slice(2, 4), 16),
    parseInt(text.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb) {
  needRgb(rgb);
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function invert(rgb) {
  needRgb(rgb);
  return rgb.map((v) => 255 - v);
}

function grayscale(rgb) {
  needRgb(rgb);
  const avg = Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
  return [avg, avg, avg];
}

function lighten(rgb, percent) {
  needRgb(rgb);
  if (percent < 0 || percent > 100) {
    throw new Error("percent must be 0 to 100");
  }
  return rgb.map((v) => Math.round(v + ((255 - v) * percent) / 100));
}

function darken(rgb, percent) {
  needRgb(rgb);
  if (percent < 0 || percent > 100) {
    throw new Error("percent must be 0 to 100");
  }
  return rgb.map((v) => Math.round(v * (1 - percent / 100)));
}

function mix(a, b) {
  needRgb(a);
  needRgb(b);
  return [
    Math.round((a[0] + b[0]) / 2),
    Math.round((a[1] + b[1]) / 2),
    Math.round((a[2] + b[2]) / 2),
  ];
}

function brightness(rgb) {
  needRgb(rgb);
  return Math.round((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000);
}

function isDark(rgb) {
  return brightness(rgb) < 128;
}

function contrast(a, b) {
  return Math.abs(brightness(a) - brightness(b));
}

function gradient(a, b, steps) {
  needRgb(a);
  needRgb(b);
  if (!Number.isInteger(steps) || steps < 2) {
    throw new Error("steps must be at least 2");
  }
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    out.push([
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ]);
  }
  return out;
}

function fromName(name) {
  const key = String(name).toLowerCase();
  if (!(key in NAMED)) {
    throw new Error("unknown color: " + name);
  }
  return hexToRgb(NAMED[key]);
}

function nameOf(rgb) {
  const hex = rgbToHex(rgb);
  for (const name of Object.keys(NAMED)) {
    if (NAMED[name] === hex) {
      return name;
    }
  }
  return null;
}

function sameColor(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

check("hex to rgb", hexToRgb("#ff8000"), [255, 128, 0]);
check("hex no hash", hexToRgb("ff8000"), [255, 128, 0]);
check("hex short", hexToRgb("#fff"), [255, 255, 255]);
check("hex short mixed", hexToRgb("#1a2"), [17, 170, 34]);
check("hex uppercase", hexToRgb("#FF00FF"), [255, 0, 255]);
check("hex spaces", hexToRgb("  #000000 "), [0, 0, 0]);
check("hex bad letters", raises(() => hexToRgb("#gg0000")), true);
check("hex bad length", raises(() => hexToRgb("#12345")), true);
check("hex empty", raises(() => hexToRgb("")), true);
check("hex only hash", raises(() => hexToRgb("#")), true);

console.log();
check("rgb to hex", rgbToHex([255, 128, 0]), "#ff8000");
check("rgb to hex black", rgbToHex([0, 0, 0]), "#000000");
check("rgb to hex padded", rgbToHex([1, 2, 3]), "#010203");
check("rgb too big", raises(() => rgbToHex([256, 0, 0])), true);
check("rgb negative", raises(() => rgbToHex([-1, 0, 0])), true);
check("rgb decimal", raises(() => rgbToHex([1.5, 0, 0])), true);
check("rgb too short", raises(() => rgbToHex([1, 2])), true);
check("rgb not array", raises(() => rgbToHex("red")), true);

console.log();
check("invert black", invert([0, 0, 0]), [255, 255, 255]);
check("invert color", invert([255, 128, 0]), [0, 127, 255]);
check("double invert", invert(invert([10, 20, 30])), [10, 20, 30]);
check("grayscale", grayscale([255, 128, 0]), [128, 128, 128]);
check("grayscale white", grayscale([255, 255, 255]), [255, 255, 255]);
check("grayscale gray", grayscale([90, 90, 90]), [90, 90, 90]);

console.log();
check("lighten half", lighten([0, 0, 0], 50), [128, 128, 128]);
check("lighten zero", lighten([10, 20, 30], 0), [10, 20, 30]);
check("lighten full", lighten([10, 20, 30], 100), [255, 255, 255]);
check("darken half", darken([200, 100, 50], 50), [100, 50, 25]);
check("darken zero", darken([200, 100, 50], 0), [200, 100, 50]);
check("darken full", darken([200, 100, 50], 100), [0, 0, 0]);
check("lighten bad percent", raises(() => lighten([0, 0, 0], 101)), true);
check("darken bad percent", raises(() => darken([0, 0, 0], -1)), true);

console.log();
check("mix red blue", mix([255, 0, 0], [0, 0, 255]), [128, 0, 128]);
check("mix same", mix([10, 20, 30], [10, 20, 30]), [10, 20, 30]);
check("mix black white", mix([0, 0, 0], [255, 255, 255]), [128, 128, 128]);
check("brightness white", brightness([255, 255, 255]), 255);
check("brightness black", brightness([0, 0, 0]), 0);
check("brightness red", brightness([255, 0, 0]), 76);
check("brightness yellow", brightness([255, 255, 0]), 226);
check("red is dark", isDark([255, 0, 0]), true);
check("yellow is light", isDark([255, 255, 0]), false);
check("contrast black white", contrast([0, 0, 0], [255, 255, 255]), 255);
check("contrast same", contrast([9, 9, 9], [9, 9, 9]), 0);

console.log();
check("gradient three", gradient([0, 0, 0], [255, 255, 255], 3), [[0, 0, 0], [128, 128, 128], [255, 255, 255]]);
check("gradient two", gradient([10, 20, 30], [40, 50, 60], 2), [[10, 20, 30], [40, 50, 60]]);
check("gradient five", gradient([0, 0, 0], [255, 255, 255], 5).map((c) => c[0]), [0, 64, 128, 191, 255]);
check("gradient length", gradient([0, 0, 0], [1, 1, 1], 10).length, 10);
check("gradient one step", raises(() => gradient([0, 0, 0], [1, 1, 1], 1)), true);
check("gradient bad color", raises(() => gradient([0, 0, 0], [1, 1], 3)), true);

console.log();
check("name red", fromName("red"), [255, 0, 0]);
check("name uppercase", fromName("BLUE"), [0, 0, 255]);
check("name orange", fromName("orange"), [255, 128, 0]);
check("unknown name", raises(() => fromName("purple")), true);
check("name of green", nameOf([0, 255, 0]), "green");
check("name of unknown", nameOf([1, 2, 3]), null);
check("same color yes", sameColor([1, 2, 3], [1, 2, 3]), true);
check("same color no", sameColor([1, 2, 3], [1, 2, 4]), false);
let namesOk = true;
for (const name of Object.keys(NAMED)) {
  if (nameOf(fromName(name)) !== name) {
    namesOk = false;
  }
}
check("all names round trip", namesOk, true);

console.log();
let hexOk = true;
for (let i = 0; i < 256; i++) {
  const rgb = [i, 255 - i, (i * 7) % 256];
  if (!sameColor(hexToRgb(rgbToHex(rgb)), rgb)) {
    hexOk = false;
  }
}
check("256 hex round trips", hexOk, true);
let invertOk = true;
for (let i = 0; i < 256; i++) {
  const rgb = [i, (i * 3) % 256, (i * 5) % 256];
  if (!sameColor(invert(invert(rgb)), rgb)) {
    invertOk = false;
  }
}
check("256 invert round trips", invertOk, true);
let grayOk = true;
for (let i = 0; i < 256; i++) {
  const g = grayscale([i, i, i]);
  if (g[0] !== i || g[1] !== i || g[2] !== i) {
    grayOk = false;
  }
}
check("256 grays unchanged", grayOk, true);
const ramp = gradient([0, 0, 0], [255, 255, 255], 256);
check("256 step ramp", ramp.length, 256);
check("ramp is smooth", ramp.every((c, i) => c[0] === i), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
