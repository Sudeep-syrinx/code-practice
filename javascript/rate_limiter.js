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

class TokenBucket {
  constructor(capacity, perSecond, now) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("capacity must be a positive integer");
    }
    if (typeof perSecond !== "number" || !(perSecond > 0)) {
      throw new Error("refill rate must be positive");
    }
    if (typeof now !== "function") {
      throw new Error("now must be a function");
    }
    this.cap = capacity;
    this.rate = perSecond;
    this.now = now;
    this.tokens = capacity;
    this.last = now();
  }

  refill() {
    const t = this.now();
    const elapsed = (t - this.last) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.cap, this.tokens + elapsed * this.rate);
    }
    this.last = t;
  }

  tryTake(n = 1) {
    if (!Number.isInteger(n) || n < 1 || n > this.cap) {
      throw new Error("bad token count");
    }
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  available() {
    this.refill();
    return this.tokens;
  }

  waitTime(n = 1) {
    this.refill();
    if (this.tokens >= n) {
      return 0;
    }
    return ((n - this.tokens) / this.rate) * 1000;
  }
}

class SlidingWindow {
  constructor(limit, windowMs, now) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("limit must be a positive integer");
    }
    if (typeof windowMs !== "number" || !(windowMs > 0)) {
      throw new Error("window must be positive");
    }
    if (typeof now !== "function") {
      throw new Error("now must be a function");
    }
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.stamps = [];
  }

  prune() {
    const cutoff = this.now() - this.windowMs;
    while (this.stamps.length > 0 && this.stamps[0] <= cutoff) {
      this.stamps.shift();
    }
  }

  allow() {
    this.prune();
    if (this.stamps.length < this.limit) {
      this.stamps.push(this.now());
      return true;
    }
    return false;
  }

  remaining() {
    this.prune();
    return this.limit - this.stamps.length;
  }
}

class KeyedLimiter {
  constructor(limit, windowMs, now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.byKey = new Map();
  }

  allow(key) {
    if (!this.byKey.has(key)) {
      this.byKey.set(key, new SlidingWindow(this.limit, this.windowMs, this.now));
    }
    return this.byKey.get(key).allow();
  }

  remaining(key) {
    return this.byKey.has(key) ? this.byKey.get(key).remaining() : this.limit;
  }

  keyCount() {
    return this.byKey.size;
  }
}

let t = 0;
const clock = () => t;

const bucket = new TokenBucket(5, 1, clock);
check("starts full", bucket.available(), 5);
check("take 1", bucket.tryTake(), true);
check("take 2", bucket.tryTake(), true);
check("take 3", bucket.tryTake(), true);
check("take 4", bucket.tryTake(), true);
check("take 5", bucket.tryTake(), true);
check("empty now", bucket.tryTake(), false);
t = 1000;
check("one refilled", bucket.tryTake(), true);
check("then empty", bucket.tryTake(), false);
check("available empty", bucket.available(), 0);
check("wait for 2", bucket.waitTime(2), 2000);
t = 3500;
check("fractional tokens", bucket.available(), 2.5);
check("wait for 3", bucket.waitTime(3), 500);
check("wait not needed", bucket.waitTime(2), 0);
t = 100000;
check("capped at capacity", bucket.available(), 5);
check("take too many", raises(() => bucket.tryTake(6)), true);
check("take zero", raises(() => bucket.tryTake(0)), true);
check("take decimal", raises(() => bucket.tryTake(1.5)), true);
check("take several", bucket.tryTake(3), true);
check("left over", bucket.available(), 2);

console.log();
t = 0;
const fast = new TokenBucket(4, 2, clock);
for (let i = 0; i < 4; i++) {
  fast.tryTake();
}
t = 500;
check("rate two refill", fast.tryTake(), true);
check("rate two empty", fast.tryTake(), false);
check("bad capacity", raises(() => new TokenBucket(0, 1, clock)), true);
check("bad rate", raises(() => new TokenBucket(1, 0, clock)), true);
check("bad clock", raises(() => new TokenBucket(1, 1, 5)), true);

console.log();
t = 0;
const win = new SlidingWindow(3, 1000, clock);
check("window 1", win.allow(), true);
check("window 2", win.allow(), true);
check("window 3", win.allow(), true);
check("window full", win.allow(), false);
check("remaining none", win.remaining(), 0);
t = 999;
check("still full", win.allow(), false);
t = 1000;
check("slot frees up", win.allow(), true);
check("remaining two", win.remaining(), 0);
t = 5000;
check("all expired", win.remaining(), 3);
check("bad limit", raises(() => new SlidingWindow(0, 1000, clock)), true);
check("bad window", raises(() => new SlidingWindow(1, 0, clock)), true);

console.log();
t = 0;
const keyed = new KeyedLimiter(2, 1000, clock);
check("user a first", keyed.allow("a"), true);
check("user a second", keyed.allow("a"), true);
check("user a blocked", keyed.allow("a"), false);
check("user b free", keyed.allow("b"), true);
check("remaining b", keyed.remaining("b"), 1);
check("remaining unknown", keyed.remaining("zzz"), 2);
check("key count", keyed.keyCount(), 2);
t = 1000;
check("user a again", keyed.allow("a"), true);

console.log();
let seed = 4242;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
t = 0;
const rb = new TokenBucket(10, 3, clock);
let bucketOk = true;
let taken = 0;
for (let step = 0; step < 500; step++) {
  t += nextRandom(700);
  const k = 1 + nextRandom(3);
  if (rb.tryTake(k)) {
    taken += k;
  }
  const a = rb.available();
  if (a < -1e-9 || a > 10 + 1e-9) {
    bucketOk = false;
  }
  if (taken > 10 + (3 * t) / 1000 + 1e-6) {
    bucketOk = false;
  }
}
check("500 bucket steps", bucketOk, true);

t = 0;
const rw = new SlidingWindow(4, 500, clock);
const accepted = [];
let windowOk = true;
for (let step = 0; step < 500; step++) {
  t += nextRandom(200);
  const inside = accepted.filter((x) => x > t - 500).length;
  const expected = inside < 4;
  if (rw.allow() !== expected) {
    windowOk = false;
  }
  if (expected) {
    accepted.push(t);
  }
}
check("500 window steps", windowOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
