const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class LeftistNode {
  constructor(key, value) {
    this.key = key;
    this.value = value !== undefined ? value : key;
    this.left = null;
    this.right = null;
    this.rank = 1;
  }
}

class LeftistHeap {
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
    if (!a.left || a.left.rank < a.right.rank) {
      [a.left, a.right] = [a.right, a.left];
    }
    a.rank = (a.right ? a.right.rank : 0) + 1;
    return a;
  }

  push(key, value) {
    const node = new LeftistNode(key, value);
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

  isValidLeftist() {
    const check = (node) => {
      if (!node) return { valid: true, rank: 0 };
      const left = check(node.left);
      const right = check(node.right);
      if (!left.valid || !right.valid) return { valid: false, rank: 0 };
      if (node.left && this.cmp(node.key, node.left.key) > 0) return { valid: false, rank: 0 };
      if (node.right && this.cmp(node.key, node.right.key) > 0) return { valid: false, rank: 0 };
      const leftRank = node.left ? node.left.rank : 0;
      const rightRank = node.right ? node.right.rank : 0;
      if (leftRank < rightRank) return { valid: false, rank: 0 };
      const expectedRank = rightRank + 1;
      if (node.rank !== expectedRank) return { valid: false, rank: 0 };
      return { valid: true, rank: node.rank };
    };
    return check(this.root).valid;
  }

  toArray() {
    const result = [];
    const clone = new LeftistHeap(this.cmp);
    clone.root = this._clone(this.root);
    clone._size = this._size;
    while (!clone.isEmpty()) result.push(clone.pop());
    return result;
  }

  _clone(node) {
    if (!node) return null;
    const n = new LeftistNode(node.key, node.value);
    n.left = this._clone(node.left);
    n.right = this._clone(node.right);
    n.rank = node.rank;
    return n;
  }
}

class BinomialNode {
  constructor(key, value) {
    this.key = key;
    this.value = value !== undefined ? value : key;
    this.children = [];
    this.rank = 0;
  }
}

class BinomialHeap {
  constructor(comparator) {
    this.roots = [];
    this.cmp = comparator || ((a, b) => a - b);
    this._size = 0;
  }

  _link(a, b) {
    if (this.cmp(a.key, b.key) <= 0) {
      a.children.push(b);
      a.rank++;
      return a;
    } else {
      b.children.push(a);
      b.rank++;
      return b;
    }
  }

  push(key, value) {
    let node = new BinomialNode(key, value);
    this._size++;
    let carry = node;
    for (let i = 0; i < this.roots.length; i++) {
      if (this.roots[i] === null) {
        this.roots[i] = carry;
        return;
      }
      if (this.roots[i].rank === carry.rank) {
        carry = this._link(this.roots[i], carry);
        this.roots[i] = null;
      } else if (this.roots[i].rank > carry.rank) {
        this.roots.splice(i, 0, carry);
        return;
      }
    }
    this.roots.push(carry);
  }

  _findMin() {
    let minIdx = -1;
    for (let i = 0; i < this.roots.length; i++) {
      if (this.roots[i] !== null) {
        if (minIdx === -1 || this.cmp(this.roots[i].key, this.roots[minIdx].key) < 0) {
          minIdx = i;
        }
      }
    }
    return minIdx;
  }

  pop() {
    const minIdx = this._findMin();
    if (minIdx === -1) return undefined;
    const minNode = this.roots[minIdx];
    this.roots[minIdx] = null;
    const childRoots = [...minNode.children].reverse();
    for (const child of childRoots) {
      let carry = child;
      let placed = false;
      for (let i = 0; i < this.roots.length; i++) {
        if (this.roots[i] === null) {
          this.roots[i] = carry;
          placed = true;
          break;
        }
        if (this.roots[i].rank === carry.rank) {
          carry = this._link(this.roots[i], carry);
          this.roots[i] = null;
        } else if (this.roots[i].rank > carry.rank) {
          this.roots.splice(i, 0, carry);
          placed = true;
          break;
        }
      }
      if (!placed) this.roots.push(carry);
    }
    this._size--;
    return { key: minNode.key, value: minNode.value };
  }

  peek() {
    const minIdx = this._findMin();
    if (minIdx === -1) return undefined;
    return { key: this.roots[minIdx].key, value: this.roots[minIdx].value };
  }

  merge(other) {
    const merged = new BinomialHeap(this.cmp);
    const maxLen = Math.max(this.roots.length, other.roots.length);
    let carry = null;
    for (let i = 0; i <= maxLen; i++) {
      const a = i < this.roots.length ? this.roots[i] : null;
      const b = i < other.roots.length ? other.roots[i] : null;
      const hasA = a !== null && a !== undefined;
      const hasB = b !== null && b !== undefined;
      const hasCarry = carry !== null;
      if (!hasA && !hasB && !hasCarry) {
        merged.roots.push(null);
      } else if (hasA && !hasB && !hasCarry) {
        merged.roots.push(a);
      } else if (!hasA && hasB && !hasCarry) {
        merged.roots.push(b);
      } else if (!hasA && !hasB && hasCarry) {
        merged.roots.push(carry);
        carry = null;
      } else if (hasA && hasB && !hasCarry) {
        merged.roots.push(null);
        carry = this._link(a, b);
      } else if (hasA && !hasB && hasCarry) {
        merged.roots.push(null);
        carry = this._link(a, carry);
      } else if (!hasA && hasB && hasCarry) {
        merged.roots.push(null);
        carry = this._link(b, carry);
      } else {
        merged.roots.push(a);
        carry = this._link(b, carry);
      }
    }
    while (merged.roots.length > 0 && merged.roots[merged.roots.length - 1] === null) merged.roots.pop();
    this.roots = merged.roots;
    this._size += other._size;
    other.roots = [];
    other._size = 0;
  }

