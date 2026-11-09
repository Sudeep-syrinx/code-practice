const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class CircuitBreaker {
  constructor(options) {
    this.failureThreshold = (options && options.failureThreshold) || 5;
    this.resetTimeout = (options && options.resetTimeout) || 30000;
    this.halfOpenMax = (options && options.halfOpenMax) || 3;
    this.state = "closed";
    this.failures = 0;
    this.lastFailureTime = 0;
    this.halfOpenSuccesses = 0;
    this.stats = { successes: 0, failures: 0, rejections: 0, stateChanges: 0 };
  }
  getState() {
    if (this.state === "open" && Date.now() - this.lastFailureTime >= this.resetTimeout) {
      this._transition("half-open");
    }
    return this.state;
  }
  _transition(newState) {
    if (this.state !== newState) { this.state = newState; this.stats.stateChanges++; }
  }
  canExecute() {
    const s = this.getState();
    if (s === "closed") return true;
    if (s === "half-open") return this.halfOpenSuccesses < this.halfOpenMax;
    this.stats.rejections++;
    return false;
  }
  recordSuccess() {
    this.stats.successes++;
    if (this.state === "half-open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenMax) { this._transition("closed"); this.failures = 0; }
    } else if (this.state === "closed") {
      this.failures = 0;
    }
  }
  recordFailure() {
    this.stats.failures++;
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === "half-open") { this._transition("open"); }
    else if (this.failures >= this.failureThreshold) { this._transition("open"); }
  }
  reset() { this._transition("closed"); this.failures = 0; this.halfOpenSuccesses = 0; }
  getStats() { return { ...this.stats, state: this.state, failures: this.failures }; }
}

class Bulkhead {
  constructor(maxConcurrent, maxQueueSize) {
    this.maxConcurrent = maxConcurrent || 10;
    this.maxQueueSize = maxQueueSize || 0;
    this.active = 0;
    this.queue = [];
    this.stats = { accepted: 0, rejected: 0, completed: 0 };
  }
  async execute(fn) {
    if (this.active < this.maxConcurrent) {
      this.active++;
      this.stats.accepted++;
      try { return await fn(); } finally { this.active--; this.stats.completed++; this._processQueue(); }
    } else if (this.queue.length < this.maxQueueSize) {
      this.stats.accepted++;
      return new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject, fn });
      });
    } else {
      this.stats.rejected++;
      throw new Error("bulkhead full");
    }
  }
  _processQueue() {
    while (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const item = this.queue.shift();
      this.active++;
      item.fn().then(item.resolve).catch(item.reject).finally(() => { this.active--; this.stats.completed++; this._processQueue(); });
    }
  }
  getActive() { return this.active; }
  getQueueSize() { return this.queue.length; }
  getStats() { return { ...this.stats }; }
}

class RetryPolicy {
  constructor(options) {
    this.maxRetries = (options && options.maxRetries) || 3;
    this.baseDelay = (options && options.baseDelay) || 100;
    this.maxDelay = (options && options.maxDelay) || 5000;
    this.backoffMultiplier = (options && options.backoffMultiplier) || 2;
    this.jitter = (options && options.jitter) || false;
    this.retryableErrors = (options && options.retryableErrors) || null;
    this.stats = { attempts: 0, retries: 0, successes: 0, failures: 0 };
  }
  getDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    delay = Math.min(delay, this.maxDelay);
    if (this.jitter) delay = delay * (0.5 + Math.random() * 0.5);
    return Math.round(delay);
  }
  shouldRetry(attempt, error) {
    if (attempt >= this.maxRetries) return false;
    if (this.retryableErrors && error && !this.retryableErrors.some(e => error instanceof e || error.message === e)) return false;
    if (error && error.retryable === false) return false;
    return true;
  }
  async execute(fn) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.stats.attempts++;
      try {
        const result = await fn(attempt);
        this.stats.successes++;
        return result;
      } catch (e) {
        lastError = e;
        if (!this.shouldRetry(attempt, e)) { this.stats.failures++; throw e; }
        this.stats.retries++;
        const delay = this.getDelay(attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    this.stats.failures++;
    throw lastError;
  }
  getStats() { return { ...this.stats }; }
}

class TimeoutWrapper {
  constructor(timeoutMs) {
    this.timeoutMs = timeoutMs;
    this.stats = { successes: 0, timeouts: 0 };
  }
  async execute(fn) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; this.stats.timeouts++; reject(new Error("timeout after " + this.timeoutMs + "ms")); }
      }, this.timeoutMs);
      fn().then(result => {
        if (!settled) { settled = true; clearTimeout(timer); this.stats.successes++; resolve(result); }
      }).catch(err => {
        if (!settled) { settled = true; clearTimeout(timer); reject(err); }
      });
    });
  }
  getStats() { return { ...this.stats }; }
}

