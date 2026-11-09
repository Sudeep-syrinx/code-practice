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
  static identity(n) {
    const m = new Matrix(n, n);
    for (let i = 0; i < n; i++) m.set(i, i, 1);
    return m;
  }
  static zeros(rows, cols) { return new Matrix(rows, cols); }
  add(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) throw new Error("dimension mismatch");
    const r = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] + other.data[i];
    return r;
  }
  sub(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) throw new Error("dimension mismatch");
    const r = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] - other.data[i];
    return r;
  }
  scale(s) {
    const r = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.data.length; i++) r.data[i] = this.data[i] * s;
    return r;
  }
  mul(other) {
    if (this.cols !== other.rows) throw new Error("dimension mismatch");
    const r = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++)
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) sum += this.get(i, k) * other.get(k, j);
        r.set(i, j, sum);
      }
    return r;
  }
  transpose() {
    const r = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++)
      for (let j = 0; j < this.cols; j++) r.set(j, i, this.get(i, j));
    return r;
  }
  trace() {
    if (this.rows !== this.cols) throw new Error("not square");
    let sum = 0;
    for (let i = 0; i < this.rows; i++) sum += this.get(i, i);
    return sum;
  }
  determinant() {
    if (this.rows !== this.cols) throw new Error("not square");
    const n = this.rows;
    if (n === 1) return this.get(0, 0);
    if (n === 2) return this.get(0, 0) * this.get(1, 1) - this.get(0, 1) * this.get(1, 0);
    const lu = this._luDecompose();
    let det = 1;
    for (let i = 0; i < n; i++) det *= lu.U.get(i, i);
    return det * lu.sign;
  }
  _luDecompose() {
    const n = this.rows;
    const L = Matrix.identity(n);
    const U = new Matrix(n, n);
    for (let i = 0; i < n * n; i++) U.data[i] = this.data[i];
    let sign = 1;
    for (let col = 0; col < n; col++) {
      let maxRow = col, maxVal = Math.abs(U.get(col, col));
      for (let row = col + 1; row < n; row++) {
        const v = Math.abs(U.get(row, col));
        if (v > maxVal) { maxVal = v; maxRow = row; }
      }
      if (maxRow !== col) {
        for (let j = 0; j < n; j++) {
          const tmp = U.get(col, j); U.set(col, j, U.get(maxRow, j)); U.set(maxRow, j, tmp);
        }
        for (let j = 0; j < col; j++) {
          const tmp = L.get(col, j); L.set(col, j, L.get(maxRow, j)); L.set(maxRow, j, tmp);
        }
        sign *= -1;
      }
      if (Math.abs(U.get(col, col)) < 1e-12) continue;
      for (let row = col + 1; row < n; row++) {
        const factor = U.get(row, col) / U.get(col, col);
        L.set(row, col, factor);
        for (let j = col; j < n; j++) U.set(row, j, U.get(row, j) - factor * U.get(col, j));
      }
    }
    return { L, U, sign };
  }
  inverse() {
    if (this.rows !== this.cols) throw new Error("not square");
    const n = this.rows;
    const aug = new Matrix(n, 2 * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) aug.set(i, j, this.get(i, j));
      aug.set(i, n + i, 1);
    }
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug.get(row, col)) > Math.abs(aug.get(maxRow, col))) maxRow = row;
      }
      if (maxRow !== col) {
        for (let j = 0; j < 2 * n; j++) {
          const tmp = aug.get(col, j); aug.set(col, j, aug.get(maxRow, j)); aug.set(maxRow, j, tmp);
        }
      }
      const pivot = aug.get(col, col);
      if (Math.abs(pivot) < 1e-12) throw new Error("singular matrix");
      for (let j = 0; j < 2 * n; j++) aug.set(col, j, aug.get(col, j) / pivot);
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug.get(row, col);
        for (let j = 0; j < 2 * n; j++) aug.set(row, j, aug.get(row, j) - factor * aug.get(col, j));
      }
    }
    const inv = new Matrix(n, n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) inv.set(i, j, aug.get(i, n + j));
    return inv;
  }
  equals(other, eps) {
    if (this.rows !== other.rows || this.cols !== other.cols) return false;
    const e = eps || 1e-9;
    for (let i = 0; i < this.data.length; i++) {
      if (Math.abs(this.data[i] - other.data[i]) > e) return false;
    }
    return true;
  }
  toArray() {
    const arr = [];
    for (let i = 0; i < this.rows; i++) {
      const row = [];
      for (let j = 0; j < this.cols; j++) row.push(this.get(i, j));
      arr.push(row);
    }
    return arr;
  }
}

