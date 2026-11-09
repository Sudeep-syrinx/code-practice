const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Matrix {
  constructor(rows, cols, data) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || new Float64Array(rows * cols);
  }
  get(r, c) { return this.data[r * this.cols + c]; }
  set(r, c, v) { this.data[r * this.cols + c] = v; }
  static identity(n) { const m = new Matrix(n, n); for (let i = 0; i < n; i++) m.set(i, i, 1); return m; }
  static zeros(rows, cols) { return new Matrix(rows, cols); }
  add(o) { const r = new Matrix(this.rows, this.cols); for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] + o.data[i]; return r; }
  sub(o) { const r = new Matrix(this.rows, this.cols); for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] - o.data[i]; return r; }
  scale(s) { const r = new Matrix(this.rows, this.cols); for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] * s; return r; }
  mul(o) {
    const r = new Matrix(this.rows, o.cols);
    for (let i = 0; i < this.rows; i++) for (let j = 0; j < o.cols; j++) { let s = 0; for (let k = 0; k < this.cols; k++) s += this.get(i, k) * o.get(k, j); r.set(i, j, s); }
    return r;
  }
  transpose() { const r = new Matrix(this.cols, this.rows); for (let i = 0; i < this.rows; i++) for (let j = 0; j < this.cols; j++) r.set(j, i, this.get(i, j)); return r; }
  trace() { let s = 0; for (let i = 0; i < this.rows; i++) s += this.get(i, i); return s; }
  determinant() {
    const n = this.rows;
    if (n === 1) return this.get(0, 0);
    if (n === 2) return this.get(0, 0) * this.get(1, 1) - this.get(0, 1) * this.get(1, 0);
    const lu = this._lu(); let det = 1; for (let i = 0; i < n; i++) det *= lu.U.get(i, i); return det * lu.sign;
  }
  _lu() {
    const n = this.rows; const L = Matrix.identity(n); const U = new Matrix(n, n);
    for (let i = 0; i < n * n; i++) U.data[i] = this.data[i];
    let sign = 1;
    for (let col = 0; col < n; col++) {
      let maxRow = col; for (let row = col + 1; row < n; row++) if (Math.abs(U.get(row, col)) > Math.abs(U.get(maxRow, col))) maxRow = row;
      if (maxRow !== col) { for (let j = 0; j < n; j++) { let t = U.get(col, j); U.set(col, j, U.get(maxRow, j)); U.set(maxRow, j, t); } for (let j = 0; j < col; j++) { let t = L.get(col, j); L.set(col, j, L.get(maxRow, j)); L.set(maxRow, j, t); } sign *= -1; }
      if (Math.abs(U.get(col, col)) < 1e-12) continue;
      for (let row = col + 1; row < n; row++) { const f = U.get(row, col) / U.get(col, col); L.set(row, col, f); for (let j = col; j < n; j++) U.set(row, j, U.get(row, j) - f * U.get(col, j)); }
    }
    return { L, U, sign };
  }
  inverse() {
    const n = this.rows; const aug = new Matrix(n, 2 * n);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) aug.set(i, j, this.get(i, j)); aug.set(i, n + i, 1); }
    for (let col = 0; col < n; col++) {
      let maxRow = col; for (let row = col + 1; row < n; row++) if (Math.abs(aug.get(row, col)) > Math.abs(aug.get(maxRow, col))) maxRow = row;
      if (maxRow !== col) for (let j = 0; j < 2 * n; j++) { let t = aug.get(col, j); aug.set(col, j, aug.get(maxRow, j)); aug.set(maxRow, j, t); }
      const pivot = aug.get(col, col); if (Math.abs(pivot) < 1e-12) throw new Error("singular");
      for (let j = 0; j < 2 * n; j++) aug.set(col, j, aug.get(col, j) / pivot);
      for (let row = 0; row < n; row++) { if (row === col) continue; const f = aug.get(row, col); for (let j = 0; j < 2 * n; j++) aug.set(row, j, aug.get(row, j) - f * aug.get(col, j)); }
    }
    const inv = new Matrix(n, n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) inv.set(i, j, aug.get(i, n + j)); return inv;
  }
  eigenvalues2x2() {
    const a = this.get(0, 0), b = this.get(0, 1), c = this.get(1, 0), d = this.get(1, 1);
    const tr = a + d, det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    if (disc < 0) return null;
    return [(tr + Math.sqrt(disc)) / 2, (tr - Math.sqrt(disc)) / 2];
  }
  powerIteration(maxIter) {
    const n = this.rows;
    let v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = Math.random();
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    for (let i = 0; i < n; i++) v[i] /= norm;
    let eigenvalue = 0;
    for (let iter = 0; iter < (maxIter || 100); iter++) {
      const Av = new Float64Array(n);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Av[i] += this.get(i, j) * v[j];
      eigenvalue = Av.reduce((s, x, i) => s + x * v[i], 0);
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      for (let i = 0; i < n; i++) v[i] = Av[i] / norm;
    }
    return { eigenvalue, eigenvector: [...v] };
  }
  equals(o, eps) { const e = eps || 1e-9; for (let i = 0; i < this.data.length; i++) if (Math.abs(this.data[i] - o.data[i]) > e) return false; return true; }
  toArray() { const a = []; for (let i = 0; i < this.rows; i++) { const r = []; for (let j = 0; j < this.cols; j++) r.push(this.get(i, j)); a.push(r); } return a; }
}

