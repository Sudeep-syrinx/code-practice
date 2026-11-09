const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class RateLimiter {
  constructor(maxTokens, refillRate) {
    if (maxTokens <= 0 || refillRate <= 0) throw new Error("invalid params");
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
  allow(cost = 1) {
    this._refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
  waitTime(cost = 1) {
    this._refill();
    if (this.tokens >= cost) return 0;
    return (cost - this.tokens) / this.refillRate;
  }
  getTokens() { this._refill(); return this.tokens; }
}

class SlidingWindowCounter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = [];
  }
  _cleanup() {
    const cutoff = Date.now() - this.windowMs;
    while (this.requests.length > 0 && this.requests[0] < cutoff) this.requests.shift();
  }
  allow() {
    this._cleanup();
    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      return true;
    }
    return false;
  }
  count() { this._cleanup(); return this.requests.length; }
  remaining() { return Math.max(0, this.maxRequests - this.count()); }
  resetAt() {
    this._cleanup();
    if (this.requests.length === 0) return Date.now();
    return this.requests[0] + this.windowMs;
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = "closed";
    this.failures = 0;
    this.lastFailureTime = 0;
    this.successes = 0;
    this.halfOpenMax = options.halfOpenMax || 3;
    this.halfOpenSuccesses = 0;
  }
  getState() {
    if (this.state === "open" && Date.now() - this.lastFailureTime >= this.resetTimeout) {
      this.state = "half-open";
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }
  canExecute() {
    const s = this.getState();
    return s === "closed" || s === "half-open";
  }
  recordSuccess() {
    if (this.state === "half-open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenMax) {
        this.state = "closed";
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === "half-open") {
      this.state = "open";
    } else if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }
  reset() {
    this.state = "closed";
    this.failures = 0;
    this.halfOpenSuccesses = 0;
  }
}

class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 100;
    this.maxDelay = options.maxDelay || 5000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitter = options.jitter || false;
  }
  getDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    delay = Math.min(delay, this.maxDelay);
    if (this.jitter) delay = delay * (0.5 + Math.random() * 0.5);
    return Math.round(delay);
  }
  shouldRetry(attempt, error) {
    if (attempt >= this.maxRetries) return false;
    if (error && error.retryable === false) return false;
    return true;
  }
  async execute(fn) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (e) {
        lastError = e;
        if (!this.shouldRetry(attempt, e)) throw e;
        const delay = this.getDelay(attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }
}

check("rate limiter initial tokens", (() => {
  const rl = new RateLimiter(10, 1);
  return rl.getTokens();
})(), 10);
check("rate limiter allow consumes", (() => {
  const rl = new RateLimiter(5, 1);
  rl.allow(3);
  return Math.round(rl.getTokens());
})(), 2);
check("rate limiter deny when empty", (() => {
  const rl = new RateLimiter(2, 0.001);
  rl.allow(2);
  return rl.allow(1);
})(), false);
check("rate limiter invalid throws", raises(() => new RateLimiter(0, 1)), true);
check("sliding window allows under limit", (() => {
  const sw = new SlidingWindowCounter(10000, 3);
  return sw.allow() && sw.allow() && sw.allow();
})(), true);
check("sliding window denies over limit", (() => {
  const sw = new SlidingWindowCounter(10000, 2);
  sw.allow(); sw.allow();
  return sw.allow();
})(), false);
check("sliding window count", (() => {
  const sw = new SlidingWindowCounter(10000, 5);
  sw.allow(); sw.allow(); sw.allow();
  return sw.count();
})(), 3);
check("sliding window remaining", (() => {
  const sw = new SlidingWindowCounter(10000, 5);
  sw.allow(); sw.allow();
  return sw.remaining();
})(), 3);
check("circuit breaker starts closed", new CircuitBreaker().getState(), "closed");
check("circuit breaker opens on failures", (() => {
  const cb = new CircuitBreaker({ failureThreshold: 3 });
  cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
  return cb.getState();
})(), "open");
check("circuit breaker blocks when open", (() => {
  const cb = new CircuitBreaker({ failureThreshold: 1 });
  cb.recordFailure();
  return cb.canExecute();
})(), false);
check("circuit breaker resets", (() => {
  const cb = new CircuitBreaker({ failureThreshold: 2 });
  cb.recordFailure(); cb.recordFailure();
  cb.reset();
  return cb.getState();
})(), "closed");
check("retry policy delay increases", (() => {
  const rp = new RetryPolicy({ baseDelay: 100, backoffMultiplier: 2 });
  return rp.getDelay(0) < rp.getDelay(1) && rp.getDelay(1) < rp.getDelay(2);
})(), true);
check("retry policy caps at max", (() => {
  const rp = new RetryPolicy({ baseDelay: 100, maxDelay: 500, backoffMultiplier: 10 });
  return rp.getDelay(5);
})(), 500);
check("retry policy stops at max retries", (() => {
  const rp = new RetryPolicy({ maxRetries: 2 });
  return rp.shouldRetry(2, null);
})(), false);
check("retry policy respects non-retryable", (() => {
  const rp = new RetryPolicy({ maxRetries: 5 });
  return rp.shouldRetry(0, { retryable: false });
})(), false);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
