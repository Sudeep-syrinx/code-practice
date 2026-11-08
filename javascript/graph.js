const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

class Graph {
  constructor(directed) {
    this.directed = directed === true;
    this.adj = new Map();
  }

  addNode(n) {
    if (!this.adj.has(n)) {
      this.adj.set(n, new Map());
    }
  }

  addEdge(a, b, w) {
    if (w === undefined) {
      w = 1;
    }
    if (typeof w !== "number" || Number.isNaN(w) || w < 0) {
      throw new Error("weight must be a non-negative number");
    }
    this.addNode(a);
    this.addNode(b);
    this.adj.get(a).set(b, w);
    if (!this.directed) {
      this.adj.get(b).set(a, w);
    }
  }

  nodes() {
    return Array.from(this.adj.keys()).sort();
  }

  neighbors(n) {
    if (!this.adj.has(n)) {
      throw new Error("unknown node: " + n);
    }
    return Array.from(this.adj.get(n).keys()).sort();
  }

  edgeCount() {
    let total = 0;
    for (const m of this.adj.values()) {
      total += m.size;
    }
    return this.directed ? total : total / 2;
  }

  bfs(start) {
    const seen = new Set([start]);
    const order = [];
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const n = queue[head++];
      order.push(n);
      for (const m of this.neighbors(n)) {
        if (!seen.has(m)) {
          seen.add(m);
          queue.push(m);
        }
      }
    }
    return order;
  }

  dfs(start) {
    const seen = new Set();
    const order = [];
    const visit = (n) => {
      seen.add(n);
      order.push(n);
      for (const m of this.neighbors(n)) {
        if (!seen.has(m)) {
          visit(m);
        }
      }
    };
    this.neighbors(start);
    visit(start);
    return order;
  }

  hasPath(a, b) {
    return this.bfs(a).includes(b);
  }

  shortestPath(a, b) {
    if (a === b) {
      this.neighbors(a);
      return [a];
    }
    const parent = new Map();
    const seen = new Set([a]);
    const queue = [a];
    let head = 0;
    while (head < queue.length) {
      const n = queue[head++];
      for (const m of this.neighbors(n)) {
        if (!seen.has(m)) {
          seen.add(m);
          parent.set(m, n);
          if (m === b) {
            const path = [b];
            let cur = b;
            while (parent.has(cur)) {
              cur = parent.get(cur);
              path.push(cur);
            }
            return path.reverse();
          }
          queue.push(m);
        }
      }
    }
    return null;
  }

  dijkstra(start) {
    this.neighbors(start);
    const dist = new Map();
    const done = new Set();
    dist.set(start, 0);
    while (true) {
      let best = null;
      for (const [node, d] of dist) {
        if (!done.has(node) && (best === null || d < dist.get(best))) {
          best = node;
        }
      }
      if (best === null) {
        break;
      }
      done.add(best);
      for (const [m, w] of this.adj.get(best)) {
        const candidate = dist.get(best) + w;
        if (!dist.has(m) || candidate < dist.get(m)) {
          dist.set(m, candidate);
        }
      }
    }
    const out = {};
    for (const node of this.nodes()) {
      if (dist.has(node)) {
        out[node] = dist.get(node);
      }
    }
    return out;
  }

  topoSort() {
    if (!this.directed) {
      throw new Error("topological sort needs a directed graph");
    }
    const indegree = new Map();
    for (const n of this.nodes()) {
      indegree.set(n, 0);
    }
    for (const m of this.adj.values()) {
      for (const target of m.keys()) {
        indegree.set(target, indegree.get(target) + 1);
      }
    }
    const ready = this.nodes().filter((n) => indegree.get(n) === 0);
    const order = [];
    while (ready.length > 0) {
      ready.sort();
      const n = ready.shift();
      order.push(n);
      for (const m of this.neighbors(n)) {
        indegree.set(m, indegree.get(m) - 1);
        if (indegree.get(m) === 0) {
          ready.push(m);
        }
      }
    }
    return order.length === this.adj.size ? order : null;
  }

  components() {
    const seen = new Set();
    const out = [];
    for (const n of this.nodes()) {
      if (!seen.has(n)) {
        const group = this.bfs(n).sort();
        for (const m of group) {
          seen.add(m);
        }
        out.push(group);
      }
    }
    return out;
  }
}

const g = new Graph();
g.addEdge("A", "B");
g.addEdge("A", "C");
g.addEdge("B", "D");
g.addEdge("C", "D");
g.addEdge("D", "E");
g.addEdge("F", "G");

