const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class LRUCache {
  constructor(capacity) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.capacity = capacity;
    this.map = new Map();
    this.head = { key: null, next: null, prev: null };
    this.tail = { key: null, next: null, prev: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
  }
  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }
  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  _moveToFront(node) {
    this._removeNode(node);
    this._addToFront(node);
  }
  get(key) {
    const node = this.map.get(key);
    if (!node) { this.misses++; return undefined; }
    this.hits++;
    this._moveToFront(node);
    return node.value;
  }
  put(key, value) {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this._moveToFront(existing);
      return;
    }
    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev;
      this._removeNode(lru);
      this.map.delete(lru.key);
    }
    const node = { key, value, next: null, prev: null };
    this._addToFront(node);
    this.map.set(key, node);
  }
  has(key) { return this.map.has(key); }
  delete(key) {
    const node = this.map.get(key);
    if (!node) return false;
    this._removeNode(node);
    this.map.delete(key);
    return true;
  }
  clear() {
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.map.clear();
  }
  size() { return this.map.size; }
  keys() {
    const result = [];
    let node = this.head.next;
    while (node !== this.tail) { result.push(node.key); node = node.next; }
    return result;
  }
  getStats() { return { hits: this.hits, misses: this.misses, hitRatio: this.hits / Math.max(1, this.hits + this.misses) }; }
}

class LFUCache {
  constructor(capacity) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.capacity = capacity;
    this.map = new Map();
    this.freqMap = new Map();
    this.minFreq = 0;
    this.hits = 0;
    this.misses = 0;
  }
  _getOrCreateFreqList(freq) {
    if (!this.freqMap.has(freq)) {
      this.freqMap.set(freq, { head: { next: null, prev: null }, tail: { next: null, prev: null }, size: 0 });
      const list = this.freqMap.get(freq);
      list.head.next = list.tail;
      list.tail.prev = list.head;
    }
    return this.freqMap.get(freq);
  }
  _addToList(list, node) {
    node.next = list.head.next;
    node.prev = list.head;
    list.head.next.prev = node;
    list.head.next = node;
    list.size++;
  }
  _removeFromList(list, node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    list.size--;
  }
  get(key) {
    const node = this.map.get(key);
    if (!node) { this.misses++; return undefined; }
    this.hits++;
    this._updateFreq(node);
    return node.value;
  }
  _updateFreq(node) {
    const oldFreq = node.freq;
    const oldList = this.freqMap.get(oldFreq);
    this._removeFromList(oldList, node);
    if (oldList.size === 0 && this.minFreq === oldFreq) this.minFreq++;
    node.freq++;
    const newList = this._getOrCreateFreqList(node.freq);
    this._addToList(newList, node);
  }
  put(key, value) {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this._updateFreq(existing);
      return;
    }
    if (this.map.size >= this.capacity) {
      const minList = this.freqMap.get(this.minFreq);
      const evict = minList.tail.prev;
      this._removeFromList(minList, evict);
      this.map.delete(evict.key);
    }
    const node = { key, value, freq: 1, next: null, prev: null };
    this.minFreq = 1;
    const list = this._getOrCreateFreqList(1);
    this._addToList(list, node);
    this.map.set(key, node);
  }
  has(key) { return this.map.has(key); }
  size() { return this.map.size; }
  getStats() { return { hits: this.hits, misses: this.misses, hitRatio: this.hits / Math.max(1, this.hits + this.misses) }; }
}

