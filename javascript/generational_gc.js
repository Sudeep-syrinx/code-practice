const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class GenObject {
  constructor(id, generation, size, refs) {
    this.id = id;
    this.generation = generation;
    this.size = size;
    this.refs = refs || [];
    this.marked = false;
    this.age = 0;
  }
}

class GenerationalHeap {
  constructor(youngCap, oldCap, promotionAge) {
    this.youngCap = youngCap || 256;
    this.oldCap = oldCap || 1024;
    this.promotionAge = promotionAge || 3;
    this.young = new Map();
    this.old = new Map();
    this.youngUsed = 0;
    this.oldUsed = 0;
    this.nextId = 0;
    this.roots = new Set();
    this.writeBarriers = [];
    this.stats = {
      minorGCs: 0, majorGCs: 0, promoted: 0,
      youngCollected: 0, oldCollected: 0,
      allocations: 0, totalAllocatedBytes: 0
    };
  }

  alloc(size, refs) {
    this.stats.allocations++;
    this.stats.totalAllocatedBytes += size;
    const id = this.nextId++;
    const obj = new GenObject(id, 0, size, refs || []);
    if (this.youngUsed + size <= this.youngCap) {
      this.young.set(id, obj);
      this.youngUsed += size;
    } else {
      this._minorGC();
      if (this.youngUsed + size <= this.youngCap) {
        this.young.set(id, obj);
        this.youngUsed += size;
      } else {
        obj.generation = 1;
        this.old.set(id, obj);
        this.oldUsed += size;
        this.stats.promoted++;
      }
    }
    return id;
  }

  addRoot(id) { this.roots.add(id); }
  removeRoot(id) { this.roots.delete(id); }

  getObject(id) { return this.young.get(id) || this.old.get(id); }

  setRefs(id, refs) {
    const obj = this.getObject(id);
    if (!obj) throw new Error("object not found: " + id);
    obj.refs = refs;
    if (obj.generation === 1) {
      for (const ref of refs) {
        const target = this.young.get(ref);
        if (target) this.writeBarriers.push({ from: id, to: ref });
      }
    }
  }

  getField(id, fieldIndex) {
    const obj = this.getObject(id);
    if (!obj) return undefined;
    return obj.refs[fieldIndex];
  }

  _markPhase(space) {
    for (const [, obj] of this.young) obj.marked = false;
    for (const [, obj] of this.old) obj.marked = false;
    const stack = [...this.roots];
    for (const wb of this.writeBarriers) stack.push(wb.to);
    while (stack.length > 0) {
      const id = stack.pop();
      const obj = this.young.get(id) || this.old.get(id);
      if (!obj || obj.marked) continue;
      obj.marked = true;
      for (const ref of obj.refs) stack.push(ref);
    }
  }

  _minorGC() {
    this._markPhase("young");
    const survived = new Map();
    let survivedSize = 0;
    for (const [id, obj] of this.young) {
      if (obj.marked) {
        obj.age++;
        if (obj.age >= this.promotionAge) {
          if (this.oldUsed + obj.size <= this.oldCap) {
            obj.generation = 1;
            this.old.set(id, obj);
            this.oldUsed += obj.size;
            this.stats.promoted++;
          } else {
            survived.set(id, obj);
            survivedSize += obj.size;
          }
        } else {
          survived.set(id, obj);
          survivedSize += obj.size;
        }
      } else {
        this.stats.youngCollected++;
      }
    }
    this.young = survived;
    this.youngUsed = survivedSize;
    this.writeBarriers = [];
    this.stats.minorGCs++;
  }

  _majorGC() {
    this._markPhase("old");
    let oldCollected = 0;
    for (const [id, obj] of this.old) {
      if (!obj.marked) {
        this.old.delete(id);
        this.oldUsed -= obj.size;
        oldCollected++;
      }
    }
    let youngCollected = 0;
    for (const [id, obj] of this.young) {
      if (!obj.marked) {
        this.young.delete(id);
        this.youngUsed -= obj.size;
        youngCollected++;
      }
    }
    this.stats.oldCollected += oldCollected;
    this.stats.youngCollected += youngCollected;
    this.stats.majorGCs++;
    this.writeBarriers = [];
  }

