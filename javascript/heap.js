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

class Heap {
  constructor(compare) {
    this.compare = compare || ((a, b) => a - b);
    this.data = [];
  }

  size() {
    return this.data.length;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  peek() {
    if (this.data.length === 0) {
      throw new Error("heap is empty");
    }
    return this.data[0];
  }

  swap(i, j) {
    const tmp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = tmp;
  }

  up(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.data[i], this.data[parent]) < 0) {
        this.swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  down(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.compare(this.data[right], this.data[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === i) {
        break;
      }
      this.swap(i, smallest);
      i = smallest;
    }
  }

  push(value) {
    this.data.push(value);
    this.up(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) {
      throw new Error("heap is empty");
    }
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.down(0);
    }
    return top;
  }

  toSortedArray() {
    const copy = new Heap(this.compare);
    copy.data = this.data.slice();
    const out = [];
    while (!copy.isEmpty()) {
      out.push(copy.pop());
    }
    return out;
  }
}

function heapSort(arr, compare) {
  const h = new Heap(compare);
  for (const x of arr) {
    h.push(x);
  }
  const out = [];
  while (!h.isEmpty()) {
    out.push(h.pop());
  }
  return out;
}

function checkK(k) {
  if (!Number.isInteger(k) || k < 0) {
    throw new Error("k must be a non-negative integer");
  }
}

function kLargest(arr, k) {
  checkK(k);
  if (k === 0) {
    return [];
  }
  const h = new Heap((a, b) => a - b);
  for (const x of arr) {
    if (h.size() < k) {
      h.push(x);
    } else if (x > h.peek()) {
      h.pop();
      h.push(x);
    }
  }
  return h.toSortedArray().reverse();
}

function kSmallest(arr, k) {
  checkK(k);
  if (k === 0) {
    return [];
  }
  const h = new Heap((a, b) => b - a);
  for (const x of arr) {
    if (h.size() < k) {
      h.push(x);
    } else if (x < h.peek()) {
      h.pop();
      h.push(x);
    }
  }
  return h.toSortedArray().reverse();
}

function mergeSorted(arrays) {
  const h = new Heap((x, y) => x.v - y.v);
  for (let a = 0; a < arrays.length; a++) {
    if (arrays[a].length > 0) {
      h.push({ v: arrays[a][0], a: a, i: 0 });
    }
  }
  const out = [];
  while (!h.isEmpty()) {
    const top = h.pop();
    out.push(top.v);
    const next = top.i + 1;
    if (next < arrays[top.a].length) {
      h.push({ v: arrays[top.a][next], a: top.a, i: next });
    }
  }
  return out;
}

class RunningMedian {
  constructor() {
    this.low = new Heap((a, b) => b - a);
    this.high = new Heap((a, b) => a - b);
  }

  add(x) {
    if (this.low.isEmpty() || x <= this.low.peek()) {
      this.low.push(x);
    } else {
      this.high.push(x);
    }
    if (this.low.size() > this.high.size() + 1) {
      this.high.push(this.low.pop());
    } else if (this.high.size() > this.low.size()) {
      this.low.push(this.high.pop());
    }
  }

  median() {
    if (this.low.isEmpty()) {
      throw new Error("no numbers yet");
    }
    if (this.low.size() > this.high.size()) {
      return this.low.peek();
    }
    return (this.low.peek() + this.high.peek()) / 2;
  }

  count() {
    return this.low.size() + this.high.size();
  }
}

class TaskQueue {
  constructor() {
    this.heap = new Heap((a, b) => a.priority - b.priority || a.order - b.order);
    this.counter = 0;
  }

  add(name, priority) {
    if (typeof priority !== "number" || Number.isNaN(priority)) {
      throw new Error("priority must be a number");
    }
    this.heap.push({ name: name, priority: priority, order: this.counter++ });
  }

  next() {
    if (this.heap.isEmpty()) {
      throw new Error("no tasks");
    }
    return this.heap.pop().name;
  }

  size() {
    return this.heap.size();
  }
}

const h = new Heap();
check("starts empty", h.isEmpty(), true);
check("empty pop raises", raises(() => h.pop()), true);
check("empty peek raises", raises(() => h.peek()), true);
for (const x of [5, 3, 8, 1, 9, 2]) {
  h.push(x);
}
check("size", h.size(), 6);
check("peek is smallest", h.peek(), 1);
const popped = [];
while (!h.isEmpty()) {
  popped.push(h.pop());
}
check("pop order", popped, [1, 2, 3, 5, 8, 9]);

