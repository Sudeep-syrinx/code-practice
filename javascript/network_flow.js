const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MaxFlowNetwork {
  constructor(numVertices) {
    this.V = numVertices;
    this.capacity = Array.from({ length: numVertices }, () => new Float64Array(numVertices));
    this.flow = Array.from({ length: numVertices }, () => new Float64Array(numVertices));
    this.adj = Array.from({ length: numVertices }, () => []);
  }
  addEdge(u, v, cap) {
    this.capacity[u][v] += cap;
    if (!this.adj[u].includes(v)) this.adj[u].push(v);
    if (!this.adj[v].includes(u)) this.adj[v].push(u);
  }
  _bfs(source, sink, parent) {
    const visited = new Uint8Array(this.V);
    visited[source] = 1;
    const queue = [source];
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of this.adj[u]) {
        if (!visited[v] && this.capacity[u][v] - this.flow[u][v] > 1e-9) {
          visited[v] = 1;
          parent[v] = u;
          if (v === sink) return true;
          queue.push(v);
        }
      }
    }
    return false;
  }
  edmondsKarp(source, sink) {
    for (let i = 0; i < this.V; i++) this.flow[i].fill(0);
    let maxFlow = 0;
    const parent = new Int32Array(this.V).fill(-1);
    while (this._bfs(source, sink, parent)) {
      let pathFlow = Infinity;
      for (let v = sink; v !== source; v = parent[v]) {
        const u = parent[v];
        pathFlow = Math.min(pathFlow, this.capacity[u][v] - this.flow[u][v]);
      }
      for (let v = sink; v !== source; v = parent[v]) {
        const u = parent[v];
        this.flow[u][v] += pathFlow;
        this.flow[v][u] -= pathFlow;
      }
      maxFlow += pathFlow;
      parent.fill(-1);
    }
    return maxFlow;
  }
  getFlow(u, v) { return this.flow[u][v]; }
  getMinCut(source, sink) {
    this.edmondsKarp(source, sink);
    const visited = new Uint8Array(this.V);
    const queue = [source];
    visited[source] = 1;
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of this.adj[u]) {
        if (!visited[v] && this.capacity[u][v] - this.flow[u][v] > 1e-9) {
          visited[v] = 1;
          queue.push(v);
        }
      }
    }
    const cutEdges = [];
    for (let u = 0; u < this.V; u++) {
      if (visited[u]) {
        for (const v of this.adj[u]) {
          if (!visited[v] && this.capacity[u][v] > 0) {
            cutEdges.push({ u, v, capacity: this.capacity[u][v] });
          }
        }
      }
    }
    return { sourceSide: visited, cutEdges };
  }
}

class BipartiteMatching {
  constructor(leftSize, rightSize) {
    this.L = leftSize;
    this.R = rightSize;
    this.adj = Array.from({ length: leftSize }, () => []);
    this.matchL = new Int32Array(leftSize).fill(-1);
    this.matchR = new Int32Array(rightSize).fill(-1);
  }
  addEdge(left, right) {
    if (left >= 0 && left < this.L && right >= 0 && right < this.R) {
      this.adj[left].push(right);
    }
  }
  _dfs(u, visited) {
    for (const v of this.adj[u]) {
      if (visited[v]) continue;
      visited[v] = true;
      if (this.matchR[v] === -1 || this._dfs(this.matchR[v], visited)) {
        this.matchR[v] = u;
        this.matchL[u] = v;
        return true;
      }
    }
    return false;
  }
  maxMatching() {
    this.matchL.fill(-1);
    this.matchR.fill(-1);
    let matching = 0;
    for (let u = 0; u < this.L; u++) {
      const visited = new Uint8Array(this.R);
      if (this._dfs(u, visited)) matching++;
    }
    return matching;
  }
  getMatching() {
    const pairs = [];
    for (let u = 0; u < this.L; u++) {
      if (this.matchL[u] !== -1) pairs.push([u, this.matchL[u]]);
    }
    return pairs;
  }
  isMatched(left) { return this.matchL[left] !== -1; }
}