check("nodes", g.nodes(), ["A", "B", "C", "D", "E", "F", "G"]);
check("neighbors A", g.neighbors("A"), ["B", "C"]);
check("neighbors D", g.neighbors("D"), ["B", "C", "E"]);
check("neighbors E", g.neighbors("E"), ["D"]);
check("edge count", g.edgeCount(), 6);
check("unknown neighbors", raises(() => g.neighbors("Z")), true);
check("bfs from A", g.bfs("A"), ["A", "B", "C", "D", "E"]);
check("bfs from E", g.bfs("E"), ["E", "D", "B", "C", "A"]);
check("bfs other part", g.bfs("F"), ["F", "G"]);
check("dfs from A", g.dfs("A"), ["A", "B", "D", "C", "E"]);
check("dfs unknown", raises(() => g.dfs("Z")), true);
check("bfs unknown", raises(() => g.bfs("Z")), true);

console.log();
check("has path yes", g.hasPath("A", "E"), true);
check("has path no", g.hasPath("A", "F"), false);
check("has path self", g.hasPath("A", "A"), true);
check("shortest A to E", g.shortestPath("A", "E"), ["A", "B", "D", "E"]);
check("shortest A to D", g.shortestPath("A", "D"), ["A", "B", "D"]);
check("shortest self", g.shortestPath("A", "A"), ["A"]);
check("shortest none", g.shortestPath("A", "F"), null);
check("shortest neighbor", g.shortestPath("F", "G"), ["F", "G"]);
check("shortest unknown", raises(() => g.shortestPath("Z", "A")), true);
check("components", g.components(), [["A", "B", "C", "D", "E"], ["F", "G"]]);
check("topo undirected raises", raises(() => g.topoSort()), true);
check("negative weight raises", raises(() => g.addEdge("X", "Y", -1)), true);
check("text weight raises", raises(() => g.addEdge("X", "Y", "2")), true);

console.log();
const w = new Graph();
w.addEdge("A", "B", 4);
w.addEdge("A", "C", 1);
w.addEdge("C", "B", 2);
w.addEdge("B", "D", 1);
w.addEdge("C", "D", 5);
w.addNode("Z");
check("dijkstra from A", w.dijkstra("A"), { A: 0, B: 3, C: 1, D: 4 });
check("dijkstra from D", w.dijkstra("D"), { A: 4, B: 1, C: 3, D: 0 });
check("dijkstra isolated", w.dijkstra("Z"), { Z: 0 });
check("dijkstra unknown", raises(() => w.dijkstra("Q")), true);
check("weighted edges", w.edgeCount(), 5);

console.log();
const d = new Graph(true);
d.addEdge("a", "b");
d.addEdge("a", "c");
d.addEdge("b", "d");
d.addEdge("c", "d");
d.addEdge("e", "c");
const order = d.topoSort();
check("topo order", order, ["a", "b", "e", "c", "d"]);
let orderOk = true;
for (const from of d.nodes()) {
  for (const to of d.neighbors(from)) {
    if (order.indexOf(from) >= order.indexOf(to)) {
      orderOk = false;
    }
  }
}
check("topo respects edges", orderOk, true);
check("directed edge count", d.edgeCount(), 5);
check("directed neighbors", d.neighbors("d"), []);
check("directed one way", d.hasPath("d", "a"), false);
check("directed forward", d.hasPath("a", "d"), true);
const cycle = new Graph(true);
cycle.addEdge("a", "b");
cycle.addEdge("b", "c");
cycle.addEdge("c", "a");
check("cycle gives null", cycle.topoSort(), null);
const lone = new Graph(true);
lone.addNode("x");
check("single node topo", lone.topoSort(), ["x"]);
check("empty topo", new Graph(true).topoSort(), []);

console.log();
const chain = new Graph();
function name(i) {
  return "n" + String(i).padStart(3, "0");
}
for (let i = 0; i < 199; i++) {
  chain.addEdge(name(i), name(i + 1));
}
check("chain nodes", chain.nodes().length, 200);
check("chain edges", chain.edgeCount(), 199);
check("chain path length", chain.shortestPath(name(0), name(199)).length, 200);
check("chain bfs length", chain.bfs(name(0)).length, 200);
check("chain dfs length", chain.dfs(name(0)).length, 200);
check("chain dijkstra end", chain.dijkstra(name(0))[name(199)], 199);
check("chain one component", chain.components().length, 1);
check("chain path ends", chain.shortestPath(name(5), name(8)), [name(5), name(6), name(7), name(8)]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
