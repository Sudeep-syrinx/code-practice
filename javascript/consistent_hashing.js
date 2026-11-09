const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class ConsistentHashRing {
  constructor(replicas) {
    this.replicas = replicas || 150;
    this.ring = new Map();
    this.sortedKeys = [];
    this.nodes = new Set();
  }
  hash(key) {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return (h >>> 0) / 4294967296;
  }
  addNode(node) {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);
    for (let i = 0; i < this.replicas; i++) {
      const h = this.hash(node + ":" + i);
      this.ring.set(h, node);
      this.sortedKeys.push(h);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }
  removeNode(node) {
    if (!this.nodes.has(node)) return;
    this.nodes.delete(node);
    const toRemove = [];
    for (const [h, n] of this.ring) { if (n === node) toRemove.push(h); }
    for (const h of toRemove) this.ring.delete(h);
    this.sortedKeys = this.sortedKeys.filter(h => !toRemove.includes(h));
  }
  getNode(key) {
    if (this.sortedKeys.length === 0) return null;
    const h = this.hash(key);
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.sortedKeys[mid] < h) lo = mid + 1; else hi = mid; }
    if (lo >= this.sortedKeys.length) lo = 0;
    return this.ring.get(this.sortedKeys[lo]);
  }
  getNodes(key, count) {
    if (this.sortedKeys.length === 0) return [];
    const result = [];
    const seen = new Set();
    const h = this.hash(key);
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.sortedKeys[mid] < h) lo = mid + 1; else hi = mid; }
    let idx = lo;
    while (result.length < count && seen.size < this.nodes.size) {
      if (idx >= this.sortedKeys.length) idx = 0;
      const node = this.ring.get(this.sortedKeys[idx]);
      if (!seen.has(node)) { seen.add(node); result.push(node); }
      idx++;
    }
    return result;
  }
  getNodeCount() { return this.nodes.size; }
  getDistribution(keys) {
    const dist = {};
    for (const k of keys) { const n = this.getNode(k); dist[n] = (dist[n] || 0) + 1; }
    return dist;
  }
}

class RendezvousHash {
  constructor() { this.nodes = new Set(); }
  hash(key, node) {
    let h = 0;
    const s = String(key) + ":" + String(node);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return (h >>> 0) / 4294967296;
  }
  addNode(node) { this.nodes.add(node); }
  removeNode(node) { this.nodes.delete(node); }
  getNode(key) {
    let bestNode = null, bestScore = -1;
    for (const node of this.nodes) {
      const score = this.hash(key, node);
      if (score > bestScore) { bestScore = score; bestNode = node; }
    }
    return bestNode;
  }
  getNodes(key, count) {
    const scored = [];
    for (const node of this.nodes) scored.push({ node, score: this.hash(key, node) });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(s => s.node);
  }
  getNodeCount() { return this.nodes.size; }
}

class JumpConsistentHash {
  static hash(key, numBuckets) {
    if (numBuckets <= 0) throw new Error("numBuckets must be positive");
    let b = -1, j = 0;
    let k = typeof key === "number" ? key : JumpConsistentHash._stringToNum(String(key));
    while (j < numBuckets) {
      b = j;
      k = BigInt(k) * 2862933555777941757n + 1n;
      j = Number(BigInt(b + 1) * (BigInt(1) << 31n) / (BigInt(Number((k >> 33n) & 0x7FFFFFFFn)) + 1n));
    }
    return b;
  }
  static _stringToNum(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return h >>> 0;
  }
}

class MaglevHash {
  constructor(nodes, tableSize) {
    this.tableSize = tableSize || 65537;
    this.nodes = [...nodes];
    this.lookupTable = this._buildTable();
  }
  _hash1(node) {
    let h = 0;
    const s = String(node);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return (h >>> 0) % this.tableSize;
  }
  _hash2(node) {
    let h = 0x811c9dc5;
    const s = String(node) + ":salt";
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ((h >>> 0) % (this.tableSize - 1)) + 1;
  }
  _buildTable() {
    const table = new Int32Array(this.tableSize).fill(-1);
    const occupied = new Uint8Array(this.tableSize);
    const n = this.nodes.length;
    if (n === 0) return table;
    const offsets = new Int32Array(n);
    const skips = new Int32Array(n);
    for (let i = 0; i < n; i++) { offsets[i] = this._hash1(this.nodes[i]); skips[i] = this._hash2(this.nodes[i]); }
    let filled = 0;
    while (filled < this.tableSize) {
      for (let i = 0; i < n && filled < this.tableSize; i++) {
        let pos = (offsets[i] + skips[i]) % this.tableSize;
        offsets[i] = pos;
        while (occupied[pos]) pos = (pos + skips[i]) % this.tableSize;
        table[pos] = i;
        occupied[pos] = 1;
        offsets[i] = pos;
        filled++;
      }
    }
    return table;
  }
  getNode(key) {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    const idx = this.lookupTable[(h >>> 0) % this.tableSize];
    return idx >= 0 ? this.nodes[idx] : null;
  }
  getNodeCount() { return this.nodes.length; }
}

