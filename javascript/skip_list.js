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

function seeded(start) {
  let s = start;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

class SkipList {
  constructor(random = Math.random, maxLevel = 16) {
    if (typeof random !== "function") {
      throw new Error("random must be a function");
    }
    if (!Number.isInteger(maxLevel) || maxLevel < 1) {
      throw new Error("maxLevel must be a positive integer");
    }
    this.random = random;
    this.maxLevel = maxLevel;
    this.head = { key: null, next: new Array(maxLevel).fill(null) };
    this.level = 1;
    this.count = 0;
  }

  checkKey(key) {
    if (typeof key !== "number" || Number.isNaN(key)) {
      throw new Error("key must be a number");
    }
  }

  randomLevel() {
    let l = 1;
    while (l < this.maxLevel && this.random() < 0.5) {
      l++;
    }
    return l;
  }

  findPath(key) {
    const update = new Array(this.maxLevel).fill(this.head);
    let node = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.next[i] !== null && node.next[i].key < key) {
        node = node.next[i];
      }
      update[i] = node;
    }
    return { update: update, before: node, candidate: node.next[0] };
  }

  insert(key) {
    this.checkKey(key);
    const path = this.findPath(key);
    if (path.candidate !== null && path.candidate.key === key) {
      return false;
    }
    const lvl = this.randomLevel();
    if (lvl > this.level) {
      for (let i = this.level; i < lvl; i++) {
        path.update[i] = this.head;
      }
      this.level = lvl;
    }
    const node = { key: key, next: new Array(lvl).fill(null) };
    for (let i = 0; i < lvl; i++) {
      node.next[i] = path.update[i].next[i];
      path.update[i].next[i] = node;
    }
    this.count++;
    return true;
  }

  has(key) {
    this.checkKey(key);
    const c = this.findPath(key).candidate;
    return c !== null && c.key === key;
  }

  remove(key) {
    this.checkKey(key);
    const path = this.findPath(key);
    const target = path.candidate;
    if (target === null || target.key !== key) {
      return false;
    }
    for (let i = 0; i < this.level; i++) {
      if (path.update[i].next[i] !== target) {
        break;
      }
      path.update[i].next[i] = target.next[i];
    }
    while (this.level > 1 && this.head.next[this.level - 1] === null) {
      this.level--;
    }
    this.count--;
    return true;
  }

  size() {
    return this.count;
  }

  height() {
    return this.level;
  }

  min() {
    return this.head.next[0] === null ? null : this.head.next[0].key;
  }

  max() {
    let node = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.next[i] !== null) {
        node = node.next[i];
      }
    }
    return node === this.head ? null : node.key;
  }

  floor(key) {
    this.checkKey(key);
    const path = this.findPath(key);
    if (path.candidate !== null && path.candidate.key === key) {
      return key;
    }
    return path.before === this.head ? null : path.before.key;
  }

  ceil(key) {
    this.checkKey(key);
    const c = this.findPath(key).candidate;
    return c === null ? null : c.key;
  }

  toArray() {
    const out = [];
    for (let n = this.head.next[0]; n !== null; n = n.next[0]) {
      out.push(n.key);
    }
    return out;
  }

  range(lo, hi) {
    this.checkKey(lo);
    this.checkKey(hi);
    if (lo > hi) {
      throw new Error("low is above high");
    }
    const out = [];
    for (let n = this.findPath(lo).candidate; n !== null && n.key <= hi; n = n.next[0]) {
      out.push(n.key);
    }
    return out;
  }
}

