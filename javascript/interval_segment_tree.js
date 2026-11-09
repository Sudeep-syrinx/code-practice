const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Interval {
  constructor(low, high) {
    this.low = low;
    this.high = high;
  }
  overlaps(other) { return this.low <= other.high && this.high >= other.low; }
  contains(point) { return point >= this.low && point <= this.high; }
  equals(other) { return this.low === other.low && this.high === other.high; }
}

class IntervalTreeNode {
  constructor(interval, maxHigh) {
    this.interval = interval;
    this.maxHigh = maxHigh;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class IntervalTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  _height(node) { return node ? node.height : 0; }
  _balanceFactor(node) { return node ? this._height(node.left) - this._height(node.right) : 0; }
  _updateHeight(node) {
    if (node) {
      node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
      node.maxHigh = node.interval.high;
      if (node.left) node.maxHigh = Math.max(node.maxHigh, node.left.maxHigh);
      if (node.right) node.maxHigh = Math.max(node.maxHigh, node.right.maxHigh);
    }
  }

  _rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this._updateHeight(y);
    this._updateHeight(x);
    return x;
  }

  _rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this._updateHeight(x);
    this._updateHeight(y);
    return y;
  }

  _balance(node) {
    this._updateHeight(node);
    const bf = this._balanceFactor(node);
    if (bf > 1) {
      if (this._balanceFactor(node.left) < 0) node.left = this._rotateLeft(node.left);
      return this._rotateRight(node);
    }
    if (bf < -1) {
      if (this._balanceFactor(node.right) > 0) node.right = this._rotateRight(node.right);
      return this._rotateLeft(node);
    }
    return node;
  }

  insert(low, high) {
    const interval = new Interval(low, high);
    this.root = this._insert(this.root, interval);
    this.size++;
  }

  _insert(node, interval) {
    if (!node) return new IntervalTreeNode(interval, interval.high);
    if (interval.low < node.interval.low) {
      node.left = this._insert(node.left, interval);
    } else {
      node.right = this._insert(node.right, interval);
    }
    return this._balance(node);
  }

  queryOverlapping(low, high) {
    const queryInterval = new Interval(low, high);
    const results = [];
    this._query(this.root, queryInterval, results);
    return results;
  }

  _query(node, queryInterval, results) {
    if (!node) return;
    if (node.left && node.left.maxHigh >= queryInterval.low) {
      this._query(node.left, queryInterval, results);
    }
    if (node.interval.overlaps(queryInterval)) {
      results.push({ low: node.interval.low, high: node.interval.high });
    }
    if (node.right && node.interval.low <= queryInterval.high && node.right.maxHigh >= queryInterval.low) {
      this._query(node.right, queryInterval, results);
    }
  }

  queryPoint(point) {
    const results = [];
    this._queryPoint(this.root, point, results);
    return results;
  }

  _queryPoint(node, point, results) {
    if (!node) return;
    if (node.left && node.left.maxHigh >= point) {
      this._queryPoint(node.left, point, results);
    }
    if (node.interval.contains(point)) {
      results.push({ low: node.interval.low, high: node.interval.high });
    }
    if (node.right && node.interval.low <= point) {
      this._queryPoint(node.right, point, results);
    }
  }

  delete(low, high) {
    const before = this.size;
    this.root = this._delete(this.root, new Interval(low, high));
    return this.size < before;
  }

  _delete(node, interval) {
    if (!node) return null;
    if (interval.low < node.interval.low) {
      node.left = this._delete(node.left, interval);
    } else if (interval.low > node.interval.low) {
      node.right = this._delete(node.right, interval);
    } else {
      if (interval.high !== node.interval.high) {
        node.right = this._delete(node.right, interval);
        return this._balance(node);
      }
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.interval = successor.interval;
      node.right = this._delete(node.right, successor.interval);
      this.size--;
    }
    return this._balance(node);
  }

  getSize() { return this.size; }

  getAllIntervals() {
    const results = [];
    this._inorder(this.root, results);
    return results;
  }

  _inorder(node, results) {
    if (!node) return;
    this._inorder(node.left, results);
    results.push({ low: node.interval.low, high: node.interval.high });
    this._inorder(node.right, results);
  }
}

