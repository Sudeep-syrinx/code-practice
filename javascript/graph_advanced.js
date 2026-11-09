const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TopologicalSorter {
  constructor() {
    this.adj = new Map();
    this.inDegree = new Map();
  }
  addNode(node) {
    if (!this.adj.has(node)) { this.adj.set(node, []); this.inDegree.set(node, 0); }
  }
  addEdge(from, to) {
    this.addNode(from); this.addNode(to);
    this.adj.get(from).push(to);
    this.inDegree.set(to, this.inDegree.get(to) + 1);
  }
  sort() {
    const queue = [];
    for (const [node, deg] of this.inDegree) if (deg === 0) queue.push(node);
    const result = [];
    while (queue.length > 0) {
      queue.sort();
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
  allTopologicalOrders() {
    const results = [];
    const inDeg = new Map(this.inDegree);
    const visited = new Set();
    const current = [];
    const backtrack = () => {
      if (current.length === this.adj.size) { results.push([...current]); return; }
      const available = [];
      for (const [node, deg] of inDeg) {
        if (deg === 0 && !visited.has(node)) available.push(node);
      }
      available.sort();
      for (const node of available) {
        visited.add(node);
        current.push(node);
        for (const neighbor of this.adj.get(node)) inDeg.set(neighbor, inDeg.get(neighbor) - 1);
        backtrack();
        for (const neighbor of this.adj.get(node)) inDeg.set(neighbor, inDeg.get(neighbor) + 1);
        current.pop();
        visited.delete(node);
      }
    };
    backtrack();
    return results;
  }
  hasCycle() { try { this.sort(); return false; } catch (e) { return true; } }
  getSources() { const s = []; for (const [n, d] of this.inDegree) if (d === 0) s.push(n); return s.sort(); }
  getSinks() { const s = []; for (const [n, neighbors] of this.adj) if (neighbors.length === 0) s.push(n); return s.sort(); }
  longestPath() {
    const order = this.sort();
    const dist = new Map();
    const pred = new Map();
    for (const node of order) dist.set(node, 0);
    for (const node of order) {
      for (const neighbor of this.adj.get(node)) {
        if (dist.get(node) + 1 > dist.get(neighbor)) {
          dist.set(neighbor, dist.get(node) + 1);
          pred.set(neighbor, node);
        }
      }
    }
    let maxDist = 0, endNode = null;
    for (const [node, d] of dist) { if (d > maxDist) { maxDist = d; endNode = node; } }
    const path = [];
    let cur = endNode;
    while (cur !== undefined) { path.unshift(cur); cur = pred.get(cur); }
    return { length: maxDist, path };
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
  kosaraju() {
    const visited = new Set();
    const order = [];
    const dfs1 = (node) => {
      visited.add(node);
      for (const n of (this.adj.get(node) || [])) if (!visited.has(n)) dfs1(n);
      order.push(node);
    };
    for (const node of this.adj.keys()) if (!visited.has(node)) dfs1(node);
    const visited2 = new Set();
    const components = [];
    const dfs2 = (node, comp) => {
      visited2.add(node);
      comp.push(node);
      for (const n of (this.revAdj.get(node) || [])) if (!visited2.has(n)) dfs2(n, comp);
    };
    for (let i = order.length - 1; i >= 0; i--) {
      if (!visited2.has(order[i])) { const comp = []; dfs2(order[i], comp); components.push(comp.sort()); }
    }
    return components.sort((a, b) => a[0] < b[0] ? -1 : 1);
  }
  tarjan() {
    let index = 0;
    const stack = [];
    const onStack = new Set();
    const indices = new Map();
    const lowlinks = new Map();
    const components = [];
    const strongconnect = (v) => {
      indices.set(v, index);
      lowlinks.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);
      for (const w of (this.adj.get(v) || [])) {
        if (!indices.has(w)) {
          strongconnect(w);
          lowlinks.set(v, Math.min(lowlinks.get(v), lowlinks.get(w)));
        } else if (onStack.has(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v), indices.get(w)));
        }
      }
      if (lowlinks.get(v) === indices.get(v)) {
        const comp = [];
        let w;
        do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
        components.push(comp.sort());
      }
    };
    for (const node of this.adj.keys()) if (!indices.has(node)) strongconnect(node);
    return components.sort((a, b) => a[0] < b[0] ? -1 : 1);
  }
}

class BipartiteChecker {
  constructor() { this.adj = new Map(); }
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
          if (!color.has(neighbor)) { color.set(neighbor, 1 - color.get(node)); queue.push(neighbor); }
          else if (color.get(neighbor) === color.get(node)) return false;
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
          if (!color.has(neighbor)) { color.set(neighbor, 1 - color.get(node)); queue.push(neighbor); }
        }
      }
    }
    return Object.fromEntries(color);
  }
}

