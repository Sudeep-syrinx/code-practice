const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TreapNode {
  constructor(key, value, priority) {
    this.key = key;
    this.value = value;
    this.priority = priority;
    this.left = null;
    this.right = null;
    this.size = 1;
  }
}

class Treap {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    this._nextPriority = 1;
  }

  _updateSize(node) {
    if (!node) return;
    node.size = 1 + this._size(node.left) + this._size(node.right);
  }

  _size(node) { return node ? node.size : 0; }

  _rotateRight(node) {
    const left = node.left;
    node.left = left.right;
    left.right = node;
    this._updateSize(node);
    this._updateSize(left);
    return left;
  }

  _rotateLeft(node) {
    const right = node.right;
    node.right = right.left;
    right.left = node;
    this._updateSize(node);
    this._updateSize(right);
    return right;
  }

  insert(key, value, priority) {
    const prio = priority !== undefined ? priority : this._nextPriority++;
    this.root = this._insert(this.root, key, value, prio);
  }

  _insert(node, key, value, priority) {
    if (!node) return new TreapNode(key, value, priority);
    const c = this.cmp(key, node.key);
    if (c === 0) {
      node.value = value;
      return node;
    }
    if (c < 0) {
      node.left = this._insert(node.left, key, value, priority);
      if (node.left.priority > node.priority) node = this._rotateRight(node);
    } else {
      node.right = this._insert(node.right, key, value, priority);
      if (node.right.priority > node.priority) node = this._rotateLeft(node);
    }
    this._updateSize(node);
    return node;
  }

  search(key) {
    let node = this.root;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) return node.value;
      node = c < 0 ? node.left : node.right;
    }
    return undefined;
  }

  delete(key) {
    const result = this._delete(this.root, key);
    this.root = result.node;
    return result.found;
  }

  _delete(node, key) {
    if (!node) return { node: null, found: false };
    const c = this.cmp(key, node.key);
    if (c < 0) {
      const result = this._delete(node.left, key);
      node.left = result.node;
      this._updateSize(node);
      return { node, found: result.found };
    }
    if (c > 0) {
      const result = this._delete(node.right, key);
      node.right = result.node;
      this._updateSize(node);
      return { node, found: result.found };
    }
    if (!node.left && !node.right) return { node: null, found: true };
    if (!node.left) return { node: node.right, found: true };
    if (!node.right) return { node: node.left, found: true };
    if (node.left.priority > node.right.priority) {
      node = this._rotateRight(node);
      const result = this._delete(node.right, key);
      node.right = result.node;
      this._updateSize(node);
      return { node, found: true };
    } else {
      node = this._rotateLeft(node);
      const result = this._delete(node.left, key);
      node.left = result.node;
      this._updateSize(node);
      return { node, found: true };
    }
  }

  kthSmallest(k) {
    if (k < 0 || k >= this._size(this.root)) return undefined;
    let node = this.root;
    let remaining = k;
    while (node) {
      const leftSize = this._size(node.left);
      if (remaining < leftSize) {
        node = node.left;
      } else if (remaining === leftSize) {
        return { key: node.key, value: node.value };
      } else {
        remaining -= leftSize + 1;
        node = node.right;
      }
    }
    return undefined;
  }

  rank(key) {
    let node = this.root;
    let r = 0;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) return r + this._size(node.left);
      if (c < 0) {
        node = node.left;
      } else {
        r += this._size(node.left) + 1;
        node = node.right;
      }
    }
    return -1;
  }

  split(key) {
    const result = this._split(this.root, key);
    return { left: result.left, right: result.right };
  }

  _split(node, key) {
    if (!node) return { left: null, right: null };
    if (this.cmp(key, node.key) <= 0) {
      const result = this._split(node.left, key);
      node.left = result.right;
      this._updateSize(node);
      return { left: result.left, right: node };
    } else {
      const result = this._split(node.right, key);
      node.right = result.left;
      this._updateSize(node);
      return { left: node, right: result.right };
    }
  }

  merge(otherRoot) {
    this.root = this._merge(this.root, otherRoot);
  }

  _merge(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (left.priority > right.priority) {
      left.right = this._merge(left.right, right);
      this._updateSize(left);
      return left;
    } else {
      right.left = this._merge(left, right.left);
      this._updateSize(right);
      return right;
    }
  }

  inorder() {
    const result = [];
    const stack = [];
    let node = this.root;
    while (stack.length > 0 || node) {
      while (node) { stack.push(node); node = node.left; }
      node = stack.pop();
      result.push({ key: node.key, value: node.value });
      node = node.right;
    }
    return result;
  }

  size() { return this._size(this.root); }

  isValidTreap() {
    const checkBST = (node, minKey, maxKey) => {
      if (!node) return true;
      if (minKey !== null && this.cmp(node.key, minKey) <= 0) return false;
      if (maxKey !== null && this.cmp(node.key, maxKey) >= 0) return false;
      return checkBST(node.left, minKey, node.key) && checkBST(node.right, node.key, maxKey);
    };
    const checkHeap = (node) => {
      if (!node) return true;
      if (node.left && node.left.priority > node.priority) return false;
      if (node.right && node.right.priority > node.priority) return false;
      return checkHeap(node.left) && checkHeap(node.right);
    };
    const checkSize = (node) => {
      if (!node) return true;
      const expected = 1 + this._size(node.left) + this._size(node.right);
      if (node.size !== expected) return false;
      return checkSize(node.left) && checkSize(node.right);
    };
    return checkBST(this.root, null, null) && checkHeap(this.root) && checkSize(this.root);
  }
}

