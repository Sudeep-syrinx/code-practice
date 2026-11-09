const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class GCObject {
  constructor(tag, fields) {
    this.tag = tag;
    this.fields = fields || [];
    this.marked = false;
    this.forwarded = null;
  }
}

class Heap {
  constructor(capacity) {
    this.capacity = capacity;
    this.objects = new Map();
    this.nextId = 0;
    this.allocated = 0;
  }
  alloc(tag, fields) {
    if (this.objects.size >= this.capacity) throw new Error("out of memory");
    const id = this.nextId++;
    this.objects.set(id, new GCObject(tag, fields));
    this.allocated++;
    return id;
  }
  get(id) { return this.objects.get(id); }
  setField(id, fieldIdx, value) {
    const obj = this.objects.get(id);
    if (!obj) throw new Error("invalid object");
    while (obj.fields.length <= fieldIdx) obj.fields.push(null);
    obj.fields[fieldIdx] = value;
  }
  getField(id, fieldIdx) {
    const obj = this.objects.get(id);
    if (!obj || fieldIdx >= obj.fields.length) return null;
    return obj.fields[fieldIdx];
  }
  size() { return this.objects.size; }
}

class MarkCompactCollector {
  constructor(heap) {
    this.heap = heap;
    this.roots = [];
    this.collections = 0;
    this.totalFreed = 0;
  }
  addRoot(id) { if (!this.roots.includes(id)) this.roots.push(id); }
  removeRoot(id) { this.roots = this.roots.filter(r => r !== id); }
  collect() {
    for (const [, obj] of this.heap.objects) obj.marked = false;
    const stack = [...this.roots];
    while (stack.length > 0) {
      const id = stack.pop();
      const obj = this.heap.objects.get(id);
      if (!obj || obj.marked) continue;
      obj.marked = true;
      for (const field of obj.fields) {
        if (typeof field === "number" && this.heap.objects.has(field)) stack.push(field);
      }
    }
    const liveIds = [];
    for (const [id, obj] of this.heap.objects) {
      if (obj.marked) liveIds.push(id);
      else { this.heap.objects.delete(id); this.totalFreed++; }
    }
    const compactMap = new Map();
    let nextAddr = 0;
    for (const id of liveIds) {
      compactMap.set(id, nextAddr++);
    }
    for (const id of liveIds) {
      const obj = this.heap.objects.get(id);
      for (let i = 0; i < obj.fields.length; i++) {
        if (typeof obj.fields[i] === "number" && compactMap.has(obj.fields[i])) {
          obj.fields[i] = compactMap.get(obj.fields[i]);
        }
      }
    }
    this.roots = this.roots.map(r => compactMap.has(r) ? compactMap.get(r) : r);
    this.collections++;
    return this.totalFreed;
  }
  getStats() { return { collections: this.collections, freed: this.totalFreed, heapSize: this.heap.size() }; }
}

class Interpreter {
  constructor(heapCapacity) {
    this.heap = new Heap(heapCapacity || 256);
    this.gc = new MarkCompactCollector(this.heap);
    this.env = new Map();
    this.output = [];
  }
  eval(expr) {
    if (expr.type === "num") return expr.value;
    if (expr.type === "str") return expr.value;
    if (expr.type === "var") {
      if (!this.env.has(expr.name)) throw new Error("undefined: " + expr.name);
      return this.env.get(expr.name);
    }
    if (expr.type === "alloc") {
      const fields = expr.fields.map(f => this.eval(f));
      return this.heap.alloc(expr.tag || "obj", fields);
    }
    if (expr.type === "getfield") {
      const objId = this.eval(expr.obj);
      return this.heap.getField(objId, expr.field);
    }
    if (expr.type === "setfield") {
      const objId = this.eval(expr.obj);
      const val = this.eval(expr.value);
      this.heap.setField(objId, expr.field, val);
      return val;
    }
    if (expr.type === "let") {
      const val = this.eval(expr.value);
      this.env.set(expr.name, val);
      return this.eval(expr.body);
    }
    if (expr.type === "add") return this.eval(expr.left) + this.eval(expr.right);
    if (expr.type === "print") {
      const val = this.eval(expr.value);
      this.output.push(val);
      return val;
    }
    if (expr.type === "gc") {
      return this.gc.collect();
    }
    if (expr.type === "seq") {
      let result;
      for (const e of expr.exprs) result = this.eval(e);
      return result;
    }
    throw new Error("unknown expr type: " + expr.type);
  }
  addRoot(id) { this.gc.addRoot(id); }
  getOutput() { return [...this.output]; }
  heapSize() { return this.heap.size(); }
}

check("heap alloc and get", (() => {
  const h = new Heap(10);
  const id = h.alloc("pair", [1, 2]);
  return h.getField(id, 0);
})(), 1);
check("heap set field", (() => {
  const h = new Heap(10);
  const id = h.alloc("node", [0]);
  h.setField(id, 0, 42);
  return h.getField(id, 0);
})(), 42);
check("heap oom throws", (() => {
  const h = new Heap(1);
  h.alloc("a", []);
  return raises(() => h.alloc("b", []));
})(), true);
check("gc collects unreachable", (() => {
  const h = new Heap(10);
  const gc = new MarkCompactCollector(h);
  h.alloc("garbage", []);
  const root = h.alloc("root", []);
  gc.addRoot(root);
  gc.collect();
  return h.size();
})(), 1);
check("gc keeps reachable chain", (() => {
  const h = new Heap(10);
  const gc = new MarkCompactCollector(h);
  const c = h.alloc("c", []);
  const b = h.alloc("b", [c]);
  const a = h.alloc("a", [b]);
  gc.addRoot(a);
  gc.collect();
  return h.size();
})(), 3);
check("gc stats tracked", (() => {
  const h = new Heap(10);
  const gc = new MarkCompactCollector(h);
  h.alloc("g", []);
  gc.collect();
  return gc.getStats().freed;
})(), 1);
check("interpreter let binding", (() => {
  const interp = new Interpreter();
  return interp.eval({ type: "let", name: "x", value: { type: "num", value: 42 }, body: { type: "var", name: "x" } });
})(), 42);
check("interpreter alloc and getfield", (() => {
  const interp = new Interpreter();
  const id = interp.eval({ type: "alloc", tag: "pair", fields: [{ type: "num", value: 10 }, { type: "num", value: 20 }] });
  interp.addRoot(id);
  return interp.eval({ type: "getfield", obj: { type: "var", name: "__last" }, field: 1 });
})(), 20);
check("interpreter print output", (() => {
  const interp = new Interpreter();
  interp.eval({ type: "print", value: { type: "str", value: "hello" } });
  return interp.getOutput();
})(), ["hello"]);
check("interpreter gc in program", (() => {
  const interp = new Interpreter(10);
  interp.eval({ type: "alloc", tag: "temp", fields: [] });
  const root = interp.eval({ type: "alloc", tag: "root", fields: [] });
  interp.addRoot(root);
  interp.eval({ type: "gc" });
  return interp.heapSize();
})(), 1);
check("interpreter arithmetic", (() => {
  const interp = new Interpreter();
  return interp.eval({ type: "add", left: { type: "num", value: 3 }, right: { type: "num", value: 4 } });
})(), 7);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