class EulerianPath {
  constructor() { this.adj = new Map(); this.degree = new Map(); }
  addUndirectedEdge(u, v) {
    if (!this.adj.has(u)) { this.adj.set(u, []); this.degree.set(u, 0); }
    if (!this.adj.has(v)) { this.adj.set(v, []); this.degree.set(v, 0); }
    this.adj.get(u).push(v);
    this.adj.get(v).push(u);
    this.degree.set(u, this.degree.get(u) + 1);
    this.degree.set(v, this.degree.get(v) + 1);
  }
  hasEulerianCircuit() {
    for (const [, deg] of this.degree) if (deg % 2 !== 0) return false;
    return this._isConnected();
  }
  hasEulerianPath() {
    let oddCount = 0;
    for (const [, deg] of this.degree) if (deg % 2 !== 0) oddCount++;
    return (oddCount === 0 || oddCount === 2) && this._isConnected();
  }
  _isConnected() {
    const nodes = [...this.adj.keys()];
    if (nodes.length === 0) return true;
    const visited = new Set();
    const stack = [nodes[0]];
    while (stack.length > 0) {
      const node = stack.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      for (const neighbor of this.adj.get(node)) if (!visited.has(neighbor)) stack.push(neighbor);
    }
    return visited.size === nodes.length;
  }
  findEulerianPath() {
    if (!this.hasEulerianPath()) return null;
    const adjCopy = new Map();
    for (const [k, v] of this.adj) adjCopy.set(k, [...v]);
    let start = null;
    for (const [node, deg] of this.degree) { if (deg % 2 !== 0) { start = node; break; } }
    if (!start) start = [...this.adj.keys()][0];
    const path = [];
    const stack = [start];
    while (stack.length > 0) {
      const node = stack[stack.length - 1];
      const neighbors = adjCopy.get(node);
      if (neighbors && neighbors.length > 0) {
        const next = neighbors.pop();
        const revNeighbors = adjCopy.get(next);
        const idx = revNeighbors.indexOf(node);
        if (idx !== -1) revNeighbors.splice(idx, 1);
        stack.push(next);
      } else {
        path.push(stack.pop());
      }
    }
    return path.reverse();
  }
}

console.log("=== TOPOLOGICAL SORT ===");
check("topo linear chain", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","B"); ts.addEdge("B","C"); ts.addEdge("C","D"); return ts.sort(); })(), ["A","B","C","D"]);
check("topo diamond", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","B"); ts.addEdge("A","C"); ts.addEdge("B","D"); ts.addEdge("C","D"); const s = ts.sort(); return s.indexOf("A")===0 && s.indexOf("D")===3; })(), true);
check("topo cycle detected", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","B"); ts.addEdge("B","C"); ts.addEdge("C","A"); return ts.hasCycle(); })(), true);
check("topo no cycle", (() => { const ts = new TopologicalSorter(); ts.addEdge("X","Y"); return ts.hasCycle(); })(), false);
check("topo sources", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","C"); ts.addEdge("B","C"); return ts.getSources(); })(), ["A","B"]);
check("topo sinks", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","B"); ts.addEdge("A","C"); return ts.getSinks(); })(), ["B","C"]);
check("topo longest path", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","B"); ts.addEdge("B","C"); ts.addEdge("C","D"); return ts.longestPath().length; })(), 3);
check("topo all orders count", (() => { const ts = new TopologicalSorter(); ts.addEdge("A","C"); ts.addEdge("B","C"); return ts.allTopologicalOrders().length; })(), 2);

console.log("\n=== SCC ===");
check("kosaraju simple cycle", (() => { const scc = new StronglyConnectedComponents(); scc.addEdge("A","B"); scc.addEdge("B","C"); scc.addEdge("C","A"); return scc.kosaraju().length; })(), 1);
check("kosaraju two components", (() => { const scc = new StronglyConnectedComponents(); scc.addEdge("A","B"); scc.addEdge("B","A"); scc.addEdge("C","D"); scc.addEdge("D","C"); scc.addEdge("B","C"); return scc.kosaraju().length; })(), 2);
check("tarjan matches kosaraju", (() => { const scc = new StronglyConnectedComponents(); scc.addEdge("A","B"); scc.addEdge("B","C"); scc.addEdge("C","A"); scc.addEdge("D","E"); scc.addEdge("E","D"); return JSON.stringify(scc.kosaraju()) === JSON.stringify(scc.tarjan()); })(), true);
check("scc single nodes", (() => { const scc = new StronglyConnectedComponents(); scc.addEdge("A","B"); scc.addEdge("B","C"); return scc.kosaraju().length; })(), 3);

console.log("\n=== BIPARTITE ===");
check("bipartite even cycle", (() => { const bc = new BipartiteChecker(); bc.addEdge(1,2); bc.addEdge(2,3); bc.addEdge(3,4); bc.addEdge(4,1); return bc.isBipartite(); })(), true);
check("bipartite odd cycle", (() => { const bc = new BipartiteChecker(); bc.addEdge(1,2); bc.addEdge(2,3); bc.addEdge(3,1); return bc.isBipartite(); })(), false);
check("bipartite coloring valid", (() => { const bc = new BipartiteChecker(); bc.addEdge("A","B"); bc.addEdge("B","C"); bc.addEdge("C","D"); const c = bc.getColoring(); return c["A"]!==c["B"] && c["B"]!==c["C"]; })(), true);
check("non-bipartite coloring null", (() => { const bc = new BipartiteChecker(); bc.addEdge(1,2); bc.addEdge(2,3); bc.addEdge(3,1); return bc.getColoring(); })(), null);

console.log("\n=== EULERIAN PATH ===");
check("euler circuit exists", (() => { const ep = new EulerianPath(); ep.addUndirectedEdge("A","B"); ep.addUndirectedEdge("B","C"); ep.addUndirectedEdge("C","A"); return ep.hasEulerianCircuit(); })(), true);
check("euler path exists", (() => { const ep = new EulerianPath(); ep.addUndirectedEdge("A","B"); ep.addUndirectedEdge("B","C"); return ep.hasEulerianPath(); })(), true);
check("no euler path", (() => { const ep = new EulerianPath(); ep.addUndirectedEdge("A","B"); ep.addUndirectedEdge("A","C"); ep.addUndirectedEdge("A","D"); return ep.hasEulerianPath(); })(), false);
check("euler path visits all edges", (() => { const ep = new EulerianPath(); ep.addUndirectedEdge("A","B"); ep.addUndirectedEdge("B","C"); ep.addUndirectedEdge("C","A"); const path = ep.findEulerianPath(); return path.length === 4; })(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
