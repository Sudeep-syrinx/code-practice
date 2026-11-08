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

function permutations(items) {
  if (!Array.isArray(items) || items.length > 8) {
    throw new Error("items must be an array of at most 8 elements");
  }
  const out = [];
  const used = new Array(items.length).fill(false);
  const cur = [];
  const walk = () => {
    if (cur.length === items.length) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) {
        continue;
      }
      used[i] = true;
      cur.push(items[i]);
      walk();
      cur.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

function uniquePermutations(items) {
  if (!Array.isArray(items) || items.length > 8) {
    throw new Error("items must be an array of at most 8 elements");
  }
  const sorted = items.slice().sort((a, b) => a - b);
  const out = [];
  const used = new Array(sorted.length).fill(false);
  const cur = [];
  const walk = () => {
    if (cur.length === sorted.length) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) {
        continue;
      }
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) {
        continue;
      }
      used[i] = true;
      cur.push(sorted[i]);
      walk();
      cur.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

function subsets(items) {
  if (!Array.isArray(items) || items.length > 12) {
    throw new Error("items must be an array of at most 12 elements");
  }
  const out = [];
  const cur = [];
  const walk = (start) => {
    out.push(cur.slice());
    for (let i = start; i < items.length; i++) {
      cur.push(items[i]);
      walk(i + 1);
      cur.pop();
    }
  };
  walk(0);
  return out;
}

function combinations(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0) {
    throw new Error("n and k must be non-negative integers");
  }
  const out = [];
  const cur = [];
  const walk = (start) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i <= n; i++) {
      if (n - i + 1 < k - cur.length) {
        break;
      }
      cur.push(i);
      walk(i + 1);
      cur.pop();
    }
  };
  walk(1);
  return out;
}

function combinationSum(candidates, target) {
  if (!Array.isArray(candidates) || candidates.some((c) => !Number.isInteger(c) || c < 1)) {
    throw new Error("candidates must be positive integers");
  }
  if (!Number.isInteger(target) || target < 1) {
    throw new Error("target must be a positive integer");
  }
  const sorted = Array.from(new Set(candidates)).sort((a, b) => a - b);
  const out = [];
  const cur = [];
  const walk = (start, remaining) => {
    if (remaining === 0) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) {
        break;
      }
      cur.push(sorted[i]);
      walk(i, remaining - sorted[i]);
      cur.pop();
    }
  };
  walk(0, target);
  return out;
}

function parentheses(n) {
  if (!Number.isInteger(n) || n < 0 || n > 10) {
    throw new Error("n must be an integer from 0 to 10");
  }
  const out = [];
  const walk = (open, close, text) => {
    if (text.length === n * 2) {
      out.push(text);
      return;
    }
    if (open < n) {
      walk(open + 1, close, text + "(");
    }
    if (close < open) {
      walk(open, close + 1, text + ")");
    }
  };
  walk(0, 0, "");
  return out;
}

function nQueens(n) {
  if (!Number.isInteger(n) || n < 1 || n > 9) {
    throw new Error("n must be an integer from 1 to 9");
  }
  const out = [];
  const cols = new Set();
  const diagA = new Set();
  const diagB = new Set();
  const cur = [];
  const walk = (row) => {
    if (row === n) {
      out.push(cur.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diagA.has(row - c) || diagB.has(row + c)) {
        continue;
      }
      cols.add(c);
      diagA.add(row - c);
      diagB.add(row + c);
      cur.push(c);
      walk(row + 1);
      cur.pop();
      cols.delete(c);
      diagA.delete(row - c);
      diagB.delete(row + c);
    }
  };
  walk(0);
  return out;
}

function isValidQueens(solution) {
  const n = solution.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (solution[a] === solution[b]) {
        return false;
      }
      if (Math.abs(solution[a] - solution[b]) === b - a) {
        return false;
      }
    }
  }
  return true;
}

function boardText(solution) {
  const rows = [];
  for (const c of solution) {
    let row = "";
    for (let i = 0; i < solution.length; i++) {
      row += i === c ? "Q" : ".";
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function parseGrid(rows) {
  if (!Array.isArray(rows) || rows.length !== 9) {
    throw new Error("grid must have 9 rows");
  }
  return rows.map((row) => {
    if (typeof row !== "string" || !/^[0-9.]{9}$/.test(row)) {
      throw new Error("each row must be 9 characters of digits or dots");
    }
    return row.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
  });
}

function canPlace(grid, r, c, v) {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === v || grid[i][c] === v) {
      return false;
    }
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[br + i][bc + j] === v) {
        return false;
      }
    }
  }
  return true;
}

