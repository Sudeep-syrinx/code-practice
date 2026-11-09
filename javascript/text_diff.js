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

function lcsTable(a, b) {
  const table = [];
  for (let i = 0; i <= a.length; i++) {
    table.push(new Array(b.length + 1).fill(0));
  }
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
  }
  return table;
}

function lcsLength(a, b) {
  return lcsTable(a, b)[0][0];
}

function lcs(a, b) {
  const table = lcsTable(a, b);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return out;
}

function diff(a, b) {
  const table = lcsTable(a, b);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ op: "keep", value: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ op: "del", value: a[i] });
      i++;
    } else {
      ops.push({ op: "add", value: b[j] });
      j++;
    }
  }
  while (i < a.length) {
    ops.push({ op: "del", value: a[i++] });
  }
  while (j < b.length) {
    ops.push({ op: "add", value: b[j++] });
  }
  return ops;
}

function applyDiff(ops) {
  return ops.filter((o) => o.op !== "del").map((o) => o.value);
}

function revertDiff(ops) {
  return ops.filter((o) => o.op !== "add").map((o) => o.value);
}

function diffStats(ops) {
  const stats = { keep: 0, add: 0, del: 0 };
  for (const o of ops) {
    stats[o.op]++;
  }
  return stats;
}

function similarity(a, b) {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  return (2 * lcsLength(a, b)) / (a.length + b.length);
}

function diffText(a, b) {
  return diff(a.split("\n"), b.split("\n"));
}

function render(ops) {
  return ops
    .map((o) => (o.op === "keep" ? "  " : o.op === "add" ? "+ " : "- ") + o.value)
    .join("\n");
}

function isSubsequence(small, big) {
  let i = 0;
  for (const x of big) {
    if (i < small.length && small[i] === x) {
      i++;
    }
  }
  return i === small.length;
}

check("lcs length classic", lcsLength("ABCBDAB".split(""), "BDCABA".split("")), 4);
check("lcs length same", lcsLength(["a", "b"], ["a", "b"]), 2);
check("lcs length none", lcsLength(["a"], ["b"]), 0);
check("lcs length empty", lcsLength([], ["a"]), 0);
check("lcs length both empty", lcsLength([], []), 0);
check("lcs same text", lcs("abc".split(""), "abc".split("")).join(""), "abc");
check("lcs gap", lcs("axbxc".split(""), "abc".split("")).join(""), "abc");
check("lcs none", lcs(["a"], ["b"]), []);
check("lcs classic size", lcs("ABCBDAB".split(""), "BDCABA".split("")).length, 4);
check("lcs numbers", lcs([1, 2, 3, 4], [2, 4, 5]), [2, 4]);

console.log();
check("diff small", diff(["a", "b", "c"], ["a", "c", "d"]), [
  { op: "keep", value: "a" },
  { op: "del", value: "b" },
  { op: "keep", value: "c" },
  { op: "add", value: "d" },
]);
check("diff same", diff(["x"], ["x"]), [{ op: "keep", value: "x" }]);
check("diff all new", diff([], ["a", "b"]), [{ op: "add", value: "a" }, { op: "add", value: "b" }]);
check("diff all gone", diff(["a", "b"], []), [{ op: "del", value: "a" }, { op: "del", value: "b" }]);
check("diff both empty", diff([], []), []);
check("diff replace", diff(["a"], ["b"]).length, 2);
check("stats", diffStats(diff(["a", "b", "c"], ["a", "c", "d"])), { keep: 2, add: 1, del: 1 });
check("apply", applyDiff(diff(["a", "b", "c"], ["a", "c", "d"])), ["a", "c", "d"]);
check("revert", revertDiff(diff(["a", "b", "c"], ["a", "c", "d"])), ["a", "b", "c"]);

console.log();
const oldText = "one\ntwo\nthree";
const newText = "one\n2\nthree\nfour";
const ops = diffText(oldText, newText);
check("text apply", applyDiff(ops).join("\n"), newText);
check("text revert", revertDiff(ops).join("\n"), oldText);
check("text render", render(ops), "  one\n- two\n+ 2\n  three\n+ four");
check("text identical", diffStats(diffText("a\nb", "a\nb")), { keep: 2, add: 0, del: 0 });

console.log();
check("similar same", similarity(["a", "b"], ["a", "b"]), 1);
check("similar none", similarity(["a"], ["b"]), 0);
check("similar both empty", similarity([], []), 1);
check("similar partial", Math.round(similarity("ab".split(""), "abcd".split("")) * 1000) / 1000, 0.667);
check("similar one empty", similarity([], ["a"]), 0);

console.log();
let seed = 321;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomList(maxLen) {
  const len = nextRandom(maxLen);
  const list = [];
  for (let i = 0; i < len; i++) {
    list.push("abc"[nextRandom(3)]);
  }
  return list;
}
let diffOk = true;
let lcsOk = true;
let symmetryOk = true;
for (let round = 0; round < 300; round++) {
  const a = randomList(12);
  const b = randomList(12);
  const d = diff(a, b);
  if (JSON.stringify(applyDiff(d)) !== JSON.stringify(b)) {
    diffOk = false;
  }
  if (JSON.stringify(revertDiff(d)) !== JSON.stringify(a)) {
    diffOk = false;
  }
  const common = lcs(a, b);
  if (common.length !== lcsLength(a, b) || !isSubsequence(common, a) || !isSubsequence(common, b)) {
    lcsOk = false;
  }
  if (diffStats(d).keep !== common.length) {
    lcsOk = false;
  }
  if (lcsLength(a, b) !== lcsLength(b, a)) {
    symmetryOk = false;
  }
  if (lcsLength(a, a) !== a.length) {
    symmetryOk = false;
  }
}
check("300 diffs rebuild", diffOk, true);
check("300 lcs valid", lcsOk, true);
check("300 symmetry checks", symmetryOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
