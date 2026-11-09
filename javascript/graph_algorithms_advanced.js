const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class DisjointSet {
  constructor(n) {
    this.parent = new Int32Array(n);
    this.rank = new Uint8Array(n);
    this.componentSize = new Int32Array(n);
    this.numComponents = n;
    for (let i = 0; i < n; i++) { this.parent[i] = i; this.componentSize[i] = 1; }
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) { this.parent[ra] = rb; this.componentSize[rb] += this.componentSize[ra]; }
    else if (this.rank[ra] > this.rank[rb]) { this.parent[rb] = ra; this.componentSize[ra] += this.componentSize[rb]; }
    else { this.parent[rb] = ra; this.componentSize[ra] += this.componentSize[rb]; this.rank[ra]++; }
    this.numComponents--;
    return true;
  }
  connected(a, b) { return this.find(a) === this.find(b); }
  sizeOf(x) { return this.componentSize[this.find(x)]; }
  components() { return this.numComponents; }
}

class KruskalMST {
  constructor(numVertices) {
    this.V = numVertices;
    this.edges = [];
  }
  addEdge(u, v, weight) { this.edges.push({ u, v, weight }); }
  compute() {
    const sorted = [...this.edges].sort((a, b) => a.weight - b.weight);
    const dsu = new DisjointSet(this.V);
    const mst = [];
    let totalWeight = 0;
    for (const edge of sorted) {
      if (dsu.union(edge.u, edge.v)) {
        mst.push(edge);
        totalWeight += edge.weight;
        if (mst.length === this.V - 1) break;
      }
    }
    return { edges: mst, totalWeight, connected: dsu.components() === 1 };
  }
}

class Dijkstra {
  constructor(numVertices) {
    this.V = numVertices;
    this.adj = Array.from({ length: numVertices }, () => []);
  }
  addEdge(u, v, weight) {
    this.adj[u].push({ to: v, weight });
  }
  shortestPath(source) {
    const dist = new Float64Array(this.V).fill(Infinity);
    const prev = new Int32Array(this.V).fill(-1);
    const visited = new Uint8Array(this.V);
    dist[source] = 0;
    const pq = [{ node: source, dist: 0 }];
    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { node, dist: d } = pq.shift();
      if (visited[node]) continue;
      visited[node] = 1;
      for (const edge of this.adj[node]) {
        const alt = d + edge.weight;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = node;
          pq.push({ node: edge.to, dist: alt });
        }
      }
    }
    return { distances: [...dist], predecessors: [...prev] };
  }
  getPath(source, target) {
    const { predecessors, distances } = this.shortestPath(source);
    if (distances[target] === Infinity) return null;
    const path = [];
    let cur = target;
    while (cur !== -1) { path.unshift(cur); cur = predecessors[cur]; }
    return { path, distance: distances[target] };
  }
}

class BellmanFord {
  constructor(numVertices) {
    this.V = numVertices;
    this.edges = [];
  }
  addEdge(u, v, weight) { this.edges.push({ u, v, weight }); }
  shortestPath(source) {
    const dist = new Float64Array(this.V).fill(Infinity);
    const prev = new Int32Array(this.V).fill(-1);
    dist[source] = 0;
    for (let i = 0; i < this.V - 1; i++) {
      for (const e of this.edges) {
        if (dist[e.u] !== Infinity && dist[e.u] + e.weight < dist[e.v]) {
          dist[e.v] = dist[e.u] + e.weight;
          prev[e.v] = e.u;
        }
      }
    }
    for (const e of this.edges) {
      if (dist[e.u] !== Infinity && dist[e.u] + e.weight < dist[e.v]) {
        return { hasNegativeCycle: true, distances: [...dist] };
      }
    }
    return { hasNegativeCycle: false, distances: [...dist], predecessors: [...prev] };
  }
}

class FloydWarshall {
  constructor(numVertices) {
    this.V = numVertices;
    this.dist = Array.from({ length: numVertices }, () => new Float64Array(numVertices).fill(Infinity));
    this.next = Array.from({ length: numVertices }, () => new Int32Array(numVertices).fill(-1));
    for (let i = 0; i < numVertices; i++) { this.dist[i][i] = 0; this.next[i][i] = i; }
  }
  addEdge(u, v, weight) {
    if (weight < this.dist[u][v]) {
      this.dist[u][v] = weight;
      this.next[u][v] = v;
    }
  }
  compute() {
    for (let k = 0; k < this.V; k++)
      for (let i = 0; i < this.V; i++)
        for (let j = 0; j < this.V; j++)
          if (this.dist[i][k] + this.dist[k][j] < this.dist[i][j]) {
            this.dist[i][j] = this.dist[i][k] + this.dist[k][j];
            this.next[i][j] = this.next[i][k];
          }
  }
  getDistance(u, v) { return this.dist[u][v]; }
  getPath(u, v) {
    if (this.next[u][v] === -1) return null;
    const path = [u];
    let cur = u;
    while (cur !== v) { cur = this.next[cur][v]; if (cur === -1) return null; path.push(cur); }
    return path;
  }
  hasNegativeCycle() {
    for (let i = 0; i < this.V; i++) if (this.dist[i][i] < 0) return true;
    return false;
  }
}