function hasConflicts(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v !== 0) {
        grid[r][c] = 0;
        const fine = canPlace(grid, r, c, v);
        grid[r][c] = v;
        if (!fine) {
          return true;
        }
      }
    }
  }
  return false;
}

function fill(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        for (let v = 1; v <= 9; v++) {
          if (canPlace(grid, r, c, v)) {
            grid[r][c] = v;
            if (fill(grid)) {
              return true;
            }
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function solveSudoku(rows) {
  const grid = parseGrid(rows);
  if (hasConflicts(grid)) {
    return null;
  }
  if (fill(grid)) {
    return grid.map((row) => row.join(""));
  }
  return null;
}

function isSolved(rows) {
  const grid = parseGrid(rows);
  const full = "123456789";
  for (let i = 0; i < 9; i++) {
    const row = grid[i].slice().sort().join("");
    const col = grid.map((r) => r[i]).sort().join("");
    const box = [];
    for (let j = 0; j < 9; j++) {
      box.push(grid[3 * Math.floor(i / 3) + Math.floor(j / 3)][3 * (i % 3) + (j % 3)]);
    }
    if (row !== full || col !== full || box.sort().join("") !== full) {
      return false;
    }
  }
  return true;
}

function balanced(text) {
  let depth = 0;
  for (const ch of text) {
    depth += ch === "(" ? 1 : -1;
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
}

check("perms of 3", permutations([1, 2, 3]), [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]);
check("perms of 1", permutations([7]), [[7]]);
check("perms of none", permutations([]), [[]]);
check("perms of 4 count", permutations([1, 2, 3, 4]).length, 24);
check("perms letters", permutations(["a", "b"]), [["a", "b"], ["b", "a"]]);
check("perms too many", raises(() => permutations([1, 2, 3, 4, 5, 6, 7, 8, 9])), true);
check("perms not array", raises(() => permutations("abc")), true);
check("unique perms", uniquePermutations([1, 1, 2]), [[1, 1, 2], [1, 2, 1], [2, 1, 1]]);
check("unique perms all same", uniquePermutations([3, 3, 3]), [[3, 3, 3]]);
check("unique perms distinct", uniquePermutations([2, 1]), [[1, 2], [2, 1]]);
check("unique perms keeps input", (() => {
  const input = [2, 1, 1];
  uniquePermutations(input);
  return input;
})(), [2, 1, 1]);

console.log();
check("subsets of 3", subsets([1, 2, 3]), [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]);
check("subsets of none", subsets([]), [[]]);
check("subsets of one", subsets(["x"]), [[], ["x"]]);
check("subsets count 10", subsets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).length, 1024);
check("subsets too many", raises(() => subsets(new Array(13).fill(0))), true);
check("combos 4 choose 2", combinations(4, 2), [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]);
check("combos choose zero", combinations(3, 0), [[]]);
check("combos choose too many", combinations(3, 4), []);
check("combos choose all", combinations(3, 3), [[1, 2, 3]]);
check("combos 10 choose 3", combinations(10, 3).length, 120);
check("combos zero zero", combinations(0, 0), [[]]);
check("combos negative", raises(() => combinations(-1, 1)), true);
check("combos decimal", raises(() => combinations(3, 1.5)), true);

console.log();
check("sum 7", combinationSum([2, 3, 6, 7], 7), [[2, 2, 3], [7]]);
check("sum 8", combinationSum([2, 3, 5], 8), [[2, 2, 2, 2], [2, 3, 3], [3, 5]]);
check("sum impossible", combinationSum([2], 1), []);
check("sum repeat one", combinationSum([2], 4), [[2, 2]]);
check("sum ones", combinationSum([1], 3), [[1, 1, 1]]);
check("sum unsorted", combinationSum([7, 3, 2, 6], 7), [[2, 2, 3], [7]]);
check("sum duplicates", combinationSum([2, 2, 3], 5), [[2, 3]]);
check("sum bad target", raises(() => combinationSum([1], 0)), true);
check("sum bad candidate", raises(() => combinationSum([0], 3)), true);

console.log();
check("parens 0", parentheses(0), [""]);
check("parens 1", parentheses(1), ["()"]);
check("parens 2", parentheses(2), ["(())", "()()"]);
check("parens 3", parentheses(3), ["((()))", "(()())", "(())()", "()(())", "()()()"]);
check("parens catalan", [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => parentheses(n).length), [1, 1, 2, 5, 14, 42, 132, 429, 1430]);
check("parens too big", raises(() => parentheses(11)), true);
check("parens negative", raises(() => parentheses(-1)), true);
let parenOk = true;
for (let n = 0; n <= 7; n++) {
  const list = parentheses(n);
  if (new Set(list).size !== list.length || !list.every((s) => balanced(s))) {
    parenOk = false;
  }
}
check("all balanced and unique", parenOk, true);

console.log();
check("queens counts", [1, 2, 3, 4, 5, 6, 7, 8].map((n) => nQueens(n).length), [1, 0, 0, 2, 10, 4, 40, 92]);
check("queens 4 solutions", nQueens(4), [[1, 3, 0, 2], [2, 0, 3, 1]]);
check("queens 1", nQueens(1), [[0]]);
check("queens 4 board", boardText([1, 3, 0, 2]), ".Q..\n...Q\nQ...\n..Q.");
check("queens valid check", isValidQueens([1, 3, 0, 2]), true);
check("queens same column", isValidQueens([0, 0, 1, 2]), false);
check("queens diagonal", isValidQueens([0, 1, 3, 2]), false);
check("queens all valid", nQueens(6).every((s) => isValidQueens(s)), true);
check("queens too big", raises(() => nQueens(10)), true);
check("queens zero", raises(() => nQueens(0)), true);

console.log();
const PUZZLE = [
  "53..7....",
  "6..195...",
  ".98....6.",
  "8...6...3",
  "4..8.3..1",
  "7...2...6",
  ".6....28.",
  "...419..5",
  "....8..79",
];
const SOLUTION = [
  "534678912",
  "672195348",
  "198342567",
  "859761423",
  "426853791",
  "713924856",
  "961537284",
  "287419635",
  "345286179",
];
check("sudoku solves", solveSudoku(PUZZLE), SOLUTION);
check("solution is valid", isSolved(SOLUTION), true);
check("puzzle is not solved", isSolved(PUZZLE.map((r) => r.replace(/\./g, "1"))), false);
check("solved grid stays", solveSudoku(SOLUTION), SOLUTION);
check("givens kept", solveSudoku(PUZZLE).every((row, r) => row.split("").every((ch, c) => PUZZLE[r][c] === "." || PUZZLE[r][c] === ch)), true);
const blank = new Array(9).fill(".........");
check("blank grid solves", isSolved(solveSudoku(blank)), true);
const rowClash = ["55.......", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........."];
check("row clash", solveSudoku(rowClash), null);
const colClash = ["5........", "5........", ".........", ".........", ".........", ".........", ".........", ".........", "........."];
check("column clash", solveSudoku(colClash), null);
const boxClash = ["5........", ".5.......", ".........", ".........", ".........", ".........", ".........", ".........", "........."];
check("box clash", solveSudoku(boxClash), null);
check("wrong row count", raises(() => solveSudoku(["123"])), true);
check("bad character", raises(() => solveSudoku(new Array(9).fill("12345678x"))), true);
check("short row", raises(() => solveSudoku(new Array(9).fill("12345678"))), true);
check("input not changed", PUZZLE[0], "53..7....");

console.log();
let factorials = [1, 1, 2, 6, 24, 120, 720];
let permOk = true;
for (let n = 0; n <= 6; n++) {
  const list = permutations(new Array(n).fill(0).map((x, i) => i));
  if (list.length !== factorials[n]) {
    permOk = false;
  }
  if (new Set(list.map((p) => JSON.stringify(p))).size !== list.length) {
    permOk = false;
  }
}
check("perm counts 0 to 6", permOk, true);

let subsetOk = true;
for (let n = 0; n <= 10; n++) {
  const list = subsets(new Array(n).fill(0).map((x, i) => i));
  if (list.length !== Math.pow(2, n)) {
    subsetOk = false;
  }
  if (new Set(list.map((p) => JSON.stringify(p))).size !== list.length) {
    subsetOk = false;
  }
}
check("subset counts 0 to 10", subsetOk, true);

const pascal = [[1]];
for (let n = 1; n <= 9; n++) {
  const row = [1];
  for (let k = 1; k < n; k++) {
    row.push(pascal[n - 1][k - 1] + pascal[n - 1][k]);
  }
  row.push(1);
  pascal.push(row);
}
let comboOk = true;
for (let n = 0; n <= 9; n++) {
  for (let k = 0; k <= 9; k++) {
    const expected = k <= n ? pascal[n][k] : 0;
    if (combinations(n, k).length !== expected) {
      comboOk = false;
    }
  }
}
check("combination counts", comboOk, true);

let sumOk = true;
for (const target of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  for (const list of combinationSum([2, 3, 5], target)) {
    if (list.reduce((s, x) => s + x, 0) !== target) {
      sumOk = false;
    }
  }
}
check("every sum adds up", sumOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