  collect() {
    if (this.youngUsed > this.youngCap * 0.75) this._minorGC();
    if (this.oldUsed > this.oldCap * 0.75) this._majorGC();
  }

  forceMinorGC() { this._minorGC(); }
  forceMajorGC() { this._majorGC(); }

  compactOld() {
    const liveIds = [];
    for (const [id, obj] of this.old) liveIds.push(id);
    const idRemap = new Map();
    let nextCompactId = 0;
    for (const id of liveIds) {
      idRemap.set(id, nextCompactId++);
    }
    for (const id of liveIds) {
      const obj = this.old.get(id);
      obj.refs = obj.refs.map(r => idRemap.has(r) ? idRemap.get(r) : r);
    }
    const newOld = new Map();
    for (const id of liveIds) {
      const obj = this.old.get(id);
      newOld.set(idRemap.get(id), obj);
      obj.id = idRemap.get(id);
    }
    this.old = newOld;
    const newRoots = new Set();
    for (const r of this.roots) newRoots.add(idRemap.has(r) ? idRemap.get(r) : r);
    this.roots = newRoots;
  }

  getStats() { return { ...this.stats, youngSize: this.young.size, oldSize: this.old.size, youngUsed: this.youngUsed, oldUsed: this.oldUsed }; }
  totalObjects() { return this.young.size + this.old.size; }
  youngObjects() { return this.young.size; }
  oldObjects() { return this.old.size; }
}

console.log("=== ALLOCATION ===");
check("alloc returns unique ids", (() => {
  const h = new GenerationalHeap(256, 1024);
  const a = h.alloc(10, []);
  const b = h.alloc(10, []);
  return a !== b;
})(), true);
check("alloc young generation", (() => {
  const h = new GenerationalHeap(256, 1024);
  const id = h.alloc(10, []);
  return h.getObject(id).generation;
})(), 0);
check("alloc tracks stats", (() => {
  const h = new GenerationalHeap(256, 1024);
  h.alloc(10, []); h.alloc(20, []);
  return h.getStats().allocations;
})(), 2);
check("alloc total bytes tracked", (() => {
  const h = new GenerationalHeap(256, 1024);
  h.alloc(10, []); h.alloc(20, []);
  return h.getStats().totalAllocatedBytes;
})(), 30);
check("getObject returns correct object", (() => {
  const h = new GenerationalHeap(256, 1024);
  const id = h.alloc(5, [42]);
  return h.getField(id, 0);
})(), 42);

console.log("\n=== ROOTS AND REACHABILITY ===");
check("root survives minor gc", (() => {
  const h = new GenerationalHeap(32, 1024);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 10; i++) h.alloc(5, []);
  h.forceMinorGC();
  return h.getObject(root) !== undefined;
})(), true);
check("unrooted collected in minor gc", (() => {
  const h = new GenerationalHeap(32, 1024);
  for (let i = 0; i < 10; i++) h.alloc(5, []);
  const before = h.youngObjects();
  h.forceMinorGC();
  return h.youngObjects() < before;
})(), true);
check("reference chain survives", (() => {
  const h = new GenerationalHeap(32, 1024);
  const c = h.alloc(5, []);
  const b = h.alloc(5, [c]);
  const a = h.alloc(5, [b]);
  h.addRoot(a);
  for (let i = 0; i < 10; i++) h.alloc(5, []);
  h.forceMinorGC();
  return h.getObject(c) !== undefined && h.getObject(b) !== undefined;
})(), true);
check("removeRoot makes object collectible", (() => {
  const h = new GenerationalHeap(32, 1024);
  const id = h.alloc(5, []);
  h.addRoot(id);
  h.removeRoot(id);
  h.forceMinorGC();
  return h.getObject(id) === undefined;
})(), true);