const maxHeap = new Heap((a, b) => b - a);
for (const x of [5, 3, 8]) {
  maxHeap.push(x);
}
check("max heap", maxHeap.pop(), 8);
const byLength = new Heap((a, b) => a.length - b.length);
for (const w of ["ccc", "a", "bb"]) {
  byLength.push(w);
}
check("custom compare", [byLength.pop(), byLength.pop(), byLength.pop()], ["a", "bb", "ccc"]);
const dup = new Heap();
for (const x of [2, 2, 1, 1]) {
  dup.push(x);
}
check("duplicates", dup.toSortedArray(), [1, 1, 2, 2]);
check("sorted array keeps heap", dup.size(), 4);

console.log();
const sample = [5, 2, 9, 1, 5, 6];
check("heap sort", heapSort(sample), [1, 2, 5, 5, 6, 9]);
check("heap sort keeps input", sample, [5, 2, 9, 1, 5, 6]);
check("heap sort empty", heapSort([]), []);
check("heap sort single", heapSort([4]), [4]);
check("heap sort descending", heapSort([1, 3, 2], (a, b) => b - a), [3, 2, 1]);
check("k largest", kLargest(sample, 3), [9, 6, 5]);
check("k smallest", kSmallest(sample, 3), [1, 2, 5]);
check("k zero largest", kLargest(sample, 0), []);
check("k zero smallest", kSmallest(sample, 0), []);
check("k above length largest", kLargest([3, 1], 5), [3, 1]);
check("k above length smallest", kSmallest([3, 1], 5), [1, 3]);
check("k negative raises", raises(() => kLargest(sample, -1)), true);
check("k decimal raises", raises(() => kSmallest(sample, 1.5)), true);

console.log();
check("merge three", mergeSorted([[1, 4, 7], [2, 5, 8], [3, 6, 9]]), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
check("merge with empties", mergeSorted([[], [1], []]), [1]);
check("merge nothing", mergeSorted([]), []);
check("merge uneven", mergeSorted([[1, 2, 3, 4], [0]]), [0, 1, 2, 3, 4]);
check("merge duplicates", mergeSorted([[1, 1], [1]]), [1, 1, 1]);

console.log();
const med = new RunningMedian();
check("median empty raises", raises(() => med.median()), true);
med.add(5);
check("median one", med.median(), 5);
med.add(15);
check("median two", med.median(), 10);
med.add(1);
check("median three", med.median(), 5);
med.add(3);
check("median four", med.median(), 4);
check("median count", med.count(), 4);

const tasks = new TaskQueue();
tasks.add("write", 2);
tasks.add("test", 1);
tasks.add("deploy", 3);
tasks.add("lint", 1);
check("task count", tasks.size(), 4);
check("task first", tasks.next(), "test");
check("task second", tasks.next(), "lint");
check("task third", tasks.next(), "write");
check("task fourth", tasks.next(), "deploy");
check("task empty raises", raises(() => tasks.next()), true);
check("task bad priority", raises(() => tasks.add("x", "high")), true);

console.log();
let seed = 6060;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomArray(maxLen) {
  const arr = [];
  const len = nextRandom(maxLen);
  for (let i = 0; i < len; i++) {
    arr.push(nextRandom(200) - 100);
  }
  return arr;
}
function naiveMedian(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
let sortOk = true;
let largeOk = true;
let smallOk = true;
let mergeOk = true;
let medianOk = true;
for (let n = 0; n < 200; n++) {
  const arr = randomArray(40);
  const sorted = arr.slice().sort((a, b) => a - b);
  if (JSON.stringify(heapSort(arr)) !== JSON.stringify(sorted)) {
    sortOk = false;
  }
  const k = nextRandom(10);
  if (JSON.stringify(kLargest(arr, k)) !== JSON.stringify(sorted.slice().reverse().slice(0, k))) {
    largeOk = false;
  }
  if (JSON.stringify(kSmallest(arr, k)) !== JSON.stringify(sorted.slice(0, k))) {
    smallOk = false;
  }
  const parts = [];
  const partCount = nextRandom(6);
  const all = [];
  for (let p = 0; p < partCount; p++) {
    const part = randomArray(10).sort((a, b) => a - b);
    parts.push(part);
    for (const x of part) {
      all.push(x);
    }
  }
  all.sort((a, b) => a - b);
  if (JSON.stringify(mergeSorted(parts)) !== JSON.stringify(all)) {
    mergeOk = false;
  }
  const rm = new RunningMedian();
  const seen = [];
  for (const x of arr) {
    rm.add(x);
    seen.push(x);
    if (rm.median() !== naiveMedian(seen)) {
      medianOk = false;
    }
  }
}
check("200 random heap sorts", sortOk, true);
check("200 random k largest", largeOk, true);
check("200 random k smallest", smallOk, true);
check("200 random merges", mergeOk, true);
check("200 random medians", medianOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