console.log("=== DISJOINT SET ===");
check("dsu initial components", new DisjointSet(5).components(), 5);
check("dsu union reduces components", (() => { const d = new DisjointSet(5); d.union(0, 1); return d.components(); })(), 4);
check("dsu connected after union", (() => { const d = new DisjointSet(5); d.union(0, 1); return d.connected(0, 1); })(), true);
check("dsu not connected initially", (() => { const d = new DisjointSet(5); return d.connected(0, 1); })(), false);
check("dsu transitive connection", (() => { const d = new DisjointSet(5); d.union(0, 1); d.union(1, 2); return d.connected(0, 2); })(), true);
check("dsu size of component", (() => { const d = new DisjointSet(5); d.union(0, 1); d.union(1, 2); return d.sizeOf(0); })(), 3);
check("dsu redundant union returns false", (() => { const d = new DisjointSet(5); d.union(0, 1); return d.union(0, 1); })(), false);

console.log("\n=== KRUSKAL MST ===");
check("kruskal simple triangle", (() => {
  const k = new KruskalMST(3);
  k.addEdge(0, 1, 1); k.addEdge(1, 2, 2); k.addEdge(0, 2, 3);
  const mst = k.compute();
  return mst.totalWeight === 3 && mst.edges.length === 2 && mst.connected;
})(), true);
check("kruskal disconnected graph", (() => {
  const k = new KruskalMST(4);
  k.addEdge(0, 1, 1); k.addEdge(2, 3, 2);
  return k.compute().connected;
})(), false);
check("kruskal selects minimum edges", (() => {
  const k = new KruskalMST(4);
  k.addEdge(0, 1, 10); k.addEdge(0, 2, 1); k.addEdge(0, 3, 5);
  k.addEdge(1, 2, 3); k.addEdge(1, 3, 8); k.addEdge(2, 3, 2);
  return k.compute().totalWeight;
})(), 6);

console.log("\n=== DIJKSTRA ===");
check("dijkstra simple path", (() => {
  const d = new Dijkstra(4);
  d.addEdge(0, 1, 1); d.addEdge(1, 2, 2); d.addEdge(0, 2, 10);
  return d.getPath(0, 2);
})(), { path: [0, 1, 2], distance: 3 });
check("dijkstra unreachable", (() => {
  const d = new Dijkstra(3);
  d.addEdge(0, 1, 1);
  return d.getPath(0, 2);
})(), null);
check("dijkstra direct vs indirect", (() => {
  const d = new Dijkstra(3);
  d.addEdge(0, 1, 1); d.addEdge(1, 2, 1); d.addEdge(0, 2, 5);
  return d.getPath(0, 2).distance;
})(), 2);
check("dijkstra distances array", (() => {
  const d = new Dijkstra(3);
  d.addEdge(0, 1, 3); d.addEdge(0, 2, 7);
  return d.shortestPath(0).distances;
})(), [0, 3, 7]);

console.log("\n=== BELLMAN-FORD ===");
check("bf simple shortest path", (() => {
  const bf = new BellmanFord(3);
  bf.addEdge(0, 1, 4); bf.addEdge(0, 2, 5); bf.addEdge(1, 2, -3);
  return bf.shortestPath(0).distances[2];
})(), 1);
check("bf detects negative cycle", (() => {
  const bf = new BellmanFord(3);
  bf.addEdge(0, 1, 1); bf.addEdge(1, 2, -1); bf.addEdge(2, 0, -1);
  return bf.shortestPath(0).hasNegativeCycle;
})(), true);
check("bf no negative cycle", (() => {
  const bf = new BellmanFord(3);
  bf.addEdge(0, 1, 1); bf.addEdge(1, 2, 2);
  return bf.shortestPath(0).hasNegativeCycle;
})(), false);

console.log("\n=== FLOYD-WARSHALL ===");
check("fw all pairs shortest", (() => {
  const fw = new FloydWarshall(3);
  fw.addEdge(0, 1, 3); fw.addEdge(1, 2, 1); fw.addEdge(0, 2, 8);
  fw.compute();
  return fw.getDistance(0, 2);
})(), 4);
check("fw path reconstruction", (() => {
  const fw = new FloydWarshall(4);
  fw.addEdge(0, 1, 1); fw.addEdge(1, 2, 2); fw.addEdge(2, 3, 3);
  fw.compute();
  return fw.getPath(0, 3);
})(), [0, 1, 2, 3]);
check("fw unreachable", (() => {
  const fw = new FloydWarshall(3);
  fw.addEdge(0, 1, 1);
  fw.compute();
  return fw.getDistance(0, 2);
})(), Infinity);
check("fw negative cycle detection", (() => {
  const fw = new FloydWarshall(3);
  fw.addEdge(0, 1, 1); fw.addEdge(1, 2, -1); fw.addEdge(2, 0, -1);
  fw.compute();
  return fw.hasNegativeCycle();
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