  size() { return this._size; }
  isEmpty() { return this._size === 0; }

  isValidBinomial() {
    const checkTree = (node, expectedRank) => {
      if (!node) return false;
      if (node.rank !== expectedRank) return false;
      if (node.children.length !== expectedRank) return false;
      for (let i = 0; i < node.children.length; i++) {
        if (this.cmp(node.key, node.children[i].key) > 0) return false;
        if (!checkTree(node.children[i], expectedRank - 1 - i + i)) return false;
      }
      for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].rank !== node.children.length - 1 - i) return false;
      }
      return true;
    };
    const seenRanks = new Set();
    for (const root of this.roots) {
      if (root === null || root === undefined) continue;
      if (seenRanks.has(root.rank)) return false;
      seenRanks.add(root.rank);
      if (!checkTree(root, root.rank)) return false;
    }
    return true;
  }
}

console.log("=== LEFTIST HEAP ===");
check("leftist push and peek", (() => { const h = new LeftistHeap(); h.push(5); return h.peek().key; })(), 5);
check("leftist pop returns min", (() => { const h = new LeftistHeap(); h.push(3); h.push(1); h.push(2); return h.pop().key; })(), 1);
check("leftist pop order", (() => { const h = new LeftistHeap(); [5,3,8,1,4].forEach(k => h.push(k)); const r = []; while (!h.isEmpty()) r.push(h.pop().key); return r; })(), [1,3,4,5,8]);
check("leftist empty pop", new LeftistHeap().pop(), undefined);
check("leftist size", (() => { const h = new LeftistHeap(); h.push(1); h.push(2); h.pop(); return h.size(); })(), 1);
check("leftist merge", (() => { const a = new LeftistHeap(); a.push(3); a.push(5); const b = new LeftistHeap(); b.push(1); b.push(4); a.merge(b); const r = []; while (!a.isEmpty()) r.push(a.pop().key); return r; })(), [1,3,4,5]);
check("leftist valid after inserts", (() => { const h = new LeftistHeap(); for (let i = 0; i < 50; i++) h.push(Math.floor(Math.random()*100)); return h.isValidLeftist(); })(), true);
check("leftist valid after merge", (() => { const a = new LeftistHeap(); const b = new LeftistHeap(); for (let i = 0; i < 20; i++) { a.push(Math.floor(Math.random()*100)); b.push(Math.floor(Math.random()*100)); } a.merge(b); return a.isValidLeftist(); })(), true);
check("leftist toArray sorted", (() => { const h = new LeftistHeap(); [7,2,9,1,5].forEach(k => h.push(k)); return h.toArray().map(n => n.key); })(), [1,2,5,7,9]);
check("leftist custom comparator max", (() => { const h = new LeftistHeap((a,b) => b-a); h.push(1); h.push(5); h.push(3); return h.pop().key; })(), 5);
check("leftist with values", (() => { const h = new LeftistHeap(); h.push(2,"two"); h.push(1,"one"); return h.pop().value; })(), "one");
check("leftist rank property", (() => { const h = new LeftistHeap(); for (let i = 0; i < 100; i++) h.push(i); return h.isValidLeftist(); })(), true);

console.log("\n=== BINOMIAL HEAP ===");
check("binomial push and peek", (() => { const h = new BinomialHeap(); h.push(5); return h.peek().key; })(), 5);
check("binomial pop returns min", (() => { const h = new BinomialHeap(); h.push(3); h.push(1); h.push(2); return h.pop().key; })(), 1);
check("binomial pop order", (() => { const h = new BinomialHeap(); [5,3,8,1,4].forEach(k => h.push(k)); const r = []; while (!h.isEmpty()) r.push(h.pop().key); return r; })(), [1,3,4,5,8]);
check("binomial empty pop", new BinomialHeap().pop(), undefined);
check("binomial size", (() => { const h = new BinomialHeap(); h.push(1); h.push(2); h.pop(); return h.size(); })(), 1);
check("binomial merge", (() => { const a = new BinomialHeap(); a.push(3); a.push(5); const b = new BinomialHeap(); b.push(1); b.push(4); a.merge(b); const r = []; while (!a.isEmpty()) r.push(h.pop ? h.pop().key : a.pop().key); return r; })(), [1,3,4,5]);
check("binomial valid after inserts", (() => { const h = new BinomialHeap(); for (let i = 0; i < 50; i++) h.push(Math.floor(Math.random()*100)); return h.isValidBinomial(); })(), true);
check("binomial large sorted extraction", (() => { const h = new BinomialHeap(); for (let i = 100; i >= 0; i--) h.push(i); let prev = -1; let sorted = true; while (!h.isEmpty()) { const v = h.pop().key; if (v < prev) sorted = false; prev = v; } return sorted; })(), true);
check("binomial custom comparator", (() => { const h = new BinomialHeap((a,b) => b-a); h.push(1); h.push(5); h.push(3); return h.pop().key; })(), 5);
check("binomial with values", (() => { const h = new BinomialHeap(); h.push(2,"two"); h.push(1,"one"); return h.pop().value; })(), "one");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
