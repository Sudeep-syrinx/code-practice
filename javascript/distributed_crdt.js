const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class VectorClock {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.clock = new Map();
    this.clock.set(nodeId, 0);
  }
  increment() {
    this.clock.set(this.nodeId, (this.clock.get(this.nodeId) || 0) + 1);
  }
  merge(other) {
    for (const [node, ts] of other.clock) {
      const cur = this.clock.get(node) || 0;
      this.clock.set(node, Math.max(cur, ts));
    }
    this.increment();
  }
  happensBefore(other) {
    let atLeastOneLess = false;
    for (const [node, ts] of this.clock) {
      const otherTs = other.clock.get(node) || 0;
      if (ts > otherTs) return false;
      if (ts < otherTs) atLeastOneLess = true;
    }
    for (const [node, ts] of other.clock) {
      if (!this.clock.has(node) && ts > 0) atLeastOneLess = true;
    }
    return atLeastOneLess;
  }
  concurrent(other) {
    return !this.happensBefore(other) && !other.happensBefore(this) && !this.equals(other);
  }
  equals(other) {
    const allKeys = new Set([...this.clock.keys(), ...other.clock.keys()]);
    for (const k of allKeys) {
      if ((this.clock.get(k) || 0) !== (other.clock.get(k) || 0)) return false;
    }
    return true;
  }
  toJSON() { return Object.fromEntries(this.clock); }
}

class CRDTCounter {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.increments = new Map();
    this.decrements = new Map();
  }
  inc(amount = 1) {
    this.increments.set(this.nodeId, (this.increments.get(this.nodeId) || 0) + amount);
  }
  dec(amount = 1) {
    this.decrements.set(this.nodeId, (this.decrements.get(this.nodeId) || 0) + amount);
  }
  value() {
    let total = 0;
    for (const v of this.increments.values()) total += v;
    for (const v of this.decrements.values()) total -= v;
    return total;
  }
  merge(other) {
    for (const [node, val] of other.increments) {
      this.increments.set(node, Math.max(this.increments.get(node) || 0, val));
    }
    for (const [node, val] of other.decrements) {
      this.decrements.set(node, Math.max(this.decrements.get(node) || 0, val));
    }
  }
}

class LWWRegister {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.value = null;
    this.timestamp = 0;
    this.writer = nodeId;
  }
  set(val, ts) {
    if (ts >= this.timestamp) {
      this.value = val;
      this.timestamp = ts;
      this.writer = this.nodeId;
    }
  }
  merge(other) {
    if (other.timestamp > this.timestamp || (other.timestamp === this.timestamp && other.writer > this.writer)) {
      this.value = other.value;
      this.timestamp = other.timestamp;
      this.writer = other.writer;
    }
  }
  get() { return this.value; }
}

class GSet {
  constructor() { this.elements = new Set(); }
  add(val) { this.elements.add(val); }
  has(val) { return this.elements.has(val); }
  merge(other) { for (const e of other.elements) this.elements.add(e); }
  toArray() { return [...this.elements].sort(); }
  size() { return this.elements.size; }
}

class MVMap {
  constructor() {
    this.data = new Map();
  }
  set(key, value, timestamp) {
    if (!this.data.has(key)) this.data.set(key, []);
    const entries = this.data.get(key);
    const existing = entries.findIndex(e => e.timestamp === timestamp);
    if (existing !== -1) entries[existing].value = value;
    else entries.push({ value, timestamp });
  }
  get(key) {
    const entries = this.data.get(key);
    if (!entries || entries.length === 0) return undefined;
    let latest = entries[0];
    for (const e of entries) { if (e.timestamp > latest.timestamp) latest = e; }
    return latest.value;
  }
  getAllVersions(key) {
    return (this.data.get(key) || []).sort((a, b) => a.timestamp - b.timestamp);
  }
  merge(other) {
    for (const [key, entries] of other.data) {
      for (const e of entries) this.set(key, e.value, e.timestamp);
    }
  }
  keys() { return [...this.data.keys()].sort(); }
}

check("vc increment", (() => {
  const vc = new VectorClock("A");
  vc.increment(); vc.increment();
  return vc.toJSON();
})(), { A: 2 });
check("vc merge", (() => {
  const a = new VectorClock("A"); a.increment(); a.increment();
  const b = new VectorClock("B"); b.increment();
  a.merge(b);
  return a.toJSON();
})(), { A: 3, B: 1 });
check("vc happens before", (() => {
  const a = new VectorClock("A"); a.increment();
  const b = new VectorClock("A"); b.merge(a); b.increment();
  return a.happensBefore(b);
})(), true);
check("vc not happens before", (() => {
  const a = new VectorClock("A"); a.increment();
  const b = new VectorClock("B"); b.increment();
  return a.happensBefore(b);
})(), false);
check("vc concurrent", (() => {
  const a = new VectorClock("A"); a.increment();
  const b = new VectorClock("B"); b.increment();
  return a.concurrent(b);
})(), true);
check("vc equals", (() => {
  const a = new VectorClock("A"); a.increment();
  const b = new VectorClock("A"); b.increment();
  return a.equals(b);
})(), true);
check("crdt counter inc", (() => {
  const c = new CRDTCounter("n1");
  c.inc(5); c.inc(3);
  return c.value();
})(), 8);
check("crdt counter dec", (() => {
  const c = new CRDTCounter("n1");
  c.inc(10); c.dec(3);
  return c.value();
})(), 7);
check("crdt counter merge", (() => {
  const a = new CRDTCounter("n1"); a.inc(5);
  const b = new CRDTCounter("n2"); b.inc(3);
  a.merge(b);
  return a.value();
})(), 8);
check("crdt counter merge idempotent", (() => {
  const a = new CRDTCounter("n1"); a.inc(5);
  const b = new CRDTCounter("n1"); b.inc(5);
  a.merge(b);
  return a.value();
})(), 5);
check("lww register set and get", (() => {
  const r = new LWWRegister("A");
  r.set("hello", 1);
  return r.get();
})(), "hello");
check("lww register last writer wins", (() => {
  const r = new LWWRegister("A");
  r.set("old", 1); r.set("new", 2);
  return r.get();
})(), "new");
check("lww register merge higher ts wins", (() => {
  const a = new LWWRegister("A"); a.set("a-val", 1);
  const b = new LWWRegister("B"); b.set("b-val", 2);
  a.merge(b);
  return a.get();
})(), "b-val");
check("gset add and has", (() => {
  const s = new GSet();
  s.add(1); s.add(2);
  return s.has(1) && s.has(2) && !s.has(3);
})(), true);
check("gset merge", (() => {
  const a = new GSet(); a.add(1); a.add(2);
  const b = new GSet(); b.add(2); b.add(3);
  a.merge(b);
  return a.toArray();
})(), [1, 2, 3]);
check("mvmap set and get latest", (() => {
  const m = new MVMap();
  m.set("k", "v1", 1); m.set("k", "v2", 2);
  return m.get("k");
})(), "v2");
check("mvmap all versions", (() => {
  const m = new MVMap();
  m.set("k", "a", 1); m.set("k", "b", 3); m.set("k", "c", 2);
  return m.getAllVersions("k").map(e => e.value);
})(), ["a", "c", "b"]);
check("mvmap merge", (() => {
  const a = new MVMap(); a.set("k", "v1", 1);
  const b = new MVMap(); b.set("k", "v2", 2);
  a.merge(b);
  return a.get("k");
})(), "v2");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
