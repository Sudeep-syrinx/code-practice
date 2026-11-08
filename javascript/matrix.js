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

class Matrix {
  constructor(rows) {
    if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(rows[0]) || rows[0].length === 0) {
      throw new Error("matrix cannot be empty");
    }
    const width = rows[0].length;
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== width) {
        throw new Error("rows must have equal length");
      }
    }
    this.rows = rows.map((r) => r.slice());
    this.nRows = rows.length;
    this.nCols = width;
  }

  static zeros(nRows, nCols) {
    const rows = [];
    for (let i = 0; i < nRows; i++) {
      rows.push(new Array(nCols).fill(0));
    }
    return new Matrix(rows);
  }

  static identity(n) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      rows.push(row);
    }
    return new Matrix(rows);
  }

  shape() {
    return [this.nRows, this.nCols];
  }

  get(r, c) {
    return this.rows[r][c];
  }

  equals(other) {
    return JSON.stringify(this.rows) === JSON.stringify(other.rows);
  }

  sameShape(other) {
    return this.nRows === other.nRows && this.nCols === other.nCols;
  }

  add(other) {
    if (!this.sameShape(other)) {
      throw new Error("shapes differ");
    }
    return new Matrix(this.rows.map((row, i) => row.map((v, j) => v + other.rows[i][j])));
  }

  subtract(other) {
    if (!this.sameShape(other)) {
      throw new Error("shapes differ");
    }
    return new Matrix(this.rows.map((row, i) => row.map((v, j) => v - other.rows[i][j])));
  }

  scale(k) {
    return new Matrix(this.rows.map((row) => row.map((v) => v * k)));
  }

  multiply(other) {
    if (this.nCols !== other.nRows) {
      throw new Error("cannot multiply these shapes");
    }
    const out = [];
    for (let i = 0; i < this.nRows; i++) {
      const row = [];
      for (let j = 0; j < other.nCols; j++) {
        let total = 0;
        for (let k = 0; k < this.nCols; k++) {
          total += this.rows[i][k] * other.rows[k][j];
        }
        row.push(total);
      }
      out.push(row);
    }
    return new Matrix(out);
  }

  transpose() {
    const out = [];
    for (let c = 0; c < this.nCols; c++) {
      const row = [];
      for (let r = 0; r < this.nRows; r++) {
        row.push(this.rows[r][c]);
      }
      out.push(row);
    }
    return new Matrix(out);
  }

  isSquare() {
    return this.nRows === this.nCols;
  }

  trace() {
    if (!this.isSquare()) {
      throw new Error("trace needs a square matrix");
    }
    let total = 0;
    for (let i = 0; i < this.nRows; i++) {
      total += this.rows[i][i];
    }
    return total;
  }

  isSymmetric() {
    return this.isSquare() && this.equals(this.transpose());
  }

  isIdentity() {
    return this.isSquare() && this.equals(Matrix.identity(this.nRows));
  }

  minor(r, c) {
    const out = [];
    for (let i = 0; i < this.nRows; i++) {
      if (i === r) {
        continue;
      }
      const row = [];
      for (let j = 0; j < this.nCols; j++) {
        if (j !== c) {
          row.push(this.rows[i][j]);
        }
      }
      out.push(row);
    }
    return new Matrix(out);
  }

  determinant() {
    if (!this.isSquare()) {
      throw new Error("determinant needs a square matrix");
    }
    if (this.nRows === 1) {
      return this.rows[0][0];
    }
    if (this.nRows === 2) {
      return this.rows[0][0] * this.rows[1][1] - this.rows[0][1] * this.rows[1][0];
    }
    let total = 0;
    for (let c = 0; c < this.nCols; c++) {
      const sign = c % 2 === 0 ? 1 : -1;
      total += sign * this.rows[0][c] * this.minor(0, c).determinant();
    }
    return total;
  }

  power(n) {
    if (!this.isSquare()) {
      throw new Error("power needs a square matrix");
    }
    if (!Number.isInteger(n) || n < 0) {
      throw new Error("power must be a non-negative integer");
    }
    let result = Matrix.identity(this.nRows);
    for (let i = 0; i < n; i++) {
      result = result.multiply(this);
    }
    return result;
  }

  rowSums() {
    return this.rows.map((row) => row.reduce((a, b) => a + b, 0));
  }

  colSums() {
    return this.transpose().rowSums();
  }

  max() {
    let best = this.rows[0][0];
    for (const row of this.rows) {
      for (const v of row) {
        if (v > best) {
          best = v;
        }
      }
    }
    return best;
  }

  flatten() {
    const out = [];
    for (const row of this.rows) {
      for (const v of row) {
        out.push(v);
      }
    }
    return out;
  }

  toText() {
    return this.rows.map((row) => row.map((v) => String(v).padStart(4)).join(" ")).join("\n");
  }
}

const a = new Matrix([[1, 2], [3, 4]]);
const b = new Matrix([[5, 6], [7, 8]]);

