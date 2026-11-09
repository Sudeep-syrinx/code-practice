const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BPlusNode {
  constructor(isLeaf, order) {
    this.isLeaf = isLeaf;
    this.order = order;
    this.keys = [];
    this.children = [];
    this.values = [];
    this.next = null;
  }
  isFull() { return this.keys.length >= this.order - 1; }
}

class BPlusTree {
  constructor(order) {
    this.order = order || 4;
    this.root = new BPlusNode(true, this.order);
    this.height = 1;
    this.size = 0;
  }
  search(key) {
    let node = this.root;
    while (!node.isLeaf) {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      node = node.children[i];
    }
    const idx = node.keys.indexOf(key);
    return idx !== -1 ? node.values[idx] : undefined;
  }
  insert(key, value) {
    const leaf = this._findLeaf(key);
    const existingIdx = leaf.keys.indexOf(key);
    if (existingIdx !== -1) {
      leaf.values[existingIdx] = value;
      return;
    }
    let i = 0;
    while (i < leaf.keys.length && leaf.keys[i] < key) i++;
    leaf.keys.splice(i, 0, key);
    leaf.values.splice(i, 0, value);
    this.size++;
    if (leaf.isFull()) this._splitLeaf(leaf);
  }
  _findLeaf(key) {
    let node = this.root;
    while (!node.isLeaf) {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      node = node.children[i];
    }
    return node;
  }
  _splitLeaf(leaf) {
    const mid = Math.ceil(leaf.keys.length / 2);
    const newLeaf = new BPlusNode(true, this.order);
    newLeaf.keys = leaf.keys.splice(mid);
    newLeaf.values = leaf.values.splice(mid);
    newLeaf.next = leaf.next;
    leaf.next = newLeaf;
    const promotedKey = newLeaf.keys[0];
    this._insertIntoParent(leaf, promotedKey, newLeaf);
  }
  _insertIntoParent(leftNode, key, rightNode) {
    if (leftNode === this.root) {
      const newRoot = new BPlusNode(false, this.order);
      newRoot.keys = [key];
      newRoot.children = [leftNode, rightNode];
      this.root = newRoot;
      this.height++;
      return;
    }
    const parent = this._findParent(this.root, leftNode);
    let i = 0;
    while (i < parent.keys.length && parent.keys[i] < key) i++;
    parent.keys.splice(i, 0, key);
    parent.children.splice(i + 1, 0, rightNode);
    if (parent.isFull()) this._splitInternal(parent);
  }
  _findParent(node, target) {
    if (node.isLeaf) return null;
    for (const child of node.children) {
      if (child === target) return node;
      if (!child.isLeaf) {
        const found = this._findParent(child, target);
        if (found) return found;
      }
    }
    return null;
  }
  _splitInternal(node) {
    const mid = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[mid];
    const newNode = new BPlusNode(false, this.order);
    newNode.keys = node.keys.splice(mid + 1);
    node.keys.splice(mid);
    newNode.children = node.children.splice(mid + 1);
    if (node === this.root) {
      const newRoot = new BPlusNode(false, this.order);
      newRoot.keys = [promotedKey];
      newRoot.children = [node, newNode];
      this.root = newRoot;
      this.height++;
    } else {
      this._insertIntoParent(node, promotedKey, newNode);
    }
  }
  rangeQuery(low, high) {
    const result = [];
    let node = this._findLeaf(low);
    while (node) {
      for (let i = 0; i < node.keys.length; i++) {
        if (node.keys[i] >= low && node.keys[i] <= high) {
          result.push({ key: node.keys[i], value: node.values[i] });
        }
        if (node.keys[i] > high) return result;
      }
      node = node.next;
    }
    return result;
  }
  delete(key) {
    const leaf = this._findLeaf(key);
    const idx = leaf.keys.indexOf(key);
    if (idx === -1) return false;
    leaf.keys.splice(idx, 1);
    leaf.values.splice(idx, 1);
    this.size--;
    return true;
  }
  getAllKeys() {
    const keys = [];
    let node = this.root;
    while (!node.isLeaf) node = node.children[0];
    while (node) {
      keys.push(...node.keys);
      node = node.next;
    }
    return keys;
  }
  getHeight() { return this.height; }
  getSize() { return this.size; }
}

check("bplus insert and search", (() => {
  const t = new BPlusTree(4);
  t.insert(10, "ten");
  return t.search(10);
})(), "ten");
check("bplus search miss", new BPlusTree(4).search(99), undefined);
check("bplus update existing", (() => {
  const t = new BPlusTree(4);
  t.insert(5, "old");
  t.insert(5, "new");
  return t.search(5);
})(), "new");
check("bplus size tracking", (() => {
  const t = new BPlusTree(4);
  t.insert(1, "a"); t.insert(2, "b"); t.insert(1, "c");
  return t.getSize();
})(), 2);
check("bplus split increases height", (() => {
  const t = new BPlusTree(3);
  for (let i = 0; i < 10; i++) t.insert(i, "v" + i);
  return t.getHeight() > 1;
})(), true);
check("bplus all keys sorted after splits", (() => {
  const t = new BPlusTree(3);
  for (let i = 20; i >= 0; i--) t.insert(i, "v");
  const keys = t.getAllKeys();
  for (let i = 1; i < keys.length; i++) if (keys[i] <= keys[i - 1]) return false;
  return true;
})(), true);
check("bplus range query", (() => {
  const t = new BPlusTree(4);
  for (let i = 0; i < 10; i++) t.insert(i, "v" + i);
  return t.rangeQuery(3, 6).map(r => r.key);
})(), [3, 4, 5, 6]);
check("bplus range query empty", (() => {
  const t = new BPlusTree(4);
  for (let i = 0; i < 5; i++) t.insert(i, "v");
  return t.rangeQuery(10, 20);
})(), []);
check("bplus delete existing", (() => {
  const t = new BPlusTree(4);
  t.insert(1, "a"); t.insert(2, "b");
  t.delete(1);
  return t.search(1);
})(), undefined);
check("bplus delete missing returns false", (() => {
  const t = new BPlusTree(4);
  return t.delete(99);
})(), false);
check("bplus large insert search", (() => {
  const t = new BPlusTree(5);
  for (let i = 0; i < 200; i++) t.insert(i, "val" + i);
  return t.search(150) === "val150" && t.search(0) === "val0" && t.search(199) === "val199";
})(), true);
check("bplus leaf linked list traversal", (() => {
  const t = new BPlusTree(3);
  for (let i = 0; i < 15; i++) t.insert(i, i * 10);
  return t.getAllKeys().length;
})(), 15);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