class FallbackChain {
  constructor(fns) { this.fns = fns || []; this.stats = { primarySuccesses: 0, fallbacks: 0, totalFailures: 0 }; }
  add(fn) { this.fns.push(fn); return this; }
  async execute() {
    for (let i = 0; i < this.fns.length; i++) {
      try {
        const result = await this.fns[i]();
        if (i === 0) this.stats.primarySuccesses++; else this.stats.fallbacks++;
        return result;
      } catch (e) {
        if (i === this.fns.length - 1) { this.stats.totalFailures++; throw e; }
      }
    }
  }
  getStats() { return { ...this.stats }; }
}

console.log("=== CIRCUIT BREAKER ===");
check("cb starts closed", new CircuitBreaker().getState(), "closed");
check("cb opens on threshold", (() => { const cb = new CircuitBreaker({ failureThreshold: 3 }); cb.recordFailure(); cb.recordFailure(); cb.recordFailure(); return cb.getState(); })(), "open");
check("cb blocks when open", (() => { const cb = new CircuitBreaker({ failureThreshold: 1 }); cb.recordFailure(); return cb.canExecute(); })(), false);
check("cb resets", (() => { const cb = new CircuitBreaker({ failureThreshold: 2 }); cb.recordFailure(); cb.recordFailure(); cb.reset(); return cb.getState(); })(), "closed");
check("cb success resets failures", (() => { const cb = new CircuitBreaker({ failureThreshold: 3 }); cb.recordFailure(); cb.recordFailure(); cb.recordSuccess(); cb.recordFailure(); cb.recordFailure(); return cb.getState(); })(), "closed");
check("cb stats tracked", (() => { const cb = new CircuitBreaker({ failureThreshold: 2 }); cb.recordSuccess(); cb.recordFailure(); return cb.getStats().successes === 1 && cb.getStats().failures === 1; })(), true);
check("cb state changes counted", (() => { const cb = new CircuitBreaker({ failureThreshold: 1 }); cb.recordFailure(); return cb.getStats().stateChanges; })(), 1);

console.log("\n=== BULKHEAD ===");
check("bulkhead accepts under limit", async () => { const bh = new Bulkhead(2, 0); const r = await bh.execute(async () => 42); return r; }, 42);
check("bulkhead rejects over limit", async () => { const bh = new Bulkhead(1, 0); let resolve1; const p1 = bh.execute(() => new Promise(r => { resolve1 = r; })); try { await bh.execute(async () => 1); return false; } catch (e) { resolve1(1); await p1; return true; } }, true);
check("bulkhead stats", async () => { const bh = new Bulkhead(5, 0); await bh.execute(async () => 1); return bh.getStats().accepted; }, 1);

console.log("\n=== RETRY POLICY ===");
check("retry delay increases", (() => { const rp = new RetryPolicy({ baseDelay: 100, backoffMultiplier: 2 }); return rp.getDelay(0) < rp.getDelay(1) && rp.getDelay(1) < rp.getDelay(2); })(), true);
check("retry caps at max", (() => new RetryPolicy({ baseDelay: 100, maxDelay: 500, backoffMultiplier: 10 }).getDelay(5))(), 500);
check("retry stops at max retries", (() => new RetryPolicy({ maxRetries: 2 }).shouldRetry(2, null))(), false);
check("retry respects non-retryable", (() => new RetryPolicy({ maxRetries: 5 }).shouldRetry(0, { retryable: false }))(), false);
check("retry succeeds eventually", async () => { let attempts = 0; const rp = new RetryPolicy({ maxRetries: 3, baseDelay: 1 }); return await rp.execute(async () => { attempts++; if (attempts < 3) throw new Error("fail"); return "ok"; }); }, "ok");
check("retry stats", async () => { let attempts = 0; const rp = new RetryPolicy({ maxRetries: 3, baseDelay: 1 }); try { await rp.execute(async () => { attempts++; throw new Error("always fail"); }); } catch (e) {} return rp.getStats().retries; }, 3);

console.log("\n=== TIMEOUT ===");
check("timeout succeeds fast", async () => { const tw = new TimeoutWrapper(1000); return await tw.execute(async () => 42); }, 42);
check("timeout rejects slow", async () => { const tw = new TimeoutWrapper(10); try { await tw.execute(() => new Promise(r => setTimeout(() => r(1), 100))); return false; } catch (e) { return true; } }, true);
check("timeout stats", async () => { const tw = new TimeoutWrapper(1000); await tw.execute(async () => 1); return tw.getStats().successes; }, 1);

console.log("\n=== FALLBACK CHAIN ===");
check("fallback primary succeeds", async () => { const fc = new FallbackChain([async () => "primary"]); return await fc.execute(); }, "primary");
check("fallback uses second", async () => { const fc = new FallbackChain([async () => { throw new Error("fail"); }, async () => "backup"]); return await fc.execute(); }, "backup");
check("fallback all fail throws", async () => { const fc = new FallbackChain([async () => { throw new Error("a"); }, async () => { throw new Error("b"); }]); try { await fc.execute(); return false; } catch (e) { return true; } }, true);
check("fallback stats", async () => { const fc = new FallbackChain([async () => { throw new Error("fail"); }, async () => "ok"]); await fc.execute(); return fc.getStats().fallbacks; }, 1);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