class Vector {
  constructor(components) { this.data = new Float64Array(components); }
  get(i) { return this.data[i]; }
  dot(o) { let s = 0; for (let i = 0; i < this.data.length; i++) s += this.data[i] * o.data[i]; return s; }
  add(o) { return new Vector([...this.data].map((v, i) => v + o.data[i])); }
  sub(o) { return new Vector([...this.data].map((v, i) => v - o.data[i])); }
  scale(s) { return new Vector([...this.data].map(v => v * s)); }
  norm() { return Math.sqrt(this.dot(this)); }
  normalize() { const n = this.norm(); return n === 0 ? new Vector(this.data) : this.scale(1 / n); }
  cross(o) {
    if (this.data.length !== 3) throw new Error("cross product requires 3D vectors");
    return new Vector([this.data[1]*o.data[2]-this.data[2]*o.data[1], this.data[2]*o.data[0]-this.data[0]*o.data[2], this.data[0]*o.data[1]-this.data[1]*o.data[0]]);
  }
  toArray() { return [...this.data]; }
}

console.log("=== MATRIX OPERATIONS ===");
check("identity matrix", (() => { const m = Matrix.identity(3); return m.get(0,0)===1 && m.get(1,1)===1 && m.get(0,1)===0; })(), true);
check("matrix add", (() => { const a = new Matrix(2,2,new Float64Array([1,2,3,4])); const b = new Matrix(2,2,new Float64Array([5,6,7,8])); return a.add(b).toArray(); })(), [[6,8],[10,12]]);
check("matrix mul", (() => { const a = new Matrix(2,2,new Float64Array([1,2,3,4])); const b = new Matrix(2,2,new Float64Array([5,6,7,8])); return a.mul(b).toArray(); })(), [[19,22],[43,50]]);
check("matrix transpose", (() => new Matrix(2,3,new Float64Array([1,2,3,4,5,6])).transpose().toArray())(), [[1,4],[2,5],[3,6]]);
check("matrix determinant 2x2", (() => Math.abs(new Matrix(2,2,new Float64Array([1,2,3,4])).determinant()-(-2))<1e-9)(), true);
check("matrix inverse", (() => { const m = new Matrix(2,2,new Float64Array([4,7,2,6])); return m.mul(m.inverse()).equals(Matrix.identity(2),1e-9); })(), true);
check("matrix trace", (() => new Matrix(3,3,new Float64Array([1,0,0,0,2,0,0,0,3])).trace())(), 6);
check("singular throws", raises(() => new Matrix(2,2,new Float64Array([1,2,2,4])).inverse()), true);

console.log("\n=== EIGENVALUES ===");
check("eigenvalues 2x2", (() => { const eigs = new Matrix(2,2,new Float64Array([2,1,1,2])).eigenvalues2x2(); return eigs.sort((a,b)=>a-b).map(v=>Math.round(v*100)/100); })(), [1, 3]);
check("power iteration dominant eigenvalue", (() => { const m = new Matrix(2,2,new Float64Array([4,1,2,3])); const {eigenvalue} = m.powerIteration(200); return Math.abs(eigenvalue-5)<0.1; })(), true);

console.log("\n=== VECTOR OPERATIONS ===");
check("vector dot", new Vector([1,2,3]).dot(new Vector([4,5,6])), 32);
check("vector add", new Vector([1,2]).add(new Vector([3,4])).toArray(), [4, 6]);
check("vector norm", (() => Math.abs(new Vector([3,4]).norm()-5)<1e-9)(), true);
check("vector normalize", (() => { const n = new Vector([3,4]).normalize(); return Math.abs(n.norm()-1)<1e-9; })(), true);
check("vector cross", new Vector([1,0,0]).cross(new Vector([0,1,0])).toArray(), [0, 0, 1]);
check("vector scale", new Vector([2,3]).scale(3).toArray(), [6, 9]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
