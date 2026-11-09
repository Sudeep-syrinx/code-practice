const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class AVLNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
    this.size = 1;
  }
}

class AVLTree {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    this._size = 0;
  }

  _height(node) { return node ? node.height : 0; }
  _sizeOf(node) { return node ? node.size : 0; }
  _balanceFactor(node) { return node ? this._height(node.left) - this._height(node.right) : 0; }

  _update(node) {
    if (!node) return;
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    node.size = 1 + this._sizeOf(node.left) + this._sizeOf(node.right);
  }

  _rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this._update(y);
    this._update(x);
    return x;
  }

  _rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this._update(x);
    this._update(y);
    return y;
  }

  _balance(node) {
    this._update(node);
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

  insert(key, value) {
    const result = this._insert(this.root, key, value);
    this.root = result.node;
    if (result.inserted) this._size++;
  }

  _insert(node, key, value) {
    if (!node) return { node: new AVLNode(key, value), inserted: true };
    const c = this.cmp(key, node.key);
    let inserted = false;
    if (c < 0) {
      const r = this._insert(node.left, key, value);
      node.left = r.node;
      inserted = r.inserted;
    } else if (c > 0) {
      const r = this._insert(node.right, key, value);
      node.right = r.node;
      inserted = r.inserted;
    } else {
      node.value = value;
      return { node, inserted: false };
    }
    return { node: this._balance(node), inserted };
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
    if (result.deleted) this._size--;
    return result.deleted;
  }

  _delete(node, key) {
    if (!node) return { node: null, deleted: false };
    const c = this.cmp(key, node.key);
    let deleted = false;
    if (c < 0) {
      const r = this._delete(node.left, key);
      node.left = r.node;
      deleted = r.deleted;
    } else if (c > 0) {
      const r = this._delete(node.right, key);
      node.right = r.node;
      deleted = r.deleted;
    } else {
      deleted = true;
      if (!node.left) return { node: node.right, deleted: true };
      if (!node.right) return { node: node.left, deleted: true };
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.key = successor.key;
      node.value = successor.value;
      const r = this._delete(node.right, successor.key);
      node.right = r.node;
    }
    return { node: this._balance(node), deleted };
  }

  min() {
    if (!this.root) return undefined;
    let node = this.root;
    while (node.left) node = node.left;
    return { key: node.key, value: node.value };
  }

  max() {
    if (!this.root) return undefined;
    let node = this.root;
    while (node.right) node = node.right;
    return { key: node.key, value: node.value };
  }

  kthSmallest(k) {
    if (k < 0 || k >= this._size) return undefined;
    let node = this.root;
    let remaining = k;
    while (node) {
      const leftSize = this._sizeOf(node.left);
      if (remaining < leftSize) { node = node.left; }
      else if (remaining === leftSize) { return { key: node.key, value: node.value }; }
      else { remaining -= leftSize + 1; node = node.right; }
    }
    return undefined;
  }

  rank(key) {
    let node = this.root;
    let r = 0;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) return r + this._sizeOf(node.left);
      if (c < 0) { node = node.left; }
      else { r += this._sizeOf(node.left) + 1; node = node.right; }
    }
    return -1;
  }

  rangeQuery(low, high) {
    const result = [];
    this._rangeQuery(this.root, low, high, result);
    return result;
  }

  _rangeQuery(node, low, high, result) {
    if (!node) return;
    if (this.cmp(low, node.key) < 0) this._rangeQuery(node.left, low, high, result);
    if (this.cmp(low, node.key) <= 0 && this.cmp(node.key, high) <= 0) {
      result.push({ key: node.key, value: node.value });
    }
    if (this.cmp(node.key, high) < 0) this._rangeQuery(node.right, low, high, result);
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

  size() { return this._size; }

  isValidAVL() {
    const check = (node) => {
      if (!node) return { valid: true, height: 0, size: 0 };
      const left = check(node.left);
      const right = check(node.right);
      if (!left.valid || !right.valid) return { valid: false, height: 0, size: 0 };
      const h = 1 + Math.max(left.height, right.height);
      const s = 1 + left.size + right.size;
      if (Math.abs(left.height - right.height) > 1) return { valid: false, height: h, size: s };
      if (node.height !== h) return { valid: false, height: h, size: s };
      if (node.size !== s) return { valid: false, height: h, size: s };
      if (node.left && this.cmp(node.left.key, node.key) >= 0) return { valid: false, height: h, size: s };
      if (node.right && this.cmp(node.right.key, node.key) <= 0) return { valid: false, height: h, size: s };
      return { valid: true, height: h, size: s };
    };
    return check(this.root).valid;
  }
}