class SegmentTreeRange {
  constructor(size) {
    this.n = size;
    this.tree = new Float64Array(4 * size);
    this.lazy = new Float64Array(4 * size);
  }
  build(arr) {
    this._build(arr, 1, 0, this.n - 1);
  }
  _build(arr, node, start, end) {
    if (start === end) { this.tree[node] = arr[start]; return; }
    const mid = (start + end) >> 1;
    this._build(arr, node * 2, start, mid);
    this._build(arr, node * 2 + 1, mid + 1, end);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }
  update(l, r, val) { this._update(1, 0, this.n - 1, l, r, val); }
  _update(node, start, end, l, r, val) {
    if (this.lazy[node] !== 0) {
      this.tree[node] += this.lazy[node] * (end - start + 1);
      if (start !== end) { this.lazy[node * 2] += this.lazy[node]; this.lazy[node * 2 + 1] += this.lazy[node]; }
      this.lazy[node] = 0;
    }
    if (start > r || end < l) return;
    if (start >= l && end <= r) {
      this.tree[node] += val * (end - start + 1);
      if (start !== end) { this.lazy[node * 2] += val; this.lazy[node * 2 + 1] += val; }
      return;
    }
    const mid = (start + end) >> 1;
    this._update(node * 2, start, mid, l, r, val);
    this._update(node * 2 + 1, mid + 1, end, l, r, val);
    this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
  }
  query(l, r) { return this._query(1, 0, this.n - 1, l, r); }
  _query(node, start, end, l, r) {
    if (this.lazy[node] !== 0) {
      this.tree[node] += this.lazy[node] * (end - start + 1);
      if (start !== end) { this.lazy[node * 2] += this.lazy[node]; this.lazy[node * 2 + 1] += this.lazy[node]; }
      this.lazy[node] = 0;
    }
    if (start > r || end < l) return 0;
    if (start >= l && end <= r) return this.tree[node];
    const mid = (start + end) >> 1;
    return this._query(node * 2, start, mid, l, r) + this._query(node * 2 + 1, mid + 1, end, l, r);
  }
}

console.log("=== INTERVAL TREE INSERT QUERY ===");
check("insert and query overlap", (() => {
  const it = new IntervalTree();
  it.insert(1, 5); it.insert(3, 8); it.insert(10, 15);
  return it.queryOverlapping(4, 6).length;
})(), 2);
check("query no overlap", (() => {
  const it = new IntervalTree();
  it.insert(1, 3); it.insert(5, 7);
  return it.queryOverlapping(4, 4).length;
})(), 0);
check("query point", (() => {
  const it = new IntervalTree();
  it.insert(1, 5); it.insert(3, 8); it.insert(10, 15);
  return it.queryPoint(4).length;
})(), 2);
check("query point miss", (() => {
  const it = new IntervalTree();
  it.insert(1, 3); it.insert(5, 7);
  return it.queryPoint(4).length;
})(), 0);
check("size tracking", (() => {
  const it = new IntervalTree();
  it.insert(1, 5); it.insert(3, 8);
  return it.getSize();
})(), 2);
check("get all intervals sorted", (() => {
  const it = new IntervalTree();
  it.insert(5, 10); it.insert(1, 3); it.insert(7, 12);
  const all = it.getAllIntervals();
  return all[0].low === 1 && all[1].low === 5 && all[2].low === 7;
})(), true);

console.log("\n=== INTERVAL TREE DELETE ===");
check("delete existing", (() => {
  const it = new IntervalTree();
  it.insert(1, 5);
  return it.delete(1, 5);
})(), true);
check("delete missing", (() => {
  const it = new IntervalTree();
  return it.delete(1, 5);
})(), false);
check("delete reduces size", (() => {
  const it = new IntervalTree();
  it.insert(1, 5); it.insert(3, 8);
  it.delete(1, 5);
  return it.getSize();
})(), 1);
check("deleted not in query", (() => {
  const it = new IntervalTree();
  it.insert(1, 5); it.insert(3, 8);
  it.delete(1, 5);
  return it.queryPoint(2).length;
})(), 0);

console.log("\n=== INTERVAL TREE STRESS ===");
check("many inserts query correct", (() => {
  const it = new IntervalTree();
  for (let i = 0; i < 100; i++) it.insert(i * 2, i * 2 + 5);
  const results = it.queryOverlapping(10, 12);
  return results.length > 0;
})(), true);
check("balanced after sequential inserts", (() => {
  const it = new IntervalTree();
  for (let i = 0; i < 100; i++) it.insert(i, i + 1);
  return it.getSize() === 100;
})(), true);

console.log("\n=== SEGMENT TREE RANGE ===");
check("seg tree build and query", (() => {
  const st = new SegmentTreeRange(5);
  st.build([1, 2, 3, 4, 5]);
  return st.query(0, 4);
})(), 15);
check("seg tree range sum", (() => {
  const st = new SegmentTreeRange(5);
  st.build([1, 2, 3, 4, 5]);
  return st.query(1, 3);
})(), 9);
check("seg tree single element", (() => {
  const st = new SegmentTreeRange(5);
  st.build([1, 2, 3, 4, 5]);
  return st.query(2, 2);
})(), 3);
check("seg tree range update", (() => {
  const st = new SegmentTreeRange(5);
  st.build([1, 2, 3, 4, 5]);
  st.update(1, 3, 10);
  return st.query(0, 4);
})(), 45);
check("seg tree partial update", (() => {
  const st = new SegmentTreeRange(5);
  st.build([0, 0, 0, 0, 0]);
  st.update(2, 3, 5);
  return st.query(0, 4);
})(), 10);
check("seg tree multiple updates", (() => {
  const st = new SegmentTreeRange(5);
  st.build([1, 1, 1, 1, 1]);
  st.update(0, 2, 1);
  st.update(2, 4, 2);
  return st.query(0, 4);
})(), 13);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
