const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class GrowableArray {
  constructor(initialCapacity) {
    this.capacity = initialCapacity || 8;
    this.data = new Array(this.capacity).fill(undefined);
    this.length = 0;
  }
  _resize(newCapacity) {
    const newData = new Array(newCapacity).fill(undefined);
    for (let i = 0; i < this.length; i++) newData[i] = this.data[i];
    this.data = newData;
    this.capacity = newCapacity;
  }
  push(value) {
    if (this.length >= this.capacity) this._resize(this.capacity * 2);
    this.data[this.length++] = value;
  }
  pop() {
    if (this.length === 0) throw new Error("pop from empty");
    return this.data[--this.length];
  }
  get(index) {
    if (index < 0 || index >= this.length) throw new Error("index out of bounds");
    return this.data[index];
  }
  set(index, value) {
    if (index < 0 || index >= this.length) throw new Error("index out of bounds");
    this.data[index] = value;
  }
  insertAt(index, value) {
    if (index < 0 || index > this.length) throw new Error("index out of bounds");
    if (this.length >= this.capacity) this._resize(this.capacity * 2);
    for (let i = this.length; i > index; i--) this.data[i] = this.data[i - 1];
    this.data[index] = value;
    this.length++;
  }
  removeAt(index) {
    if (index < 0 || index >= this.length) throw new Error("index out of bounds");
    const value = this.data[index];
    for (let i = index; i < this.length - 1; i++) this.data[i] = this.data[i + 1];
    this.length--;
    return value;
  }
  indexOf(value) {
    for (let i = 0; i < this.length; i++) if (this.data[i] === value) return i;
    return -1;
  }
  includes(value) { return this.indexOf(value) !== -1; }
  slice(start, end) {
    const s = start || 0;
    const e = end !== undefined ? end : this.length;
    const result = [];
    for (let i = s; i < e && i < this.length; i++) result.push(this.data[i]);
    return result;
  }
  forEach(fn) { for (let i = 0; i < this.length; i++) fn(this.data[i], i); }
  map(fn) { const r = []; for (let i = 0; i < this.length; i++) r.push(fn(this.data[i], i)); return r; }
  filter(fn) { const r = []; for (let i = 0; i < this.length; i++) if (fn(this.data[i], i)) r.push(this.data[i]); return r; }
  reduce(fn, initial) { let acc = initial; for (let i = 0; i < this.length; i++) acc = fn(acc, this.data[i], i); return acc; }
  sort(comparator) {
    const cmp = comparator || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    for (let i = 0; i < this.length - 1; i++) for (let j = 0; j < this.length - i - 1; j++) { if (cmp(this.data[j], this.data[j + 1]) > 0) { [this.data[j], this.data[j + 1]] = [this.data[j + 1], this.data[j]]; } }
  }
  reverse() { for (let i = 0; i < Math.floor(this.length / 2); i++) { [this.data[i], this.data[this.length - 1 - i]] = [this.data[this.length - 1 - i], this.data[i]]; } }
  clear() { this.length = 0; }
  toArray() { return this.slice(0, this.length); }
  isEmpty() { return this.length === 0; }
}

class CircularBuffer {
  constructor(capacity) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
  push(value) {
    if (this.count === this.capacity) {
      this.buffer[this.tail] = value;
      this.tail = (this.tail + 1) % this.capacity;
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.buffer[this.tail] = value;
      this.tail = (this.tail + 1) % this.capacity;
      this.count++;
    }
  }
  pop() {
    if (this.count === 0) throw new Error("pop from empty");
    this.tail = (this.tail - 1 + this.capacity) % this.capacity;
    const value = this.buffer[this.tail];
    this.buffer[this.tail] = undefined;
    this.count--;
    return value;
  }
  shift() {
    if (this.count === 0) throw new Error("shift from empty");
    const value = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    return value;
  }
  peek() {
    if (this.count === 0) return undefined;
    return this.buffer[this.head];
  }
  peekLast() {
    if (this.count === 0) return undefined;
    return this.buffer[(this.tail - 1 + this.capacity) % this.capacity];
  }
  get(index) {
    if (index < 0 || index >= this.count) throw new Error("index out of bounds");
    return this.buffer[(this.head + index) % this.capacity];
  }
  size() { return this.count; }
  isFull() { return this.count === this.capacity; }
  isEmpty() { return this.count === 0; }
  toArray() {
    const result = [];
    for (let i = 0; i < this.count; i++) result.push(this.buffer[(this.head + i) % this.capacity]);
    return result;
  }
  clear() { this.head = 0; this.tail = 0; this.count = 0; }
}

