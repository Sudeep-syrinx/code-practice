const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class IntervalTree {
  constructor() {
    this.intervals = [];
  }
  add(low, high, value) {
    if (low > high) throw new Error("low > high");
    this.intervals.push({ low, high, value });
    this.intervals.sort((a, b) => a.low - b.low);
  }
  query(point) {
    const matches = [];
    for (const iv of this.intervals) {
      if (iv.low <= point && point <= iv.high) matches.push(iv.value);
    }
    return matches;
  }
  queryRange(low, high) {
    const matches = [];
    for (const iv of this.intervals) {
      if (iv.low <= high && iv.high >= low) matches.push(iv.value);
    }
    return matches;
  }
  overlaps(low, high) {
    for (const iv of this.intervals) {
      if (iv.low <= high && iv.high >= low) return true;
    }
    return false;
  }
  remove(low, high) {
    this.intervals = this.intervals.filter(iv => iv.low !== low || iv.high !== high);
  }
  size() { return this.intervals.length; }
  getAllSorted() { return [...this.intervals]; }
}

class SegmentTree2D {
  constructor(rows, cols, initVal) {
    this.rows = rows;
    this.cols = cols;
    this.tree = Array.from({ length: rows * 4 }, () => new Float64Array(cols * 4).fill(initVal || 0));
    this.initVal = initVal || 0;
  }
  update(r, c, val) {
    this._updateRow(1, 0, this.rows - 1, r, c, val);
  }
  _updateRow(node, rLo, rHi, r, c, val) {
    if (rLo === rHi) {
      this._updateCol(node, 1, 0, this.cols - 1, c, val);
      return;
    }
    const mid = (rLo + rHi) >> 1;
    if (r <= mid) this._updateRow(node * 2, rLo, mid, r, c, val);
    else this._updateRow(node * 2 + 1, mid + 1, rHi, r, c, val);
    this._mergeCols(node, node * 2, node * 2 + 1);
  }
  _updateCol(node, cNode, cLo, cHi, c, val) {
    if (cLo === cHi) {
      this.tree[node][cNode] = val;
      return;
    }
    const mid = (cLo + cHi) >> 1;
    if (c <= mid) this._updateCol(node, cNode * 2, cLo, mid, c, val);
    else this._updateCol(node, cNode * 2 + 1, mid + 1, cHi, c, val);
    this.tree[node][cNode] = this.tree[node][cNode * 2] + this.tree[node][cNode * 2 + 1];
  }
  _mergeCols(dest, left, right) {
    for (let i = 1; i < this.cols * 4; i++) {
      this.tree[dest][i] = this.tree[left][i] + this.tree[right][i];
    }
  }
  query(r1, c1, r2, c2) {
    return this._queryRow(1, 0, this.rows - 1, r1, r2, c1, c2);
  }
  _queryRow(node, rLo, rHi, r1, r2, c1, c2) {
    if (r1 > rHi || r2 < rLo) return 0;
    if (r1 <= rLo && rHi <= r2) return this._queryCol(node, 1, 0, this.cols - 1, c1, c2);
    const mid = (rLo + rHi) >> 1;
    return this._queryRow(node * 2, rLo, mid, r1, r2, c1, c2) +
           this._queryRow(node * 2 + 1, mid + 1, rHi, r1, r2, c1, c2);
  }
  _queryCol(node, cNode, cLo, cHi, c1, c2) {
    if (c1 > cHi || c2 < cLo) return 0;
    if (c1 <= cLo && cHi <= c2) return this.tree[node][cNode];
    const mid = (cLo + cHi) >> 1;
    return this._queryCol(node, cNode * 2, cLo, mid, c1, c2) +
           this._queryCol(node, cNode * 2 + 1, mid + 1, cHi, c1, c2);
  }
}

