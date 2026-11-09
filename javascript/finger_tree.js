const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class FingerTreeNode {
  constructor(children) { this.children = children; }
  get size() { return this.children.reduce((s, c) => s + (c.size || 1), 0); }
}

class Digit {
  constructor(items) { this.items = items; }
  get size() { return this.items.length; }
}

class DeepNode {
  constructor(prefix, middle, suffix) {
    this.prefix = prefix;
    this.middle = middle;
    this.suffix = suffix;
  }
  get size() {
    let s = this.prefix.items.length;
    for (const item of this.middle) s += item.size || 1;
    s += this.suffix.items.length;
    return s;
  }
}

class FingerTree {
  constructor() { this.root = null; this._size = 0; }

  static empty() { return new FingerTree(); }

  static single(value) {
    const ft = new FingerTree();
    ft.root = value;
    ft._size = 1;
    return ft;
  }

  static deep(prefix, middle, suffix) {
    const ft = new FingerTree();
    ft.root = new DeepNode(new Digit(prefix), middle, new Digit(suffix));
    ft._size = ft.root.size;
    return ft;
  }

  isEmpty() { return this._size === 0; }
  size() { return this._size; }

  cons(value) {
    if (this.isEmpty()) return FingerTree.single(value);
    if (!(this.root instanceof DeepNode)) {
      return FingerTree.deep([value], [], [this.root]);
    }
    if (this.root.prefix.items.length < 4) {
      const newPrefix = [value, ...this.root.prefix.items];
      return FingerTree.deep(newPrefix, this.root.middle, this.root.suffix.items);
    }
    const [a, b, ...rest] = this.root.prefix.items;
    const node = new FingerTreeNode([a, b]);
    const newMiddle = [node, ...this.root.middle];
    return FingerTree.deep([value, ...rest], newMiddle, this.root.suffix.items);
  }

  snoc(value) {
    if (this.isEmpty()) return FingerTree.single(value);
    if (!(this.root instanceof DeepNode)) {
      return FingerTree.deep([this.root], [], [value]);
    }
    if (this.root.suffix.items.length < 4) {
      const newSuffix = [...this.root.suffix.items, value];
      return FingerTree.deep(this.root.prefix.items, this.root.middle, newSuffix);
    }
    const [...rest, a, b] = this.root.suffix.items;
    const node = new FingerTreeNode([a, b]);
    const newMiddle = [...this.root.middle, node];
    return FingerTree.deep(this.root.prefix.items, newMiddle, [...rest, value]);
  }

  head() {
    if (this.isEmpty()) throw new Error("empty tree");
    if (!(this.root instanceof DeepNode)) return this.root;
    return this.root.prefix.items[0];
  }

  last() {
    if (this.isEmpty()) throw new Error("empty tree");
    if (!(this.root instanceof DeepNode)) return this.root;
    const suffixItems = this.root.suffix.items;
    return suffixItems[suffixItems.length - 1];
  }

  tail() {
    if (this.isEmpty()) throw new Error("empty tree");
    if (!(this.root instanceof DeepNode)) return FingerTree.empty();
    if (this.root.prefix.items.length > 1) {
      return FingerTree.deep(this.root.prefix.items.slice(1), this.root.middle, this.root.suffix.items);
    }
    if (this.root.middle.length === 0) {
      const suffixItems = this.root.suffix.items;
      if (suffixItems.length === 1) return FingerTree.single(suffixItems[0]);
      return FingerTree.deep([suffixItems[0]], [], suffixItems.slice(1));
    }
    const [firstMid, ...restMid] = this.root.middle;
    const newPrefix = firstMid.children;
    return FingerTree.deep(newPrefix, restMid, this.root.suffix.items);
  }

  init() {
    if (this.isEmpty()) throw new Error("empty tree");
    if (!(this.root instanceof DeepNode)) return FingerTree.empty();
    const suffixItems = this.root.suffix.items;
    if (suffixItems.length > 1) {
      return FingerTree.deep(this.root.prefix.items, this.root.middle, suffixItems.slice(0, -1));
    }
    if (this.root.middle.length === 0) {
      const prefixItems = this.root.prefix.items;
      if (prefixItems.length === 1) return FingerTree.single(prefixItems[0]);
      return FingerTree.deep(prefixItems.slice(0, -1), [], [prefixItems[prefixItems.length - 1]]);
    }
    const [...restMid, lastMid] = this.root.middle;
    const newSuffix = lastMid.children;
    return FingerTree.deep(this.root.prefix.items, restMid, newSuffix);
  }

