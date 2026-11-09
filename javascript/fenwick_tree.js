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

class FenwickTree {
  constructor(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error("n must be a non-negative integer");
    }
    this.n = n;
    this.tree = new Array(n + 1).fill(0);
    this.values = new Array(n).fill(0);
  }

  static from(list) {
    const f = new FenwickTree(list.length);
    for (let i = 0; i < list.length; i++) {
      f.add(i, list[i]);
    }
    return f;
  }

  checkIndex(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.n) {
      throw new Error("index out of range: " + i);
    }
  }

  add(i, delta) {
    this.checkIndex(i);
    if (typeof delta !== "number" || Number.isNaN(delta)) {
      throw new Error("delta must be a number");
    }
    this.values[i] += delta;
    for (let x = i + 1; x <= this.n; x += x & -x) {
      this.tree[x] += delta;
    }
  }

  set(i, value) {
    this.checkIndex(i);
    this.add(i, value - this.values[i]);
  }

  get(i) {
    this.checkIndex(i);
    return this.values[i];
  }

  prefix(i) {
    if (!Number.isInteger(i) || i < -1 || i >= this.n) {
      throw new Error("index out of range: " + i);
    }
    let sum = 0;
    for (let x = i + 1; x > 0; x -= x & -x) {
      sum += this.tree[x];
    }
    return sum;
  }

  range(l, r) {
    this.checkIndex(l);
    this.checkIndex(r);
    if (l > r) {
      throw new Error("left index is after right index");
    }
    return this.prefix(r) - this.prefix(l - 1);
  }

  total() {
    return this.prefix(this.n - 1);
  }

  lowerBound(target) {
    let lo = 0;
    let hi = this.n;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.prefix(mid) >= target) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return lo;
  }
}

function countInversions(list) {
  const sorted = Array.from(new Set(list)).sort((a, b) => a - b);
  const rank = new Map();
  sorted.forEach((v, i) => rank.set(v, i));
  const f = new FenwickTree(sorted.length);
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    const r = rank.get(list[i]);
    count += i - f.prefix(r);
    f.add(r, 1);
  }
  return count;
}

const f = FenwickTree.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]);
check("prefix 0", f.prefix(0), 3);
check("prefix 3", f.prefix(3), 10);
check("prefix last", f.prefix(10), 31);
check("prefix minus one", f.prefix(-1), 0);
check("total", f.total(), 31);
check("range 2 to 4", f.range(2, 4), 10);
check("range single", f.range(0, 0), 3);
check("range whole", f.range(0, 10), 31);
check("get", f.get(3), 6);
f.add(2, 5);
check("range after add", f.range(2, 4), 15);
check("get after add", f.get(2), 4);
f.set(0, 10);
check("get after set", f.get(0), 10);
check("total after set", f.total(), 43);
check("prefix too high", raises(() => f.prefix(11)), true);
check("add bad index", raises(() => f.add(-1, 1)), true);
check("add bad delta", raises(() => f.add(0, "1")), true);
check("range reversed", raises(() => f.range(4, 2)), true);
check("range decimal", raises(() => f.range(1.5, 3)), true);
check("constructor negative", raises(() => new FenwickTree(-1)), true);
check("empty total", FenwickTree.from([]).total(), 0);
check("empty prefix", new FenwickTree(0).prefix(-1), 0);

console.log();
const lb = FenwickTree.from([1, 2, 3, 4]);
check("lower bound 0", lb.lowerBound(0), 0);
check("lower bound 1", lb.lowerBound(1), 0);
check("lower bound 2", lb.lowerBound(2), 1);
check("lower bound 3", lb.lowerBound(3), 1);
check("lower bound 4", lb.lowerBound(4), 2);
check("lower bound 10", lb.lowerBound(10), 3);
check("lower bound too big", lb.lowerBound(11), 4);

console.log();
check("inversions example", countInversions([2, 4, 1, 3, 5]), 3);
check("inversions sorted", countInversions([1, 2, 3]), 0);
check("inversions reversed", countInversions([3, 2, 1]), 3);
check("inversions big reverse", countInversions([5, 4, 3, 2, 1]), 10);
check("inversions empty", countInversions([]), 0);
check("inversions single", countInversions([7]), 0);
check("inversions ties", countInversions([2, 2, 1]), 2);
check("inversions all equal", countInversions([4, 4, 4]), 0);
check("inversions negatives", countInversions([0, -5, -3]), 2);

console.log();
let seed = 777;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let treeOk = true;
const n = 20;
const tree = new FenwickTree(n);
const model = new Array(n).fill(0);
for (let step = 0; step < 400; step++) {
  const i = nextRandom(n);
  const op = nextRandom(3);
  if (op === 0) {
    const d = nextRandom(21) - 10;
    tree.add(i, d);
    model[i] += d;
  } else if (op === 1) {
    const v = nextRandom(21) - 10;
    tree.set(i, v);
    model[i] = v;
  }
  const a = nextRandom(n);
  const b = nextRandom(n);
  const l = Math.min(a, b);
  const r = Math.max(a, b);
  const expected = model.slice(l, r + 1).reduce((s, x) => s + x, 0);
  if (tree.range(l, r) !== expected || tree.get(i) !== model[i]) {
    treeOk = false;
  }
}
check("400 random operations", treeOk, true);
check("random total", tree.total(), model.reduce((s, x) => s + x, 0));

let invOk = true;
for (let round = 0; round < 200; round++) {
  const len = nextRandom(15);
  const list = [];
  for (let i = 0; i < len; i++) {
    list.push(nextRandom(10) - 5);
  }
  let brute = 0;
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      if (list[i] > list[j]) {
        brute++;
      }
    }
  }
  if (countInversions(list) !== brute) {
    invOk = false;
  }
}
check("200 random inversions", invOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
