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

class SegmentTree {
  constructor(list, combine, identity) {
    if (!Array.isArray(list)) {
      throw new Error("list must be an array");
    }
    if (typeof combine !== "function") {
      throw new Error("combine must be a function");
    }
    this.n = list.length;
    this.combine = combine;
    this.identity = identity;
    this.tree = new Array(2 * this.n).fill(identity);
    for (let i = 0; i < this.n; i++) {
      this.tree[this.n + i] = list[i];
    }
    for (let i = this.n - 1; i >= 1; i--) {
      this.tree[i] = combine(this.tree[2 * i], this.tree[2 * i + 1]);
    }
  }

  checkIndex(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.n) {
      throw new Error("index out of range: " + i);
    }
  }

  size() {
    return this.n;
  }

  get(i) {
    this.checkIndex(i);
    return this.tree[this.n + i];
  }

  update(i, value) {
    this.checkIndex(i);
    let p = i + this.n;
    this.tree[p] = value;
    while (p > 1) {
      p = p >> 1;
      this.tree[p] = this.combine(this.tree[2 * p], this.tree[2 * p + 1]);
    }
  }

  query(l, r) {
    this.checkIndex(l);
    this.checkIndex(r);
    if (l > r) {
      throw new Error("left index is after right index");
    }
    let result = this.identity;
    let lo = l + this.n;
    let hi = r + this.n + 1;
    while (lo < hi) {
      if (lo & 1) {
        result = this.combine(result, this.tree[lo++]);
      }
      if (hi & 1) {
        result = this.combine(result, this.tree[--hi]);
      }
      lo = lo >> 1;
      hi = hi >> 1;
    }
    return result;
  }

  total() {
    return this.n === 0 ? this.identity : this.query(0, this.n - 1);
  }

  toArray() {
    return this.tree.slice(this.n);
  }
}

const sumTree = (list) => new SegmentTree(list, (a, b) => a + b, 0);
const minTree = (list) => new SegmentTree(list, Math.min, Infinity);
const maxTree = (list) => new SegmentTree(list, Math.max, -Infinity);
const gcd = (a, b) => {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};

function slidingWindowMax(list, k) {
  if (!Number.isInteger(k) || k < 1 || k > list.length) {
    throw new Error("window must be between 1 and the list length");
  }
  const tree = maxTree(list);
  const out = [];
  for (let i = 0; i + k <= list.length; i++) {
    out.push(tree.query(i, i + k - 1));
  }
  return out;
}

const s = sumTree([1, 2, 3, 4, 5]);
check("sum whole", s.query(0, 4), 15);
check("sum middle", s.query(1, 3), 9);
check("sum single", s.query(2, 2), 3);
check("sum first two", s.query(0, 1), 3);
check("sum last two", s.query(3, 4), 9);
check("total", s.total(), 15);
check("size", s.size(), 5);
check("get", s.get(3), 4);
s.update(2, 10);
check("get after update", s.get(2), 10);
check("sum after update", s.query(0, 4), 22);
check("sum partial update", s.query(0, 1), 3);
check("to array", s.toArray(), [1, 2, 10, 4, 5]);

console.log();
const mn = minTree([5, 2, 8, 1, 9]);
check("min first three", mn.query(0, 2), 2);
check("min last three", mn.query(2, 4), 1);
check("min single", mn.query(4, 4), 9);
check("min total", mn.total(), 1);
mn.update(3, 100);
check("min after update", mn.query(2, 4), 8);
const mx = maxTree([5, 2, 8, 1, 9]);
check("max first three", mx.query(0, 2), 8);
check("max last two", mx.query(3, 4), 9);
check("max single", mx.query(1, 1), 2);
const g = new SegmentTree([12, 18, 27, 36], gcd, 0);
check("gcd first two", g.query(0, 1), 6);
check("gcd first three", g.query(0, 2), 3);
check("gcd all", g.total(), 3);
check("gcd last two", g.query(2, 3), 9);

console.log();
check("one element", sumTree([7]).query(0, 0), 7);
check("one element update", (() => {
  const t = sumTree([7]);
  t.update(0, 9);
  return t.total();
})(), 9);
check("empty total", sumTree([]).total(), 0);
check("empty size", sumTree([]).size(), 0);
check("query too high", raises(() => s.query(0, 5)), true);
check("query negative", raises(() => s.query(-1, 2)), true);
check("query reversed", raises(() => s.query(3, 1)), true);
check("query decimal", raises(() => s.query(0.5, 2)), true);
check("update bad index", raises(() => s.update(5, 1)), true);
check("get bad index", raises(() => s.get(-1)), true);
check("not an array", raises(() => sumTree("abc")), true);
check("combine not function", raises(() => new SegmentTree([1], 5, 0)), true);
check("input untouched", (() => {
  const input = [1, 2, 3];
  sumTree(input).update(0, 99);
  return input;
})(), [1, 2, 3]);

console.log();
check("window max", slidingWindowMax([1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7]);
check("window one", slidingWindowMax([4, 2, 9], 1), [4, 2, 9]);
check("window whole", slidingWindowMax([4, 2, 9], 3), [9]);
check("window too big", raises(() => slidingWindowMax([1, 2], 3)), true);
check("window zero", raises(() => slidingWindowMax([1, 2], 0)), true);

console.log();
let seed = 2024;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const n = 17;
const model = [];
for (let i = 0; i < n; i++) {
  model.push(nextRandom(100) - 50);
}
const t1 = sumTree(model);
const t2 = minTree(model);
const t3 = maxTree(model);
let sumOk = true;
let minOk = true;
let maxOk = true;
for (let step = 0; step < 500; step++) {
  if (nextRandom(3) === 0) {
    const i = nextRandom(n);
    const v = nextRandom(100) - 50;
    model[i] = v;
    t1.update(i, v);
    t2.update(i, v);
    t3.update(i, v);
  }
  const a = nextRandom(n);
  const b = nextRandom(n);
  const l = Math.min(a, b);
  const r = Math.max(a, b);
  const part = model.slice(l, r + 1);
  if (t1.query(l, r) !== part.reduce((x, y) => x + y, 0)) {
    sumOk = false;
  }
  if (t2.query(l, r) !== Math.min(...part)) {
    minOk = false;
  }
  if (t3.query(l, r) !== Math.max(...part)) {
    maxOk = false;
  }
}
check("500 random sums", sumOk, true);
check("500 random mins", minOk, true);
check("500 random maxes", maxOk, true);
check("random final array", t1.toArray(), model);

let windowOk = true;
for (let round = 0; round < 100; round++) {
  const list = [];
  const len = 1 + nextRandom(15);
  for (let i = 0; i < len; i++) {
    list.push(nextRandom(30));
  }
  const k = 1 + nextRandom(len);
  const expected = [];
  for (let i = 0; i + k <= len; i++) {
    expected.push(Math.max(...list.slice(i, i + k)));
  }
  if (JSON.stringify(slidingWindowMax(list, k)) !== JSON.stringify(expected)) {
    windowOk = false;
  }
}
check("100 random windows", windowOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
