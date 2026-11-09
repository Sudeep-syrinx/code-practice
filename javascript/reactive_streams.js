const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(38) + shown.padEnd(46) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

// ============================================================================
// REACTIVE STREAMS PIPELINE WITH BACKPRESSURE
// Covers: Pub/Sub, Request-N Protocol, Operators, Error Handling, Scheduling
// ============================================================================

const SIGNAL = { NEXT: 0, ERROR: 1, COMPLETE: 2 };

class Subscription {
  constructor(publisher, subscriber) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.requested = 0;
    this.cancelled = false;
    this.completed = false;
  }

  request(n) {
    if (!Number.isInteger(n) || n <= 0) throw new Error("request(n) requires positive integer");
    if (this.cancelled || this.completed) return;
    this.requested += n;
    this.publisher._drain(this);
  }

  cancel() {
    this.cancelled = true;
    this.requested = 0;
  }

  canEmit() {
    return !this.cancelled && !this.completed && this.requested > 0;
  }

  consumeDemand() {
    if (this.requested !== Infinity) this.requested--;
  }
}

class Publisher {
  constructor(sourceFn) {
    this.sourceFn = sourceFn;
    this.subscriptions = [];
    this.buffer = [];
    this.error = null;
    this.done = false;
  }

  subscribe(subscriber) {
    if (!subscriber || typeof subscriber.onNext !== "function") throw new Error("Subscriber must have onNext");
    const sub = new Subscription(this, subscriber);
    this.subscriptions.push(sub);
    if (subscriber.onSubscribe) subscriber.onSubscribe(sub);
    if (this.error) {
      if (subscriber.onError) subscriber.onError(this.error);
      sub.completed = true;
    } else if (this.done) {
      if (subscriber.onComplete) subscriber.onComplete();
      sub.completed = true;
    }
    return sub;
  }

  emit(value) {
    if (this.done || this.error) return;
    this.buffer.push(value);
    for (const sub of this.subscriptions) this._drain(sub);
  }

  complete() {
    if (this.done || this.error) return;
    this.done = true;
    for (const sub of this.subscriptions) {
      if (!sub.cancelled && !sub.completed && sub.subscriber.onComplete) {
        sub.subscriber.onComplete();
      }
      sub.completed = true;
    }
  }

  fail(err) {
    if (this.done || this.error) return;
    this.error = err;
    for (const sub of this.subscriptions) {
      if (!sub.cancelled && !sub.completed && sub.subscriber.onError) {
        sub.subscriber.onError(err);
      }
      sub.completed = true;
    }
  }

  _drain(sub) {
    while (sub.canEmit() && this.buffer.length > 0) {
      const val = this.buffer.shift();
      sub.consumeDemand();
      if (sub.subscriber.onNext) sub.subscriber.onNext(val);
    }
    if (sub.canEmit() && this.done && !sub.completed) {
      if (sub.subscriber.onComplete) sub.subscriber.onComplete();
      sub.completed = true;
    }
    if (!sub.completed && this.error) {
      if (sub.subscriber.onError) sub.subscriber.onError(this.error);
      sub.completed = true;
    }
  }

