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

function validate(list) {
  if (!Array.isArray(list)) {
    throw new Error("intervals must be an array");
  }
  for (const iv of list) {
    if (!Array.isArray(iv) || iv.length !== 2 || typeof iv[0] !== "number" || typeof iv[1] !== "number" || iv[0] > iv[1]) {
      throw new Error("bad interval");
    }
  }
}

function mergeIntervals(list) {
  validate(list);
  const sorted = list.map((iv) => [iv[0], iv[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) {
      if (iv[1] > last[1]) {
        last[1] = iv[1];
      }
    } else {
      out.push(iv);
    }
  }
  return out;
}

function insertInterval(list, item) {
  validate([item]);
  return mergeIntervals(list.concat([item]));
}

function intersect(a, b) {
  const ma = mergeIntervals(a);
  const mb = mergeIntervals(b);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < ma.length && j < mb.length) {
    const lo = Math.max(ma[i][0], mb[j][0]);
    const hi = Math.min(ma[i][1], mb[j][1]);
    if (lo <= hi) {
      out.push([lo, hi]);
    }
    if (ma[i][1] < mb[j][1]) {
      i++;
    } else {
      j++;
    }
  }
  return out;
}

function totalCovered(list) {
  return mergeIntervals(list).reduce((sum, iv) => sum + (iv[1] - iv[0]), 0);
}

function findGaps(list, lo, hi) {
  if (typeof lo !== "number" || typeof hi !== "number" || lo > hi) {
    throw new Error("bad range");
  }
  const gaps = [];
  let cursor = lo;
  for (const m of mergeIntervals(list)) {
    if (cursor >= hi) {
      break;
    }
    if (m.start === undefined && m[0] > cursor) {
      gaps.push([cursor, Math.min(m[0], hi)]);
    }
    cursor = Math.max(cursor, m[1]);
  }
  if (cursor < hi) {
    gaps.push([cursor, hi]);
  }
  return gaps;
}

function sweep(list, startsFirst) {
  validate(list);
  const events = [];
  for (const iv of list) {
    events.push([iv[0], 1]);
    events.push([iv[1], -1]);
  }
  events.sort((a, b) => a[0] - b[0] || (startsFirst ? b[1] - a[1] : a[1] - b[1]));
  let current = 0;
  let best = 0;
  for (const ev of events) {
    current += ev[1];
    if (current > best) {
      best = current;
    }
  }
  return best;
}

function maxOverlap(list) {
  return sweep(list, true);
}

function minRooms(meetings) {
  return sweep(meetings, false);
}

check("merge example", mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]), [[1, 6], [8, 10], [15, 18]]);
check("merge touching", mergeIntervals([[1, 4], [4, 5]]), [[1, 5]]);
check("merge empty", mergeIntervals([]), []);
check("merge unsorted", mergeIntervals([[5, 6], [1, 2]]), [[1, 2], [5, 6]]);
check("merge nested", mergeIntervals([[1, 10], [2, 3]]), [[1, 10]]);
check("merge single", mergeIntervals([[2, 2]]), [[2, 2]]);
check("merge chain", mergeIntervals([[1, 2], [2, 3], [3, 4], [10, 11]]), [[1, 4], [10, 11]]);
check("merge bad interval", raises(() => mergeIntervals([[3, 1]])), true);
check("merge bad shape", raises(() => mergeIntervals([[1, 2, 3]])), true);
check("merge bad type", raises(() => mergeIntervals([["a", "b"]])), true);
check("merge not array", raises(() => mergeIntervals(5)), true);
const original = [[5, 6], [1, 2]];
mergeIntervals(original);
check("merge keeps input", original, [[5, 6], [1, 2]]);

console.log();
check("insert overlap", insertInterval([[1, 3], [6, 9]], [2, 5]), [[1, 5], [6, 9]]);
check("insert many", insertInterval([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]), [[1, 2], [3, 10], [12, 16]]);
check("insert apart", insertInterval([[1, 2]], [5, 6]), [[1, 2], [5, 6]]);
check("insert into empty", insertInterval([], [1, 2]), [[1, 2]]);
check("insert bad", raises(() => insertInterval([], [2, 1])), true);

console.log();
check("intersect example", intersect([[0, 2], [5, 10], [13, 23], [24, 25]], [[1, 5], [8, 12], [15, 24], [25, 26]]), [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]);
check("intersect none", intersect([[1, 2]], [[3, 4]]), []);
check("intersect empty", intersect([], [[1, 2]]), []);
check("intersect nested", intersect([[0, 10]], [[2, 3], [5, 6]]), [[2, 3], [5, 6]]);
check("intersect same", intersect([[1, 5]], [[1, 5]]), [[1, 5]]);