console.log("=== BASIC OPERATIONS ===");
check("identity matrix", (() => {
  const m = Matrix.identity(3);
  return m.get(0, 0) === 1 && m.get(1, 1) === 1 && m.get(2, 2) === 1 && m.get(0, 1) === 0;
})(), true);
check("add matrices", (() => {
  const a = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  const b = new Matrix(2, 2, new Float64Array([5, 6, 7, 8]));
  return a.add(b).toArray();
})(), [[6, 8], [10, 12]]);
check("sub matrices", (() => {
  const a = new Matrix(2, 2, new Float64Array([5, 6, 7, 8]));
  const b = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  return a.sub(b).toArray();
})(), [[4, 4], [4, 4]]);
check("scale matrix", (() => {
  const m = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  return m.scale(2).toArray();
})(), [[2, 4], [6, 8]]);
check("dimension mismatch add throws", (() => {
  const a = new Matrix(2, 2);
  const b = new Matrix(3, 3);
  return raises(() => a.add(b));
})(), true);

console.log("\n=== MULTIPLICATION ===");
check("matrix multiply 2x2", (() => {
  const a = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  const b = new Matrix(2, 2, new Float64Array([5, 6, 7, 8]));
  return a.mul(b).toArray();
})(), [[19, 22], [43, 50]]);
check("multiply by identity", (() => {
  const a = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  return a.mul(Matrix.identity(2)).equals(a);
})(), true);
check("transpose", (() => {
  const m = new Matrix(2, 3, new Float64Array([1, 2, 3, 4, 5, 6]));
  return m.transpose().toArray();
})(), [[1, 4], [2, 5], [3, 6]]);
check("mul dimension mismatch throws", (() => {
  const a = new Matrix(2, 3);
  const b = new Matrix(2, 2);
  return raises(() => a.mul(b));
})(), true);

console.log("\n=== DETERMINANT AND INVERSE ===");
check("determinant 2x2", (() => {
  const m = new Matrix(2, 2, new Float64Array([1, 2, 3, 4]));
  return Math.abs(m.determinant() - (-2)) < 1e-9;
})(), true);
check("determinant identity", (() => {
  return Math.abs(Matrix.identity(3).determinant() - 1) < 1e-9;
})(), true);
check("determinant 3x3", (() => {
  const m = new Matrix(3, 3, new Float64Array([6, 1, 1, 4, -2, 5, 2, 8, 7]));
  return Math.abs(m.determinant() - (-306)) < 1e-9;
})(), true);
check("inverse 2x2", (() => {
  const m = new Matrix(2, 2, new Float64Array([4, 7, 2, 6]));
  const inv = m.inverse();
  return m.mul(inv).equals(Matrix.identity(2), 1e-9);
})(), true);
check("inverse 3x3", (() => {
  const m = new Matrix(3, 3, new Float64Array([1, 2, 3, 0, 1, 4, 5, 6, 0]));
  const inv = m.inverse();
  return m.mul(inv).equals(Matrix.identity(3), 1e-9);
})(), true);
check("singular matrix throws", (() => {
  const m = new Matrix(2, 2, new Float64Array([1, 2, 2, 4]));
  return raises(() => m.inverse());
})(), true);
check("trace", (() => {
  const m = new Matrix(3, 3, new Float64Array([1, 0, 0, 0, 2, 0, 0, 0, 3]));
  return m.trace();
})(), 6);
check("trace non-square throws", (() => {
  return raises(() => new Matrix(2, 3).trace());
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