  // Operator: map
  map(fn) {
    if (typeof fn !== "function") throw new Error("map requires function");
    const upstream = this;
    return new Publisher(null).tap(p => {
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => { try { p.emit(fn(v)); } catch(e) { p.fail(e); } },
        onError: e => p.fail(e),
        onComplete: () => p.complete()
      });
    });
  }

  // Operator: filter
  filter(predicate) {
    if (typeof predicate !== "function") throw new Error("filter requires function");
    const upstream = this;
    return new Publisher(null).tap(p => {
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => { try { if (predicate(v)) p.emit(v); } catch(e) { p.fail(e); } },
        onError: e => p.fail(e),
        onComplete: () => p.complete()
      });
    });
  }

  // Operator: take
  take(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error("take requires non-negative integer");
    const upstream = this;
    return new Publisher(null).tap(p => {
      let count = 0;
      let sub = null;
      upstream.subscribe({
        onSubscribe: s => { sub = s; },
        onNext: v => {
          if (count < n) { p.emit(v); count++; }
          if (count >= n) { p.complete(); if (sub) sub.cancel(); }
        },
        onError: e => p.fail(e),
        onComplete: () => p.complete()
      });
    });
  }

  // Operator: buffer (collects n items then emits array)
  buffer(size) {
    if (!Number.isInteger(size) || size < 1) throw new Error("buffer requires positive integer");
    const upstream = this;
    return new Publisher(null).tap(p => {
      let buf = [];
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => {
          buf.push(v);
          if (buf.length >= size) { p.emit([...buf]); buf = []; }
        },
        onError: e => p.fail(e),
        onComplete: () => { if (buf.length > 0) p.emit([...buf]); p.complete(); }
      });
    });
  }

  // Operator: windowByTime (emits arrays at intervals based on item count proxy)
  windowByCount(count) {
    return this.buffer(count);
  }

  // Operator: debounce (emits only if no new value within threshold count)
  debounce(threshold) {
    if (!Number.isInteger(threshold) || threshold < 1) throw new Error("debounce requires positive integer");
    const upstream = this;
    return new Publisher(null).tap(p => {
      let pending = null;
      let counter = 0;
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => {
          pending = v;
          counter = threshold;
        },
        onError: e => p.fail(e),
        onComplete: () => { if (pending !== null) p.emit(pending); p.complete(); }
      });
      // Simulated tick-based debounce via demand
      const origDrain = p._drain.bind(p);
      p._tickDebounce = () => {
        if (counter > 0) {
          counter--;
          if (counter === 0 && pending !== null) {
            p.emit(pending);
            pending = null;
          }
        }
      };
    });
  }

  // Operator: scan (reduce with emission)
  scan(initial, fn) {
    if (typeof fn !== "function") throw new Error("scan requires function");
    const upstream = this;
    return new Publisher(null).tap(p => {
      let acc = initial;
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => { try { acc = fn(acc, v); p.emit(acc); } catch(e) { p.fail(e); } },
        onError: e => p.fail(e),
        onComplete: () => p.complete()
      });
    });
  }

  // Operator: flatMap (merge mapped publishers)
  flatMap(fn) {
    if (typeof fn !== "function") throw new Error("flatMap requires function");
    const upstream = this;
    return new Publisher(null).tap(p => {
      let activeInner = 0;
      let outerDone = false;
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => {
          activeInner++;
          try {
            const inner = fn(v);
            if (!(inner instanceof Publisher)) throw new Error("flatMap fn must return Publisher");
            inner.subscribe({
              onSubscribe: () => {},
              onNext: iv => p.emit(iv),
              onError: e => p.fail(e),
              onComplete: () => {
                activeInner--;
                if (outerDone && activeInner === 0) p.complete();
              }
            });
          } catch(e) { p.fail(e); }
        },
        onError: e => p.fail(e),
        onComplete: () => {
          outerDone = true;
          if (activeInner === 0) p.complete();
        }
      });
    });
  }

  // Operator: distinctUntilChanged
  distinctUntilChanged() {
    const upstream = this;
    return new Publisher(null).tap(p => {
      let last = undefined;
      let hasLast = false;
      upstream.subscribe({
        onSubscribe: () => {},
        onNext: v => {
          if (!hasLast || JSON.stringify(v) !== JSON.stringify(last)) {
            last = v;
            hasLast = true;
            p.emit(v);
          }
        },
        onError: e => p.fail(e),
        onComplete: () => p.complete()
      });
    });
  }

  // Utility: tap for chaining setup
  tap(fn) {
    fn(this);
    return this;
  }

  // Collect all emitted values (for testing)
  collect(maxItems = 10000) {
    return new Promise((resolve, reject) => {
      const collected = [];
      let sub = null;
      this.subscribe({
        onSubscribe: s => { sub = s; s.request(maxItems); },
        onNext: v => { collected.push(v); if (collected.length >= maxItems) { sub.cancel(); resolve(collected); } },
        onError: e => reject(e),
        onComplete: () => resolve(collected)
      });
    });
  }

  // Synchronous collect for simple sources
  collectSync(maxItems = 10000) {
    const collected = [];
    let sub = null;
    this.subscribe({
      onSubscribe: s => { sub = s; s.request(maxItems); },
      onNext: v => { collected.push(v); if (collected.length >= maxItems && sub) sub.cancel(); },
      onError: e => { throw e; },
      onComplete: () => {}
    });
    return collected;
  }
}

// Factory functions
function of(...values) {
  const p = new Publisher(null);
  p.tap(pub => {
    for (const v of values) pub.emit(v);
    pub.complete();
  });
  return p;
}

function fromArray(arr) {
  if (!Array.isArray(arr)) throw new Error("fromArray requires array");
  return of(...arr);
}

