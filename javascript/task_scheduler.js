const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.completed = new Set();
  }
  addTask(id, duration, deps) {
    this.tasks.set(id, { duration, deps: deps || [], start: -1, end: -1 });
  }
  topologicalOrder() {
    const inDeg = new Map();
    const adj = new Map();
    for (const [id] of this.tasks) { inDeg.set(id, 0); adj.set(id, []); }
    for (const [id, task] of this.tasks) {
      for (const dep of task.deps) {
        if (adj.has(dep)) { adj.get(dep).push(id); inDeg.set(id, inDeg.get(id) + 1); }
      }
    }
    const queue = [];
    for (const [id, deg] of inDeg) { if (deg === 0) queue.push(id); }
    const order = [];
    while (queue.length > 0) {
      const node = queue.shift();
      order.push(node);
      for (const next of adj.get(node)) {
        inDeg.set(next, inDeg.get(next) - 1);
        if (inDeg.get(next) === 0) queue.push(next);
      }
    }
    if (order.length !== this.tasks.size) throw new Error("cycle detected");
    return order;
  }
  computeCriticalPath() {
    const order = this.topologicalOrder();
    const earliestStart = new Map();
    const earliestEnd = new Map();
    for (const id of order) {
      const task = this.tasks.get(id);
      let es = 0;
      for (const dep of task.deps) es = Math.max(es, earliestEnd.get(dep) || 0);
      earliestStart.set(id, es);
      earliestEnd.set(id, es + task.duration);
    }
    const projectEnd = Math.max(...earliestEnd.values());
    const latestEnd = new Map();
    const latestStart = new Map();
    const reverseAdj = new Map();
    for (const [id] of this.tasks) reverseAdj.set(id, []);
    for (const [id, task] of this.tasks) {
      for (const dep of task.deps) reverseAdj.get(dep).push(id);
    }
    for (let i = order.length - 1; i >= 0; i--) {
      const id = order[i];
      const task = this.tasks.get(id);
      let le = projectEnd;
      for (const next of reverseAdj.get(id)) le = Math.min(le, latestStart.get(next) || projectEnd);
      latestEnd.set(id, le);
      latestStart.set(id, le - task.duration);
    }
    const criticalPath = [];
    for (const id of order) {
      const slack = latestStart.get(id) - earliestStart.get(id);
      if (Math.abs(slack) < 0.001) criticalPath.push(id);
    }
    return { projectDuration: projectEnd, criticalPath, earliestStart: Object.fromEntries(earliestStart), latestStart: Object.fromEntries(latestStart) };
  }
  simulate() {
    const order = this.topologicalOrder();
    const timeline = [];
    const endTime = new Map();
    for (const id of order) {
      const task = this.tasks.get(id);
      let start = 0;
      for (const dep of task.deps) start = Math.max(start, endTime.get(dep) || 0);
      const end = start + task.duration;
      endTime.set(id, end);
      timeline.push({ id, start, end });
    }
    return timeline;
  }
}

class ResourceAllocator {
  constructor(resources) {
    this.available = new Map();
    for (const [name, qty] of Object.entries(resources)) this.available.set(name, qty);
    this.allocations = new Map();
  }
  allocate(taskId, requirements) {
    for (const [res, qty] of Object.entries(requirements)) {
      if ((this.available.get(res) || 0) < qty) return false;
    }
    for (const [res, qty] of Object.entries(requirements)) {
      this.available.set(res, this.available.get(res) - qty);
    }
    this.allocations.set(taskId, requirements);
    return true;
  }
  release(taskId) {
    const reqs = this.allocations.get(taskId);
    if (!reqs) return false;
    for (const [res, qty] of Object.entries(reqs)) {
      this.available.set(res, this.available.get(res) + qty);
    }
    this.allocations.delete(taskId);
    return true;
  }
  canAllocate(requirements) {
    for (const [res, qty] of Object.entries(requirements)) {
      if ((this.available.get(res) || 0) < qty) return false;
    }
    return true;
  }
  getAvailable() { return Object.fromEntries(this.available); }
  getAllocatedTasks() { return [...this.allocations.keys()].sort(); }
}

check("scheduler topo order", (() => {
  const s = new TaskScheduler();
  s.addTask("A", 2, []); s.addTask("B", 3, ["A"]); s.addTask("C", 1, ["A"]);
  const order = s.topologicalOrder();
  return order.indexOf("A") < order.indexOf("B") && order.indexOf("A") < order.indexOf("C");
})(), true);
check("scheduler cycle throws", (() => {
  const s = new TaskScheduler();
  s.addTask("X", 1, ["Y"]); s.addTask("Y", 1, ["X"]);
  return raises(() => s.topologicalOrder());
})(), true);
check("scheduler critical path", (() => {
  const s = new TaskScheduler();
  s.addTask("A", 3, []); s.addTask("B", 2, ["A"]); s.addTask("C", 1, ["A"]); s.addTask("D", 1, ["B", "C"]);
  const cp = s.computeCriticalPath();
  return cp.projectDuration === 6 && cp.criticalPath.includes("A") && cp.criticalPath.includes("B");
})(), true);
check("scheduler simulate timeline", (() => {
  const s = new TaskScheduler();
  s.addTask("A", 2, []); s.addTask("B", 3, ["A"]);
  const tl = s.simulate();
  return tl.find(t => t.id === "B").start === 2;
})(), true);
check("resource allocator basic", (() => {
  const ra = new ResourceAllocator({ cpu: 4, mem: 8 });
  return ra.allocate("t1", { cpu: 2, mem: 4 });
})(), true);
check("resource allocator insufficient", (() => {
  const ra = new ResourceAllocator({ cpu: 2 });
  return ra.allocate("t1", { cpu: 5 });
})(), false);
check("resource allocator release", (() => {
  const ra = new ResourceAllocator({ cpu: 4 });
  ra.allocate("t1", { cpu: 3 });
  ra.release("t1");
  return ra.getAvailable().cpu;
})(), 4);
check("resource allocator can allocate", (() => {
  const ra = new ResourceAllocator({ gpu: 2 });
  ra.allocate("t1", { gpu: 1 });
  return ra.canAllocate({ gpu: 1 }) && !ra.canAllocate({ gpu: 2 });
})(), true);
check("resource allocator allocated tasks", (() => {
  const ra = new ResourceAllocator({ x: 10 });
  ra.allocate("b", { x: 1 }); ra.allocate("a", { x: 1 });
  return ra.getAllocatedTasks();
})(), ["a", "b"]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