check("shape", a.shape(), [2, 2]);
check("get", a.get(1, 0), 3);
check("add", a.add(b).rows, [[6, 8], [10, 12]]);
check("subtract", b.subtract(a).rows, [[4, 4], [4, 4]]);
check("scale", a.scale(3).rows, [[3, 6], [9, 12]]);
check("multiply", a.multiply(b).rows, [[19, 22], [43, 50]]);
check("equal", a.equals(new Matrix([[1, 2], [3, 4]])), true);
check("not equal", a.equals(b), false);
check("input copied", new Matrix([[1]]).rows, [[1]]);

console.log();
check("zeros", Matrix.zeros(2, 3).rows, [[0, 0, 0], [0, 0, 0]]);
check("identity", Matrix.identity(3).rows, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
check("times identity", a.multiply(Matrix.identity(2)).equals(a), true);
check("identity first", Matrix.identity(2).multiply(a).equals(a), true);
check("is identity", Matrix.identity(4).isIdentity(), true);
check("not identity", a.isIdentity(), false);
check("transpose", new Matrix([[1, 2, 3], [4, 5, 6]]).transpose().rows, [[1, 4], [2, 5], [3, 6]]);
check("transpose shape", new Matrix([[1, 2, 3], [4, 5, 6]]).transpose().shape(), [3, 2]);
check("double transpose", a.transpose().transpose().equals(a), true);
check("rectangular product", new Matrix([[1, 2, 3]]).multiply(new Matrix([[1], [2], [3]])).rows, [[14]]);
check("trace", a.trace(), 5);
check("symmetric yes", new Matrix([[1, 2], [2, 1]]).isSymmetric(), true);
check("symmetric no", a.isSymmetric(), false);
check("symmetric rectangle", new Matrix([[1, 2, 3]]).isSymmetric(), false);

console.log();
check("det 1x1", new Matrix([[7]]).determinant(), 7);
check("det 2x2", a.determinant(), -2);
check("det 3x3 zero", new Matrix([[2, 0, 1], [1, 3, 2], [1, 1, 1]]).determinant(), 0);
check("det 3x3", new Matrix([[6, 1, 1], [4, -2, 5], [2, 8, 7]]).determinant(), -306);
check("det identity", Matrix.identity(4).determinant(), 1);
check("det big identity", Matrix.identity(6).determinant(), 1);
check("det product", a.multiply(b).determinant(), a.determinant() * b.determinant());
check("det scaled 2x2", a.scale(2).determinant(), 4 * a.determinant());
check("minor", new Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).minor(0, 0).rows, [[5, 6], [8, 9]]);
check("minor middle", new Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).minor(1, 1).rows, [[1, 3], [7, 9]]);

console.log();
check("power 0", a.power(0).equals(Matrix.identity(2)), true);
check("power 1", a.power(1).equals(a), true);
check("power 2", a.power(2).rows, [[7, 10], [15, 22]]);
check("power 3", a.power(3).rows, [[37, 54], [81, 118]]);
check("fibonacci matrix", new Matrix([[1, 1], [1, 0]]).power(10).get(0, 1), 55);
check("fibonacci full", new Matrix([[1, 1], [1, 0]]).power(10).rows, [[89, 55], [55, 34]]);
check("row sums", a.rowSums(), [3, 7]);
check("col sums", a.colSums(), [4, 6]);
check("max", new Matrix([[1, 9], [3, 4]]).max(), 9);
check("max negative", new Matrix([[-5, -9], [-3, -4]]).max(), -3);
check("flatten", a.flatten(), [1, 2, 3, 4]);
check("text lines", a.toText().split("\n").length, 2);
console.log(a.toText());

console.log();
check("empty matrix", raises(() => new Matrix([])), true);
check("empty row", raises(() => new Matrix([[]])), true);
check("ragged rows", raises(() => new Matrix([[1, 2], [3]])), true);
check("not rows", raises(() => new Matrix("abc")), true);
check("add shapes", raises(() => a.add(new Matrix([[1, 2, 3]]))), true);
check("subtract shapes", raises(() => a.subtract(new Matrix([[1]]))), true);
check("multiply shapes", raises(() => a.multiply(new Matrix([[1, 2, 3]]))), true);
check("trace rectangle", raises(() => new Matrix([[1, 2, 3]]).trace()), true);
check("det rectangle", raises(() => new Matrix([[1, 2, 3]]).determinant()), true);
check("power rectangle", raises(() => new Matrix([[1, 2, 3]]).power(2)), true);
check("negative power", raises(() => a.power(-1)), true);
check("decimal power", raises(() => a.power(1.5)), true);

console.log();
const big = Matrix.identity(50);
check("big trace", big.trace(), 50);
check("big square", big.multiply(big).isIdentity(), true);
check("big shape", big.shape(), [50, 50]);
const ones = new Matrix(Array.from({ length: 40 }, () => new Array(40).fill(1)));
const product = ones.multiply(ones);
check("ones product", product.get(0, 0), 40);
check("ones product corner", product.get(39, 39), 40);
check("ones sum", product.flatten().reduce((x, y) => x + y, 0), 40 * 40 * 40);
check("ones transpose", ones.transpose().equals(ones), true);
check("big zeros", Matrix.zeros(30, 30).flatten().every((v) => v === 0), true);
check("big add zeros", big.add(Matrix.zeros(50, 50)).equals(big), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