const list = new SkipList(seeded(7));
check("starts empty", list.size(), 0);
check("empty array", list.toArray(), []);
check("empty min", list.min(), null);
check("empty max", list.max(), null);
check("empty has", list.has(1), false);
check("empty floor", list.floor(1), null);
check("empty ceil", list.ceil(1), null);
check("empty height", list.height(), 1);
check("empty remove", list.remove(1), false);
for (const k of [5, 3, 8, 1, 4, 7, 9, 2, 6]) {
  check("insert " + k, list.insert(k), true);
}
check("duplicate insert", list.insert(5), false);
check("size", list.size(), 9);
check("sorted order", list.toArray(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
check("has present", list.has(4), true);
check("has missing", list.has(10), false);
check("min", list.min(), 1);
check("max", list.max(), 9);

console.log();
check("floor between", list.floor(5.5), 5);
check("floor exact", list.floor(5), 5);
check("floor below all", list.floor(0), null);
check("floor above all", list.floor(100), 9);
check("ceil between", list.ceil(5.5), 6);
check("ceil exact", list.ceil(5), 5);
check("ceil above all", list.ceil(10), null);
check("ceil below all", list.ceil(0), 1);
check("range middle", list.range(3, 6), [3, 4, 5, 6]);
check("range partial", list.range(3.5, 5.5), [4, 5]);
check("range none", list.range(10, 20), []);
check("range single", list.range(4, 4), [4]);
check("range wide", list.range(-Infinity, Infinity).length, 9);
check("range reversed", raises(() => list.range(6, 3)), true);

console.log();
check("remove present", list.remove(5), true);
check("remove again", list.remove(5), false);
check("gone", list.has(5), false);
check("size after", list.size(), 8);
check("order after", list.toArray(), [1, 2, 3, 4, 6, 7, 8, 9]);
check("floor after", list.floor(5), 4);
check("remove min", list.remove(1), true);
check("new min", list.min(), 2);
check("remove max", list.remove(9), true);
check("new max", list.max(), 8);
for (const k of list.toArray()) {
  list.remove(k);
}
check("all removed", list.size(), 0);
check("all removed array", list.toArray(), []);
check("height back to one", list.height(), 1);
check("usable again", list.insert(42), true);
check("usable again array", list.toArray(), [42]);

console.log();
check("negatives and floats", (() => {
  const l = new SkipList(seeded(3));
  for (const k of [0.5, -2, 10, -0.5]) {
    l.insert(k);
  }
  return l.toArray();
})(), [-2, -0.5, 0.5, 10]);
check("insert text raises", raises(() => list.insert("a")), true);
check("insert NaN raises", raises(() => list.insert(NaN)), true);
check("has text raises", raises(() => list.has("a")), true);
check("bad random", raises(() => new SkipList(5)), true);
check("bad max level", raises(() => new SkipList(Math.random, 0)), true);
const flat = new SkipList(() => 0.99, 8);
for (let i = 0; i < 20; i++) {
  flat.insert(i);
}
check("flat height", flat.height(), 1);
check("flat order", flat.toArray().length, 20);
const tall = new SkipList(() => 0, 4);
for (const k of [3, 1, 2, 5, 4]) {
  tall.insert(k);
}
check("tall height", tall.height(), 4);
check("tall order", tall.toArray(), [1, 2, 3, 4, 5]);
check("tall remove", tall.remove(3) && tall.toArray(), [1, 2, 4, 5]);

console.log();
const rng = seeded(1234);
let seed = 99;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const sl = new SkipList(rng, 8);
const model = new Set();
let opsOk = true;
let viewOk = true;
let heightOk = true;
for (let step = 0; step < 800; step++) {
  const k = nextRandom(60);
  if (nextRandom(5) < 3) {
    if (sl.insert(k) === model.has(k)) {
      opsOk = false;
    }
    model.add(k);
  } else {
    if (sl.remove(k) !== model.has(k)) {
      opsOk = false;
    }
    model.delete(k);
  }
  if (sl.height() > 8) {
    heightOk = false;
  }
  if (step % 10 === 0) {
    const sorted = Array.from(model).sort((a, b) => a - b);
    const probe = nextRandom(70) - 5 + nextRandom(2) * 0.5;
    const lowers = sorted.filter((x) => x <= probe);
    const uppers = sorted.filter((x) => x >= probe);
    const lo = nextRandom(60);
    const hi = lo + nextRandom(20);
    if (JSON.stringify(sl.toArray()) !== JSON.stringify(sorted) || sl.size() !== sorted.length) {
      viewOk = false;
    }
    if (sl.floor(probe) !== (lowers.length ? lowers[lowers.length - 1] : null)) {
      viewOk = false;
    }
    if (sl.ceil(probe) !== (uppers.length ? uppers[0] : null)) {
      viewOk = false;
    }
    if (JSON.stringify(sl.range(lo, hi)) !== JSON.stringify(sorted.filter((x) => x >= lo && x <= hi))) {
      viewOk = false;
    }
    if (sl.min() !== (sorted.length ? sorted[0] : null) || sl.max() !== (sorted.length ? sorted[sorted.length - 1] : null)) {
      viewOk = false;
    }
  }
}
check("800 random operations", opsOk, true);
check("80 random snapshots", viewOk, true);
check("height stays bounded", heightOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