console.log("=== CONSISTENT HASH RING ===");
check("chr add and get", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B");
  return typeof r.getNode("key1") === "string";
})(), true);
check("chr empty returns null", new ConsistentHashRing().getNode("x"), null);
check("chr deterministic", (() => {
  const r = new ConsistentHashRing(50);
  r.addNode("X"); r.addNode("Y"); r.addNode("Z");
  return r.getNode("test-key") === r.getNode("test-key");
})(), true);
check("chr remove node", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B");
  r.removeNode("A");
  return r.getNodeCount() === 1 && r.getNode("any") === "B";
})(), true);
check("chr get multiple unique", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B"); r.addNode("C");
  const nodes = r.getNodes("key", 3);
  return new Set(nodes).size === 3;
})(), true);
check("chr distribution balanced", (() => {
  const r = new ConsistentHashRing(100);
  r.addNode("A"); r.addNode("B"); r.addNode("C");
  const keys = Array.from({ length: 300 }, (_, i) => "k" + i);
  const dist = r.getDistribution(keys);
  const vals = Object.values(dist);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.every(v => Math.abs(v - avg) < avg * 0.5);
})(), true);

console.log("\n=== RENDEZVOUS HASH ===");
check("rv deterministic", (() => {
  const rv = new RendezvousHash();
  rv.addNode("A"); rv.addNode("B"); rv.addNode("C");
  return rv.getNode("key") === rv.getNode("key");
})(), true);
check("rv all nodes reachable", (() => {
  const rv = new RendezvousHash();
  rv.addNode("A"); rv.addNode("B"); rv.addNode("C");
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(rv.getNode("key" + i));
  return seen.size === 3;
})(), true);
check("rv get top-k", (() => {
  const rv = new RendezvousHash();
  rv.addNode("A"); rv.addNode("B"); rv.addNode("C");
  return rv.getNodes("key", 2).length;
})(), 2);
check("rv remove changes assignment", (() => {
  const rv = new RendezvousHash();
  rv.addNode("A"); rv.addNode("B");
  const before = rv.getNode("key");
  rv.removeNode(before);
  return rv.getNode("key") !== before;
})(), true);

console.log("\n=== JUMP CONSISTENT HASH ===");
check("jch in range", (() => {
  let allValid = true;
  for (let i = 0; i < 100; i++) {
    const h = JumpConsistentHash.hash(i, 10);
    if (h < 0 || h >= 10) { allValid = false; break; }
  }
  return allValid;
})(), true);
check("jch deterministic", JumpConsistentHash.hash(42, 100) === JumpConsistentHash.hash(42, 100), true);
check("jch string key", (() => {
  const h = JumpConsistentHash.hash("hello", 10);
  return h >= 0 && h < 10;
})(), true);
check("jch invalid buckets throws", raises(() => JumpConsistentHash.hash(1, 0)), true);
check("jch uniform distribution", (() => {
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 10000; i++) counts[JumpConsistentHash.hash(i, 10)]++;
  const avg = 1000;
  return counts.every(c => Math.abs(c - avg) < avg * 0.3);
})(), true);

console.log("\n=== MAGLEV HASH ===");
check("maglev deterministic", (() => {
  const m = new MaglevHash(["A", "B", "C"]);
  return m.getNode("key") === m.getNode("key");
})(), true);
check("maglev all nodes reachable", (() => {
  const m = new MaglevHash(["A", "B", "C"]);
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(m.getNode("key" + i));
  return seen.size === 3;
})(), true);
check("maglev node count", new MaglevHash(["A", "B"]).getNodeCount(), 2);
check("maglev minimal disruption on add", (() => {
  const m1 = new MaglevHash(["A", "B", "C"]);
  const assignments1 = {};
  for (let i = 0; i < 100; i++) assignments1[i] = m1.getNode("key" + i);
  const m2 = new MaglevHash(["A", "B", "C", "D"]);
  let changed = 0;
  for (let i = 0; i < 100; i++) if (assignments1[i] !== m2.getNode("key" + i)) changed++;
  return changed < 40;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
