const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("capacity must be a positive integer");
    }
    this.capacity = capacity;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.map.has(key)) {
      this.misses++;
      return undefined;
    }
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    this.hits++;
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  has(key) {
    return this.map.has(key);
  }

  size() {
    return this.map.size;
  }

  keys() {
    return Array.from(this.map.keys());
  }

  hitRate() {
    const total = this.hits + this.misses;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.hits / total) * 100) / 100;
  }

  clear() {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

function memoize(fn, capacity) {
  const cache = new LRUCache(capacity);
  const wrapped = function (arg) {
    const key = String(arg);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const value = fn(arg);
    cache.put(key, value);
    return value;
  };
  wrapped.cache = cache;
  return wrapped;
}

class NaiveLRU {
  constructor(capacity) {
    this.capacity = capacity;
    this.list = [];
  }

  get(key) {
    const index = this.list.findIndex((pair) => pair[0] === key);
    if (index === -1) {
      return undefined;
    }
    const pair = this.list.splice(index, 1)[0];
    this.list.push(pair);
    return pair[1];
  }

  put(key, value) {
    const index = this.list.findIndex((pair) => pair[0] === key);
    if (index !== -1) {
      this.list.splice(index, 1);
    } else if (this.list.length >= this.capacity) {
      this.list.shift();
    }
    this.list.push([key, value]);
  }

  keys() {
    return this.list.map((pair) => pair[0]);
  }
}

const c = new LRUCache(2);
check("starts empty", c.size(), 0);
check("keys empty", c.keys(), []);
check("hit rate empty", c.hitRate(), 0);
c.put("a", 1);
c.put("b", 2);
check("size two", c.size(), 2);
check("keys order", c.keys(), ["a", "b"]);
check("get a", c.get("a"), 1);
check("a is newest", c.keys(), ["b", "a"]);
c.put("c", 3);
check("b evicted", c.has("b"), false);
check("keys after evict", c.keys(), ["a", "c"]);
check("size capped", c.size(), 2);
check("get missing", c.get("b"), undefined);
check("get c", c.get("c"), 3);
check("get a again", c.get("a"), 1);
check("order now", c.keys(), ["c", "a"]);
check("hits", c.hits, 3);
check("misses", c.misses, 1);
check("hit rate", c.hitRate(), 0.75);

console.log();
c.put("c", 30);
check("update moves to newest", c.keys(), ["a", "c"]);
check("update value", c.get("c"), 30);
check("update keeps size", c.size(), 2);
check("has does not refresh", (() => {
  const t = new LRUCache(2);
  t.put("x", 1);
  t.put("y", 2);
  t.has("x");
  t.put("z", 3);
  return t.keys();
})(), ["y", "z"]);
check("has missing", c.has("zzz"), false);
c.clear();
check("clear size", c.size(), 0);
check("clear hits", c.hits, 0);
check("clear misses", c.misses, 0);

console.log();
check("capacity zero", raises(() => new LRUCache(0)), true);
check("capacity negative", raises(() => new LRUCache(-1)), true);
check("capacity decimal", raises(() => new LRUCache(1.5)), true);
check("capacity text", raises(() => new LRUCache("2")), true);
const one = new LRUCache(1);
one.put("a", 1);
one.put("b", 2);
check("capacity one keys", one.keys(), ["b"]);
check("capacity one old gone", one.get("a"), undefined);
check("capacity one value", one.get("b"), 2);
const falsy = new LRUCache(3);
falsy.put("zero", 0);
falsy.put("empty", "");
falsy.put("no", false);
check("falsy zero", falsy.get("zero"), 0);
check("falsy empty", falsy.get("empty"), "");
check("falsy false", falsy.get("no"), false);
check("falsy are hits", falsy.hits, 3);

console.log();
let calls = 0;
const square = memoize((n) => {
  calls++;
  return n * n;
}, 100);
check("memo first", square(5), 25);
check("memo second", square(5), 25);
check("memo one call", calls, 1);
check("memo other", square(6), 36);
check("memo two calls", calls, 2);
check("memo cache size", square.cache.size(), 2);

let calls2 = 0;
const small = memoize((n) => {
  calls2++;
  return n + 1;
}, 2);
small(1);
small(2);
small(3);
check("small three calls", calls2, 3);
small(1);
check("evicted recomputed", calls2, 4);
small(3);
check("recent still cached", calls2, 4);
check("small cache size", small.cache.size(), 2);

console.log();
let seed = 31337;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let sameOk = true;
for (let round = 1; round <= 5; round++) {
  const fast = new LRUCache(round);
  const slow = new NaiveLRU(round);
  for (let i = 0; i < 2000; i++) {
    const key = "k" + nextRandom(8);
    if (nextRandom(2) === 0) {
      const value = nextRandom(100);
      fast.put(key, value);
      slow.put(key, value);
    } else if (fast.get(key) !== slow.get(key)) {
      sameOk = false;
    }
    if (JSON.stringify(fast.keys()) !== JSON.stringify(slow.keys())) {
      sameOk = false;
    }
    if (fast.size() > round) {
      sameOk = false;
    }
  }
}
check("10000 ops match naive", sameOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
