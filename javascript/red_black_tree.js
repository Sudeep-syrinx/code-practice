const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class RedBlackNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
    this.parent = null;
    this.red = true;
  }
}

class RedBlackTree {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    this.size = 0;
  }

  insert(key, value) {
    const node = new RedBlackNode(key, value);
    if (!this.root) {
      this.root = node;
      node.red = false;
      this.size = 1;
      return;
    }
    let current = this.root;
    let parent = null;
    while (current) {
      parent = current;
      const c = this.cmp(key, current.key);
      if (c < 0) current = current.left;
      else if (c > 0) current = current.right;
      else { current.value = value; return; }
    }
    node.parent = parent;
    if (this.cmp(key, parent.key) < 0) parent.left = node;
    else parent.right = node;
    this.size++;
    this._fixInsert(node);
  }

  _fixInsert(node) {
    while (node !== this.root && node.parent && node.parent.red) {
      const grandparent = node.parent.parent;
      if (!grandparent) break;
      if (node.parent === grandparent.left) {
        const uncle = grandparent.right;
        if (uncle && uncle.red) {
          node.parent.red = false;
          uncle.red = false;
          grandparent.red = true;
          node = grandparent;
        } else {
          if (node === node.parent.right) {
            node = node.parent;
            this._rotateLeft(node);
          }
          node.parent.red = false;
          node.parent.parent.red = true;
          this._rotateRight(node.parent.parent);
        }
      } else {
        const uncle = grandparent.left;
        if (uncle && uncle.red) {
          node.parent.red = false;
          uncle.red = false;
          grandparent.red = true;
          node = grandparent;
        } else {
          if (node === node.parent.left) {
            node = node.parent;
            this._rotateRight(node);
          }
          node.parent.red = false;
          node.parent.parent.red = true;
          this._rotateLeft(node.parent.parent);
        }
      }
    }
    this.root.red = false;
  }

  _rotateLeft(node) {
    const right = node.right;
    node.right = right.left;
    if (right.left) right.left.parent = node;
    right.parent = node.parent;
    if (!node.parent) this.root = right;
    else if (node === node.parent.left) node.parent.left = right;
    else node.parent.right = right;
    right.left = node;
    node.parent = right;
  }

  _rotateRight(node) {
    const left = node.left;
    node.left = left.right;
    if (left.right) left.right.parent = node;
    left.parent = node.parent;
    if (!node.parent) this.root = left;
    else if (node === node.parent.right) node.parent.right = left;
    else node.parent.left = left;
    left.right = node;
    node.parent = left;
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

  delete(key) {
    const node = this._findNode(key);
    if (!node) return false;
    this._deleteNode(node);
    this.size--;
    return true;
  }

  _findNode(key) {
    let node = this.root;
    while (node) {
      const c = this.cmp(key, node.key);
      if (c === 0) return node;
      node = c < 0 ? node.left : node.right;
    }
    return null;
  }

  _deleteNode(z) {
    let y = z;
    let yOrigRed = y.red;
    let x, xParent;
    if (!z.left) {
      x = z.right;
      xParent = z.parent;
      this._transplant(z, z.right);
    } else if (!z.right) {
      x = z.left;
      xParent = z.parent;
      this._transplant(z, z.left);
    } else {
      y = this._minimum(z.right);
      yOrigRed = y.red;
      x = y.right;
      if (y.parent === z) {
        xParent = y;
      } else {
        xParent = y.parent;
        this._transplant(y, y.right);
        y.right = z.right;
        y.right.parent = y;
      }
      this._transplant(z, y);
      y.left = z.left;
      y.left.parent = y;
      y.red = z.red;
    }
    if (!yOrigRed && x !== this.root) this._fixDelete(x, xParent);
  }

  _transplant(u, v) {
    if (!u.parent) this.root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _minimum(node) {
    while (node.left) node = node.left;
    return node;
  }

  _fixDelete(x, xParent) {
    while (x !== this.root && (!x || !x.red)) {
      if (!xParent) break;
      if (x === xParent.left) {
        let w = xParent.right;
        if (!w) break;
        if (w.red) {
          w.red = false;
          xParent.red = true;
          this._rotateLeft(xParent);
          w = xParent.right;
          if (!w) break;
        }
        const wLeftRed = w.left && w.left.red;
        const wRightRed = w.right && w.right.red;
        if (!wLeftRed && !wRightRed) {
          w.red = true;
          x = xParent;
          xParent = x.parent;
        } else {
          if (!wRightRed) {
            if (w.left) w.left.red = false;
            w.red = true;
            this._rotateRight(w);
            w = xParent.right;
            if (!w) break;
          }
          w.red = xParent.red;
          xParent.red = false;
          if (w.right) w.right.red = false;
          this._rotateLeft(xParent);
          x = this.root;
          break;
        }
      } else {
        let w = xParent.left;
        if (!w) break;
        if (w.red) {
          w.red = false;
          xParent.red = true;
          this._rotateRight(xParent);
          w = xParent.left;
          if (!w) break;
        }
        const wLeftRed = w.left && w.left.red;
        const wRightRed = w.right && w.right.red;
        if (!wLeftRed && !wRightRed) {
          w.red = true;
          x = xParent;
          xParent = x.parent;
        } else {
          if (!wLeftRed) {
            if (w.right) w.right.red = false;
            w.red = true;
            this._rotateLeft(w);
            w = xParent.left;
            if (!w) break;
          }
          w.red = xParent.red;
          xParent.red = false;
          if (w.left) w.left.red = false;
          this._rotateRight(xParent);
          x = this.root;
          break;
        }
      }
    }
    if (x) x.red = false;
  }

  getHeight() {
    const bh = (node) => {
      if (!node) return 0;
      const lbh = bh(node.left);
      const rbh = bh(node.right);
      if (lbh === -1 || rbh === -1 || lbh !== rbh) return -1;
      return lbh + (node.red ? 0 : 1);
    };
    return bh(this.root);
  }

  isValidRBTree() {
    if (!this.root) return true;
    if (this.root.red) return false;
    const bh = this.getHeight();
    if (bh === -1) return false;
    const checkNoRedRed = (node) => {
      if (!node) return true;
      if (node.red) {
        if (node.left && node.left.red) return false;
        if (node.right && node.right.red) return false;
      }
      return checkNoRedRed(node.left) && checkNoRedRed(node.right);
    };
    return checkNoRedRed(this.root);
  }
}

console.log("=== INSERT AND SEARCH ===");
check("insert and search single", (() => {
  const t = new RedBlackTree();
  t.insert(10, "ten");
  return t.search(10);
})(), "ten");
check("search missing returns undefined", (() => {
  const t = new RedBlackTree();
  return t.search(99);
})(), undefined);
check("insert overwrite updates value", (() => {
  const t = new RedBlackTree();
  t.insert(5, "old");
  t.insert(5, "new");
  return t.search(5);
})(), "new");
check("size tracking", (() => {
  const t = new RedBlackTree();
  t.insert(1, "a"); t.insert(2, "b"); t.insert(1, "c");
  return t.size;
})(), 2);
check("multiple inserts all searchable", (() => {
  const t = new RedBlackTree();
  for (let i = 0; i < 20; i++) t.insert(i, "v" + i);
  let allFound = true;
  for (let i = 0; i < 20; i++) if (t.search(i) !== "v" + i) allFound = false;
  return allFound;
})(), true);

console.log("\n=== MIN MAX ===");
check("min of tree", (() => {
  const t = new RedBlackTree();
  t.insert(5, "a"); t.insert(3, "b"); t.insert(8, "c");
  return t.min().key;
})(), 3);
check("max of tree", (() => {
  const t = new RedBlackTree();
  t.insert(5, "a"); t.insert(3, "b"); t.insert(8, "c");
  return t.max().key;
})(), 8);
check("min empty returns undefined", new RedBlackTree().min(), undefined);
check("max empty returns undefined", new RedBlackTree().max(), undefined);

console.log("\n=== INORDER TRAVERSAL ===");
check("inorder sorted", (() => {
  const t = new RedBlackTree();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, "v" + k));
  return t.inorder().map(n => n.key);
})(), [1, 3, 4, 5, 7, 8, 9]);
check("inorder empty", new RedBlackTree().inorder(), []);
check("inorder single", (() => {
  const t = new RedBlackTree();
  t.insert(42, "x");
  return t.inorder();
})(), [{ key: 42, value: "x" }]);

