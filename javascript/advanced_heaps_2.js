const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class SkewHeapNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class SkewHeap {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a - b);
    this._size = 0;
  }

  _merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (this.cmp(a.key, b.key) > 0) [a, b] = [b, a];
    a.right = this._merge(a.right, b);
    [a.left, a.right] = [a.right, a.left];
    return a;
  }

  push(key, value) {
    const node = new SkewHeapNode(key, value !== undefined ? value : key);
    this.root = this._merge(this.root, node);
    this._size++;
  }

  pop() {
    if (!this.root) return undefined;
    const min = this.root;
    this.root = this._merge(min.left, min.right);
    this._size--;
    return { key: min.key, value: min.value };
  }

  peek() {
    if (!this.root) return undefined;
    return { key: this.root.key, value: this.root.value };
  }

  merge(other) {
    this.root = this._merge(this.root, other.root);
    this._size += other._size;
    other.root = null;
    other._size = 0;
  }

  size() { return this._size; }
  isEmpty() { return this._size === 0; }

  toArray() {
    const result = [];
    const temp = new SkewHeap(this.cmp);
    temp.root = this._clone(this.root);
    temp._size = this._size;
    while (!temp.isEmpty()) result.push(temp.pop());
    return result;
  }

  _clone(node) {
    if (!node) return null;
    const n = new SkewHeapNode(node.key, node.value);
    n.left = this._clone(node.left);
    n.right = this._clone(node.right);
    return n;
  }

  isValidHeap() {
    const check = (node) => {
      if (!node) return true;
      if (node.left && this.cmp(node.key, node.left.key) > 0) return false;
      if (node.right && this.cmp(node.key, node.right.key) > 0) return false;
      return check(node.left) && check(node.right);
    };
    return check(this.root);
  }
}

class PairingHeapNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.children = [];
    this.parent = null;
  }
}

class PairingHeap {
  constructor(comparator) {
    this.root = null;
    this.cmp = comparator || ((a, b) => a - b);
    this._size = 0;
  }

  push(key, value) {
    const node = new PairingHeapNode(key, value !== undefined ? value : key);
    this.root = this._merge(this.root, node);
    this._size++;
    return node;
  }

  _merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (this.cmp(a.key, b.key) <= 0) {
      b.parent = a;
      a.children.push(b);
      return a;
    } else {
      a.parent = b;
      b.children.push(a);
      return b;
    }
  }

  pop() {
    if (!this.root) return undefined;
    const min = this.root;
    this.root = this._pairMerge(min.children);
    this._size--;
    return { key: min.key, value: min.value };
  }

  _pairMerge(children) {
    if (children.length === 0) return null;
    if (children.length === 1) { children[0].parent = null; return children[0]; }
    const merged = [];
    for (let i = 0; i < children.length - 1; i += 2) {
      merged.push(this._merge(children[i], children[i + 1]));
    }
    if (children.length % 2 === 1) merged.push(children[children.length - 1]);
    let result = merged[merged.length - 1];
    for (let i = merged.length - 2; i >= 0; i--) {
      result = this._merge(result, merged[i]);
    }
    if (result) result.parent = null;
    return result;
  }

  peek() {
    if (!this.root) return undefined;
    return { key: this.root.key, value: this.root.value };
  }

  decreaseKey(node, newKey) {
    if (this.cmp(newKey, node.key) > 0) throw new Error("new key must be smaller");
    node.key = newKey;
    if (node.parent && this.cmp(node.key, node.parent.key) < 0) {
      const parent = node.parent;
      parent.children = parent.children.filter(c => c !== node);
      node.parent = null;
      this.root = this._merge(this.root, node);
    }
  }

  deleteNode(node) {
    if (node === this.root) { this.pop(); return; }
    if (node.parent) {
      node.parent.children = node.parent.children.filter(c => c !== node);
      node.parent = null;
    }
    const subtreeRoot = this._pairMerge(node.children);
    if (subtreeRoot) {
      this.root = this._merge(this.root, subtreeRoot);
    }
    this._size--;
  }

  size() { return this._size; }
  isEmpty() { return this._size === 0; }

  isValidHeap() {
    const check = (node) => {
      if (!node) return true;
      for (const child of node.children) {
        if (this.cmp(node.key, child.key) > 0) return false;
        if (!check(child)) return false;
      }
      return true;
    };
    return check(this.root);
  }
}

