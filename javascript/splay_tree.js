const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class SplayNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

class SplayTree {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    this.size = 0;
    this.splayCount = 0;
  }

  _rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  _rotateRight(x) {
    const y = x.left;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  _splay(node) {
    this.splayCount++;
    while (node.parent) {
      const parent = node.parent;
      const grandparent = parent.parent;
      if (!grandparent) {
        if (node === parent.left) this._rotateRight(parent);
        else this._rotateLeft(parent);
      } else if (node === parent.left && parent === grandparent.left) {
        this._rotateRight(grandparent);
        this._rotateRight(parent);
      } else if (node === parent.right && parent === grandparent.right) {
        this._rotateLeft(grandparent);
        this._rotateLeft(parent);
      } else if (node === parent.right && parent === grandparent.left) {
        this._rotateLeft(parent);
        this._rotateRight(grandparent);
      } else {
        this._rotateRight(parent);
        this._rotateLeft(grandparent);
      }
    }
  }

  insert(key, value) {
    if (!this.root) {
      this.root = new SplayNode(key, value);
      this.size = 1;
      return;
    }
    let node = this.root;
    let parent = null;
    while (node) {
      parent = node;
      const c = this.cmp(key, node.key);
      if (c === 0) {
        node.value = value;
        this._splay(node);
        return;
      }
      node = c < 0 ? node.left : node.right;
    }
    const newNode = new SplayNode(key, value);
    newNode.parent = parent;
    if (this.cmp(key, parent.key) < 0) parent.left = newNode;
    else parent.right = newNode;
    this.size++;
    this._splay(newNode);
  }

  search(key) {
    let node = this.root;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) {
        this._splay(node);
        return node.value;
      }
      node = c < 0 ? node.left : node.right;
    }
    return undefined;
  }

  delete(key) {
    let node = this.root;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) break;
      node = c < 0 ? node.left : node.right;
    }
    if (!node) return false;
    this._splay(node);
    if (!node.left) {
      this.root = node.right;
      if (this.root) this.root.parent = null;
    } else if (!node.right) {
      this.root = node.left;
      this.root.parent = null;
    } else {
      const leftSubtree = node.left;
      leftSubtree.parent = null;
      const rightSubtree = node.right;
      rightSubtree.parent = null;
      let maxNode = leftSubtree;
      while (maxNode.right) maxNode = maxNode.right;
      this._splay(maxNode);
      this.root.right = rightSubtree;
      rightSubtree.parent = this.root;
    }
    this.size--;
    return true;
  }

  min() {
    if (!this.root) return undefined;
    let node = this.root;
    while (node.left) node = node.left;
    this._splay(node);
    return { key: node.key, value: node.value };
  }

  max() {
    if (!this.root) return undefined;
    let node = this.root;
    while (node.right) node = node.right;
    this._splay(node);
    return { key: node.key, value: node.value };
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

  getRoot() { return this.root ? this.root.key : null; }
  getSplayCount() { return this.splayCount; }
}

console.log("=== INSERT AND SEARCH ===");
check("insert and search", (() => {
  const t = new SplayTree();
  t.insert(10, "ten");
  return t.search(10);
})(), "ten");
check("search miss", new SplayTree().search(99), undefined);
check("overwrite value", (() => {
  const t = new SplayTree();
  t.insert(5, "old"); t.insert(5, "new");
  return t.search(5);
})(), "new");
check("size tracking", (() => {
  const t = new SplayTree();
  t.insert(1, "a"); t.insert(2, "b"); t.insert(1, "c");
  return t.size;
})(), 2);
check("multiple inserts searchable", (() => {
  const t = new SplayTree();
  for (let i = 0; i < 20; i++) t.insert(i, "v" + i);
  let ok = true;
  for (let i = 0; i < 20; i++) if (t.search(i) !== "v" + i) ok = false;
  return ok;
})(), true);

console.log("\n=== SPLAY BEHAVIOR ===");
check("searched node becomes root", (() => {
  const t = new SplayTree();
  t.insert(1, "a"); t.insert(2, "b"); t.insert(3, "c");
  t.search(1);
  return t.getRoot();
})(), 1);
check("inserted node becomes root", (() => {
  const t = new SplayTree();
  t.insert(5, "a"); t.insert(3, "b");
  return t.getRoot();
})(), 3);
check("splay count increments", (() => {
  const t = new SplayTree();
  t.insert(1, "a"); t.insert(2, "b");
  t.search(1);
  return t.getSplayCount() >= 2;
})(), true);
check("zig rotation single child", (() => {
  const t = new SplayTree();
  t.insert(2, "a"); t.insert(1, "b");
  t.search(1);
  return t.getRoot() === 1 && t.size === 2;
})(), true);
check("zig-zig rotation", (() => {
  const t = new SplayTree();
  t.insert(3, "a"); t.insert(2, "b"); t.insert(1, "c");
  t.search(1);
  return t.getRoot() === 1;
})(), true);
check("zig-zag rotation", (() => {
  const t = new SplayTree();
  t.insert(3, "a"); t.insert(1, "b"); t.insert(2, "c");
  t.search(2);
  return t.getRoot() === 2;
})(), true);

console.log("\n=== DELETE ===");
check("delete existing", (() => {
  const t = new SplayTree();
  t.insert(5, "a");
  return t.delete(5);
})(), true);
check("delete missing", (() => new SplayTree().delete(99))(), false);
check("delete reduces size", (() => {
  const t = new SplayTree();
  t.insert(1, "a"); t.insert(2, "b");
  t.delete(1);
  return t.size;
})(), 1);
check("deleted not searchable", (() => {
  const t = new SplayTree();
  t.insert(5, "a"); t.delete(5);
  return t.search(5);
})(), undefined);
check("delete root only", (() => {
  const t = new SplayTree();
  t.insert(5, "a"); t.delete(5);
  return t.size === 0 && t.getRoot() === null;
})(), true);
check("delete maintains inorder", (() => {
  const t = new SplayTree();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, k));
  t.delete(5); t.delete(1);
  return t.inorder().map(n => n.key);
})(), [3, 4, 7, 8, 9]);

console.log("\n=== MIN MAX TRAVERSAL ===");
check("min", (() => {
  const t = new SplayTree();
  t.insert(5, "a"); t.insert(3, "b"); t.insert(8, "c");
  return t.min().key;
})(), 3);
check("max", (() => {
  const t = new SplayTree();
  t.insert(5, "a"); t.insert(3, "b"); t.insert(8, "c");
  return t.max().key;
})(), 8);
check("min empty", new SplayTree().min(), undefined);
check("inorder sorted", (() => {
  const t = new SplayTree();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, k));
  return t.inorder().map(n => n.key);
})(), [1, 3, 4, 5, 7, 8, 9]);

console.log("\n=== ACCESS LOCALITY ===");
check("repeated access same key fast", (() => {
  const t = new SplayTree();
  for (let i = 0; i < 100; i++) t.insert(i, i);
  const before = t.getSplayCount();
  for (let i = 0; i < 10; i++) t.search(50);
  return t.getRoot() === 50;
})(), true);
check("sequential access pattern", (() => {
  const t = new SplayTree();
  for (let i = 0; i < 50; i++) t.insert(i, i);
  for (let i = 0; i < 50; i++) t.search(i);
  return t.getRoot() === 49;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
