const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class ConsistentHashRing {
  constructor(replicas = 150) {
    this.replicas = replicas;
    this.ring = new Map();
    this.sortedKeys = [];
    this.nodes = new Set();
  }
  hash(key) {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
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
    for (const [h, n] of this.ring) {
      if (n === node) toRemove.push(h);
    }
    for (const h of toRemove) this.ring.delete(h);
    this.sortedKeys = this.sortedKeys.filter(h => !toRemove.includes(h));
  }
  getNode(key) {
    if (this.sortedKeys.length === 0) return null;
    const h = this.hash(key);
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    if (lo >= this.sortedKeys.length) lo = 0;
    return this.ring.get(this.sortedKeys[lo]);
  }
  getNodes(key, count) {
    if (this.sortedKeys.length === 0) return [];
    const result = [];
    const seen = new Set();
    const h = this.hash(key);
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    let idx = lo;
    while (result.length < count && seen.size < this.nodes.size) {
      if (idx >= this.sortedKeys.length) idx = 0;
      const node = this.ring.get(this.sortedKeys[idx]);
      if (!seen.has(node)) {
        seen.add(node);
        result.push(node);
      }
      idx++;
    }
    return result;
  }
  getNodeCount() { return this.nodes.size; }
  getDistribution(keys) {
    const dist = {};
    for (const k of keys) {
      const n = this.getNode(k);
      dist[n] = (dist[n] || 0) + 1;
    }
    return dist;
  }
}

class LoadBalancer {
  constructor(strategy) {
    this.strategy = strategy || "round-robin";
    this.nodes = [];
    this.weights = new Map();
    this.rrIndex = 0;
    this.connections = new Map();
    this.ring = null;
  }
  addNode(node, weight = 1) {
    this.nodes.push(node);
    this.weights.set(node, weight);
    this.connections.set(node, 0);
    if (this.strategy === "consistent-hash") {
      if (!this.ring) this.ring = new ConsistentHashRing();
      this.ring.addNode(node);
    }
  }
  removeNode(node) {
    this.nodes = this.nodes.filter(n => n !== node);
    this.weights.delete(node);
    this.connections.delete(node);
    if (this.ring) this.ring.removeNode(node);
  }
  select(key) {
    if (this.nodes.length === 0) return null;
    if (this.strategy === "round-robin") {
      const node = this.nodes[this.rrIndex % this.nodes.length];
      this.rrIndex++;
      return node;
    }
    if (this.strategy === "least-connections") {
      let minNode = this.nodes[0];
      let minConn = this.connections.get(minNode);
      for (const n of this.nodes) {
        const c = this.connections.get(n);
        if (c < minConn) { minConn = c; minNode = n; }
      }
      return minNode;
    }
    if (this.strategy === "weighted-random") {
      const total = this.nodes.reduce((s, n) => s + this.weights.get(n), 0);
      let r = Math.random() * total;
      for (const n of this.nodes) {
        r -= this.weights.get(n);
        if (r <= 0) return n;
      }
      return this.nodes[this.nodes.length - 1];
    }
    if (this.strategy === "consistent-hash") {
      return this.ring.getNode(key);
    }
    return this.nodes[0];
  }
  connect(node) {
    if (this.connections.has(node)) this.connections.set(node, this.connections.get(node) + 1);
  }
  disconnect(node) {
    if (this.connections.has(node) && this.connections.get(node) > 0) {
      this.connections.set(node, this.connections.get(node) - 1);
    }
  }
}

check("ring add and get", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B");
  return typeof r.getNode("key1") === "string";
})(), true);
check("ring empty returns null", new ConsistentHashRing().getNode("x"), null);
check("ring deterministic", (() => {
  const r = new ConsistentHashRing(50);
  r.addNode("X"); r.addNode("Y"); r.addNode("Z");
  const n1 = r.getNode("test-key");
  const n2 = r.getNode("test-key");
  return n1 === n2;
})(), true);
check("ring remove node", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B");
  r.removeNode("A");
  return r.getNodeCount() === 1 && r.getNode("any") === "B";
})(), true);
check("ring get multiple nodes", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B"); r.addNode("C");
  return r.getNodes("key", 2).length === 2;
})(), true);
check("ring get nodes unique", (() => {
  const r = new ConsistentHashRing(10);
  r.addNode("A"); r.addNode("B"); r.addNode("C");
  const nodes = r.getNodes("key", 3);
  return new Set(nodes).size === 3;
})(), true);
check("lb round robin cycles", (() => {
  const lb = new LoadBalancer("round-robin");
  lb.addNode("A"); lb.addNode("B"); lb.addNode("C");
  return [lb.select(), lb.select(), lb.select(), lb.select()];
})(), ["A", "B", "C", "A"]);
check("lb least connections", (() => {
  const lb = new LoadBalancer("least-connections");
  lb.addNode("A"); lb.addNode("B");
  lb.connect("A"); lb.connect("A");
  return lb.select();
})(), "B");
check("lb consistent hash stable", (() => {
  const lb = new LoadBalancer("consistent-hash");
  lb.addNode("N1"); lb.addNode("N2"); lb.addNode("N3");
  const n1 = lb.select("user-123");
  const n2 = lb.select("user-123");
  return n1 === n2;
})(), true);
check("lb empty returns null", new LoadBalancer().select(), null);
check("lb remove node", (() => {
  const lb = new LoadBalancer("round-robin");
  lb.addNode("A"); lb.addNode("B");
  lb.removeNode("A");
  return lb.select() === "B";
})(), true);
check("lb connect disconnect", (() => {
  const lb = new LoadBalancer("least-connections");
  lb.addNode("A");
  lb.connect("A"); lb.connect("A");
  lb.disconnect("A");
  return lb.connections.get("A");
})(), 1);

let seed = 777;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }
let distOk = true;
for (let t = 0; t < 50; t++) {
  const r = new ConsistentHashRing(100);
  r.addNode("A"); r.addNode("B"); r.addNode("C");
  const keys = Array.from({ length: 300 }, (_, i) => "k" + i + "-" + t);
  const dist = r.getDistribution(keys);
  const vals = Object.values(dist);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  for (const v of vals) {
    if (Math.abs(v - avg) > avg * 0.8) { distOk = false; break; }
  }
  if (!distOk) break;
}
check("50 ring distribution balanced", distOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
