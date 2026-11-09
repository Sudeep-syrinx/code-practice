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

class RingBuffer {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("capacity must be a positive integer");
    }
    this.cap = capacity;
    this.items = new Array(capacity).fill(undefined);
    this.head = 0;
    this.count = 0;
  }

  push(value) {
    if (this.count === this.cap) {
      this.items[this.head] = value;
      this.head = (this.head + 1) % this.cap;
      return true;
    }
    this.items[(this.head + this.count) % this.cap] = value;
    this.count++;
    return false;
  }

  shift() {
    if (this.count === 0) {
      throw new Error("buffer is empty");
    }
    const value = this.items[this.head];
    this.items[this.head] = undefined;
    this.head = (this.head + 1) % this.cap;
    this.count--;
    return value;
  }

  peek() {
    if (this.count === 0) {
      throw new Error("buffer is empty");
    }
    return this.items[this.head];
  }

  newest() {
    if (this.count === 0) {
      throw new Error("buffer is empty");
    }
    return this.items[(this.head + this.count - 1) % this.cap];
  }

  get(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.count) {
      throw new Error("index out of range: " + i);
    }
    return this.items[(this.head + i) % this.cap];
  }

  size() {
    return this.count;
  }

  capacity() {
    return this.cap;
  }

  isEmpty() {
    return this.count === 0;
  }

  isFull() {
    return this.count === this.cap;
  }

  clear() {
    this.items = new Array(this.cap).fill(undefined);
    this.head = 0;
    this.count = 0;
  }

  toArray() {
    const out = [];
    for (let i = 0; i < this.count; i++) {
      out.push(this.items[(this.head + i) % this.cap]);
    }
    return out;
  }
}

function movingAverage(values, window) {
  if (!Number.isInteger(window) || window < 1) {
    throw new Error("window must be a positive integer");
  }
  const buf = new RingBuffer(window);
  let sum = 0;
  const out = [];
  for (const v of values) {
    if (buf.isFull()) {
      sum -= buf.peek();
    }
    buf.push(v);
    sum += v;
    out.push(sum / buf.size());
  }
  return out;
}

const b = new RingBuffer(3);
check("starts empty", b.isEmpty(), true);
check("not full", b.isFull(), false);
check("capacity", b.capacity(), 3);
check("push 1", b.push(1), false);
check("push 2", b.push(2), false);
check("push 3", b.push(3), false);
check("now full", b.isFull(), true);
check("contents", b.toArray(), [1, 2, 3]);
check("push overwrites", b.push(4), true);
check("contents wrapped", b.toArray(), [2, 3, 4]);
check("size stays", b.size(), 3);
check("peek oldest", b.peek(), 2);
check("newest", b.newest(), 4);
check("shift", b.shift(), 2);
check("contents after shift", b.toArray(), [3, 4]);
check("push no overwrite", b.push(5), false);
check("contents again", b.toArray(), [3, 4, 5]);
check("get first", b.get(0), 3);
check("get last", b.get(2), 5);
check("get too high", raises(() => b.get(3)), true);
check("get negative", raises(() => b.get(-1)), true);
check("get decimal", raises(() => b.get(0.5)), true);
b.push(6);
b.push(7);
check("several overwrites", b.toArray(), [5, 6, 7]);
b.clear();
check("cleared size", b.size(), 0);
check("cleared array", b.toArray(), []);
check("empty shift raises", raises(() => b.shift()), true);
check("empty peek raises", raises(() => b.peek()), true);
check("empty newest raises", raises(() => b.newest()), true);
b.push(9);
check("usable after clear", b.toArray(), [9]);

console.log();
check("capacity zero", raises(() => new RingBuffer(0)), true);
check("capacity decimal", raises(() => new RingBuffer(2.5)), true);
check("capacity text", raises(() => new RingBuffer("3")), true);
const one = new RingBuffer(1);
one.push("a");
check("size one full", one.isFull(), true);
check("size one overwrite", one.push("b"), true);
check("size one content", one.toArray(), ["b"]);
check("stores undefined", (() => {
  const u = new RingBuffer(2);
  u.push(undefined);
  return u.size();
})(), 1);

console.log();
check("average window 3", movingAverage([1, 2, 3, 4, 5], 3), [1, 1.5, 2, 3, 4]);
check("average window 1", movingAverage([4, 8, 6], 1), [4, 8, 6]);
check("average wide window", movingAverage([2, 4], 5), [2, 3]);
check("average empty", movingAverage([], 3), []);
check("average bad window", raises(() => movingAverage([1], 0)), true);

console.log();
let seed = 5150;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let ringOk = true;
const ring = new RingBuffer(5);
const model = [];
for (let step = 0; step < 600; step++) {
  if (nextRandom(3) < 2) {
    const v = nextRandom(100);
    const overwritten = ring.push(v);
    if (overwritten !== (model.length === 5)) {
      ringOk = false;
    }
    model.push(v);
    if (model.length > 5) {
      model.shift();
    }
  } else if (model.length > 0) {
    if (ring.shift() !== model.shift()) {
      ringOk = false;
    }
  }
  if (JSON.stringify(ring.toArray()) !== JSON.stringify(model) || ring.size() !== model.length) {
    ringOk = false;
  }
  if (model.length > 0 && (ring.peek() !== model[0] || ring.newest() !== model[model.length - 1])) {
    ringOk = false;
  }
}
check("600 random operations", ringOk, true);

let avgOk = true;
for (let round = 0; round < 100; round++) {
  const len = nextRandom(20);
  const w = 1 + nextRandom(6);
  const values = [];
  for (let i = 0; i < len; i++) {
    values.push(nextRandom(50));
  }
  const got = movingAverage(values, w);
  for (let i = 0; i < len; i++) {
    const slice = values.slice(Math.max(0, i - w + 1), i + 1);
    const expected = slice.reduce((s, x) => s + x, 0) / slice.length;
    if (Math.abs(got[i] - expected) > 1e-9) {
      avgOk = false;
    }
  }
}
check("100 random averages", avgOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
