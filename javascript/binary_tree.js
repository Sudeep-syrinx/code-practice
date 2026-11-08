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

class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BST {
  constructor() {
    this.root = null;
    this.count = 0;
  }

  insert(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error("value must be a number");
    }
    if (this.contains(value)) {
      return false;
    }
    const node = new TreeNode(value);
    if (this.root === null) {
      this.root = node;
      this.count++;
      return true;
    }
    let cur = this.root;
    while (true) {
      if (value < cur.value) {
        if (cur.left === null) {
          cur.left = node;
          break;
        }
        cur = cur.left;
      } else {
        if (cur.right === null) {
          cur.right = node;
          break;
        }
        cur = cur.right;
      }
    }
    this.count++;
    return true;
  }

  contains(value) {
    let cur = this.root;
    while (cur !== null) {
      if (value === cur.value) {
        return true;
      }
      cur = value < cur.value ? cur.left : cur.right;
    }
    return false;
  }

  size() {
    return this.count;
  }

  min() {
    if (this.root === null) {
      throw new Error("tree is empty");
    }
    let cur = this.root;
    while (cur.left !== null) {
      cur = cur.left;
    }
    return cur.value;
  }

  max() {
    if (this.root === null) {
      throw new Error("tree is empty");
    }
    let cur = this.root;
    while (cur.right !== null) {
      cur = cur.right;
    }
    return cur.value;
  }

  heightOf(node) {
    if (node === null) {
      return 0;
    }
    return 1 + Math.max(this.heightOf(node.left), this.heightOf(node.right));
  }

  height() {
    return this.heightOf(this.root);
  }

  depthOf(value) {
    let cur = this.root;
    let depth = 0;
    while (cur !== null) {
      if (value === cur.value) {
        return depth;
      }
      cur = value < cur.value ? cur.left : cur.right;
      depth++;
    }
    return -1;
  }

  inOrder() {
    const out = [];
    const walk = (n) => {
      if (n === null) {
        return;
      }
      walk(n.left);
      out.push(n.value);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }

  preOrder() {
    const out = [];
    const walk = (n) => {
      if (n === null) {
        return;
      }
      out.push(n.value);
      walk(n.left);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }

  postOrder() {
    const out = [];
    const walk = (n) => {
      if (n === null) {
        return;
      }
      walk(n.left);
      walk(n.right);
      out.push(n.value);
    };
    walk(this.root);
    return out;
  }

  levelOrder() {
    if (this.root === null) {
      return [];
    }
    const out = [];
    const queue = [this.root];
    let head = 0;
    while (head < queue.length) {
      const n = queue[head++];
      out.push(n.value);
      if (n.left !== null) {
        queue.push(n.left);
      }
      if (n.right !== null) {
        queue.push(n.right);
      }
    }
    return out;
  }

  remove(value) {
    let removed = false;
    const del = (node, v) => {
      if (node === null) {
        return null;
      }
      if (v < node.value) {
        node.left = del(node.left, v);
        return node;
      }
      if (v > node.value) {
        node.right = del(node.right, v);
        return node;
      }
      removed = true;
      if (node.left === null) {
        return node.right;
      }
      if (node.right === null) {
        return node.left;
      }
      let succ = node.right;
      while (succ.left !== null) {
        succ = succ.left;
      }
      node.value = succ.value;
      node.right = del(node.right, succ.value);
      return node;
    };
    this.root = del(this.root, value);
    if (removed) {
      this.count--;
    }
    return removed;
  }

  range(lo, hi) {
    return this.inOrder().filter((v) => v >= lo && v <= hi);
  }

  kth(k) {
    if (!Number.isInteger(k) || k < 1 || k > this.count) {
      throw new Error("k out of range: " + k);
    }
    return this.inOrder()[k - 1];
  }

  lca(a, b) {
    if (!this.contains(a) || !this.contains(b)) {
      throw new Error("both values must be in the tree");
    }
    let cur = this.root;
    while (cur !== null) {
      if (a < cur.value && b < cur.value) {
        cur = cur.left;
      } else if (a > cur.value && b > cur.value) {
        cur = cur.right;
      } else {
        return cur.value;
      }
    }
    return null;
  }
}

function build(values) {
  const t = new BST();
  for (const v of values) {
    t.insert(v);
  }
  return t;
}

const BASE = [50, 30, 70, 20, 40, 60, 80];

const empty = new BST();
check("empty size", empty.size(), 0);
check("empty in order", empty.inOrder(), []);
check("empty level order", empty.levelOrder(), []);
check("empty height", empty.height(), 0);
check("empty contains", empty.contains(1), false);
check("empty min raises", raises(() => empty.min()), true);
check("empty max raises", raises(() => empty.max()), true);
check("insert text raises", raises(() => empty.insert("5")), true);
check("insert NaN raises", raises(() => empty.insert(NaN)), true);

console.log();
const t = build(BASE);
check("size", t.size(), 7);
check("in order", t.inOrder(), [20, 30, 40, 50, 60, 70, 80]);
check("pre order", t.preOrder(), [50, 30, 20, 40, 70, 60, 80]);
check("post order", t.postOrder(), [20, 40, 30, 60, 80, 70, 50]);
check("level order", t.levelOrder(), [50, 30, 70, 20, 40, 60, 80]);
check("height", t.height(), 3);
check("min", t.min(), 20);
check("max", t.max(), 80);
check("contains yes", t.contains(60), true);
check("contains no", t.contains(65), false);
check("duplicate insert", t.insert(40), false);
check("size after duplicate", t.size(), 7);
check("depth root", t.depthOf(50), 0);
check("depth child", t.depthOf(30), 1);
check("depth leaf", t.depthOf(20), 2);
check("depth missing", t.depthOf(99), -1);

console.log();
check("range middle", t.range(35, 65), [40, 50, 60]);
check("range all", t.range(0, 100), [20, 30, 40, 50, 60, 70, 80]);
check("range none", t.range(81, 90), []);
check("kth first", t.kth(1), 20);
check("kth middle", t.kth(4), 50);
check("kth last", t.kth(7), 80);
check("kth zero raises", raises(() => t.kth(0)), true);
check("kth too high", raises(() => t.kth(8)), true);
check("kth decimal", raises(() => t.kth(1.5)), true);
check("lca siblings", t.lca(20, 40), 30);
check("lca across root", t.lca(20, 80), 50);
check("lca right side", t.lca(60, 80), 70);
check("lca same node", t.lca(30, 30), 30);
check("lca ancestor", t.lca(30, 40), 30);
check("lca missing raises", raises(() => t.lca(20, 99)), true);

console.log();
const r1 = build(BASE);
check("remove leaf", r1.remove(20), true);
check("leaf gone", r1.inOrder(), [30, 40, 50, 60, 70, 80]);
check("size after leaf", r1.size(), 6);

const r2 = build(BASE);
r2.remove(30);
check("remove two children", r2.inOrder(), [20, 40, 50, 60, 70, 80]);
check("two children shape", r2.levelOrder(), [50, 40, 70, 20, 60, 80]);

const r3 = build(BASE);
r3.remove(50);
check("remove root", r3.inOrder(), [20, 30, 40, 60, 70, 80]);
check("root shape", r3.levelOrder(), [60, 30, 70, 20, 40, 80]);

const r4 = build([10, 5, 15, 12]);
r4.remove(15);
check("remove one child", r4.inOrder(), [5, 10, 12]);
check("one child shape", r4.levelOrder(), [10, 5, 12]);
check("remove missing", r4.remove(99), false);
check("size unchanged", r4.size(), 3);

const r5 = build(BASE);
for (const v of BASE) {
  r5.remove(v);
}
check("remove all size", r5.size(), 0);
check("remove all empty", r5.inOrder(), []);
check("remove all root", r5.root, null);

const line = build([1, 2, 3, 4, 5]);
check("skewed height", line.height(), 5);
check("skewed order", line.inOrder(), [1, 2, 3, 4, 5]);
const down = build([5, 4, 3, 2, 1]);
check("skewed other way", down.height(), 5);
check("skewed other order", down.inOrder(), [1, 2, 3, 4, 5]);

console.log();
let seed = 2024;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const rt = new BST();
const model = new Set();
for (let i = 0; i < 300; i++) {
  const v = nextRandom(500);
  rt.insert(v);
  model.add(v);
}
check("random in order", rt.inOrder(), Array.from(model).sort((a, b) => a - b));
check("random size", rt.size(), model.size);
check("random min", rt.min(), Math.min(...model));
check("random max", rt.max(), Math.max(...model));
let removeOk = true;
for (let i = 0; i < 300; i++) {
  const v = nextRandom(500);
  const had = model.has(v);
  const removed = rt.remove(v);
  model.delete(v);
  if (had !== removed) {
    removeOk = false;
  }
}
check("random removes agree", removeOk, true);
check("after removes order", rt.inOrder(), Array.from(model).sort((a, b) => a - b));
check("after removes size", rt.size(), model.size);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