console.log("=== INSERT AND SEARCH ===");
check("insert and search", (() => { const t = new AVLTree(); t.insert(10, "ten"); return t.search(10); })(), "ten");
check("search miss", new AVLTree().search(99), undefined);
check("overwrite value", (() => { const t = new AVLTree(); t.insert(5, "old"); t.insert(5, "new"); return t.search(5); })(), "new");
check("size tracking", (() => { const t = new AVLTree(); t.insert(1, "a"); t.insert(2, "b"); t.insert(1, "c"); return t.size(); })(), 2);
check("multiple inserts", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 50; i++) t.insert(i, "v" + i);
  let ok = true;
  for (let i = 0; i < 50; i++) if (t.search(i) !== "v" + i) ok = false;
  return ok;
})(), true);

console.log("\n=== DELETE ===");
check("delete existing", (() => { const t = new AVLTree(); t.insert(5, "a"); return t.delete(5); })(), true);
check("delete missing", (() => new AVLTree().delete(99))(), false);
check("delete reduces size", (() => { const t = new AVLTree(); t.insert(1, "a"); t.insert(2, "b"); t.delete(1); return t.size(); })(), 1);
check("deleted not searchable", (() => { const t = new AVLTree(); t.insert(5, "a"); t.delete(5); return t.search(5); })(), undefined);
check("delete root only", (() => { const t = new AVLTree(); t.insert(5, "a"); t.delete(5); return t.size() === 0; })(), true);
check("delete maintains order", (() => {
  const t = new AVLTree();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, k));
  t.delete(5); t.delete(1);
  return t.inorder().map(n => n.key);
})(), [3, 4, 7, 8, 9]);

console.log("\n=== ORDER STATISTICS ===");
check("min", (() => { const t = new AVLTree(); [5, 3, 8].forEach(k => t.insert(k, k)); return t.min().key; })(), 3);
check("max", (() => { const t = new AVLTree(); [5, 3, 8].forEach(k => t.insert(k, k)); return t.max().key; })(), 8);
check("min empty", new AVLTree().min(), undefined);
check("kth smallest", (() => { const t = new AVLTree(); [5, 3, 8, 1, 4].forEach(k => t.insert(k, k)); return t.kthSmallest(2).key; })(), 4);
check("kth out of bounds", (() => { const t = new AVLTree(); t.insert(1, "a"); return t.kthSmallest(5); })(), undefined);
check("rank", (() => { const t = new AVLTree(); [5, 3, 8, 1, 4].forEach(k => t.insert(k, k)); return t.rank(4); })(), 2);
check("rank missing", (() => { const t = new AVLTree(); t.insert(1, "a"); return t.rank(99); })(), -1);

console.log("\n=== RANGE QUERY ===");
check("range query basic", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 10; i++) t.insert(i, i);
  return t.rangeQuery(3, 6).map(n => n.key);
})(), [3, 4, 5, 6]);
check("range query empty", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 5; i++) t.insert(i, i);
  return t.rangeQuery(10, 20);
})(), []);
check("range query full", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 5; i++) t.insert(i, i);
  return t.rangeQuery(0, 10).length;
})(), 5);

console.log("\n=== AVL PROPERTIES ===");
check("valid after sequential inserts", (() => { const t = new AVLTree(); for (let i = 0; i < 100; i++) t.insert(i, i); return t.isValidAVL(); })(), true);
check("valid after reverse inserts", (() => { const t = new AVLTree(); for (let i = 100; i >= 0; i--) t.insert(i, i); return t.isValidAVL(); })(), true);
check("valid after random inserts", (() => {
  const t = new AVLTree();
  [23, 4, 56, 12, 89, 1, 45, 67, 34, 78, 2, 90, 11, 33, 55, 77, 99, 6, 44, 66].forEach(v => t.insert(v, v));
  return t.isValidAVL();
})(), true);
check("valid after deletes", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 30; i++) t.insert(i, i);
  [5, 10, 15, 20, 25, 0, 29].forEach(k => t.delete(k));
  return t.isValidAVL();
})(), true);
check("height bounded", (() => {
  const t = new AVLTree();
  for (let i = 0; i < 1000; i++) t.insert(i, i);
  const maxH = 1.44 * Math.log2(1001);
  return t.root.height <= maxH;
})(), true);
check("inorder always sorted", (() => {
  const t = new AVLTree();
  [50, 30, 70, 10, 40, 60, 80, 20, 35, 45].forEach(v => t.insert(v, v));
  const keys = t.inorder().map(n => n.key);
  for (let i = 1; i < keys.length; i++) if (keys[i] <= keys[i - 1]) return false;
  return true;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
