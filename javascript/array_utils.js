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

function sum(arr) {
  let total = 0;
  for (const v of arr) {
    total += v;
  }
  return total;
}

function average(arr) {
  if (arr.length === 0) {
    throw new Error("empty array");
  }
  return sum(arr) / arr.length;
}

function maxOf(arr) {
  if (arr.length === 0) {
    throw new Error("empty array");
  }
  let best = arr[0];
  for (const v of arr) {
    if (v > best) {
      best = v;
    }
  }
  return best;
}

function minOf(arr) {
  if (arr.length === 0) {
    throw new Error("empty array");
  }
  let best = arr[0];
  for (const v of arr) {
    if (v < best) {
      best = v;
    }
  }
  return best;
}

function median(arr) {
  if (arr.length === 0) {
    throw new Error("empty array");
  }
  const sorted = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function unique(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function flatten(arr) {
  const out = [];
  for (const v of arr) {
    if (Array.isArray(v)) {
      out.push(...flatten(v));
    } else {
      out.push(v);
    }
  }
  return out;
}

function chunk(arr, size) {
  if (size < 1) {
    throw new Error("size must be at least 1");
  }
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function zip(a, b) {
  const n = Math.min(a.length, b.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push([a[i], b[i]]);
  }
  return out;
}

function range(start, end, step = 1) {
  if (step <= 0) {
    throw new Error("step must be positive");
  }
  const out = [];
  for (let v = start; v < end; v += step) {
    out.push(v);
  }
  return out;
}

function sortBy(arr, key) {
  return arr.slice().sort((x, y) => {
    if (x[key] < y[key]) {
      return -1;
    }
    if (x[key] > y[key]) {
      return 1;
    }
    return 0;
  });
}

function groupBy(arr, fn) {
  const groups = {};
  for (const v of arr) {
    const key = fn(v);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(v);
  }
  return groups;
}

function binarySearch(sorted, target) {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid] === target) {
      return mid;
    }
    if (sorted[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}

function bubbleSort(arr) {
  const a = arr.slice();
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        const tmp = a[j];
        a[j] = a[j + 1];
        a[j + 1] = tmp;
      }
    }
  }
  return a;
}

function rotate(arr, k) {
  if (arr.length === 0) {
    return [];
  }
  const n = ((k % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}

function intersection(a, b) {
  const inB = new Set(b);
  return unique(a.filter((v) => inB.has(v)));
}

function countBy(arr) {
  const counts = {};
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

check("sum", sum([1, 2, 3, 4]), 10);
check("sum empty", sum([]), 0);
check("average", average([2, 4, 6]), 4);
check("max", maxOf([3, 9, 2]), 9);
check("min", minOf([3, 9, 2]), 2);
check("max negatives", maxOf([-5, -2, -9]), -2);
check("median odd", median([3, 1, 2]), 2);
check("median even", median([4, 1, 3, 2]), 2.5);
check("empty average", raises(() => average([])), true);
check("empty max", raises(() => maxOf([])), true);
check("empty median", raises(() => median([])), true);

console.log();
check("unique", unique([1, 2, 2, 3, 1]), [1, 2, 3]);
check("unique strings", unique(["a", "b", "a"]), ["a", "b"]);
check("flatten deep", flatten([1, [2, [3, [4]]]]), [1, 2, 3, 4]);
check("flatten flat", flatten([1, 2]), [1, 2]);
check("chunk", chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
check("chunk big size", chunk([1, 2], 5), [[1, 2]]);
check("chunk bad size", raises(() => chunk([1], 0)), true);
check("zip", zip([1, 2, 3], ["a", "b"]), [[1, "a"], [2, "b"]]);
check("zip empty", zip([], [1]), []);

console.log();
check("range", range(1, 5), [1, 2, 3, 4]);
check("range step", range(0, 10, 3), [0, 3, 6, 9]);
check("range empty", range(5, 5), []);
check("range bad step", raises(() => range(0, 5, 0)), true);

const people = [
  { name: "Cara", age: 31 },
  { name: "Ann", age: 25 },
  { name: "Bob", age: 40 },
];
check("sort by age", sortBy(people, "age").map((p) => p.name), ["Ann", "Cara", "Bob"]);
check("sort by name", sortBy(people, "name").map((p) => p.name), ["Ann", "Bob", "Cara"]);
check("original untouched", people[0].name, "Cara");
check("group by letter", groupBy(["apple", "avocado", "banana"], (s) => s[0]), {
  a: ["apple", "avocado"],
  b: ["banana"],
});
check("group by parity", groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd")), {
  odd: [1, 3],
  even: [2, 4],
});

console.log();
check("binary search found", binarySearch([1, 3, 5, 7, 9], 7), 3);
check("binary search first", binarySearch([1, 3, 5, 7, 9], 1), 0);
check("binary search last", binarySearch([1, 3, 5, 7, 9], 9), 4);
check("binary search missing", binarySearch([1, 3, 5, 7, 9], 4), -1);
check("binary search empty", binarySearch([], 1), -1);
check("bubble sort", bubbleSort([5, 2, 9, 1, 5, 6]), [1, 2, 5, 5, 6, 9]);
check("bubble sorted", bubbleSort([1, 2, 3]), [1, 2, 3]);
check("bubble empty", bubbleSort([]), []);
const original = [3, 1, 2];
bubbleSort(original);
check("bubble keeps input", original, [3, 1, 2]);

console.log();
check("rotate left", rotate([1, 2, 3, 4, 5], 2), [3, 4, 5, 1, 2]);
check("rotate zero", rotate([1, 2, 3], 0), [1, 2, 3]);
check("rotate full", rotate([1, 2, 3], 3), [1, 2, 3]);
check("rotate negative", rotate([1, 2, 3, 4, 5], -1), [5, 1, 2, 3, 4]);
check("rotate empty", rotate([], 3), []);
check("intersection", intersection([1, 2, 3, 4], [3, 4, 5]), [3, 4]);
check("intersection none", intersection([1], [2]), []);
check("count by", countBy(["a", "b", "a", "c", "a"]), { a: 3, b: 1, c: 1 });

const bigArray = [];
for (let i = 0; i < 2000; i++) {
  bigArray.push((i * 7919) % 2003);
}
const sortedBig = bubbleSort(bigArray);
let inOrder = true;
for (let i = 1; i < sortedBig.length; i++) {
  if (sortedBig[i - 1] > sortedBig[i]) {
    inOrder = false;
  }
}
console.log();
check("2000 item sort", inOrder, true);
check("same length", sortedBig.length, 2000);
check("same sum", sum(sortedBig), sum(bigArray));

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
