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

function isPlain(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepClone(v) {
  if (v === null || typeof v !== "object") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x) => deepClone(x));
  }
  const out = {};
  for (const key of Object.keys(v)) {
    out[key] = deepClone(v[key]);
  }
  return out;
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) {
    return false;
  }
  for (const key of ka) {
    if (!(key in b) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function flatten(obj, prefix, out) {
  if (prefix === undefined) {
    prefix = "";
  }
  if (out === undefined) {
    out = {};
  }
  for (const key of Object.keys(obj)) {
    const path = prefix === "" ? key : prefix + "." + key;
    const value = obj[key];
    if (value !== null && typeof value === "object") {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const path of Object.keys(flat)) {
    const parts = path.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlain(cur[parts[i]])) {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = flat[path];
  }
  return out;
}

function getPath(obj, path, fallback) {
  let cur = obj;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return fallback;
    }
    if (!(part in cur)) {
      return fallback;
    }
    cur = cur[part];
  }
  return cur;
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === null || typeof cur[parts[i]] !== "object") {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

function mergeDeep(a, b) {
  const out = deepClone(a);
  for (const key of Object.keys(b)) {
    if (isPlain(out[key]) && isPlain(b[key])) {
      out[key] = mergeDeep(out[key], b[key]);
    } else {
      out[key] = deepClone(b[key]);
    }
  }
  return out;
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (key in obj) {
      out[key] = obj[key];
    }
  }
  return out;
}

function omit(obj, keys) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      out[key] = obj[key];
    }
  }
  return out;
}

function countLeaves(value) {
  if (value === null || typeof value !== "object") {
    return 1;
  }
  let total = 0;
  for (const key of Object.keys(value)) {
    total += countLeaves(value[key]);
  }
  return total;
}

const sample = { name: "Sam", tags: ["a", "b"], address: { city: "Oslo", geo: { lat: 59, lon: 10 } } };

const copy = deepClone(sample);
check("clone equal", deepEqual(copy, sample), true);
check("clone different ref", copy === sample, false);
check("clone nested ref", copy.address === sample.address, false);
copy.address.geo.lat = 0;
check("original untouched", sample.address.geo.lat, 59);
copy.tags.push("c");
check("array untouched", sample.tags, ["a", "b"]);
check("clone primitive", deepClone(5), 5);
check("clone null", deepClone(null), null);
check("clone array", deepClone([1, [2, 3]]), [1, [2, 3]]);

console.log();
check("equal same", deepEqual({ a: 1 }, { a: 1 }), true);
check("equal nested", deepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 2] } }), true);
check("equal order free", deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
check("not equal value", deepEqual({ a: 1 }, { a: 2 }), false);
check("not equal keys", deepEqual({ a: 1 }, { b: 1 }), false);
check("not equal extra", deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
check("not equal array", deepEqual([1, 2], [1, 3]), false);
check("array vs object", deepEqual([], {}), false);
check("null vs object", deepEqual(null, {}), false);
check("equal primitives", deepEqual("x", "x"), true);
check("string vs number", deepEqual("1", 1), false);
check("equal empty", deepEqual({}, {}), true);

console.log();
check("flatten sample", flatten(sample), { name: "Sam", "tags.0": "a", "tags.1": "b", "address.city": "Oslo", "address.geo.lat": 59, "address.geo.lon": 10 });
check("flatten flat", flatten({ a: 1, b: 2 }), { a: 1, b: 2 });
check("flatten null leaf", flatten({ a: null }), { a: null });
check("flatten empty", flatten({}), {});
check("unflatten simple", unflatten({ "a.b": 1, "a.c": 2, d: 3 }), { a: { b: 1, c: 2 }, d: 3 });
check("unflatten deep", unflatten({ "a.b.c.d": 9 }), { a: { b: { c: { d: 9 } } } });
const nested = { a: { b: 1, c: { d: 2 } }, e: 3 };
check("round trip nested", deepEqual(unflatten(flatten(nested)), nested), true);

console.log();
check("get simple", getPath(sample, "name"), "Sam");
check("get nested", getPath(sample, "address.geo.lat"), 59);
check("get array item", getPath(sample, "tags.1"), "b");
check("get missing", getPath(sample, "address.zip", "none"), "none");
check("get deep missing", getPath(sample, "x.y.z", "none"), "none");
check("get through primitive", getPath(sample, "name.length.x", "none"), "none");
check("get undefined default", getPath(sample, "nope"), undefined);
check("get whole branch", getPath(sample, "address.geo"), { lat: 59, lon: 10 });

console.log();
check("set creates path", setPath({}, "a.b.c", 5), { a: { b: { c: 5 } } });
check("set top level", setPath({}, "x", 1), { x: 1 });
check("set overwrite", setPath({ a: 1 }, "a", 2), { a: 2 });
check("set over primitive", setPath({ a: 1 }, "a.b", 2), { a: { b: 2 } });
check("set keeps siblings", setPath({ a: { x: 1 } }, "a.y", 2), { a: { x: 1, y: 2 } });
const target = { k: 1 };
check("set returns same", setPath(target, "j", 2) === target, true);
check("set then get", getPath(setPath({}, "p.q", 7), "p.q"), 7);

console.log();
check("merge deep", mergeDeep({ x: 1, y: { p: 1, q: 2 } }, { y: { q: 3, r: 4 }, z: 5 }), { x: 1, y: { p: 1, q: 3, r: 4 }, z: 5 });
check("merge overwrite array", mergeDeep({ a: [1, 2] }, { a: [3] }), { a: [3] });
check("merge empty right", mergeDeep({ a: 1 }, {}), { a: 1 });
check("merge empty left", mergeDeep({}, { a: 1 }), { a: 1 });
const left = { a: { b: 1 } };
const right = { a: { c: 2 } };
const merged = mergeDeep(left, right);
merged.a.b = 99;
check("merge keeps left", left, { a: { b: 1 } });
check("merge keeps right", right, { a: { c: 2 } });
check("pick", pick({ a: 1, b: 2, c: 3 }, ["c", "a", "z"]), { c: 3, a: 1 });
check("pick none", pick({ a: 1 }, []), {});
check("omit", omit({ a: 1, b: 2, c: 3 }, ["a", "c"]), { b: 2 });
check("omit none", omit({ a: 1 }, ["z"]), { a: 1 });
check("count leaves", countLeaves({ a: 1, b: { c: 2, d: [3, 4] } }), 4);
check("count leaf alone", countLeaves(5), 1);

console.log();
let seed = 4242;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function genObj(depth) {
  const obj = {};
  const n = 1 + nextRandom(3);
  for (let i = 0; i < n; i++) {
    const key = "k" + i;
    if (depth > 0 && nextRandom(2) === 0) {
      obj[key] = genObj(depth - 1);
    } else {
      obj[key] = nextRandom(1000);
    }
  }
  return obj;
}
let cloneOk = true;
let flatOk = true;
let leafOk = true;
for (let i = 0; i < 200; i++) {
  const o = genObj(4);
  const c = deepClone(o);
  if (!deepEqual(o, c) || o === c) {
    cloneOk = false;
  }
  const flat = flatten(o);
  if (!deepEqual(unflatten(flat), o)) {
    flatOk = false;
  }
  if (countLeaves(o) !== Object.keys(flat).length) {
    leafOk = false;
  }
}
check("200 random clones", cloneOk, true);
check("200 flatten round trips", flatOk, true);
check("200 leaf counts", leafOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