class HungarianAlgorithm {
  constructor(costMatrix) {
    this.n = costMatrix.length;
    this.cost = costMatrix.map(row => [...row]);
  }
  solve() {
    const n = this.n;
    const u = new Float64Array(n + 1);
    const v = new Float64Array(n + 1);
    const p = new Int32Array(n + 1);
    const way = new Int32Array(n + 1);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(n + 1).fill(Infinity);
      const used = new Uint8Array(n + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = Infinity, j1 = -1;
        for (let j = 1; j <= n; j++) {
          if (used[j]) continue;
          const cur = this.cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
          else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }
    const assignment = new Int32Array(n);
    for (let j = 1; j <= n; j++) if (p[j] !== 0) assignment[p[j] - 1] = j - 1;
    let totalCost = 0;
    for (let i = 0; i < n; i++) totalCost += this.cost[i][assignment[i]];
    return { assignment: [...assignment], totalCost };
  }
}

console.log("=== MAX FLOW ===");
check("max flow simple path", (() => {
  const g = new MaxFlowNetwork(4);
  g.addEdge(0, 1, 10); g.addEdge(1, 2, 5); g.addEdge(2, 3, 10);
  return g.edmondsKarp(0, 3);
})(), 5);
check("max flow parallel paths", (() => {
  const g = new MaxFlowNetwork(4);
  g.addEdge(0, 1, 10); g.addEdge(0, 2, 10);
  g.addEdge(1, 3, 10); g.addEdge(2, 3, 10);
  return g.edmondsKarp(0, 3);
})(), 20);
check("max flow bottleneck", (() => {
  const g = new MaxFlowNetwork(4);
  g.addEdge(0, 1, 100); g.addEdge(1, 2, 1); g.addEdge(2, 3, 100);
  return g.edmondsKarp(0, 3);
})(), 1);
check("max flow no path", (() => {
  const g = new MaxFlowNetwork(3);
  g.addEdge(0, 1, 5);
  return g.edmondsKarp(0, 2);
})(), 0);
check("max flow diamond graph", (() => {
  const g = new MaxFlowNetwork(4);
  g.addEdge(0, 1, 3); g.addEdge(0, 2, 3);
  g.addEdge(1, 3, 3); g.addEdge(2, 3, 3);
  g.addEdge(1, 2, 2);
  return g.edmondsKarp(0, 3);
})(), 6);
check("min cut edges", (() => {
  const g = new MaxFlowNetwork(4);
  g.addEdge(0, 1, 10); g.addEdge(1, 2, 5); g.addEdge(2, 3, 10);
  const cut = g.getMinCut(0, 3);
  return cut.cutEdges.length > 0;
})(), true);

console.log("\n=== BIPARTITE MATCHING ===");
check("matching complete bipartite", (() => {
  const bm = new BipartiteMatching(3, 3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) bm.addEdge(i, j);
  return bm.maxMatching();
})(), 3);
check("matching partial", (() => {
  const bm = new BipartiteMatching(3, 3);
  bm.addEdge(0, 0); bm.addEdge(1, 1);
  return bm.maxMatching();
})(), 2);
check("matching none", (() => {
  const bm = new BipartiteMatching(3, 3);
  return bm.maxMatching();
})(), 0);
check("matching pairs valid", (() => {
  const bm = new BipartiteMatching(3, 3);
  bm.addEdge(0, 1); bm.addEdge(1, 0); bm.addEdge(2, 2);
  bm.maxMatching();
  const pairs = bm.getMatching();
  const leftUsed = new Set(pairs.map(p => p[0]));
  const rightUsed = new Set(pairs.map(p => p[1]));
  return leftUsed.size === pairs.length && rightUsed.size === pairs.length;
})(), true);
check("isMatched", (() => {
  const bm = new BipartiteMatching(2, 2);
  bm.addEdge(0, 0);
  bm.maxMatching();
  return bm.isMatched(0) && !bm.isMatched(1);
})(), true);

console.log("\n=== HUNGARIAN ALGORITHM ===");
check("hungarian identity matrix", (() => {
  const h = new HungarianAlgorithm([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  return h.solve().totalCost;
})(), 0);
check("hungarian simple assignment", (() => {
  const h = new HungarianAlgorithm([[1, 2, 3], [2, 4, 6], [3, 6, 9]]);
  const result = h.solve();
  return result.totalCost;
})(), 10);
check("hungarian all same cost", (() => {
  const h = new HungarianAlgorithm([[5, 5, 5], [5, 5, 5], [5, 5, 5]]);
  return h.solve().totalCost;
})(), 15);
check("hungarian assignment is permutation", (() => {
  const h = new HungarianAlgorithm([[1, 2], [3, 4]]);
  const a = h.solve().assignment;
  return new Set(a).size === a.length;
})(), true);
check("hungarian 4x4", (() => {
  const h = new HungarianAlgorithm([
    [82, 83, 69, 92],
    [77, 37, 49, 92],
    [11, 69, 5, 86],
    [8, 9, 98, 23]
  ]);
  const result = h.solve();
  return result.assignment.length === 4 && new Set(result.assignment).size === 4;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
