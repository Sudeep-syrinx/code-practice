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

function hash(text, seed) {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

class BloomFilter {
  constructor(bits, hashes) {
    if (!Number.isInteger(bits) || bits < 1) {
      throw new Error("bits must be a positive integer");
    }
    if (!Number.isInteger(hashes) || hashes < 1) {
      throw new Error("hashes must be a positive integer");
    }
    this.m = bits;
    this.k = hashes;
    this.bits = new Uint8Array(bits);
    this.added = 0;
  }

  positions(text) {
    if (typeof text !== "string") {
      throw new Error("item must be a string");
    }
    const list = [];
    for (let i = 0; i < this.k; i++) {
      list.push(hash(text, i * 7919 + 1) % this.m);
    }
    return list;
  }

  add(text) {
    let changed = false;
    for (const p of this.positions(text)) {
      if (this.bits[p] === 0) {
        this.bits[p] = 1;
        changed = true;
      }
    }
    this.added++;
    return changed;
  }

  has(text) {
    return this.positions(text).every((p) => this.bits[p] === 1);
  }

  fillRatio() {
    let set = 0;
    for (let i = 0; i < this.m; i++) {
      set += this.bits[i];
    }
    return set / this.m;
  }

  estimatedRate() {
    return Math.pow(1 - Math.exp((-this.k * this.added) / this.m), this.k);
  }

  clear() {
    this.bits = new Uint8Array(this.m);
    this.added = 0;
  }
}

check("hash same", hash("abc", 1) === hash("abc", 1), true);
check("hash differs by text", hash("abc", 1) === hash("abd", 1), false);
check("hash differs by seed", hash("abc", 1) === hash("abc", 2), false);
check("hash is unsigned", hash("hello", 5) >= 0, true);
check("hash empty text", typeof hash("", 1), "number");

console.log();
const f = new BloomFilter(1000, 2);
check("empty has nothing", f.has("a"), false);
check("empty fill", f.fillRatio(), 0);
check("first add", f.add("a"), true);
check("now has a", f.has("a"), true);
check("repeat add", f.add("a"), false);
check("positions count", f.positions("a").length, 2);
check("positions in range", f.positions("anything").every((p) => p >= 0 && p < 1000), true);
check("fill above zero", f.fillRatio() > 0, true);
check("add number raises", raises(() => f.add(5)), true);
check("has number raises", raises(() => f.has(null)), true);
f.clear();
check("cleared has", f.has("a"), false);
check("cleared fill", f.fillRatio(), 0);

console.log();
check("bad bits", raises(() => new BloomFilter(0, 2)), true);
check("bad hashes", raises(() => new BloomFilter(10, 0)), true);
check("decimal bits", raises(() => new BloomFilter(2.5, 1)), true);

console.log();
const est = new BloomFilter(1000, 2);
for (let i = 0; i < 100; i++) {
  est.add("item" + i);
}
check("estimated rate", Math.round(est.estimatedRate() * 1000) / 1000, 0.033);
check("fill is sensible", est.fillRatio() > 0.1 && est.fillRatio() < 0.25, true);

console.log();
const big = new BloomFilter(8000, 4);
const words = [];
for (let i = 0; i < 200; i++) {
  words.push("word-" + i);
  big.add("word-" + i);
}
check("no false negatives", words.every((w) => big.has(w)), true);
let falsePositives = 0;
for (let i = 0; i < 2000; i++) {
  if (big.has("other-" + i)) {
    falsePositives++;
  }
}
check("few false positives", falsePositives <= 10, true);
check("estimate is small", big.estimatedRate() < 0.001, true);

console.log();
let seed = 808;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let memberOk = true;
let fillOk = true;
for (let round = 0; round < 20; round++) {
  const filter = new BloomFilter(2000, 3);
  const members = [];
  let lastFill = 0;
  for (let i = 0; i < 100; i++) {
    let text = "";
    const len = 1 + nextRandom(8);
    for (let c = 0; c < len; c++) {
      text += "abcdef"[nextRandom(6)];
    }
    filter.add(text);
    members.push(text);
    const now = filter.fillRatio();
    if (now < lastFill) {
      fillOk = false;
    }
    lastFill = now;
  }
  if (!members.every((x) => filter.has(x))) {
    memberOk = false;
  }
}
check("20 random filters", memberOk, true);
check("fill never shrinks", fillOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
