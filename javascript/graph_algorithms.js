const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TopologicalSort {
  constructor() {
    this.adj = new Map();
    this.inDegree = new Map();
  }
  addNode(node) {
    if (!this.adj.has(node)) {
      this.adj.set(node, []);
      this.inDegree.set(node, 0);
    }
  }
  addEdge(from, to) {
    this.addNode(from);
    this.addNode(to);
    this.adj.get(from).push(to);
    this.inDegree.set(to, this.inDegree.get(to) + 1);
  }
  sort() {
    const queue = [];
    for (const [node, deg] of this.inDegree) {
      if (deg === 0) queue.push(node);
    }
    const result = [];
    while (queue.length > 0) {
      const node = queue.shift();
      result.push(node);
      for (const neighbor of this.adj.get(node)) {
        this.inDegree.set(neighbor, this.inDegree.get(neighbor) - 1);
        if (this.inDegree.get(neighbor) === 0) queue.push(neighbor);
      }
    }
    if (result.length !== this.adj.size) throw new Error("cycle detected");
    return result;
  }
  hasCycle() {
    try { this.sort(); return false; } catch (e) { return true; }
  }
  getSources() {
    const sources = [];
    for (const [node, deg] of this.inDegree) {
      if (deg === 0) sources.push(node);
    }
    return sources;
  }
  getSinks() {
    const sinks = [];
    for (const [node, neighbors] of this.adj) {
      if (neighbors.length === 0) sinks.push(node);
    }
    return sinks;
  }
}

class StronglyConnectedComponents {
  constructor() {
    this.adj = new Map();
    this.revAdj = new Map();
  }
  addEdge(from, to) {
    if (!this.adj.has(from)) { this.adj.set(from, []); this.revAdj.set(from, []); }
    if (!this.adj.has(to)) { this.adj.set(to, []); this.revAdj.set(to, []); }
    this.adj.get(from).push(to);
    this.revAdj.get(to).push(from);
  }
  find() {
    const visited = new Set();
    const order = [];
    const dfs1 = (node) => {
      visited.add(node);
      for (const n of (this.adj.get(node) || [])) {
        if (!visited.has(n)) dfs1(n);
      }
      order.push(node);
    };
    for (const node of this.adj.keys()) {
      if (!visited.has(node)) dfs1(node);
    }
    const visited2 = new Set();
    const components = [];
    const dfs2 = (node, component) => {
      visited2.add(node);
      component.push(node);
      for (const n of (this.revAdj.get(node) || [])) {
        if (!visited2.has(n)) dfs2(n, component);
      }
    };
    for (let i = order.length - 1; i >= 0; i--) {
      if (!visited2.has(order[i])) {
        const comp = [];
        dfs2(order[i], comp);
        components.push(comp);
      }
    }
    return components;
  }
}

class BipartiteChecker {
  constructor() {
    this.adj = new Map();
  }
  addEdge(a, b) {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a).push(b);
    this.adj.get(b).push(a);
  }
  isBipartite() {
    const color = new Map();
    for (const start of this.adj.keys()) {
      if (color.has(start)) continue;
      color.set(start, 0);
      const queue = [start];
      while (queue.length > 0) {
        const node = queue.shift();
        for (const neighbor of this.adj.get(node)) {
          if (!color.has(neighbor)) {
            color.set(neighbor, 1 - color.get(node));
            queue.push(neighbor);
          } else if (color.get(neighbor) === color.get(node)) {
            return false;
          }
        }
      }
    }
    return true;
  }
  getColoring() {
    if (!this.isBipartite()) return null;
    const color = new Map();
    for (const start of this.adj.keys()) {
      if (color.has(start)) continue;
      color.set(start, 0);
      const queue = [start];
      while (queue.length > 0) {
        const node = queue.shift();
        for (const neighbor of this.adj.get(node)) {
          if (!color.has(neighbor)) {
            color.set(neighbor, 1 - color.get(node));
            queue.push(neighbor);
          }
        }
      }
    }
    return color;
  }
}

check("topo sort linear chain", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("A", "B"); ts.addEdge("B", "C"); ts.addEdge("C", "D");
  return ts.sort();
})(), ["A", "B", "C", "D"]);
check("topo sort diamond", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("A", "B"); ts.addEdge("A", "C"); ts.addEdge("B", "D"); ts.addEdge("C", "D");
  const sorted = ts.sort();
  return sorted.indexOf("A") === 0 && sorted.indexOf("D") === 3;
})(), true);
check("topo sort cycle detected", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("A", "B"); ts.addEdge("B", "C"); ts.addEdge("C", "A");
  return ts.hasCycle();
})(), true);
check("topo sort no cycle", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("X", "Y");
  return ts.hasCycle();
})(), false);
check("topo sort sources", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("A", "C"); ts.addEdge("B", "C");
  return ts.getSources().sort();
})(), ["A", "B"]);
check("topo sort sinks", (() => {
  const ts = new TopologicalSort();
  ts.addEdge("A", "B"); ts.addEdge("A", "C");
  return ts.getSinks().sort();
})(), ["B", "C"]);
check("scc simple cycle", (() => {
  const scc = new StronglyConnectedComponents();
  scc.addEdge("A", "B"); scc.addEdge("B", "C"); scc.addEdge("C", "A");
  const comps = scc.find();
  return comps.length === 1 && comps[0].length === 3;
})(), true);
check("scc two components", (() => {
  const scc = new StronglyConnectedComponents();
  scc.addEdge("A", "B"); scc.addEdge("B", "A");
  scc.addEdge("C", "D"); scc.addEdge("D", "C");
  scc.addEdge("B", "C");
  return scc.find().length;
})(), 2);
check("scc single nodes", (() => {
  const scc = new StronglyConnectedComponents();
  scc.addEdge("A", "B"); scc.addEdge("B", "C");
  return scc.find().length;
})(), 3);
check("bipartite even cycle", (() => {
  const bc = new BipartiteChecker();
  bc.addEdge(1, 2); bc.addEdge(2, 3); bc.addEdge(3, 4); bc.addEdge(4, 1);
  return bc.isBipartite();
})(), true);
check("bipartite odd cycle", (() => {
  const bc = new BipartiteChecker();
  bc.addEdge(1, 2); bc.addEdge(2, 3); bc.addEdge(3, 1);
  return bc.isBipartite();
})(), false);
check("bipartite coloring valid", (() => {
  const bc = new BipartiteChecker();
  bc.addEdge("A", "B"); bc.addEdge("B", "C"); bc.addEdge("C", "D");
  const colors = bc.getColoring();
  return colors.get("A") !== colors.get("B") && colors.get("B") !== colors.get("C");
})(), true);
check("bipartite non-bipartite coloring null", (() => {
  const bc = new BipartiteChecker();
  bc.addEdge(1, 2); bc.addEdge(2, 3); bc.addEdge(3, 1);
  return bc.getColoring();
})(), null);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
