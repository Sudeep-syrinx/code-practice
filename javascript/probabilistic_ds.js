const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MerkleTree {
  constructor(dataBlocks, hashFn) {
    this.hashFn = hashFn || MerkleTree.defaultHash;
    this.leaves = dataBlocks.map(b => this.hashFn(String(b)));
    this.levels = [this.leaves];
    this._build();
  }
  static defaultHash(data) {
    let h = 0;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  _build() {
    let current = this.leaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : left;
        next.push(this.hashFn(left + right));
      }
      this.levels.push(next);
      current = next;
    }
  }
  getRoot() {
    const top = this.levels[this.levels.length - 1];
    return top.length > 0 ? top[0] : null;
  }
  getProof(index) {
    if (index < 0 || index >= this.leaves.length) throw new Error("index out of bounds");
    const proof = [];
    let idx = index;
    for (let level = 0; level < this.levels.length - 1; level++) {
      const layer = this.levels[level];
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      if (siblingIdx < layer.length) {
        proof.push({ position: isRight ? "left" : "right", hash: layer[siblingIdx] });
      } else {
        proof.push({ position: isRight ? "left" : "right", hash: layer[idx] });
      }
      idx = Math.floor(idx / 2);
    }
    return proof;
  }
  verify(proof, leafData, root) {
    let hash = this.hashFn(String(leafData));
    for (const p of proof) {
      if (p.position === "left") hash = this.hashFn(p.hash + hash);
      else hash = this.hashFn(hash + p.hash);
    }
    return hash === root;
  }
  getLeafCount() { return this.leaves.length; }
  getHeight() { return this.levels.length; }
}

class BloomFilter {
  constructor(expectedItems, falsePositiveRate) {
    this.size = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.log(2) ** 2));
    this.hashCount = Math.ceil(this.size / expectedItems * Math.log(2));
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
    this.count = 0;
  }
  _hashes(item) {
    const hashes = [];
    const s = String(item);
    for (let i = 0; i < this.hashCount; i++) {
      let h = 0;
      const salt = s + ":" + i;
      for (let j = 0; j < salt.length; j++) {
        h = ((h << 5) - h + salt.charCodeAt(j)) | 0;
      }
      hashes.push((h >>> 0) % this.size);
    }
    return hashes;
  }
  add(item) {
    for (const h of this._hashes(item)) {
      this.bits[h >> 3] |= (1 << (h & 7));
    }
    this.count++;
  }
  test(item) {
    for (const h of this._hashes(item)) {
      if (!(this.bits[h >> 3] & (1 << (h & 7)))) return false;
    }
    return true;
  }
  getFalsePositiveRate() {
    const fillRatio = this._countBits() / this.size;
    return Math.pow(fillRatio, this.hashCount);
  }
  _countBits() {
    let count = 0;
    for (const byte of this.bits) {
      let b = byte;
      while (b) { count += b & 1; b >>= 1; }
    }
    return count;
  }
}

class CountMinSketch {
  constructor(width, depth) {
    this.width = width;
    this.depth = depth;
    this.table = Array.from({ length: depth }, () => new Int32Array(width));
  }
  _hashes(item) {
    const hashes = [];
    const s = String(item);
    for (let i = 0; i < this.depth; i++) {
      let h = 0;
      const salt = s + "#" + i;
      for (let j = 0; j < salt.length; j++) {
        h = ((h << 5) - h + salt.charCodeAt(j)) | 0;
      }
      hashes.push((h >>> 0) % this.width);
    }
    return hashes;
  }
  add(item, count = 1) {
    const hashes = this._hashes(item);
    for (let i = 0; i < this.depth; i++) {
      this.table[i][hashes[i]] += count;
    }
  }
  estimate(item) {
    const hashes = this._hashes(item);
    let min = Infinity;
    for (let i = 0; i < this.depth; i++) {
      min = Math.min(min, this.table[i][hashes[i]]);
    }
    return min;
  }
}

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
  return t.getRoot() === MerkleTree.defaultHash("only");
})(), true);
check("merkle height", new MerkleTree(["a", "b", "c", "d"]).getHeight(), 3);
check("merkle proof oob throws", raises(() => new MerkleTree(["a"]).getProof(5)), true);
check("bloom add and test", (() => {
  const bf = new BloomFilter(100, 0.01);
  bf.add("hello");
  return bf.test("hello");
})(), true);
check("bloom missing likely false", (() => {
  const bf = new BloomFilter(100, 0.01);
  bf.add("present");
  return bf.test("absent");
})(), false);
check("bloom multiple items", (() => {
  const bf = new BloomFilter(1000, 0.01);
  for (let i = 0; i < 100; i++) bf.add("item" + i);
  let found = 0;
  for (let i = 0; i < 100; i++) if (bf.test("item" + i)) found++;
  return found;
})(), 100);
check("cms add and estimate", (() => {
  const cms = new CountMinSketch(100, 5);
  cms.add("apple", 10);
  return cms.estimate("apple");
})(), 10);
check("cms never underestimates", (() => {
  const cms = new CountMinSketch(50, 4);
  cms.add("x", 5);
  return cms.estimate("x") >= 5;
})(), true);
check("cms unknown item low estimate", (() => {
  const cms = new CountMinSketch(1000, 5);
  cms.add("known", 100);
  return cms.estimate("unknown") <= 10;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
