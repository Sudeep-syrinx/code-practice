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

const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function parse(text) {
  if (typeof text !== "string") {
    throw new Error("version must be a string");
  }
  const m = VERSION_RE.exec(text.trim());
  if (m === null) {
    throw new Error("bad version: " + text);
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] === undefined ? [] : m[4].split("."),
  };
}

function isValid(text) {
  return typeof text === "string" && VERSION_RE.test(text.trim());
}

function format(v) {
  const base = v.major + "." + v.minor + "." + v.patch;
  return v.pre.length > 0 ? base + "-" + v.pre.join(".") : base;
}

function compareIds(a, b) {
  const an = /^\d+$/.test(a);
  const bn = /^\d+$/.test(b);
  if (an && bn) {
    return Math.sign(Number(a) - Number(b));
  }
  if (an) {
    return -1;
  }
  if (bn) {
    return 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePre(a, b) {
  if (a.length === 0 && b.length === 0) {
    return 0;
  }
  if (a.length === 0) {
    return 1;
  }
  if (b.length === 0) {
    return -1;
  }
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    const c = compareIds(a[i], b[i]);
    if (c !== 0) {
      return c;
    }
  }
  return Math.sign(a.length - b.length);
}

function compare(x, y) {
  const a = parse(x);
  const b = parse(y);
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) {
      return Math.sign(a[key] - b[key]);
    }
  }
  return comparePre(a.pre, b.pre);
}

function sortVersions(list) {
  return list.slice().sort(compare);
}

function inc(text, part) {
  const v = parse(text);
  if (part === "major") {
    return format({ major: v.major + 1, minor: 0, patch: 0, pre: [] });
  }
  if (part === "minor") {
    return format({ major: v.major, minor: v.minor + 1, patch: 0, pre: [] });
  }
  if (part === "patch") {
    return format({ major: v.major, minor: v.minor, patch: v.patch + 1, pre: [] });
  }
  throw new Error("part must be major, minor or patch");
}

function diff(x, y) {
  const a = parse(x);
  const b = parse(y);
  if (a.major !== b.major) {
    return "major";
  }
  if (a.minor !== b.minor) {
    return "minor";
  }
  if (a.patch !== b.patch) {
    return "patch";
  }
  if (a.pre.join(".") !== b.pre.join(".")) {
    return "prerelease";
  }
  return null;
}

function satisfiesOne(version, part) {
  const m = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(part);
  const op = m[1] === undefined ? "=" : m[1];
  const base = parse(m[2]);
  const baseText = format(base);
  const c = compare(version, baseText);
  if (op === "=") {
    return c === 0;
  }
  if (op === ">") {
    return c > 0;
  }
  if (op === ">=") {
    return c >= 0;
  }
  if (op === "<") {
    return c < 0;
  }
  if (op === "<=") {
    return c <= 0;
  }
  let upper;
  if (op === "~") {
    upper = base.major + "." + (base.minor + 1) + ".0";
  } else if (base.major > 0) {
    upper = base.major + 1 + ".0.0";
  } else if (base.minor > 0) {
    upper = "0." + (base.minor + 1) + ".0";
  } else {
    upper = "0.0." + (base.patch + 1);
  }
  return c >= 0 && compare(version, upper) < 0;
}

function satisfies(version, range) {
  parse(version);
  const parts = range.trim().split(/\s+/);
  return parts.every((p) => satisfiesOne(version, p));
}

function maxSatisfying(list, range) {
  const ok = list.filter((v) => satisfies(v, range));
  if (ok.length === 0) {
    return null;
  }
  return sortVersions(ok)[ok.length - 1];
}

check("parse plain", parse("1.2.3"), { major: 1, minor: 2, patch: 3, pre: [] });
check("parse prerelease", parse("1.0.0-beta.2").pre, ["beta", "2"]);
check("parse trims", parse("  4.5.6 ").minor, 5);
check("parse big numbers", parse("10.200.3000").patch, 3000);
check("parse too short", raises(() => parse("1.2")), true);
check("parse leading zero", raises(() => parse("01.2.3")), true);
check("parse letters", raises(() => parse("a.b.c")), true);
check("parse extra part", raises(() => parse("1.2.3.4")), true);
check("parse empty pre", raises(() => parse("1.2.3-")), true);
check("parse number", raises(() => parse(5)), true);
check("is valid yes", isValid("1.0.0"), true);
check("is valid no", isValid("1.0"), false);
check("is valid number", isValid(1), false);
check("format plain", format(parse("3.4.5")), "3.4.5");
check("format prerelease", format(parse("3.4.5-rc.1")), "3.4.5-rc.1");