  toArray() {
    const result = [];
    const collect = (tree) => {
      if (tree.isEmpty()) return;
      if (!(tree.root instanceof DeepNode)) { result.push(tree.root); return; }
      for (const item of tree.root.prefix.items) {
        if (item instanceof FingerTreeNode) for (const c of item.children) result.push(c);
        else result.push(item);
      }
      for (const mid of tree.root.middle) {
        if (mid instanceof FingerTreeNode) for (const c of mid.children) result.push(c);
        else result.push(mid);
      }
      for (const item of tree.root.suffix.items) {
        if (item instanceof FingerTreeNode) for (const c of item.children) result.push(c);
        else result.push(item);
      }
    };
    collect(this);
    return result;
  }

  concat(other) {
    if (this.isEmpty()) return other;
    if (other.isEmpty()) return this;
    const allItems = [...this.toArray(), ...other.toArray()];
    let tree = FingerTree.empty();
    for (const item of allItems) tree = tree.snoc(item);
    return tree;
  }
}

console.log("=== FINGER TREE BASIC ===");
check("empty tree", (() => FingerTree.empty().isEmpty())(), true);
check("single element", (() => FingerTree.single(42).head())(), 42);
check("cons adds to front", (() => { let t = FingerTree.empty(); t = t.cons(3); t = t.cons(2); t = t.cons(1); return t.head(); })(), 1);
check("snoc adds to back", (() => { let t = FingerTree.empty(); t = t.snoc(1); t = t.snoc(2); t = t.snoc(3); return t.last(); })(), 3);
check("head and last", (() => { let t = FingerTree.empty(); t = t.snoc(1); t = t.snoc(2); t = t.snoc(3); return [t.head(), t.last()]; })(), [1, 3]);
check("size tracking", (() => { let t = FingerTree.empty(); t = t.snoc(1); t = t.snoc(2); t = t.snoc(3); return t.size(); })(), 3);
check("tail removes head", (() => { let t = FingerTree.empty(); t = t.snoc(1); t = t.snoc(2); t = t.snoc(3); return t.tail().head(); })(), 2);
check("init removes last", (() => { let t = FingerTree.empty(); t = t.snoc(1); t = t.snoc(2); t = t.snoc(3); return t.init().last(); })(), 2);
check("toArray preserves order", (() => { let t = FingerTree.empty(); for (let i = 1; i <= 5; i++) t = t.snoc(i); return t.toArray(); })(), [1, 2, 3, 4, 5]);
check("concat merges", (() => { let a = FingerTree.empty(); a = a.snoc(1); a = a.snoc(2); let b = FingerTree.empty(); b = b.snoc(3); b = b.snoc(4); return a.concat(b).toArray(); })(), [1, 2, 3, 4]);
check("empty head throws", raises(() => FingerTree.empty().head()), true);
check("empty tail throws", raises(() => FingerTree.empty().tail()), true);

console.log("\n=== FINGER TREE STRESS ===");
check("many snocs preserve order", (() => { let t = FingerTree.empty(); for (let i = 0; i < 100; i++) t = t.snoc(i); return t.toArray()[99]; })(), 99);
check("many conses preserve order", (() => { let t = FingerTree.empty(); for (let i = 0; i < 100; i++) t = t.cons(i); return t.toArray()[0]; })(), 99);
check("mixed cons/snoc", (() => { let t = FingerTree.empty(); t = t.snoc(5); t = t.cons(1); t = t.snoc(9); t = t.cons(0); return t.toArray(); })(), [0, 1, 5, 9]);
check("repeated tail", (() => { let t = FingerTree.empty(); for (let i = 0; i < 10; i++) t = t.snoc(i); for (let i = 0; i < 5; i++) t = t.tail(); return t.head(); })(), 5);
check("large concat", (() => { let a = FingerTree.empty(); let b = FingerTree.empty(); for (let i = 0; i < 50; i++) { a = a.snoc(i); b = b.snoc(i + 50); } return a.concat(b).size(); })(), 100);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
