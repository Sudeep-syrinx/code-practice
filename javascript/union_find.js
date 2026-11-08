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

class UnionFind {
  constructor(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error("n must be a non-negative integer");
    }
    this.n = n;
    this.parent = [];
    this.rank = [];
    this.sizes = [];
    for (let i = 0; i < n; i++) {
      this.parent.push(i);
      this.rank.push(0);
      this.sizes.push(1);
    }
    this.count = n;
  }

  checkIndex(x) {
    if (!Number.isInteger(x) || x < 0 || x >= this.n) {
      throw new Error("index out of range: " + x);
    }
  }

  find(x) {
    this.checkIndex(x);
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) {
      return false;
    }
    if (this.rank[ra] < this.rank[rb]) {
      const t = ra;
      ra = rb;
      rb = t;
    }
    this.parent[rb] = ra;
    this.sizes[ra] += this.sizes[rb];
    if (this.rank[ra] === this.rank[rb]) {
      this.rank[ra]++;
    }
    this.count--;
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }

  componentCount() {
    return this.count;
  }

  sizeOf(x) {
    return this.sizes[this.find(x)];
  }

  groups() {
    const map = new Map();
    for (let i = 0; i < this.n; i++) {
      const r = this.find(i);
      if (!map.has(r)) {
        map.set(r, []);
      }
      map.get(r).push(i);
    }
    return Array.from(map.values());
  }
}

function kruskal(n, edges) {
  const uf = new UnionFind(n);
  const sorted = edges
    .map((e, i) => ({ e: e, i: i }))
    .sort((a, b) => a.e[2] - b.e[2] || a.i - b.i);
  const chosen = [];
  let weight = 0;
  for (const item of sorted) {
    if (uf.union(item.e[0], item.e[1])) {
      chosen.push(item.e);
      weight += item.e[2];
    }
  }
  if (uf.componentCount() > 1) {
    return null;
  }
  return { weight: weight, edges: chosen };
}

function countIslands(grid) {
  const rows = grid.length;
  if (rows === 0) {
    return 0;
  }
  const cols = grid[0].length;
  const uf = new UnionFind(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1") {
        continue;
      }
      if (c + 1 < cols && grid[r][c + 1] === "1") {
        uf.union(r * cols + c, r * cols + c + 1);
      }
      if (r + 1 < rows && grid[r + 1][c] === "1") {
        uf.union(r * cols + c, (r + 1) * cols + c);
      }
    }
  }
  const roots = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") {
        roots.add(uf.find(r * cols + c));
      }
    }
  }
  return roots.size;
}

const uf = new UnionFind(6);
check("starts separate", uf.componentCount(), 6);
check("not connected", uf.connected(0, 1), false);
check("connected to self", uf.connected(3, 3), true);
check("size alone", uf.sizeOf(5), 1);
check("union 0 1", uf.union(0, 1), true);
check("union 1 2", uf.union(1, 2), true);
check("union again", uf.union(0, 2), false);
check("union same", uf.union(2, 2), false);
check("connected chain", uf.connected(0, 2), true);
check("not connected other", uf.connected(0, 3), false);
check("component count", uf.componentCount(), 4);
check("size of group", uf.sizeOf(0), 3);
check("size from member", uf.sizeOf(2), 3);
check("groups", uf.groups(), [[0, 1, 2], [3], [4], [5]]);
uf.union(3, 4);
check("groups after", uf.groups(), [[0, 1, 2], [3, 4], [5]]);
uf.union(2, 4);
check("merged groups", uf.groups(), [[0, 1, 2, 3, 4], [5]]);
check("merged count", uf.componentCount(), 2);
check("merged size", uf.sizeOf(4), 5);

console.log();
check("find too high", raises(() => uf.find(6)), true);
check("find negative", raises(() => uf.find(-1)), true);
check("find decimal", raises(() => uf.find(1.5)), true);
check("find text", raises(() => uf.find("1")), true);
check("union bad index", raises(() => uf.union(0, 9)), true);
check("connected bad index", raises(() => uf.connected(9, 0)), true);
check("constructor negative", raises(() => new UnionFind(-1)), true);
check("constructor decimal", raises(() => new UnionFind(2.5)), true);
check("constructor text", raises(() => new UnionFind("3")), true);
check("zero elements", new UnionFind(0).componentCount(), 0);
check("zero groups", new UnionFind(0).groups(), []);
check("one element", new UnionFind(1).groups(), [[0]]);

console.log();
check("mst example", kruskal(4, [[0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 4], [1, 3, 5]]), { weight: 7, edges: [[0, 1, 1], [1, 2, 2], [2, 3, 4]] });
check("mst second", kruskal(5, [[0, 1, 4], [0, 2, 4], [1, 2, 2], [1, 3, 5], [2, 3, 8], [3, 4, 3]]), { weight: 14, edges: [[1, 2, 2], [3, 4, 3], [0, 1, 4], [1, 3, 5]] });
check("mst disconnected", kruskal(4, [[0, 1, 1]]), null);
check("mst single node", kruskal(1, []), { weight: 0, edges: [] });
check("mst two nodes", kruskal(2, [[0, 1, 9]]), { weight: 9, edges: [[0, 1, 9]] });
check("mst bad vertex", raises(() => kruskal(2, [[0, 5, 1]])), true);
const edgeList = [[0, 1, 3], [1, 2, 3]];
kruskal(3, edgeList);
check("mst keeps input", edgeList, [[0, 1, 3], [1, 2, 3]]);

console.log();
check("islands three", countIslands(["11000", "11000", "00100", "00011"]), 3);
check("islands diagonal", countIslands(["101", "010", "101"]), 5);
check("islands all land", countIslands(["111", "111"]), 1);
check("islands all water", countIslands(["000", "000"]), 0);
check("islands empty", countIslands([]), 0);
check("islands single", countIslands(["1"]), 1);
check("islands ring", countIslands(["111", "101", "111"]), 1);
check("islands one row", countIslands(["1101011"]), 3);

console.log();
let seed = 4711;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let randomOk = true;
for (let round = 0; round < 100; round++) {
  const n = 12;
  const test = new UnionFind(n);
  const label = [];
  for (let i = 0; i < n; i++) {
    label.push(i);
  }
  for (let step = 0; step < 40; step++) {
    const a = nextRandom(n);
    const b = nextRandom(n);
    const expectMerge = label[a] !== label[b];
    if (expectMerge) {
      const from = label[b];
      const to = label[a];
      for (let i = 0; i < n; i++) {
        if (label[i] === from) {
          label[i] = to;
        }
      }
    }
    if (test.union(a, b) !== expectMerge) {
      randomOk = false;
    }
    if (!test.connected(a, b)) {
      randomOk = false;
    }
  }
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (test.connected(a, b) !== (label[a] === label[b])) {
        randomOk = false;
      }
    }
    if (test.sizeOf(a) !== label.filter((x) => x === label[a]).length) {
      randomOk = false;
    }
  }
  if (new Set(label).size !== test.componentCount()) {
    randomOk = false;
  }
}
check("100 random rounds", randomOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
