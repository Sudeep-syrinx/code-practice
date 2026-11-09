const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class LRUPolicy {
  constructor(capacity) {
    this.capacity = capacity;
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }
  access(key) {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
      this.hits++;
      return true;
    }
    this.misses++;
    this.accessOrder.push(key);
    if (this.accessOrder.length > this.capacity) this.accessOrder.shift();
    return false;
  }
  evict() {
    if (this.accessOrder.length === 0) return null;
    return this.accessOrder.shift();
  }
  getStats() { return { hits: this.hits, misses: this.misses, ratio: this.hits / Math.max(1, this.hits + this.misses) }; }
}

class LFUPolicy {
  constructor(capacity) {
    this.capacity = capacity;
    this.freq = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  access(key) {
    if (this.freq.has(key)) {
      this.freq.set(key, this.freq.get(key) + 1);
      this.hits++;
      return true;
    }
    this.misses++;
    if (this.freq.size >= this.capacity) this.evict();
    this.freq.set(key, 1);
    return false;
  }
  evict() {
    let minKey = null, minFreq = Infinity;
    for (const [k, f] of this.freq) {
      if (f < minFreq) { minFreq = f; minKey = k; }
    }
    if (minKey !== null) this.freq.delete(minKey);
    return minKey;
  }
  getStats() { return { hits: this.hits, misses: this.misses, ratio: this.hits / Math.max(1, this.hits + this.misses) }; }
}

class CacheSimulator {
  constructor(policy, capacity) {
    this.policy = policy;
    this.capacity = capacity;
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
  get(key) {
    const hit = this.policy.access(key);
    if (hit && this.store.has(key)) {
      this.stats.hits++;
      return this.store.get(key);
    }
    this.stats.misses++;
    return undefined;
  }
  put(key, value) {
    if (this.store.size >= this.capacity && !this.store.has(key)) {
      const evicted = this.policy.evict();
      if (evicted !== null && this.store.has(evicted)) {
        this.store.delete(evicted);
        this.stats.evictions++;
      }
    }
    this.store.set(key, value);
    this.policy.access(key);
  }
  getStats() {
    return { ...this.stats, size: this.store.size, hitRatio: this.stats.hits / Math.max(1, this.stats.hits + this.stats.misses) };
  }
}

class TwoLevelCache {
  constructor(l1Cap, l2Cap) {
    this.l1 = new CacheSimulator(new LRUPolicy(l1Cap), l1Cap);
    this.l2 = new CacheSimulator(new LRUPolicy(l2Cap), l2Cap);
    this.promotions = 0;
  }
  get(key) {
    const l1Val = this.l1.get(key);
    if (l1Val !== undefined) return l1Val;
    const l2Val = this.l2.get(key);
    if (l2Val !== undefined) {
      this.l1.put(key, l2Val);
      this.promotions++;
      return l2Val;
    }
    return undefined;
  }
  put(key, value) {
    this.l1.put(key, value);
    this.l2.put(key, value);
  }
  getStats() {
    return { l1: this.l1.getStats(), l2: this.l2.getStats(), promotions: this.promotions };
  }
}

check("lru access order", (() => {
  const p = new LRUPolicy(3);
  p.access("a"); p.access("b"); p.access("c");
  return [...p.accessOrder];
})(), ["a", "b", "c"]);
check("lru moves to end on reaccess", (() => {
  const p = new LRUPolicy(3);
  p.access("a"); p.access("b"); p.access("a");
  return [...p.accessOrder];
})(), ["b", "a"]);
check("lru evicts oldest", (() => {
  const p = new LRUPolicy(2);
  p.access("a"); p.access("b"); p.access("c");
  return [...p.accessOrder];
})(), ["b", "c"]);
check("lfu evicts least frequent", (() => {
  const p = new LFUPolicy(2);
  p.access("a"); p.access("a"); p.access("b");
  return p.evict();
})(), "b");
check("cache sim hit miss", (() => {
  const c = new CacheSimulator(new LRUPolicy(3), 3);
  c.put("x", 1);
  c.get("x");
  c.get("y");
  return c.getStats();
})(), { hits: 1, misses: 1, evictions: 0, size: 1, hitRatio: 0.5 });
check("cache sim eviction", (() => {
  const c = new CacheSimulator(new LRUPolicy(2), 2);
  c.put("a", 1); c.put("b", 2); c.put("c", 3);
  return c.getStats().evictions;
})(), 1);
check("two level cache promotion", (() => {
  const tc = new TwoLevelCache(1, 3);
  tc.put("a", 1); tc.put("b", 2);
  tc.get("b");
  return tc.promotions;
})(), 1);
check("two level cache l1 miss l2 hit", (() => {
  const tc = new TwoLevelCache(1, 3);
  tc.put("a", 10); tc.put("b", 20);
  const val = tc.get("a");
  return val;
})(), 10);

let seed = 12345;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }
let lruOk = true;
for (let t = 0; t < 100; t++) {
  const cap = 3 + nextRandom(10);
  const p = new LRUPolicy(cap);
  for (let i = 0; i < 50; i++) p.access("k" + nextRandom(20));
  if (p.accessOrder.length > cap) { lruOk = false; break; }
}
check("100 lru capacity respected", lruOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