function range(start, count) {
  if (!Number.isInteger(start) || !Number.isInteger(count) || count < 0) throw new Error("Invalid range args");
  const vals = [];
  for (let i = 0; i < count; i++) vals.push(start + i);
  return of(...vals);
}

function empty() {
  const p = new Publisher(null);
  p.tap(pub => pub.complete());
  return p;
}

function throwError(err) {
  const p = new Publisher(null);
  p.tap(pub => pub.fail(err));
  return p;
}

function interval(count) {
  const p = new Publisher(null);
  p.tap(pub => {
    for (let i = 0; i < count; i++) pub.emit(i);
    pub.complete();
  });
  return p;
}

function merge(...publishers) {
  const p = new Publisher(null);
  p.tap(pub => {
    let active = publishers.length;
    if (active === 0) { pub.complete(); return; }
    for (const src of publishers) {
      src.subscribe({
        onSubscribe: () => {},
        onNext: v => pub.emit(v),
        onError: e => pub.fail(e),
        onComplete: () => { active--; if (active === 0) pub.complete(); }
      });
    }
  });
  return p;
}

function concat(...publishers) {
  const p = new Publisher(null);
  p.tap(pub => {
    let idx = 0;
    function subscribeNext() {
      if (idx >= publishers.length) { pub.complete(); return; }
      publishers[idx].subscribe({
        onSubscribe: () => {},
        onNext: v => pub.emit(v),
        onError: e => pub.fail(e),
        onComplete: () => { idx++; subscribeNext(); }
      });
    }
    subscribeNext();
  });
  return p;
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== PUBLISHER BASIC TESTS ===");
check("of emits values", of(1,2,3).collectSync(), [1,2,3]);
check("of empty", of().collectSync(), []);
check("fromArray basic", fromArray([10,20]).collectSync(), [10,20]);
check("fromArray empty", fromArray([]).collectSync(), []);
check("fromArray non-array throws", raises(() => fromArray("bad")), true);
check("range basic", range(5, 3).collectSync(), [5,6,7]);
check("range zero count", range(0, 0).collectSync(), []);
check("range invalid throws", raises(() => range(0, -1)), true);
check("empty completes", empty().collectSync(), []);
check("throwError rejects", raises(() => throwError("boom").collectSync()), true);
check("interval emits sequence", interval(5).collectSync(), [0,1,2,3,4]);

console.log("\n=== BACKPRESSURE TESTS ===");
check("subscription request controls flow", (() => {
  const p = new Publisher(null);
  p.tap(pub => { for(let i=0;i<10;i++) pub.emit(i); pub.complete(); });
  const collected = [];
  let sub = null;
  p.subscribe({
    onSubscribe: s => { sub = s; s.request(3); },
    onNext: v => collected.push(v),
    onComplete: () => {}
  });
  return collected;
})(), [0,1,2]);
check("request more resumes", (() => {
  const p = new Publisher(null);
  p.tap(pub => { for(let i=0;i<10;i++) pub.emit(i); pub.complete(); });
  const collected = [];
  let sub = null;
  p.subscribe({
    onSubscribe: s => { sub = s; s.request(2); },
    onNext: v => { collected.push(v); if(collected.length===2) sub.request(3); },
    onComplete: () => {}
  });
  return collected;
})(), [0,1,2,3,4]);
check("cancel stops delivery", (() => {
  const p = new Publisher(null);
  p.tap(pub => { for(let i=0;i<10;i++) pub.emit(i); pub.complete(); });
  const collected = [];
  let sub = null;
  p.subscribe({
    onSubscribe: s => { sub = s; s.request(Infinity); },
    onNext: v => { collected.push(v); if(collected.length===3) sub.cancel(); },
    onComplete: () => {}
  });
  return collected;
})(), [0,1,2]);
check("request invalid throws", (() => {
  const p = of(1);
  let sub = null;
  p.subscribe({ onSubscribe: s => { sub = s; } });
  return raises(() => sub.request(0));
})(), true);
check("request negative throws", (() => {
  const p = of(1);
  let sub = null;
  p.subscribe({ onSubscribe: s => { sub = s; } });
  return raises(() => sub.request(-1));
})(), true);
check("infinity demand works", (() => {
  return range(0, 100).collectSync(Infinity).length;
})(), 100);

console.log("\n=== OPERATOR TESTS ===");
check("map transforms", of(1,2,3).map(x=>x*10).collectSync(), [10,20,30]);
check("map error propagates", raises(() => of(1,2).map(x=>{if(x===2)throw new Error("fail");return x;}).collectSync()), true);
check("map non-fn throws", raises(() => of(1).map("bad")), true);
check("filter keeps matching", of(1,2,3,4,5).filter(x=>x%2===0).collectSync(), [2,4]);
check("filter none match", of(1,3,5).filter(x=>x%2===0).collectSync(), []);
check("filter all match", of(2,4,6).filter(x=>x%2===0).collectSync(), [2,4,6]);
check("filter non-fn throws", raises(() => of(1).filter("bad")), true);
check("take limits count", of(1,2,3,4,5).take(3).collectSync(), [1,2,3]);
check("take zero", of(1,2,3).take(0).collectSync(), []);
check("take more than available", of(1,2).take(10).collectSync(), [1,2]);
check("take invalid throws", raises(() => of(1).take(-1)), true);
check("buffer groups", of(1,2,3,4,5).buffer(2).collectSync(), [[1,2],[3,4],[5]]);
check("buffer exact", of(1,2,3,4).buffer(2).collectSync(), [[1,2],[3,4]]);
check("buffer one", of(1,2,3).buffer(1).collectSync(), [[1],[2],[3]]);
check("buffer invalid throws", raises(() => of(1).buffer(0)), true);
check("scan accumulates", of(1,2,3,4).scan(0,(a,b)=>a+b).collectSync(), [1,3,6,10]);
check("scan initial value", of(1,2).scan(100,(a,b)=>a+b).collectSync(), [101,103]);
check("scan non-fn throws", raises(() => of(1).scan(0,"bad")), true);
check("distinctUntilChanged removes consecutive dups", of(1,1,2,2,2,3,1).distinctUntilChanged().collectSync(), [1,2,3,1]);
check("distinctUntilChanged no dups", of(1,2,3).distinctUntilChanged().collectSync(), [1,2,3]);
check("distinctUntilChanged all same", of(5,5,5,5).distinctUntilChanged().collectSync(), [5]);

console.log("\n=== COMPOSITION TESTS ===");
check("map then filter", of(1,2,3,4,5).map(x=>x*2).filter(x=>x>4).collectSync(), [6,8,10]);
check("filter then map", of(1,2,3,4,5).filter(x=>x%2!==0).map(x=>x*10).collectSync(), [10,30,50]);
check("chained operators", of(1,2,3,4,5,6,7,8).filter(x=>x%2===0).map(x=>x*x).take(3).collectSync(), [4,16,36]);
check("scan then filter", of(1,1,1,1,1).scan(0,(a,b)=>a+b).filter(x=>x>=3).collectSync(), [3,4,5]);
check("buffer then map", of(1,2,3,4).buffer(2).map(arr=>arr.reduce((a,b)=>a+b,0)).collectSync(), [3,7]);
check("distinct then take", of(1,1,2,2,3,3,4).distinctUntilChanged().take(3).collectSync(), [1,2,3]);

console.log("\n=== MERGE & CONCAT TESTS ===");
check("merge combines", merge(of(1,2), of(3,4)).collectSync().sort(), [1,2,3,4]);
check("merge empty", merge().collectSync(), []);
check("merge single", merge(of(1,2,3)).collectSync(), [1,2,3]);
check("concat preserves order", concat(of(1,2), of(3,4)).collectSync(), [1,2,3,4]);
check("concat empty", concat().collectSync(), []);
check("concat three", concat(of(1), of(2), of(3)).collectSync(), [1,2,3]);

console.log("\n=== FLATMAP TESTS ===");
check("flatMap expands", of(1,2,3).flatMap(x=>of(x,x*10)).collectSync(), [1,10,2,20,3,30]);
check("flatMap empty inner", of(1,2).flatMap(x=>of()).collectSync(), []);
check("flatMap nested", of(1,2).flatMap(x=>of(x).map(y=>y+100)).collectSync(), [101,102]);
check("flatMap non-fn throws", raises(() => of(1).flatMap("bad")), true);
check("flatMap non-publisher throws", raises(() => of(1).flatMap(x=>"not_publisher").collectSync()), true);

console.log("\n=== ERROR HANDLING TESTS ===");
check("error terminates stream", (() => {
  const p = new Publisher(null);
  p.tap(pub => { pub.emit(1); pub.emit(2); pub.fail("err"); pub.emit(3); });
  return p.collectSync();
})(), [1,2]);
check("error calls onError", (() => {
  const p = throwError("test_error");
  let caught = null;
  p.subscribe({ onSubscribe: s=>s.request(1), onError: e => { caught = e; } });
  return caught;
})(), "test_error");
check("complete calls onComplete", (() => {
  let completed = false;
  of(1,2).subscribe({ onSubscribe: s=>s.request(10), onComplete: ()=>{completed=true;} });
  return completed;
})(), true);
check("late subscriber gets error", (() => {
  const p = throwError("late_err");
  let caught = null;
  p.subscribe({ onSubscribe: s=>s.request(1), onError: e => { caught = e; } });
  return caught;
})(), "late_err");
check("late subscriber gets complete", (() => {
  let completed = false;
  empty().subscribe({ onSubscribe: s=>s.request(1), onComplete: ()=>{completed=true;} });
  return completed;
})(), true);
check("operator error propagates downstream", (() => {
  let caught = null;
  of(1,2,3).map(x=>{if(x===2)throw"map_err";return x;}).subscribe({
    onSubscribe: s=>s.request(10),
    onNext: ()=>{},
    onError: e=>{caught=e;}
  });
  return caught;
})(), "map_err");

console.log("\n=== ASYNC COLLECT TESTS ===");
check("async collect resolves", async () => {
  const r = await of(10,20,30).collect();
  return r;
}, [10,20,30]);
check("async collect rejects on error", async () => {
  try { await throwError("async_err").collect(); return false; } catch(e) { return e === "async_err"; }
}, true);

console.log("\n=== STRESS / PROPERTY TESTS ===");
let seed = 27182;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }

