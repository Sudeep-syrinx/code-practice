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

function binarySearch(list, target) {
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] === target) {
      return mid;
    }
    if (list[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return -1;
}

function lowerBound(list, target) {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function upperBound(list, target) {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function countOccurrences(list, target) {
  return upperBound(list, target) - lowerBound(list, target);
}

function searchInsert(list, target) {
  return lowerBound(list, target);
}

function firstTrue(lo, hi, test) {
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo > hi) {
    throw new Error("bad range");
  }
  let left = lo;
  let right = hi + 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (test(mid)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  return left;
}

function sqrtFloor(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a non-negative integer");
  }
  return firstTrue(0, n, (x) => x * x > n) - 1;
}

function searchRotated(list, target) {
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] === target) {
      return mid;
    }
    if (list[lo] <= list[mid]) {
      if (list[lo] <= target && target < list[mid]) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    } else {
      if (list[mid] < target && target <= list[hi]) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }
  return -1;
}

function minRotated(list) {
  if (list.length === 0) {
    throw new Error("list is empty");
  }
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] > list[hi]) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return list[lo];
}

function findPeak(list) {
  if (list.length === 0) {
    return -1;
  }
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (list[mid] < list[mid + 1]) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

const sorted = [1, 3, 5, 7, 9, 11];
check("find middle", binarySearch(sorted, 7), 3);
check("find first", binarySearch(sorted, 1), 0);
check("find last", binarySearch(sorted, 11), 5);
check("find missing", binarySearch(sorted, 4), -1);
check("find too small", binarySearch(sorted, -5), -1);
check("find too big", binarySearch(sorted, 100), -1);
check("find in empty", binarySearch([], 1), -1);
check("find single", binarySearch([4], 4), 0);

console.log();
const dups = [1, 2, 2, 2, 3];
check("lower bound 2", lowerBound(dups, 2), 1);
check("upper bound 2", upperBound(dups, 2), 4);
check("count 2", countOccurrences(dups, 2), 3);
check("count missing", countOccurrences(dups, 7), 0);
check("lower bound small", lowerBound(dups, 0), 0);
check("lower bound big", lowerBound(dups, 5), 5);
check("upper bound last", upperBound(dups, 3), 5);
check("lower bound empty", lowerBound([], 3), 0);
check("insert middle", searchInsert([1, 3, 5, 6], 5), 2);
check("insert between", searchInsert([1, 3, 5, 6], 2), 1);
check("insert end", searchInsert([1, 3, 5, 6], 7), 4);
check("insert start", searchInsert([1, 3, 5, 6], 0), 0);

console.log();
check("first true", firstTrue(0, 100, (x) => x >= 37), 37);
check("first true none", firstTrue(0, 10, (x) => x > 50), 11);
check("first true at start", firstTrue(5, 10, () => true), 5);
check("first true bad range", raises(() => firstTrue(5, 1, () => true)), true);
check("sqrt 0", sqrtFloor(0), 0);
check("sqrt 1", sqrtFloor(1), 1);
check("sqrt 15", sqrtFloor(15), 3);
check("sqrt 16", sqrtFloor(16), 4);
check("sqrt 17", sqrtFloor(17), 4);
check("sqrt big", sqrtFloor(1000000), 1000);
check("sqrt negative", raises(() => sqrtFloor(-1)), true);
check("sqrt decimal", raises(() => sqrtFloor(2.5)), true);

console.log();
const rot = [4, 5, 6, 7, 0, 1, 2];
check("rotated find 0", searchRotated(rot, 0), 4);
check("rotated find 4", searchRotated(rot, 4), 0);
check("rotated find 2", searchRotated(rot, 2), 6);
check("rotated find 6", searchRotated(rot, 6), 2);
check("rotated missing", searchRotated(rot, 3), -1);
check("rotated single hit", searchRotated([1], 1), 0);
check("rotated single miss", searchRotated([1], 0), -1);
check("rotated empty", searchRotated([], 1), -1);
check("min rotated", minRotated(rot), 0);
check("min rotated two", minRotated([3, 4, 5, 1, 2]), 1);
check("min not rotated", minRotated([1, 2, 3]), 1);
check("min two items", minRotated([2, 1]), 1);
check("min single", minRotated([5]), 5);
check("min empty raises", raises(() => minRotated([])), true);
check("peak simple", findPeak([1, 2, 3, 1]), 2);
check("peak first", findPeak([5, 3, 1]), 0);
check("peak last", findPeak([1, 3, 5]), 2);
check("peak single", findPeak([9]), 0);
check("peak empty", findPeak([]), -1);

console.log();
let seed = 1234;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function sortedRandom(len) {
  const list = [];
  let value = nextRandom(5);
  for (let i = 0; i < len; i++) {
    list.push(value);
    value += 1 + nextRandom(4);
  }
  return list;
}
let searchOk = true;
let boundOk = true;
let rotOk = true;
let peakOk = true;
for (let round = 0; round < 300; round++) {
  const list = sortedRandom(nextRandom(20));
  const target = nextRandom(80);
  const found = binarySearch(list, target);
  if (found !== list.indexOf(target)) {
    searchOk = false;
  }
  const withDups = [];
  for (const v of list) {
    const copies = 1 + nextRandom(3);
    for (let c = 0; c < copies; c++) {
      withDups.push(v);
    }
  }
  const expectedCount = withDups.filter((x) => x === target).length;
  if (countOccurrences(withDups, target) !== expectedCount) {
    boundOk = false;
  }
  const lb = withDups.findIndex((x) => x >= target);
  if (lowerBound(withDups, target) !== (lb === -1 ? withDups.length : lb)) {
    boundOk = false;
  }
  if (list.length > 0) {
    const cut = nextRandom(list.length);
    const rotated = list.slice(cut).concat(list.slice(0, cut));
    if (searchRotated(rotated, target) !== rotated.indexOf(target)) {
      rotOk = false;
    }
    if (minRotated(rotated) !== list[0]) {
      rotOk = false;
    }
  }
  const wiggle = [];
  for (let i = 0; i < 1 + nextRandom(12); i++) {
    wiggle.push(i * 2 + nextRandom(2) * (i % 2));
  }
  const noTies = wiggle.filter((v, i) => i === 0 || v !== wiggle[i - 1]);
  const p = findPeak(noTies);
  if (p > 0 && noTies[p - 1] > noTies[p]) {
    peakOk = false;
  }
  if (p < noTies.length - 1 && noTies[p + 1] > noTies[p]) {
    peakOk = false;
  }
}
check("300 random searches", searchOk, true);
check("300 random bounds", boundOk, true);
check("300 random rotations", rotOk, true);
check("300 random peaks", peakOk, true);
let sqrtOk = true;
for (let n = 0; n <= 2000; n++) {
  const s = sqrtFloor(n);
  if (s * s > n || (s + 1) * (s + 1) <= n) {
    sqrtOk = false;
  }
}
check("2001 square roots", sqrtOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
