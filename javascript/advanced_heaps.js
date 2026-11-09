const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MinHeap {
  constructor(comparator) {
    this.data = [];
    this.cmp = comparator || ((a, b) => a - b);
  }
  size() { return this.data.length; }
  peek() { return this.data[0]; }
  push(val) {
    this.data.push(val);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.cmp(this.data[left], this.data[smallest]) < 0) smallest = left;
      if (right < n && this.cmp(this.data[right], this.data[smallest]) < 0) smallest = right;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
  toArray() { return [...this.data]; }
}

class MaxHeap {
  constructor(comparator) {
    this.minHeap = new MinHeap(comparator ? (a, b) => comparator(b, a) : (a, b) => b - a);
  }
  size() { return this.minHeap.size(); }
  peek() { return this.minHeap.peek(); }
  push(val) { this.minHeap.push(val); }
  pop() { return this.minHeap.pop(); }
  toArray() { return this.minHeap.toArray(); }
}

class PriorityQueue {
  constructor(comparator) {
    this.heap = new MinHeap((a, b) => comparator(a.priority, b.priority));
  }
  enqueue(item, priority) {
    this.heap.push({ item, priority });
  }
  dequeue() {
    const entry = this.heap.pop();
    return entry ? entry.item : undefined;
  }
  peek() {
    const entry = this.heap.peek();
    return entry ? entry.item : undefined;
  }
  size() { return this.heap.size(); }
  isEmpty() { return this.heap.size() === 0; }
}

class MedianFinder {
  constructor() {
    this.lo = new MaxHeap();
    this.hi = new MinHeap();
  }
  add(num) {
    this.lo.push(num);
    this.hi.push(this.lo.pop());
    if (this.hi.size() > this.lo.size()) {
      this.lo.push(this.hi.pop());
    }
  }
  median() {
    if (this.lo.size() === 0) return undefined;
    if (this.lo.size() > this.hi.size()) return this.lo.peek();
    return (this.lo.peek() + this.hi.peek()) / 2;
  }
  size() { return this.lo.size() + this.hi.size(); }
}

function heapSort(arr, comparator) {
  const h = new MinHeap(comparator);
  for (const v of arr) h.push(v);
  const out = [];
  while (h.size() > 0) out.push(h.pop());
  return out;
}

function topK(arr, k, comparator) {
  if (k <= 0) return [];
  if (k >= arr.length) return heapSort(arr, comparator);
  const h = new MaxHeap(comparator);
  for (const v of arr) {
    h.push(v);
    if (h.size() > k) h.pop();
  }
  return heapSort(h.toArray(), comparator);
}

check("min heap push pop", (() => {
  const h = new MinHeap();
  h.push(3); h.push(1); h.push(2);
  return [h.pop(), h.pop(), h.pop()];
})(), [1, 2, 3]);
check("min heap peek", (() => {
  const h = new MinHeap();
  h.push(5); h.push(3);
  return h.peek();
})(), 3);
check("min heap empty pop", new MinHeap().pop(), undefined);
check("min heap size", (() => {
  const h = new MinHeap();
  h.push(1); h.push(2);
  return h.size();
})(), 2);
check("max heap push pop", (() => {
  const h = new MaxHeap();
  h.push(1); h.push(3); h.push(2);
  return [h.pop(), h.pop(), h.pop()];
})(), [3, 2, 1]);
check("pq enqueue dequeue", (() => {
  const pq = new PriorityQueue((a, b) => a - b);
  pq.enqueue("c", 3); pq.enqueue("a", 1); pq.enqueue("b", 2);
  return [pq.dequeue(), pq.dequeue(), pq.dequeue()];
})(), ["a", "b", "c"]);
check("pq peek", (() => {
  const pq = new PriorityQueue((a, b) => a - b);
  pq.enqueue("x", 5); pq.enqueue("y", 2);
  return pq.peek();
})(), "y");
check("pq empty", new PriorityQueue((a, b) => a - b).isEmpty(), true);
check("median odd", (() => {
  const m = new MedianFinder();
  m.add(1); m.add(3); m.add(2);
  return m.median();
})(), 2);
check("median even", (() => {
  const m = new MedianFinder();
  m.add(1); m.add(2); m.add(3); m.add(4);
  return m.median();
})(), 2.5);
check("median single", (() => {
  const m = new MedianFinder();
  m.add(7);
  return m.median();
})(), 7);
check("median empty", new MedianFinder().median(), undefined);
check("heap sort", heapSort([5, 3, 8, 1, 2]), [1, 2, 3, 5, 8]);
check("heap sort empty", heapSort([]), []);
check("top k basic", topK([5, 3, 8, 1, 2], 3), [1, 2, 3]);
check("top k all", topK([3, 1, 2], 5), [1, 2, 3]);
check("top k zero", topK([1, 2, 3], 0), []);

let seed = 42;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }
let sortOk = true;
for (let t = 0; t < 200; t++) {
  const len = nextRandom(30);
  const arr = Array.from({ length: len }, () => nextRandom(100));
  const sorted = heapSort(arr);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] < sorted[i - 1]) { sortOk = false; break; }
  }
  if (!sortOk) break;
}
check("200 heap sorts valid", sortOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