console.log();
check("covered overlap", totalCovered([[1, 3], [2, 6]]), 5);
check("covered apart", totalCovered([[0, 1], [5, 8]]), 4);
check("covered empty", totalCovered([]), 0);
check("covered nested", totalCovered([[0, 10], [2, 3]]), 10);
check("gaps middle", findGaps([[2, 4], [6, 8]], 0, 10), [[0, 2], [4, 6], [8, 10]]);
check("gaps none", findGaps([[0, 5]], 0, 5), []);
check("gaps empty list", findGaps([], 0, 5), [[0, 5]]);
check("gaps clipped", findGaps([[3, 20]], 0, 10), [[0, 3]]);
check("gaps outside", findGaps([[20, 30]], 0, 10), [[0, 10]]);
check("gaps before range", findGaps([[-5, 2]], 0, 10), [[2, 10]]);
check("gaps bad range", raises(() => findGaps([], 5, 1)), true);

console.log();
check("overlap three", maxOverlap([[1, 3], [2, 4], [3, 5]]), 3);
check("overlap apart", maxOverlap([[1, 2], [3, 4]]), 1);
check("overlap empty", maxOverlap([]), 0);
check("overlap nested", maxOverlap([[0, 10], [1, 9], [2, 8], [20, 21]]), 3);
check("rooms example", minRooms([[0, 30], [5, 10], [15, 20]]), 2);
check("rooms one", minRooms([[7, 10], [2, 4]]), 1);
check("rooms back to back", minRooms([[1, 5], [5, 8]]), 1);
check("rooms all clash", minRooms([[1, 4], [2, 5], [3, 6]]), 3);
check("rooms empty", minRooms([]), 0);

console.log();
let seed = 6174;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomIntervals(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const s = nextRandom(25);
    list.push([s, s + nextRandom(6)]);
  }
  return list;
}
function cellsOf(list) {
  const cells = new Set();
  for (const iv of list) {
    for (let k = iv[0]; k < iv[1]; k++) {
      cells.add(k);
    }
  }
  return cells;
}
let mergeOk = true;
let coverOk = true;
let gapOk = true;
let overlapOk = true;
let intersectOk = true;
for (let round = 0; round < 200; round++) {
  const list = randomIntervals(nextRandom(10));
  const merged = mergeIntervals(list);
  for (let i = 1; i < merged.length; i++) {
    if (merged[i][0] <= merged[i - 1][1]) {
      mergeOk = false;
    }
  }
  for (const iv of list) {
    if (!merged.some((m) => m[0] <= iv[0] && iv[1] <= m[1])) {
      mergeOk = false;
    }
  }
  const cells = cellsOf(list);
  if (totalCovered(list) !== cells.size) {
    coverOk = false;
  }
  const lo = nextRandom(10);
  const hi = lo + nextRandom(25);
  let insideCovered = 0;
  for (let k = lo; k < hi; k++) {
    if (cells.has(k)) {
      insideCovered++;
    }
  }
  const gapLength = findGaps(list, lo, hi).reduce((s, g) => s + (g[1] - g[0]), 0);
  if (gapLength !== hi - lo - insideCovered) {
    gapOk = false;
  }
  let bestPoint = 0;
  for (let p = 0; p <= 31; p++) {
    const here = list.filter((iv) => iv[0] <= p && p <= iv[1]).length;
    if (here > bestPoint) {
      bestPoint = here;
    }
  }
  if (maxOverlap(list) !== bestPoint) {
    overlapOk = false;
  }
  const other = randomIntervals(nextRandom(8));
  const both = intersect(list, other);
  for (let p = 0; p <= 31; p++) {
    const inA = list.some((iv) => iv[0] <= p && p <= iv[1]);
    const inB = other.some((iv) => iv[0] <= p && p <= iv[1]);
    const inBoth = both.some((iv) => iv[0] <= p && p <= iv[1]);
    if (inBoth !== (inA && inB)) {
      intersectOk = false;
    }
  }
}
check("200 random merges", mergeOk, true);
check("200 random coverages", coverOk, true);
check("200 random gap sets", gapOk, true);
check("200 random overlaps", overlapOk, true);
check("200 random intersections", intersectOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