console.log("=== INSERT AND SEARCH ===");
check("insert and search", (() => {
  const t = new Treap();
  t.insert(10, "ten");
  return t.search(10);
})(), "ten");
check("search miss", new Treap().search(99), undefined);
check("overwrite value", (() => {
  const t = new Treap();
  t.insert(5, "old"); t.insert(5, "new");
  return t.search(5);
})(), "new");
check("size tracking", (() => {
  const t = new Treap();
  t.insert(1, "a"); t.insert(2, "b"); t.insert(1, "c");
  return t.size();
})(), 2);
check("multiple inserts searchable", (() => {
  const t = new Treap();
  for (let i = 0; i < 50; i++) t.insert(i, "v" + i);
  let ok = true;
  for (let i = 0; i < 50; i++) if (t.search(i) !== "v" + i) ok = false;
  return ok;
})(), true);

console.log("\n=== DELETE ===");
check("delete existing", (() => {
  const t = new Treap();
  t.insert(5, "a");
  return t.delete(5);
})(), true);
check("delete missing", (() => new Treap().delete(99))(), false);
check("delete reduces size", (() => {
  const t = new Treap();
  t.insert(1, "a"); t.insert(2, "b");
  t.delete(1);
  return t.size();
})(), 1);
check("deleted not searchable", (() => {
  const t = new Treap();
  t.insert(5, "a"); t.delete(5);
  return t.search(5);
})(), undefined);
check("delete maintains order", (() => {
  const t = new Treap();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, k));
  t.delete(5); t.delete(1);
  return t.inorder().map(n => n.key);
})(), [3, 4, 7, 8, 9]);

console.log("\n=== ORDER STATISTICS ===");
check("kth smallest 0", (() => {
  const t = new Treap();
  [5, 3, 8, 1, 4].forEach(k => t.insert(k, k));
  return t.kthSmallest(0).key;
})(), 1);
check("kth smallest last", (() => {
  const t = new Treap();
  [5, 3, 8, 1, 4].forEach(k => t.insert(k, k));
  return t.kthSmallest(4).key;
})(), 8);
check("kth smallest middle", (() => {
  const t = new Treap();
  [5, 3, 8, 1, 4].forEach(k => t.insert(k, k));
  return t.kthSmallest(2).key;
})(), 4);
check("kth out of bounds", (() => {
  const t = new Treap();
  t.insert(1, "a");
  return t.kthSmallest(5);
})(), undefined);
check("rank of existing key", (() => {
  const t = new Treap();
  [5, 3, 8, 1, 4].forEach(k => t.insert(k, k));
  return t.rank(4);
})(), 2);
check("rank of missing key", (() => {
  const t = new Treap();
  t.insert(1, "a");
  return t.rank(99);
})(), -1);

console.log("\n=== SPLIT AND MERGE ===");
check("split divides correctly", (() => {
  const t = new Treap();
  [1, 2, 3, 4, 5].forEach(k => t.insert(k, k));
  const { left, right } = t.split(3);
  const leftTree = new Treap(); leftTree.root = left;
  const rightTree = new Treap(); rightTree.root = right;
  return leftTree.size() === 2 && rightTree.size() === 3;
})(), true);
check("merge combines sizes", (() => {
  const t1 = new Treap();
  [1, 2, 3].forEach(k => t1.insert(k, k));
  const t2 = new Treap();
  [4, 5, 6].forEach(k => t2.insert(k, k));
  t1.merge(t2.root);
  return t1.size();
})(), 6);
check("split then merge roundtrip", (() => {
  const t = new Treap();
  [1, 2, 3, 4, 5].forEach(k => t.insert(k, k));
  const { left, right } = t.split(3);
  const merged = new Treap();
  merged.root = merged._merge(left, right);
  return merged.inorder().map(n => n.key);
})(), [1, 2, 3, 4, 5]);

console.log("\n=== TREAP PROPERTIES ===");
check("valid after sequential inserts", (() => {
  const t = new Treap();
  for (let i = 0; i < 100; i++) t.insert(i, i);
  return t.isValidTreap();
})(), true);
check("valid after reverse inserts", (() => {
  const t = new Treap();
  for (let i = 100; i >= 0; i--) t.insert(i, i);
  return t.isValidTreap();
})(), true);
check("valid after random inserts", (() => {
  const t = new Treap();
  const vals = [23, 4, 56, 12, 89, 1, 45, 67, 34, 78, 2, 90, 11, 33, 55, 77, 99, 6, 44, 66];
  vals.forEach(v => t.insert(v, v));
  return t.isValidTreap();
})(), true);
check("valid after deletes", (() => {
  const t = new Treap();
  for (let i = 0; i < 30; i++) t.insert(i, i);
  [5, 10, 15, 20, 25, 0, 29].forEach(k => t.delete(k));
  return t.isValidTreap();
})(), true);
check("valid after split merge", (() => {
  const t = new Treap();
  for (let i = 0; i < 20; i++) t.insert(i, i);
  const { left, right } = t.split(10);
  const merged = new Treap();
  merged.root = merged._merge(left, right);
  return merged.isValidTreap();
})(), true);
check("inorder always sorted", (() => {
  const t = new Treap();
  const vals = [50, 30, 70, 10, 40, 60, 80, 20, 35, 45];
  vals.forEach(v => t.insert(v, v));
  const keys = t.inorder().map(n => n.key);
  for (let i = 1; i < keys.length; i++) if (keys[i] <= keys[i - 1]) return false;
  return true;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
