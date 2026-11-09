const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TokenBucket {
  constructor(capacity, refillRate) {
    if (capacity <= 0 || refillRate <= 0) throw new Error("invalid params");
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
  consume(count) {
    this._refill();
    if (count === undefined) count = 1;
    if (this.tokens >= count) { this.tokens -= count; return true; }
    return false;
  }
  waitTime(count) {
    this._refill();
    if (count === undefined) count = 1;
    if (this.tokens >= count) return 0;
    return (count - this.tokens) / this.refillRate;
  }
  getTokens() { this._refill(); return this.tokens; }
  getCapacity() { return this.capacity; }
}

class LeakyBucket {
  constructor(capacity, leakRate) {
    if (capacity <= 0 || leakRate <= 0) throw new Error("invalid params");
    this.capacity = capacity;
    this.leakRate = leakRate;
    this.water = 0;
    this.lastLeak = Date.now();
  }
  _leak() {
    const now = Date.now();
    const elapsed = (now - this.lastLeak) / 1000;
    this.water = Math.max(0, this.water - elapsed * this.leakRate);
    this.lastLeak = now;
  }
  allow() {
    this._leak();
    if (this.water < this.capacity) { this.water++; return true; }
    return false;
  }
  getWaterLevel() { this._leak(); return this.water; }
  getCapacity() { return this.capacity; }
}

class SlidingWindowLog {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.timestamps = [];
  }
  _cleanup() {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) this.timestamps.shift();
  }
  allow() {
    this._cleanup();
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return true;
    }
    return false;
  }
  count() { this._cleanup(); return this.timestamps.length; }
  remaining() { return Math.max(0, this.maxRequests - this.count()); }
  resetAt() {
    this._cleanup();
    if (this.timestamps.length === 0) return Date.now();
    return this.timestamps[0] + this.windowMs;
  }
}

class SlidingWindowCounter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.currentWindowStart = Math.floor(Date.now() / windowMs) * windowMs;
    this.currentCount = 0;
    this.previousCount = 0;
  }
  _advanceWindow() {
    const now = Date.now();
    const currentStart = Math.floor(now / this.windowMs) * this.windowMs;
    if (currentStart !== this.currentWindowStart) {
      if (currentStart - this.currentWindowStart === this.windowMs) {
        this.previousCount = this.currentCount;
      } else {
        this.previousCount = 0;
      }
      this.currentCount = 0;
      this.currentWindowStart = currentStart;
    }
  }
  _weightedCount() {
    const now = Date.now();
    const elapsed = now - this.currentWindowStart;
    const weight = 1 - elapsed / this.windowMs;
    return this.previousCount * weight + this.currentCount;
  }
  allow() {
    this._advanceWindow();
    if (this._weightedCount() < this.maxRequests) {
      this.currentCount++;
      return true;
    }
    return false;
  }
  count() { this._advanceWindow(); return Math.round(this._weightedCount()); }
  remaining() { return Math.max(0, this.maxRequests - this.count()); }
}

class RateLimiterChain {
  constructor(limiters) {
    this.limiters = limiters || [];
  }
  add(limiter) { this.limiters.push(limiter); return this; }
  allow() {
    for (const limiter of this.limiters) {
      if (!limiter.allow()) return false;
    }
    return true;
  }
}

class AdaptiveRateLimiter {
  constructor(initialRate, minRate, maxRate, adjustmentFactor) {
    this.rate = initialRate;
    this.minRate = minRate;
    this.maxRate = maxRate;
    this.adjustmentFactor = adjustmentFactor || 0.5;
    this.bucket = new TokenBucket(maxRate, initialRate);
    this.successCount = 0;
    this.failureCount = 0;
    this.windowStart = Date.now();
    this.windowMs = 5000;
  }
  allow() {
    this._maybeAdjust();
    return this.bucket.consume(1);
  }
  recordSuccess() { this.successCount++; }
  recordFailure() { this.failureCount++; }
  _maybeAdjust() {
    const now = Date.now();
    if (now - this.windowStart < this.windowMs) return;
    const total = this.successCount + this.failureCount;
    if (total > 0) {
      const failureRatio = this.failureCount / total;
      if (failureRatio > 0.5) {
        this.rate = Math.max(this.minRate, this.rate * (1 - this.adjustmentFactor));
      } else if (failureRatio < 0.1) {
        this.rate = Math.min(this.maxRate, this.rate * (1 + this.adjustmentFactor));
      }
      this.bucket = new TokenBucket(this.maxRate, this.rate);
    }
    this.successCount = 0;
    this.failureCount = 0;
    this.windowStart = now;
  }
  getCurrentRate() { return this.rate; }
}