console.log("\n=== PROMOTION ===");
check("object promoted after aging", (() => {
  const h = new GenerationalHeap(32, 1024, 2);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 15; i++) h.alloc(10, []);
  return h.getObject(root).generation;
})(), 1);
check("promotion moves to old space", (() => {
  const h = new GenerationalHeap(32, 1024, 2);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 15; i++) h.alloc(10, []);
  return h.oldObjects() > 0;
})(), true);
check("promotion stat tracked", (() => {
  const h = new GenerationalHeap(32, 1024, 2);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 15; i++) h.alloc(10, []);
  return h.getStats().promoted > 0;
})(), true);
check("young object stays young below age threshold", (() => {
  const h = new GenerationalHeap(32, 1024, 5);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 8; i++) h.alloc(10, []);
  return h.getObject(root).generation;
})(), 0);

console.log("\n=== MAJOR GC ===");
check("major gc collects old garbage", (() => {
  const h = new GenerationalHeap(10, 40, 1);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 20; i++) h.alloc(5, []);
  const before = h.totalObjects();
  h.forceMajorGC();
  return h.totalObjects() < before;
})(), true);
check("major gc preserves rooted old objects", (() => {
  const h = new GenerationalHeap(10, 100, 1);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 20; i++) h.alloc(5, []);
  h.forceMajorGC();
  return h.getObject(root) !== undefined;
})(), true);
check("major gc stat tracked", (() => {
  const h = new GenerationalHeap(10, 40, 1);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 20; i++) h.alloc(5, []);
  h.forceMajorGC();
  return h.getStats().majorGCs;
})(), 1);

console.log("\n=== WRITE BARRIER ===");
check("write barrier tracks old-to-young ref", (() => {
  const h = new GenerationalHeap(32, 1024, 1);
  const young = h.alloc(5, []);
  const old = h.alloc(5, []);
  h.addRoot(old);
  for (let i = 0; i < 10; i++) h.alloc(10, []);
  h.setRefs(old, [young]);
  h.forceMinorGC();
  return h.getObject(young) !== undefined;
})(), true);
check("setRefs invalid object throws", (() => {
  const h = new GenerationalHeap(256, 1024);
  return raises(() => h.setRefs(999, []));
})(), true);

console.log("\n=== COMPACTION ===");
check("compact old preserves live objects", (() => {
  const h = new GenerationalHeap(10, 100, 1);
  const a = h.alloc(5, []);
  const b = h.alloc(5, []);
  h.addRoot(a); h.addRoot(b);
  for (let i = 0; i < 20; i++) h.alloc(5, []);
  h.forceMajorGC();
  h.compactOld();
  return h.getObject(a) !== undefined || h.getObject(b) !== undefined;
})(), true);

console.log("\n=== AUTO COLLECTION ===");
check("auto minor gc triggers on threshold", (() => {
  const h = new GenerationalHeap(20, 1024);
  for (let i = 0; i < 30; i++) h.alloc(5, []);
  return h.getStats().minorGCs > 0;
})(), true);
check("collect method works", (() => {
  const h = new GenerationalHeap(20, 1024);
  const root = h.alloc(5, []);
  h.addRoot(root);
  for (let i = 0; i < 20; i++) h.alloc(5, []);
  h.collect();
  return h.getObject(root) !== undefined;
})(), true);

console.log("\n=== STATS AND COUNTING ===");
check("totalObjects accurate", (() => {
  const h = new GenerationalHeap(256, 1024);
  h.alloc(5, []); h.alloc(5, []); h.alloc(5, []);
  return h.totalObjects();
})(), 3);
check("youngObjects accurate", (() => {
  const h = new GenerationalHeap(256, 1024);
  h.alloc(5, []); h.alloc(5, []);
  return h.youngObjects();
})(), 2);
check("oldObjects initially zero", new GenerationalHeap(256, 1024).oldObjects(), 0);
check("stats youngCollected tracked", (() => {
  const h = new GenerationalHeap(20, 1024);
  for (let i = 0; i < 10; i++) h.alloc(5, []);
  h.forceMinorGC();
  return h.getStats().youngCollected > 0;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
