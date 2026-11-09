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

const UNITS = [];
for (let k = 0; k < 9; k++) {
  const row = [];
  const col = [];
  const box = [];
  for (let j = 0; j < 9; j++) {
    row.push(k * 9 + j);
    col.push(j * 9 + k);
    box.push((Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3));
  }
  UNITS.push(row, col, box);
}

const PEERS = [];
for (let i = 0; i < 81; i++) {
  const set = new Set();
  for (const unit of UNITS) {
    if (unit.includes(i)) {
      for (const p of unit) {
        if (p !== i) {
          set.add(p);
        }
      }
    }
  }
  PEERS.push(Array.from(set));
}

function parse(text) {
  if (typeof text !== "string" || !/^[0-9.]{81}$/.test(text)) {
    throw new Error("puzzle must be 81 characters of digits or dots");
  }
  return Array.from(text, (ch) => (ch === "." ? 0 : Number(ch)));
}

function toText(grid) {
  return grid.map((v) => (v === 0 ? "." : String(v))).join("");
}

function toRows(grid) {
  const rows = [];
  for (let r = 0; r < 9; r++) {
    rows.push(toText(grid.slice(r * 9, r * 9 + 9)));
  }
  return rows;
}

function isValid(grid) {
  for (const unit of UNITS) {
    let seen = 0;
    for (const i of unit) {
      const v = grid[i];
      if (v !== 0) {
        const bit = 1 << v;
        if (seen & bit) {
          return false;
        }
        seen |= bit;
      }
    }
  }
  return true;
}

function isSolved(grid) {
  return grid.every((v) => v > 0) && isValid(grid);
}

function candidateMask(grid, i) {
  let used = 0;
  for (const p of PEERS[i]) {
    if (grid[p] !== 0) {
      used |= 1 << grid[p];
    }
  }
  return ~used & 0x3fe;
}

function bitCount(mask) {
  let count = 0;
  while (mask !== 0) {
    mask &= mask - 1;
    count++;
  }
  return count;
}

function candidates(grid, i) {
  const list = [];
  const mask = candidateMask(grid, i);
  for (let d = 1; d <= 9; d++) {
    if (mask & (1 << d)) {
      list.push(d);
    }
  }
  return list;
}

function search(grid, limit, found) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const mask = candidateMask(grid, i);
      const count = bitCount(mask);
      if (count === 0) {
        return false;
      }
      if (count < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = count;
      }
    }
  }
  if (best === -1) {
    found.push(grid.slice());
    return found.length >= limit;
  }
  for (let d = 1; d <= 9; d++) {
    if (bestMask & (1 << d)) {
      grid[best] = d;
      const stop = search(grid, limit, found);
      grid[best] = 0;
      if (stop) {
        return true;
      }
    }
  }
  return false;
}

function solve(grid) {
  if (!isValid(grid)) {
    return null;
  }
  const found = [];
  search(grid.slice(), 1, found);
  return found.length > 0 ? found[0] : null;
}

function countSolutions(grid, limit = 2) {
  if (!isValid(grid)) {
    return 0;
  }
  const found = [];
  search(grid.slice(), limit, found);
  return found.length;
}

const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const puzzle = parse(PUZZLE);
const solution = parse(SOLUTION);

check("parse length", puzzle.length, 81);
check("parse first row", puzzle.slice(0, 9), [5, 3, 0, 0, 7, 0, 0, 0, 0]);
check("parse dots", parse(".".repeat(81)).every((v) => v === 0), true);
check("to text round trip", toText(parse(PUZZLE)), PUZZLE);
check("to rows count", toRows(solution).length, 9);
check("to rows first", toRows(solution)[0], "534678912");
check("to rows last", toRows(solution)[8], "345286179");
check("parse too short", raises(() => parse("123")), true);
check("parse bad char", raises(() => parse("x".repeat(81))), true);
check("parse not string", raises(() => parse(5)), true);

console.log();
check("units count", UNITS.length, 27);
check("each unit has nine", UNITS.every((u) => new Set(u).size === 9), true);
check("each cell in three units", Array.from({ length: 81 }, (_, i) => UNITS.filter((u) => u.includes(i)).length).every((c) => c === 3), true);
check("peers count", PEERS.every((p) => p.length === 20), true);
check("peer of corner", PEERS[0].includes(80), false);
check("peer same box", PEERS[0].includes(10), true);
check("peer same row", PEERS[0].includes(8), true);
check("peer same col", PEERS[0].includes(72), true);

console.log();
check("puzzle is valid", isValid(puzzle), true);
check("puzzle not solved", isSolved(puzzle), false);
check("solution is solved", isSolved(solution), true);
check("empty is valid", isValid(parse(".".repeat(81))), true);
check("row clash", isValid(parse("55" + ".".repeat(79))), false);
check("column clash", isValid(parse("5........5" + ".".repeat(71))), false);
check("box clash", isValid(parse("5...." + "." .repeat(4) + ".5" + ".".repeat(72))), true);
check("box clash real", isValid(parse("5........" + ".5......." + ".".repeat(63))), false);
check("candidates of blank", candidates(puzzle, 2), [1, 2, 4]);
check("candidates in order", candidates(puzzle, 2).every((d, i, a) => i === 0 || a[i - 1] < d), true);

console.log();
check("solves wikipedia puzzle", toText(solve(puzzle)), SOLUTION);
check("unique solution", countSolutions(puzzle), 1);
check("solving keeps input", toText(puzzle), PUZZLE);
check("already solved", toText(solve(solution)), SOLUTION);
check("count of solved", countSolutions(solution), 1);
check("empty grid solvable", isSolved(solve(parse(".".repeat(81)))), true);
check("empty grid many", countSolutions(parse(".".repeat(81)), 3), 3);
check("invalid gives null", solve(parse("55" + ".".repeat(79))), null);
check("invalid counts zero", countSolutions(parse("55" + ".".repeat(79))), 0);
const stuck = parse("12345678." + "........9" + ".".repeat(63));
check("stuck is valid", isValid(stuck), true);
check("stuck has no answer", solve(stuck), null);
check("stuck counts zero", countSolutions(stuck), 0);

console.log();
let seed = 9;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let solveOk = true;
for (let round = 0; round < 60; round++) {
  const grid = solution.slice();
  const blanks = 20 + nextRandom(25);
  for (let b = 0; b < blanks; b++) {
    grid[nextRandom(81)] = 0;
  }
  const answer = solve(grid);
  if (answer === null || !isSolved(answer)) {
    solveOk = false;
    continue;
  }
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0 && grid[i] !== answer[i]) {
      solveOk = false;
    }
  }
}
check("60 random puzzles", solveOk, true);

let relabelOk = true;
for (let round = 0; round < 50; round++) {
  const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 8; i > 0; i--) {
    const j = nextRandom(i + 1);
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  const relabeled = solution.map((v) => perm[v - 1]);
  if (!isSolved(relabeled)) {
    relabelOk = false;
  }
  const swapped = relabeled.slice();
  for (let c = 0; c < 9; c++) {
    swapped[c] = relabeled[9 + c];
    swapped[9 + c] = relabeled[c];
  }
  if (!isSolved(swapped)) {
    relabelOk = false;
  }
}
check("50 relabelled grids", relabelOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