console.log("=== TOKEN BUCKET ===");
check("tb initial tokens equal capacity", (() => {
  const tb = new TokenBucket(10, 1);
  return Math.round(tb.getTokens());
})(), 10);
check("tb consume reduces tokens", (() => {
  const tb = new TokenBucket(10, 0.001);
  tb.consume(3);
  return Math.round(tb.getTokens());
})(), 7);
check("tb deny when empty", (() => {
  const tb = new TokenBucket(2, 0.001);
  tb.consume(2);
  return tb.consume(1);
})(), false);
check("tb consume multiple", (() => {
  const tb = new TokenBucket(10, 0.001);
  return tb.consume(5);
})(), true);
check("tb invalid params throws", raises(() => new TokenBucket(0, 1)), true);
check("tb wait time zero when available", (() => {
  const tb = new TokenBucket(10, 1);
  return tb.waitTime(1);
})(), 0);
check("tb wait time positive when empty", (() => {
  const tb = new TokenBucket(1, 0.001);
  tb.consume(1);
  return tb.waitTime(1) > 0;
})(), true);

console.log("\n=== LEAKY BUCKET ===");
check("lb allow under capacity", (() => {
  const lb = new LeakyBucket(5, 0.001);
  return lb.allow() && lb.allow() && lb.allow();
})(), true);
check("lb deny over capacity", (() => {
  const lb = new LeakyBucket(2, 0.001);
  lb.allow(); lb.allow();
  return lb.allow();
})(), false);
check("lb water level tracks", (() => {
  const lb = new LeakyBucket(10, 0.001);
  lb.allow(); lb.allow(); lb.allow();
  return Math.round(lb.getWaterLevel());
})(), 3);
check("lb invalid params throws", raises(() => new LeakyBucket(0, 1)), true);

console.log("\n=== SLIDING WINDOW LOG ===");
check("swl allows under limit", (() => {
  const sw = new SlidingWindowLog(10000, 3);
  return sw.allow() && sw.allow() && sw.allow();
})(), true);
check("swl denies over limit", (() => {
  const sw = new SlidingWindowLog(10000, 2);
  sw.allow(); sw.allow();
  return sw.allow();
})(), false);
check("swl count accurate", (() => {
  const sw = new SlidingWindowLog(10000, 5);
  sw.allow(); sw.allow(); sw.allow();
  return sw.count();
})(), 3);
check("swl remaining accurate", (() => {
  const sw = new SlidingWindowLog(10000, 5);
  sw.allow(); sw.allow();
  return sw.remaining();
})(), 3);

console.log("\n=== SLIDING WINDOW COUNTER ===");
check("swc allows under limit", (() => {
  const sw = new SlidingWindowCounter(10000, 3);
  return sw.allow() && sw.allow() && sw.allow();
})(), true);
check("swc denies over limit", (() => {
  const sw = new SlidingWindowCounter(10000, 2);
  sw.allow(); sw.allow();
  return sw.allow();
})(), false);
check("swc count approximate", (() => {
  const sw = new SlidingWindowCounter(10000, 10);
  sw.allow(); sw.allow(); sw.allow();
  return sw.count() >= 2 && sw.count() <= 4;
})(), true);

console.log("\n=== RATE LIMITER CHAIN ===");
check("chain all pass", (() => {
  const chain = new RateLimiterChain();
  chain.add(new SlidingWindowLog(10000, 10));
  chain.add(new SlidingWindowLog(10000, 10));
  return chain.allow();
})(), true);
check("chain one fails blocks", (() => {
  const chain = new RateLimiterChain();
  const strict = new SlidingWindowLog(10000, 1);
  strict.allow();
  chain.add(strict);
  chain.add(new SlidingWindowLog(10000, 10));
  return chain.allow();
})(), false);

console.log("\n=== ADAPTIVE RATE LIMITER ===");
check("arl initial rate", (() => {
  const arl = new AdaptiveRateLimiter(10, 1, 100);
  return arl.getCurrentRate();
})(), 10);
check("arl allows requests", (() => {
  const arl = new AdaptiveRateLimiter(100, 1, 100);
  return arl.allow();
})(), true);
check("arl adjusts on failures", (() => {
  const arl = new AdaptiveRateLimiter(10, 1, 100, 0.5);
  arl.windowMs = 0;
  for (let i = 0; i < 10; i++) arl.recordFailure();
  arl.allow();
  return arl.getCurrentRate() < 10;
})(), true);
check("arl increases on success", (() => {
  const arl = new AdaptiveRateLimiter(10, 1, 100, 0.5);
  arl.windowMs = 0;
  for (let i = 0; i < 10; i++) arl.recordSuccess();
  arl.allow();
  return arl.getCurrentRate() > 10;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