class ARC {
  constructor(capacity) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.c = capacity;
    this.p = 0;
    this.t1 = new Map();
    this.t2 = new Map();
    this.b1 = new Map();
    this.b2 = new Map();
    this.order1 = [];
    this.order2 = [];
    this.orderB1 = [];
    this.orderB2 = [];
  }
  _evictT1() {
    const key = this.order1.shift();
    this.t1.delete(key);
    this.b1.set(key, true);
    this.orderB1.push(key);
  }
  _evictT2() {
    const key = this.order2.shift();
    this.t2.delete(key);
    this.b2.set(key, true);
    this.orderB2.push(key);
  }
  get(key) {
    if (this.t1.has(key)) {
      this.t1.delete(key);
      this.order1 = this.order1.filter(k => k !== key);
      this.t2.set(key, true);
      this.order2.push(key);
      return true;
    }
    if (this.t2.has(key)) {
      this.order2 = this.order2.filter(k => k !== key);
      this.order2.push(key);
      return true;
    }
    return false;
  }
  put(key) {
    if (this.t1.has(key)) {
      this.t1.delete(key);
      this.order1 = this.order1.filter(k => k !== key);
      this.t2.set(key, true);
      this.order2.push(key);
      return;
    }
    if (this.t2.has(key)) {
      this.order2 = this.order2.filter(k => k !== key);
      this.order2.push(key);
      return;
    }
    if (this.b1.has(key)) {
      const delta = Math.max(1, Math.floor(this.b2.size / Math.max(1, this.b1.size)));
      this.p = Math.min(this.c, this.p + delta);
      this.b1.delete(key);
      this.orderB1 = this.orderB1.filter(k => k !== key);
      while (this.t1.size + this.t2.size >= this.c) {
        if (this.t2.size > 0) this._evictT2();
        else if (this.t1.size > 0) this._evictT1();
      }
      this.t2.set(key, true);
      this.order2.push(key);
      return;
    }
    if (this.b2.has(key)) {
      const delta = Math.max(1, Math.floor(this.b1.size / Math.max(1, this.b2.size)));
      this.p = Math.max(0, this.p - delta);
      this.b2.delete(key);
      this.orderB2 = this.orderB2.filter(k => k !== key);
      while (this.t1.size + this.t2.size >= this.c) {
        if (this.t1.size > 0) this._evictT1();
        else if (this.t2.size > 0) this._evictT2();
      }
      this.t2.set(key, true);
      this.order2.push(key);
      return;
    }
    const totalCached = this.t1.size + this.t2.size;
    if (totalCached >= this.c) {
      if (this.t1.size + this.b1.size >= this.c) {
        if (this.b1.size > 0) { this.b1.delete(this.orderB1.shift()); }
        else if (this.t1.size > 0) { this.t1.delete(this.order1.shift()); }
      } else {
        if (this.t1.size + this.t2.size >= this.c && this.t2.size > 0) this._evictT2();
        else if (this.t1.size > 0) this._evictT1();
      }
    }
    this.t1.set(key, true);
    this.order1.push(key);
  }
  size() { return this.t1.size + this.t2.size; }
  contains(key) { return this.t1.has(key) || this.t2.has(key); }
}

console.log("=== LRU CACHE ===");
check("lru put and get", (() => { const c = new LRUCache(3); c.put("a", 1); return c.get("a"); })(), 1);
check("lru miss returns undefined", (() => { const c = new LRUCache(3); return c.get("x"); })(), undefined);
check("lru evicts oldest", (() => { const c = new LRUCache(2); c.put("a", 1); c.put("b", 2); c.put("c", 3); return c.has("a"); })(), false);
check("lru access refreshes", (() => { const c = new LRUCache(2); c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3); return c.has("a") && !c.has("b"); })(), true);
check("lru update value", (() => { const c = new LRUCache(3); c.put("a", 1); c.put("a", 2); return c.get("a"); })(), 2);
check("lru delete", (() => { const c = new LRUCache(3); c.put("a", 1); c.delete("a"); return c.has("a"); })(), false);
check("lru clear", (() => { const c = new LRUCache(3); c.put("a", 1); c.put("b", 2); c.clear(); return c.size(); })(), 0);
check("lru keys order", (() => { const c = new LRUCache(3); c.put("a", 1); c.put("b", 2); c.put("c", 3); c.get("a"); return c.keys(); })(), ["c", "b", "a"]);
check("lru stats", (() => { const c = new LRUCache(3); c.put("a", 1); c.get("a"); c.get("b"); return c.getStats(); })(), { hits: 1, misses: 1, hitRatio: 0.5 });
check("lru invalid capacity throws", raises(() => new LRUCache(0)), true);

console.log("\n=== LFU CACHE ===");
check("lfu put and get", (() => { const c = new LFUCache(3); c.put("a", 1); return c.get("a"); })(), 1);
check("lfu evicts least frequent", (() => { const c = new LFUCache(2); c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3); return c.has("a") && !c.has("b"); })(), true);
check("lfu miss returns undefined", (() => new LFUCache(3).get("x"))(), undefined);
check("lfu update value", (() => { const c = new LFUCache(3); c.put("a", 1); c.put("a", 2); return c.get("a"); })(), 2);
check("lfu stats", (() => { const c = new LFUCache(3); c.put("a", 1); c.get("a"); c.get("b"); return c.getStats(); })(), { hits: 1, misses: 1, hitRatio: 0.5 });
check("lfu invalid capacity throws", raises(() => new LFUCache(0)), true);

console.log("\n=== ARC CACHE ===");
check("arc put and get", (() => { const c = new ARC(3); c.put("a"); return c.get("a"); })(), true);
check("arc miss returns false", (() => new ARC(3).get("x"))(), false);
check("arc eviction", (() => { const c = new ARC(2); c.put("a"); c.put("b"); c.put("c"); return !c.contains("a") || !c.contains("b"); })(), true);
check("arc ghost list promotes", (() => { const c = new ARC(2); c.put("a"); c.put("b"); c.put("c"); c.get("a"); c.put("a"); return c.contains("a"); })(), true);
check("arc size bounded", (() => { const c = new ARC(3); for (let i = 0; i < 20; i++) c.put("k" + i); return c.size() <= 3; })(), true);
check("arc invalid capacity throws", raises(() => new ARC(0)), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