class Deque {
  constructor() { this.front = []; this.back = []; }
  pushFront(value) { this.front.push(value); }
  pushBack(value) { this.back.push(value); }
  popFront() {
    if (this.front.length > 0) return this.front.pop();
    if (this.back.length === 0) throw new Error("pop from empty");
    this._rebalance();
    return this.front.pop();
  }
  popBack() {
    if (this.back.length > 0) return this.back.pop();
    if (this.front.length === 0) throw new Error("pop from empty");
    this._rebalance();
    return this.back.pop();
  }
  peekFront() {
    if (this.front.length > 0) return this.front[this.front.length - 1];
    if (this.back.length === 0) return undefined;
    return this.back[0];
  }
  peekBack() {
    if (this.back.length > 0) return this.back[this.back.length - 1];
    if (this.front.length === 0) return undefined;
    return this.front[0];
  }
  _rebalance() {
    const all = [...this.front.reverse(), ...this.back];
    const mid = Math.floor(all.length / 2);
    this.front = all.slice(0, mid).reverse();
    this.back = all.slice(mid);
  }
  size() { return this.front.length + this.back.length; }
  isEmpty() { return this.size() === 0; }
  toArray() { return [...this.front].reverse().concat(this.back); }
  clear() { this.front = []; this.back = []; }
}

console.log("=== GROWABLE ARRAY ===");
check("ga push and get", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); return ga.get(1); })(), 2);
check("ga pop", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); return ga.pop(); })(), 2);
check("ga auto resize", (() => { const ga = new GrowableArray(2); for (let i = 0; i < 20; i++) ga.push(i); return ga.length; })(), 20);
check("ga insertAt", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(3); ga.insertAt(1, 2); return ga.toArray(); })(), [1, 2, 3]);
check("ga removeAt", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); ga.removeAt(1); return ga.toArray(); })(), [1, 3]);
check("ga indexOf", (() => { const ga = new GrowableArray(); ga.push("a"); ga.push("b"); ga.push("c"); return ga.indexOf("b"); })(), 1);
check("ga map", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); return ga.map(x => x * 2); })(), [2, 4, 6]);
check("ga filter", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); ga.push(4); return ga.filter(x => x % 2 === 0); })(), [2, 4]);
check("ga reduce", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); return ga.reduce((s, v) => s + v, 0); })(), 6);
check("ga sort", (() => { const ga = new GrowableArray(); ga.push(3); ga.push(1); ga.push(2); ga.sort(); return ga.toArray(); })(), [1, 2, 3]);
check("ga reverse", (() => { const ga = new GrowableArray(); ga.push(1); ga.push(2); ga.push(3); ga.reverse(); return ga.toArray(); })(), [3, 2, 1]);
check("ga oob throws", raises(() => new GrowableArray().get(0)), true);

console.log("\n=== CIRCULAR BUFFER ===");
check("cb push and shift", (() => { const cb = new CircularBuffer(3); cb.push(1); cb.push(2); return cb.shift(); })(), 1);
check("cb overwrites oldest", (() => { const cb = new CircularBuffer(3); cb.push(1); cb.push(2); cb.push(3); cb.push(4); return cb.toArray(); })(), [2, 3, 4]);
check("cb pop from back", (() => { const cb = new CircularBuffer(3); cb.push(1); cb.push(2); cb.push(3); return cb.pop(); })(), 3);
check("cb peek", (() => { const cb = new CircularBuffer(3); cb.push(1); cb.push(2); return cb.peek(); })(), 1);
check("cb size", (() => { const cb = new CircularBuffer(5); cb.push(1); cb.push(2); cb.push(3); return cb.size(); })(), 3);
check("cb isFull", (() => { const cb = new CircularBuffer(2); cb.push(1); cb.push(2); return cb.isFull(); })(), true);
check("cb get by index", (() => { const cb = new CircularBuffer(5); cb.push(10); cb.push(20); cb.push(30); return cb.get(1); })(), 20);
check("cb empty shift throws", raises(() => new CircularBuffer(3).shift()), true);
check("cb invalid capacity throws", raises(() => new CircularBuffer(0)), true);

console.log("\n=== DEQUE ===");
check("deque pushFront popFront", (() => { const d = new Deque(); d.pushFront(1); d.pushFront(2); return d.popFront(); })(), 2);
check("deque pushBack popBack", (() => { const d = new Deque(); d.pushBack(1); d.pushBack(2); return d.popBack(); })(), 2);
check("deque mixed ops", (() => { const d = new Deque(); d.pushBack(2); d.pushFront(1); d.pushBack(3); return d.toArray(); })(), [1, 2, 3]);
check("deque peekFront", (() => { const d = new Deque(); d.pushBack(1); d.pushFront(0); return d.peekFront(); })(), 0);
check("deque peekBack", (() => { const d = new Deque(); d.pushBack(1); d.pushBack(2); return d.peekBack(); })(), 2);
check("deque size", (() => { const d = new Deque(); d.pushBack(1); d.pushFront(2); return d.size(); })(), 2);
check("deque empty pop throws", raises(() => new Deque().popFront()), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