// Property: map(filter(xs)) === filter(map(xs)) when operations commute
let composeOk = true;
for (let t = 0; t < 100; t++) {
  const len = 5 + nextRandom(30);
  const data = Array.from({length:len}, ()=>nextRandom(100));
  const threshold = nextRandom(50);
  const multiplier = 1 + nextRandom(10);
  const a = fromArray(data).map(x=>x*multiplier).filter(x=>x>threshold).collectSync();
  const b = fromArray(data).filter(x=>x*multiplier>threshold).map(x=>x*multiplier).collectSync();
  if (JSON.stringify(a) !== JSON.stringify(b)) { composeOk = false; break; }
}
check("100 map-filter commutativity", composeOk, true);

// Property: take(n) never emits more than n items
let takeBoundOk = true;
for (let t = 0; t < 100; t++) {
  const len = 10 + nextRandom(100);
  const n = 1 + nextRandom(20);
  const data = Array.from({length:len}, (_,i)=>i);
  const result = fromArray(data).take(n).collectSync();
  if (result.length > n) { takeBoundOk = false; break; }
}
check("100 take bound respected", takeBoundOk, true);

// Property: buffer(size) output flattened equals input
let bufferRoundtripOk = true;
for (let t = 0; t < 100; t++) {
  const len = 5 + nextRandom(50);
  const size = 1 + nextRandom(10);
  const data = Array.from({length:len}, (_,i)=>i);
  const buffered = fromArray(data).buffer(size).collectSync();
  const flat = buffered.flat();
  if (JSON.stringify(flat) !== JSON.stringify(data)) { bufferRoundtripOk = false; break; }
}
check("100 buffer roundtrip", bufferRoundtripOk, true);

// Property: scan with addition produces cumulative sums
let scanCumulativeOk = true;
for (let t = 0; t < 100; t++) {
  const len = 3 + nextRandom(20);
  const data = Array.from({length:len}, ()=>1+nextRandom(10));
  const scanned = fromArray(data).scan(0,(a,b)=>a+b).collectSync();
  let sum = 0;
  let valid = true;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (scanned[i] !== sum) { valid = false; break; }
  }
  if (!valid) { scanCumulativeOk = false; break; }
}
check("100 scan cumulative correctness", scanCumulativeOk, true);

// Property: distinctUntilChanged output has no consecutive duplicates
let distinctOk = true;
for (let t = 0; t < 100; t++) {
  const len = 5 + nextRandom(50);
  const data = Array.from({length:len}, ()=>nextRandom(5)); // High dup probability
  const result = fromArray(data).distinctUntilChanged().collectSync();
  for (let i = 1; i < result.length; i++) {
    if (JSON.stringify(result[i]) === JSON.stringify(result[i-1])) { distinctOk = false; break; }
  }
  if (!distinctOk) break;
}
check("100 distinctUntilChanged property", distinctOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