console.log();
check("compare major", compare("1.0.0", "2.0.0"), -1);
check("compare minor numeric", compare("1.2.0", "1.10.0"), -1);
check("compare patch", compare("1.0.5", "1.0.4"), 1);
check("compare equal", compare("1.0.0", "1.0.0"), 0);
check("pre lower than release", compare("1.0.0-alpha", "1.0.0"), -1);
check("release higher than pre", compare("1.0.0", "1.0.0-rc.1"), 1);
check("pre shorter lower", compare("1.0.0-alpha", "1.0.0-alpha.1"), -1);
check("numeric below text", compare("1.0.0-alpha.1", "1.0.0-alpha.beta"), -1);
check("text order", compare("1.0.0-alpha.beta", "1.0.0-beta"), -1);
check("pre shorter lower again", compare("1.0.0-beta", "1.0.0-beta.2"), -1);
check("numeric ids by value", compare("1.0.0-beta.2", "1.0.0-beta.11"), -1);
check("beta below rc", compare("1.0.0-beta.11", "1.0.0-rc.1"), -1);
check("rc below release", compare("1.0.0-rc.1", "1.0.0"), -1);
check("compare bad input", raises(() => compare("1.0", "1.0.0")), true);

console.log();
check("sort mixed", sortVersions(["1.10.0", "1.2.0", "1.2.0-rc.1", "0.9.9"]), ["0.9.9", "1.2.0-rc.1", "1.2.0", "1.10.0"]);
check("sort empty", sortVersions([]), []);
const unsorted = ["2.0.0", "1.0.0"];
sortVersions(unsorted);
check("sort keeps input", unsorted, ["2.0.0", "1.0.0"]);
check("inc patch", inc("1.2.3", "patch"), "1.2.4");
check("inc minor", inc("1.2.3", "minor"), "1.3.0");
check("inc major", inc("1.2.3", "major"), "2.0.0");
check("inc drops prerelease", inc("1.2.3-beta", "patch"), "1.2.4");
check("inc bad part", raises(() => inc("1.2.3", "huge")), true);
check("diff major", diff("1.0.0", "2.0.0"), "major");
check("diff minor", diff("1.0.0", "1.1.0"), "minor");
check("diff patch", diff("1.0.0", "1.0.1"), "patch");
check("diff prerelease", diff("1.0.0", "1.0.0-beta"), "prerelease");
check("diff same", diff("1.0.0", "1.0.0"), null);

console.log();
check("caret same major", satisfies("1.2.3", "^1.0.0"), true);
check("caret next major", satisfies("2.0.0", "^1.0.0"), false);
check("caret below", satisfies("0.9.0", "^1.0.0"), false);
check("caret zero minor in", satisfies("0.2.5", "^0.2.0"), true);
check("caret zero minor out", satisfies("0.3.0", "^0.2.0"), false);
check("caret zero patch in", satisfies("0.0.3", "^0.0.3"), true);
check("caret zero patch out", satisfies("0.0.4", "^0.0.3"), false);
check("tilde in", satisfies("1.2.9", "~1.2.3"), true);
check("tilde out", satisfies("1.3.0", "~1.2.3"), false);
check("range and in", satisfies("1.5.0", ">=1.0.0 <2.0.0"), true);
check("range and out", satisfies("2.0.0", ">=1.0.0 <2.0.0"), false);
check("greater", satisfies("1.0.1", ">1.0.0"), true);
check("greater equal edge", satisfies("1.0.0", ">1.0.0"), false);
check("less equal", satisfies("1.0.0", "<=1.0.0"), true);
check("equals sign", satisfies("1.0.0", "=1.0.0"), true);
check("bare version", satisfies("1.0.0", "1.0.0"), true);
check("bare version miss", satisfies("1.0.1", "1.0.0"), false);
const pool = ["1.0.0", "1.2.3", "1.9.9", "2.0.0", "2.1.0"];
check("max caret", maxSatisfying(pool, "^1.0.0"), "1.9.9");
check("max tilde", maxSatisfying(pool, "~1.2.0"), "1.2.3");
check("max open", maxSatisfying(pool, ">=2.0.0"), "2.1.0");
check("max none", maxSatisfying(pool, "<1.0.0"), null);

console.log();
let seed = 1066;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const pres = ["", "-alpha", "-alpha.1", "-beta", "-1", "-rc.1", "-10"];
function randomVersion() {
  return nextRandom(4) + "." + nextRandom(4) + "." + nextRandom(4) + pres[nextRandom(pres.length)];
}
let antiOk = true;
let transOk = true;
let sortOk = true;
let formatOk = true;
for (let round = 0; round < 50; round++) {
  const list = [];
  for (let i = 0; i < 12; i++) {
    list.push(randomVersion());
  }
  for (const v of list) {
    if (format(parse(v)) !== v || compare(v, v) !== 0) {
      formatOk = false;
    }
  }
  for (const a of list) {
    for (const b of list) {
      if (compare(a, b) !== -compare(b, a)) {
        antiOk = false;
      }
      for (const c of list) {
        if (compare(a, b) <= 0 && compare(b, c) <= 0 && compare(a, c) > 0) {
          transOk = false;
        }
      }
    }
  }
  const sorted = sortVersions(list);
  for (let i = 1; i < sorted.length; i++) {
    if (compare(sorted[i - 1], sorted[i]) > 0) {
      sortOk = false;
    }
  }
}
check("50 antisymmetry rounds", antiOk, true);
check("50 transitivity rounds", transOk, true);
check("50 sorted rounds", sortOk, true);
check("50 format rounds", formatOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
