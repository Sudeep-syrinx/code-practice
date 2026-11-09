const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MerkleTreeNode {
  constructor(hash, left, right, data) {
    this.hash = hash;
    this.left = left || null;
    this.right = right || null;
    this.data = data || null;
  }
}

class MerkleTree {
  constructor(dataBlocks, hashFn) {
    this.hashFn = hashFn || MerkleTree.sha256Simple;
    this.leaves = dataBlocks.map(d => ({ data: d, hash: this.hashFn(d) }));
    this.root = this._build(this.leaves);
    this.leafCount = dataBlocks.length;
  }
  static sha256Simple(data) {
    const str = String(data);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  _build(leaves) {
    if (leaves.length === 0) return null;
    if (leaves.length === 1) return new MerkleTreeNode(leaves[0].hash, null, null, leaves[0].data);
    let level = leaves.map(l => new MerkleTreeNode(l.hash, null, null, l.data));
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        const combinedHash = this.hashFn(left.hash + right.hash);
        next.push(new MerkleTreeNode(combinedHash, left, right));
      }
      level = next;
    }
    return level[0];
  }
  getRoot() { return this.root ? this.root.hash : null; }
  getProof(index) {
    if (index < 0 || index >= this.leafCount) throw new Error("index out of bounds");
    const proof = [];
    let level = this.leaves.map(l => new MerkleTreeNode(l.hash, null, null, l.data));
    let idx = index;
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        if (i === idx || i + 1 === idx) {
          if (idx % 2 === 0) {
            proof.push({ position: "right", hash: right.hash });
          } else {
            proof.push({ position: "left", hash: left.hash });
          }
        }
        const combinedHash = this.hashFn(left.hash + right.hash);
        next.push(new MerkleTreeNode(combinedHash, left, right));
      }
      idx = Math.floor(idx / 2);
      level = next;
    }
    return proof;
  }
  verify(proof, leafData, rootHash) {
    let hash = this.hashFn(leafData);
    for (const step of proof) {
      if (step.position === "left") hash = this.hashFn(step.hash + hash);
      else hash = this.hashFn(hash + step.hash);
    }
    return hash === rootHash;
  }
  getLeafCount() { return this.leafCount; }
  getHeight() {
    if (this.leafCount === 0) return 0;
    return Math.ceil(Math.log2(this.leafCount)) + 1;
  }
}

class PatriciaTrie {
  constructor() {
    this.root = { children: new Map(), value: undefined, hasValue: false, prefix: "" };
    this.size = 0;
  }
  insert(key, value) {
    let node = this.root;
    let remaining = key;
    while (remaining.length > 0) {
      const firstChar = remaining[0];
      if (!node.children.has(firstChar)) {
        node.children.set(firstChar, { children: new Map(), value: undefined, hasValue: false, prefix: remaining });
        const child = node.children.get(firstChar);
        child.value = value;
        child.hasValue = true;
        this.size++;
        return;
      }
      const child = node.children.get(firstChar);
      const commonLen = this._commonPrefixLength(remaining, child.prefix);
      if (commonLen === child.prefix.length) {
        remaining = remaining.slice(commonLen);
        if (remaining.length === 0) {
          if (!child.hasValue) this.size++;
          child.value = value;
          child.hasValue = true;
          return;
        }
        node = child;
      } else {
        const splitNode = { children: new Map(), value: undefined, hasValue: false, prefix: child.prefix.slice(0, commonLen) };
        const oldSuffix = child.prefix.slice(commonLen);
        child.prefix = oldSuffix;
        splitNode.children.set(oldSuffix[0], child);
        if (commonLen === remaining.length) {
          splitNode.value = value;
          splitNode.hasValue = true;
          this.size++;
        } else {
          const newSuffix = remaining.slice(commonLen);
          splitNode.children.set(newSuffix[0], { children: new Map(), value, hasValue: true, prefix: newSuffix });
          this.size++;
        }
        node.children.set(firstChar, splitNode);
        return;
      }
    }
    if (!node.hasValue) this.size++;
    node.value = value;
    node.hasValue = true;
  }
  search(key) {
    let node = this.root;
    let remaining = key;
    while (remaining.length > 0) {
      const firstChar = remaining[0];
      if (!node.children.has(firstChar)) return undefined;
      const child = node.children.get(firstChar);
      if (!remaining.startsWith(child.prefix)) return undefined;
      remaining = remaining.slice(child.prefix.length);
      if (remaining.length === 0) return child.hasValue ? child.value : undefined;
      node = child;
    }
    return node.hasValue ? node.value : undefined;
  }
  startsWith(prefix) {
    let node = this.root;
    let remaining = prefix;
    while (remaining.length > 0) {
      const firstChar = remaining[0];
      if (!node.children.has(firstChar)) return [];
      const child = node.children.get(firstChar);
      const commonLen = this._commonPrefixLength(remaining, child.prefix);
      if (commonLen < remaining.length) return [];
      remaining = remaining.slice(commonLen);
      if (remaining.length === 0) return this._collectAll(child);
      node = child;
    }
    return this._collectAll(node);
  }
  _collectAll(node) {
    const results = [];
    if (node.hasValue) results.push(node.value);
    for (const [, child] of node.children) results.push(...this._collectAll(child));
    return results;
  }
  delete(key) {
    const path = [];
    let node = this.root;
    let remaining = key;
    while (remaining.length > 0) {
      const firstChar = remaining[0];
      if (!node.children.has(firstChar)) return false;
      const child = node.children.get(firstChar);
      if (!remaining.startsWith(child.prefix)) return false;
      path.push({ parent: node, char: firstChar, node: child });
      remaining = remaining.slice(child.prefix.length);
      if (remaining.length === 0) {
        if (!child.hasValue) return false;
        child.hasValue = false;
        child.value = undefined;
        this.size--;
        if (child.children.size === 0) {
          node.children.delete(firstChar);
        }
        return true;
      }
      node = child;
    }
    return false;
  }
  _commonPrefixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
  getSize() { return this.size; }
}

