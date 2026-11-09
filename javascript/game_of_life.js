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

class Life {
  constructor(cells) {
    this.alive = new Set();
    for (const c of cells || []) {
      if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1])) {
        throw new Error("cell must be [row, col] integers");
      }
      this.alive.add(c[0] + "," + c[1]);
    }
  }

  static fromStrings(lines, on = "#") {
    const cells = [];
    for (let r = 0; r < lines.length; r++) {
      for (let c = 0; c < lines[r].length; c++) {
        if (lines[r][c] === on) {
          cells.push([r, c]);
        }
      }
    }
    return new Life(cells);
  }

  cells() {
    return Array.from(this.alive)
      .map((k) => k.split(",").map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  population() {
    return this.alive.size;
  }

  isAlive(r, c) {
    return this.alive.has(r + "," + c);
  }

  step() {
    const counts = new Map();
    for (const cell of this.cells()) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) {
            continue;
          }
          const key = cell[0] + dr + "," + (cell[1] + dc);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
    const next = [];
    for (const entry of counts) {
      if (entry[1] === 3 || (entry[1] === 2 && this.alive.has(entry[0]))) {
        next.push(entry[0].split(",").map(Number));
      }
    }
    return new Life(next);
  }

  run(generations) {
    if (!Number.isInteger(generations) || generations < 0) {
      throw new Error("generations must be a non-negative integer");
    }
    let life = this;
    for (let i = 0; i < generations; i++) {
      life = life.step();
    }
    return life;
  }

  translate(dr, dc) {
    return new Life(this.cells().map((c) => [c[0] + dr, c[1] + dc]));
  }

  equals(other) {
    if (this.alive.size !== other.alive.size) {
      return false;
    }
    for (const key of this.alive) {
      if (!other.alive.has(key)) {
        return false;
      }
    }
    return true;
  }

  boundingBox() {
    const list = this.cells();
    if (list.length === 0) {
      return null;
    }
    return {
      minR: Math.min(...list.map((c) => c[0])),
      maxR: Math.max(...list.map((c) => c[0])),
      minC: Math.min(...list.map((c) => c[1])),
      maxC: Math.max(...list.map((c) => c[1])),
    };
  }

  toStrings() {
    const box = this.boundingBox();
    if (box === null) {
      return [];
    }
    const rows = [];
    for (let r = box.minR; r <= box.maxR; r++) {
      let line = "";
      for (let c = box.minC; c <= box.maxC; c++) {
        line += this.isAlive(r, c) ? "#" : ".";
      }
      rows.push(line);
    }
    return rows;
  }
}

function stepGrid(rows) {
  if (!Array.isArray(rows) || rows.some((r) => typeof r !== "string" || r.length !== rows[0].length)) {
    throw new Error("grid must be equal length strings");
  }
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    let line = "";
    for (let c = 0; c < rows[r].length; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((dr !== 0 || dc !== 0) && r + dr >= 0 && r + dr < rows.length && c + dc >= 0 && c + dc < rows[r].length && rows[r + dr][c + dc] === "#") {
            n++;
          }
        }
      }
      const live = rows[r][c] === "#";
      line += n === 3 || (live && n === 2) ? "#" : ".";
    }
    out.push(line);
  }
  return out;
}

const BLOCK = [[0, 0], [0, 1], [1, 0], [1, 1]];
const BLINKER = [[1, 0], [1, 1], [1, 2]];
const GLIDER = [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
const TOAD = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2]];
const BEACON = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 2], [2, 3], [3, 2], [3, 3]];

check("empty stays empty", new Life([]).step().cells(), []);
check("empty population", new Life([]).population(), 0);
check("single cell dies", new Life([[0, 0]]).step().population(), 0);
check("pair dies", new Life([[0, 0], [0, 1]]).step().population(), 0);
check("block is still", new Life(BLOCK).step().cells(), BLOCK);
check("blinker flips", new Life(BLINKER).step().cells(), [[0, 1], [1, 1], [2, 1]]);
check("blinker returns", new Life(BLINKER).run(2).cells(), BLINKER);
check("corner makes block", new Life([[0, 0], [0, 1], [1, 0]]).step().cells(), BLOCK);
check("toad changes", new Life(TOAD).step().equals(new Life(TOAD)), false);
check("toad period two", new Life(TOAD).run(2).equals(new Life(TOAD)), true);
check("beacon dips", new Life(BEACON).step().population(), 6);
check("beacon period two", new Life(BEACON).run(2).equals(new Life(BEACON)), true);
check("run zero", new Life(GLIDER).run(0).equals(new Life(GLIDER)), true);
check("run negative", raises(() => new Life(GLIDER).run(-1)), true);
check("bad cell", raises(() => new Life([[0, 1.5]])), true);
check("bad cell shape", raises(() => new Life([[0]])), true);

console.log();
const glider = new Life(GLIDER);
check("glider population", glider.run(10).population(), 5);
check("glider travels", glider.run(4).equals(glider.translate(1, 1)), true);
check("glider travels twice", glider.run(8).equals(glider.translate(2, 2)), true);
check("glider shape", glider.toStrings(), [".#.", "..#", "###"]);
check("from strings", Life.fromStrings([".#.", "..#", "###"]).equals(glider), true);
check("from strings other char", Life.fromStrings(["xx", "x."], "x").population(), 3);
check("original unchanged", glider.cells(), GLIDER.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]));
check("alive query", glider.isAlive(0, 1), true);
check("dead query", glider.isAlive(0, 0), false);
check("bounding box", glider.boundingBox(), { minR: 0, maxR: 2, minC: 0, maxC: 2 });
check("empty bounding box", new Life([]).boundingBox(), null);
check("empty strings", new Life([]).toStrings(), []);
check("negative coordinates", new Life([[-1, -1], [-1, 0], [-1, 1]]).step().cells(), [[-2, 0], [-1, 0], [0, 0]]);
check("translate", new Life([[0, 0]]).translate(-2, 3).cells(), [[-2, 3]]);

console.log();
check("grid blinker", stepGrid([".....", "..#..", "..#..", "..#..", "....."]), [".....", ".....", ".###.", ".....", "....."]);
check("grid block", stepGrid(["....", ".##.", ".##.", "...."]), ["....", ".##.", ".##.", "...."]);
check("grid corner dies", stepGrid(["#.", ".."]), ["..", ".."]);
check("grid ragged raises", raises(() => stepGrid(["..", "."])), true);
check("grid not array", raises(() => stepGrid("..")), true);

console.log();
let seed = 1970;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let gridOk = true;
let shiftOk = true;
for (let round = 0; round < 100; round++) {
  const rows = [];
  for (let r = 0; r < 30; r++) {
    let line = "";
    for (let c = 0; c < 30; c++) {
      const inside = r >= 10 && r < 18 && c >= 10 && c < 18;
      line += inside && nextRandom(3) === 0 ? "#" : ".";
    }
    rows.push(line);
  }
  let grid = rows;
  for (let i = 0; i < 5; i++) {
    grid = stepGrid(grid);
  }
  if (!Life.fromStrings(rows).run(5).equals(Life.fromStrings(grid))) {
    gridOk = false;
  }
  const base = Life.fromStrings(rows);
  if (!base.translate(3, -2).run(6).equals(base.run(6).translate(3, -2))) {
    shiftOk = false;
  }
}
check("100 grid comparisons", gridOk, true);
check("100 shift comparisons", shiftOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