console.log("=== SKEW HEAP ===");
check("skew push and peek", (() => { const h = new SkewHeap(); h.push(5); return h.peek().key; })(), 5);
check("skew pop returns min", (() => { const h = new SkewHeap(); h.push(3); h.push(1); h.push(2); return h.pop().key; })(), 1);
check("skew pop order", (() => { const h = new SkewHeap(); [5, 3, 8, 1, 4].forEach(k => h.push(k)); const r = []; while (!h.isEmpty()) r.push(h.pop().key); return r; })(), [1, 3, 4, 5, 8]);
check("skew empty pop", new SkewHeap().pop(), undefined);
check("skew size tracking", (() => { const h = new SkewHeap(); h.push(1); h.push(2); h.pop(); return h.size(); })(), 1);
check("skew merge", (() => { const a = new SkewHeap(); a.push(3); a.push(5); const b = new SkewHeap(); b.push(1); b.push(4); a.merge(b); const r = []; while (!a.isEmpty()) r.push(a.pop().key); return r; })(), [1, 3, 4, 5]);
check("skew valid heap property", (() => { const h = new SkewHeap(); for (let i = 0; i < 50; i++) h.push(Math.floor(Math.random() * 100)); return h.isValidHeap(); })(), true);
check("skew toArray sorted", (() => { const h = new SkewHeap(); [7, 2, 9, 1, 5].forEach(k => h.push(k)); return h.toArray().map(n => n.key); })(), [1, 2, 5, 7, 9]);
check("skew custom comparator max", (() => { const h = new SkewHeap((a, b) => b - a); h.push(1); h.push(5); h.push(3); return h.pop().key; })(), 5);
check("skew with values", (() => { const h = new SkewHeap(); h.push(2, "two"); h.push(1, "one"); return h.pop().value; })(), "one");

console.log("\n=== PAIRING HEAP ===");
check("pairing push and peek", (() => { const h = new PairingHeap(); h.push(5); return h.peek().key; })(), 5);
check("pairing pop returns min", (() => { const h = new PairingHeap(); h.push(3); h.push(1); h.push(2); return h.pop().key; })(), 1);
check("pairing pop order", (() => { const h = new PairingHeap(); [5, 3, 8, 1, 4].forEach(k => h.push(k)); const r = []; while (!h.isEmpty()) r.push(h.pop().key); return r; })(), [1, 3, 4, 5, 8]);
check("pairing empty pop", new PairingHeap().pop(), undefined);
check("pairing size tracking", (() => { const h = new PairingHeap(); h.push(1); h.push(2); h.pop(); return h.size(); })(), 1);
check("pairing decreaseKey", (() => { const h = new PairingHeap(); h.push(5); const node = h.push(10); h.push(15); h.decreaseKey(node, 1); return h.pop().key; })(), 1);
check("pairing decreaseKey throws on increase", (() => { const h = new PairingHeap(); const node = h.push(5); return raises(() => h.decreaseKey(node, 10)); })(), true);
check("pairing deleteNode", (() => { const h = new PairingHeap(); h.push(1); const node = h.push(5); h.push(3); h.deleteNode(node); const r = []; while (!h.isEmpty()) r.push(h.pop().key); return r; })(), [1, 3]);
check("pairing valid heap property", (() => { const h = new PairingHeap(); for (let i = 0; i < 50; i++) h.push(Math.floor(Math.random() * 100)); return h.isValidHeap(); })(), true);
check("pairing custom comparator", (() => { const h = new PairingHeap((a, b) => b - a); h.push(1); h.push(5); h.push(3); return h.pop().key; })(), 5);
check("pairing large insert extract", (() => { const h = new PairingHeap(); for (let i = 100; i >= 0; i--) h.push(i); let prev = -1; let sorted = true; while (!h.isEmpty()) { const v = h.pop().key; if (v < prev) sorted = false; prev = v; } return sorted; })(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