console.log("=== MERKLE TREE ===");
check("merkle root deterministic", (() => {
  const t1 = new MerkleTree(["a", "b", "c", "d"]);
  const t2 = new MerkleTree(["a", "b", "c", "d"]);
  return t1.getRoot() === t2.getRoot();
})(), true);
check("merkle different data different root", (() => {
  const t1 = new MerkleTree(["a", "b"]);
  const t2 = new MerkleTree(["a", "c"]);
  return t1.getRoot() !== t2.getRoot();
})(), true);
check("merkle proof verifies", (() => {
  const t = new MerkleTree(["x", "y", "z", "w"]);
  const proof = t.getProof(1);
  return t.verify(proof, "y", t.getRoot());
})(), true);
check("merkle proof wrong data fails", (() => {
  const t = new MerkleTree(["x", "y", "z"]);
  const proof = t.getProof(0);
  return t.verify(proof, "wrong", t.getRoot());
})(), false);
check("merkle single leaf", (() => {
  const t = new MerkleTree(["only"]);
  return t.getRoot() === MerkleTree.sha256Simple("only");
})(), true);
check("merkle leaf count", new MerkleTree(["a", "b", "c"]).getLeafCount(), 3);
check("merkle height", new MerkleTree(["a", "b", "c", "d"]).getHeight(), 3);
check("merkle proof oob throws", raises(() => new MerkleTree(["a"]).getProof(5)), true);
check("merkle proof all indices valid", (() => {
  const t = new MerkleTree(["a", "b", "c", "d", "e"]);
  for (let i = 0; i < 5; i++) {
    const proof = t.getProof(i);
    const data = ["a", "b", "c", "d", "e"][i];
    if (!t.verify(proof, data, t.getRoot())) return false;
  }
  return true;
})(), true);

console.log("\n=== PATRICIA TRIE ===");
check("trie insert and search", (() => {
  const t = new PatriciaTrie();
  t.insert("hello", 1);
  return t.search("hello");
})(), 1);
check("trie search miss", (() => {
  const t = new PatriciaTrie();
  return t.search("missing");
})(), undefined);
check("trie overwrite", (() => {
  const t = new PatriciaTrie();
  t.insert("key", "old");
  t.insert("key", "new");
  return t.search("key");
})(), "new");
check("trie size tracking", (() => {
  const t = new PatriciaTrie();
  t.insert("a", 1); t.insert("ab", 2); t.insert("abc", 3);
  return t.getSize();
})(), 3);
check("trie shared prefix", (() => {
  const t = new PatriciaTrie();
  t.insert("test", 1); t.insert("testing", 2); t.insert("tester", 3);
  return t.search("test") === 1 && t.search("testing") === 2 && t.search("tester") === 3;
})(), true);
check("trie startsWith", (() => {
  const t = new PatriciaTrie();
  t.insert("app", 1); t.insert("apple", 2); t.insert("application", 3); t.insert("bat", 4);
  return t.startsWith("app").sort();
})(), [1, 2, 3]);
check("trie startsWith empty", (() => {
  const t = new PatriciaTrie();
  t.insert("hello", 1);
  return t.startsWith("xyz");
})(), []);
check("trie delete", (() => {
  const t = new PatriciaTrie();
  t.insert("key", "val");
  t.delete("key");
  return t.search("key");
})(), undefined);
check("trie delete reduces size", (() => {
  const t = new PatriciaTrie();
  t.insert("a", 1); t.insert("b", 2);
  t.delete("a");
  return t.getSize();
})(), 1);
check("trie delete missing returns false", (() => {
  const t = new PatriciaTrie();
  return t.delete("nope");
})(), false);
check("trie delete prefix doesn't affect longer", (() => {
  const t = new PatriciaTrie();
  t.insert("test", 1); t.insert("testing", 2);
  t.delete("test");
  return t.search("testing");
})(), 2);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
