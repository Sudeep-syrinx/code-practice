const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MarkSweepGC {
  constructor() {
    this.heap = new Map();
    this.roots = new Set();
    this.nextId = 0;
    this.stats = { allocated: 0, collected: 0, collections: 0 };
  }
  allocate(size, data) {
    const id = this.nextId++;
    this.heap.set(id, { size, data, marked: false, refs: [] });
    this.stats.allocated++;
    return id;
  }
  addRoot(id) { this.roots.add(id); }
  removeRoot(id) { this.roots.delete(id); }
  addRef(from, to) {
    if (!this.heap.has(from) || !this.heap.has(to)) throw new Error("invalid ref");
    this.heap.get(from).refs.push(to);
  }
  mark() {
    for (const [, obj] of this.heap) obj.marked = false;
    const stack = [...this.roots];
    while (stack.length > 0) {
      const id = stack.pop();
      const obj = this.heap.get(id);
      if (!obj || obj.marked) continue;
      obj.marked = true;
      for (const ref of obj.refs) stack.push(ref);
    }
  }
  sweep() {
    const freed = [];
    for (const [id, obj] of this.heap) {
      if (!obj.marked) {
        freed.push(id);
        this.heap.delete(id);
        this.stats.collected++;
      }
    }
    this.stats.collections++;
    return freed;
  }
  collect() { this.mark(); return this.sweep(); }
  getObject(id) { return this.heap.get(id); }
  heapSize() { return this.heap.size; }
  getStats() { return { ...this.stats }; }
}

class ReferenceCountingGC {
  constructor() {
    this.heap = new Map();
    this.nextId = 0;
    this.stats = { allocated: 0, collected: 0 };
  }
  allocate(data) {
    const id = this.nextId++;
    this.heap.set(id, { data, refCount: 1, refs: new Set() });
    this.stats.allocated++;
    return id;
  }
  addRef(from, to) {
    if (!this.heap.has(from) || !this.heap.has(to)) throw new Error("invalid ref");
    if (!this.heap.get(from).refs.has(to)) {
      this.heap.get(from).refs.add(to);
      this.heap.get(to).refCount++;
    }
  }
  removeRef(from, to) {
    if (!this.heap.has(from)) return;
    const fromObj = this.heap.get(from);
    if (fromObj.refs.has(to)) {
      fromObj.refs.delete(to);
      this._decrementRef(to);
    }
  }
  _decrementRef(id) {
    const obj = this.heap.get(id);
    if (!obj) return;
    obj.refCount--;
    if (obj.refCount <= 0) {
      const refs = [...obj.refs];
      this.heap.delete(id);
      this.stats.collected++;
      for (const ref of refs) this._decrementRef(ref);
    }
  }
  release(id) { this._decrementRef(id); }
  getObject(id) { return this.heap.get(id); }
  heapSize() { return this.heap.size; }
  getStats() { return { ...this.stats }; }
}

class GenerationalGC {
  constructor(youngCap) {
    this.youngCap = youngCap || 10;
    this.young = new Map();
    this.old = new Map();
    this.roots = new Set();
    this.nextId = 0;
    this.minorCollections = 0;
    this.majorCollections = 0;
    this.promoted = 0;
  }
  allocate(data) {
    const id = this.nextId++;
    this.young.set(id, { data, refs: [], age: 0, marked: false });
    return id;
  }
  addRoot(id) { this.roots.add(id); }
  addRef(from, to) {
    const obj = this.young.get(from) || this.old.get(from);
    const target = this.young.get(to) || this.old.get(to);
    if (!obj || !target) throw new Error("invalid ref");
    obj.refs.push(to);
  }
  minorCollect() {
    for (const [, obj] of this.young) obj.marked = false;
    const stack = [...this.roots].filter(r => this.young.has(r));
    while (stack.length > 0) {
      const id = stack.pop();
      const obj = this.young.get(id);
      if (!obj || obj.marked) continue;
      obj.marked = true;
      for (const ref of obj.refs) { if (this.young.has(ref)) stack.push(ref); }
    }
    const survived = [];
    for (const [id, obj] of this.young) {
      if (obj.marked) {
        obj.age++;
        if (obj.age >= 3) {
          this.old.set(id, { data: obj.data, refs: obj.refs, marked: false });
          this.promoted++;
        } else {
          survived.push([id, obj]);
        }
      }
    }
    this.young.clear();
    for (const [id, obj] of survived) this.young.set(id, obj);
    this.minorCollections++;
    return survived.length;
  }
  majorCollect() {
    for (const [, obj] of this.old) obj.marked = false;
    for (const [, obj] of this.young) obj.marked = false;
    const stack = [...this.roots];
    while (stack.length > 0) {
      const id = stack.pop();
      const obj = this.old.get(id) || this.young.get(id);
      if (!obj || obj.marked) continue;
      obj.marked = true;
      for (const ref of obj.refs) stack.push(ref);
    }
    let freed = 0;
    for (const [id, obj] of this.old) { if (!obj.marked) { this.old.delete(id); freed++; } }
    for (const [id, obj] of this.young) { if (!obj.marked) { this.young.delete(id); freed++; } }
    this.majorCollections++;
    return freed;
  }
  totalHeapSize() { return this.young.size + this.old.size; }
}

check("mark sweep basic collection", (() => {
  const gc = new MarkSweepGC();
  const a = gc.allocate(1, "a");
  const b = gc.allocate(1, "b");
  gc.addRoot(a);
  gc.collect();
  return gc.heapSize();
})(), 1);
check("mark sweep keeps reachable chain", (() => {
  const gc = new MarkSweepGC();
  const a = gc.allocate(1, "a");
  const b = gc.allocate(1, "b");
  const c = gc.allocate(1, "c");
  gc.addRoot(a);
  gc.addRef(a, b);
  gc.addRef(b, c);
  gc.collect();
  return gc.heapSize();
})(), 3);
check("mark sweep stats", (() => {
  const gc = new MarkSweepGC();
  gc.allocate(1, "x");
  gc.collect();
  return gc.getStats().collected;
})(), 1);
check("mark sweep invalid ref throws", (() => {
  const gc = new MarkSweepGC();
  return raises(() => gc.addRef(99, 98));
})(), true);
check("refcount basic release", (() => {
  const gc = new ReferenceCountingGC();
  const a = gc.allocate("a");
  gc.release(a);
  return gc.heapSize();
})(), 0);
check("refcount shared ref survives", (() => {
  const gc = new ReferenceCountingGC();
  const a = gc.allocate("a");
  const b = gc.allocate("b");
  gc.addRef(a, b);
  gc.release(b);
  return gc.heapSize();
})(), 2);
check("refcount cascade delete", (() => {
  const gc = new ReferenceCountingGC();
  const a = gc.allocate("a");
  const b = gc.allocate("b");
  gc.addRef(a, b);
  gc.release(a);
  return gc.heapSize();
})(), 0);
check("gen gc promotes after aging", (() => {
  const gc = new GenerationalGC(5);
  const a = gc.allocate("a");
  gc.addRoot(a);
  gc.minorCollect(); gc.minorCollect(); gc.minorCollect();
  return gc.old.size;
})(), 1);
check("gen gc minor collects unreachable", (() => {
  const gc = new GenerationalGC(5);
  gc.allocate("garbage");
  gc.minorCollect();
  return gc.young.size;
})(), 0);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