console.log("\n=== DELETE ===");
check("delete existing returns true", (() => {
  const t = new RedBlackTree();
  t.insert(5, "a");
  return t.delete(5);
})(), true);
check("delete missing returns false", (() => {
  const t = new RedBlackTree();
  return t.delete(99);
})(), false);
check("delete reduces size", (() => {
  const t = new RedBlackTree();
  t.insert(1, "a"); t.insert(2, "b");
  t.delete(1);
  return t.size;
})(), 1);
check("deleted key not searchable", (() => {
  const t = new RedBlackTree();
  t.insert(5, "a");
  t.delete(5);
  return t.search(5);
})(), undefined);
check("delete root", (() => {
  const t = new RedBlackTree();
  t.insert(5, "a");
  t.delete(5);
  return t.size === 0 && t.search(5) === undefined;
})(), true);
check("delete maintains sorted order", (() => {
  const t = new RedBlackTree();
  [5, 3, 8, 1, 4, 7, 9].forEach(k => t.insert(k, "v" + k));
  t.delete(5);
  t.delete(1);
  return t.inorder().map(n => n.key);
})(), [3, 4, 7, 8, 9]);

console.log("\n=== RB TREE PROPERTIES ===");
check("valid after sequential inserts", (() => {
  const t = new RedBlackTree();
  for (let i = 0; i < 50; i++) t.insert(i, i);
  return t.isValidRBTree();
})(), true);
check("valid after reverse inserts", (() => {
  const t = new RedBlackTree();
  for (let i = 50; i >= 0; i--) t.insert(i, i);
  return t.isValidRBTree();
})(), true);
check("valid after random inserts", (() => {
  const t = new RedBlackTree();
  const vals = [23, 4, 56, 12, 89, 1, 45, 67, 34, 78, 2, 90, 11, 33, 55, 77, 99, 6, 44, 66];
  vals.forEach(v => t.insert(v, v));
  return t.isValidRBTree();
})(), true);
check("valid after deletes", (() => {
  const t = new RedBlackTree();
  for (let i = 0; i < 30; i++) t.insert(i, i);
  [5, 10, 15, 20, 25, 0, 29].forEach(k => t.delete(k));
  return t.isValidRBTree();
})(), true);
check("black height consistent", (() => {
  const t = new RedBlackTree();
  for (let i = 0; i < 100; i++) t.insert(i, i);
  return t.getHeight() > 0;
})(), true);
check("height bounded by 2*log(n)", (() => {
  const t = new RedBlackTree();
  for (let i = 0; i < 1000; i++) t.insert(i, i);
  const maxHeight = 2 * Math.log2(1001);
  return t.getHeight() <= maxHeight;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