class SweepLine {
  constructor() {
    this.events = [];
  }
  addRectangle(x1, y1, x2, y2, id) {
    this.events.push({ x: x1, type: "start", y1, y2, id });
    this.events.push({ x: x2, type: "end", y1, y2, id });
  }
  findOverlaps() {
    this.events.sort((a, b) => a.x - b.x || (a.type === "start" ? -1 : 1));
    const active = new Map();
    const overlaps = [];
    for (const ev of this.events) {
      if (ev.type === "start") {
        for (const [, other] of active) {
          if (ev.y1 < other.y2 && ev.y2 > other.y1) {
            overlaps.push([ev.id, other.id].sort());
          }
        }
        active.set(ev.id, ev);
      } else {
        active.delete(ev.id);
      }
    }
    const unique = new Set(overlaps.map(o => o.join(",")));
    return [...unique].map(s => s.split(","));
  }
  totalArea() {
    this.events.sort((a, b) => a.x - b.x || (a.type === "start" ? -1 : 1));
    const activeY = [];
    let area = 0;
    let prevX = null;
    for (const ev of this.events) {
      if (prevX !== null && activeY.length > 0) {
        const width = ev.x - prevX;
        activeY.sort((a, b) => a[0] - b[0]);
        let coveredHeight = 0;
        let curStart = activeY[0][0];
        let curEnd = activeY[0][1];
        for (let i = 1; i < activeY.length; i++) {
          if (activeY[i][0] <= curEnd) {
            curEnd = Math.max(curEnd, activeY[i][1]);
          } else {
            coveredHeight += curEnd - curStart;
            curStart = activeY[i][0];
            curEnd = activeY[i][1];
          }
        }
        coveredHeight += curEnd - curStart;
        area += width * coveredHeight;
      }
      if (ev.type === "start") activeY.push([ev.y1, ev.y2]);
      else {
        const idx = activeY.findIndex(y => y[0] === ev.y1 && y[1] === ev.y2);
        if (idx !== -1) activeY.splice(idx, 1);
      }
      prevX = ev.x;
    }
    return area;
  }
}

check("interval tree query point", (() => {
  const it = new IntervalTree();
  it.add(1, 5, "a"); it.add(3, 8, "b"); it.add(10, 15, "c");
  return it.query(4).sort();
})(), ["a", "b"]);
check("interval tree query none", (() => {
  const it = new IntervalTree();
  it.add(1, 3, "x");
  return it.query(5);
})(), []);
check("interval tree query range", (() => {
  const it = new IntervalTree();
  it.add(1, 5, "a"); it.add(6, 10, "b"); it.add(4, 8, "c");
  return it.queryRange(5, 7).sort();
})(), ["a", "b", "c"]);
check("interval tree overlaps", (() => {
  const it = new IntervalTree();
  it.add(1, 5, "a"); it.add(3, 7, "b");
  return it.overlaps(4, 6);
})(), true);
check("interval tree no overlap", (() => {
  const it = new IntervalTree();
  it.add(1, 3, "a"); it.add(5, 7, "b");
  return it.overlaps(4, 4);
})(), false);
check("interval tree remove", (() => {
  const it = new IntervalTree();
  it.add(1, 5, "a"); it.add(1, 5, "b");
  it.remove(1, 5);
  return it.size();
})(), 0);
check("interval tree invalid throws", raises(() => new IntervalTree().add(5, 1, "x")), true);
check("seg2d single update query", (() => {
  const st = new SegmentTree2D(4, 4, 0);
  st.update(1, 1, 10);
  return st.query(1, 1, 1, 1);
})(), 10);
check("seg2d range sum", (() => {
  const st = new SegmentTree2D(4, 4, 0);
  st.update(0, 0, 1); st.update(0, 1, 2);
  st.update(1, 0, 3); st.update(1, 1, 4);
  return st.query(0, 0, 1, 1);
})(), 10);
check("seg2d empty range", (() => {
  const st = new SegmentTree2D(4, 4, 0);
  return st.query(0, 0, 3, 3);
})(), 0);
check("sweep line find overlaps", (() => {
  const sl = new SweepLine();
  sl.addRectangle(0, 0, 5, 5, "A");
  sl.addRectangle(3, 3, 8, 8, "B");
  sl.addRectangle(10, 10, 15, 15, "C");
  return sl.findOverlaps();
})(), [["A", "B"]]);
check("sweep line no overlaps", (() => {
  const sl = new SweepLine();
  sl.addRectangle(0, 0, 2, 2, "X");
  sl.addRectangle(5, 5, 7, 7, "Y");
  return sl.findOverlaps();
})(), []);
check("sweep line total area single", (() => {
  const sl = new SweepLine();
  sl.addRectangle(0, 0, 3, 4, "R");
  return sl.totalArea();
})(), 12);
check("sweep line total area overlapping", (() => {
  const sl = new SweepLine();
  sl.addRectangle(0, 0, 4, 4, "A");
  sl.addRectangle(2, 2, 6, 6, "B");
  return sl.totalArea();
})(), 28);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
