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

function insertionSort(arr) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}

function mergeSort(arr) {
  if (arr.length <= 1) {
    return arr.slice();
  }
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const out = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      out.push(left[i++]);
    } else {
      out.push(right[j++]);
    }
  }
  return out.concat(left.slice(i)).concat(right.slice(j));
}

function binarySearch(sorted, target) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] === target) {
      return mid;
    }
    if (sorted[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return -1;
}

function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}

function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) {
      return false;
    }
  }
  return true;
}

function maxOf(arr) {
  if (arr.length === 0) {
    throw new Error("empty array");
  }
  let best = arr[0];
  for (const x of arr) {
    if (x > best) {
      best = x;
    }
  }
  return best;
}

const sample = [5, 2, 9, 1, 5, 6];
const expected = [1, 2, 5, 5, 6, 9];

check("bubble sort", bubbleSort(sample), expected);
check("insertion sort", insertionSort(sample), expected);
check("merge sort", mergeSort(sample), expected);
check("original unchanged", sample, [5, 2, 9, 1, 5, 6]);
check("sort empty", mergeSort([]), []);
check("sort single", bubbleSort([7]), [7]);
check("sort sorted", insertionSort([1, 2, 3]), [1, 2, 3]);
check("sort reversed", mergeSort([3, 2, 1]), [1, 2, 3]);
check("sort negatives", bubbleSort([3, -1, 0, -5]), [-5, -1, 0, 3]);

console.log();
const sorted = [1, 3, 5, 7, 9, 11];
check("binary find first", binarySearch(sorted, 1), 0);
check("binary find last", binarySearch(sorted, 11), 5);
check("binary find middle", binarySearch(sorted, 7), 3);
check("binary missing", binarySearch(sorted, 4), -1);
check("binary empty", binarySearch([], 1), -1);
check("linear find", linearSearch([4, 8, 15], 15), 2);
check("linear missing", linearSearch([4, 8, 15], 99), -1);
check("is sorted yes", isSorted(sorted), true);
check("is sorted no", isSorted(sample), false);
check("is sorted empty", isSorted([]), true);
check("max of array", maxOf(sample), 9);
check("max empty raises", raises(() => maxOf([])), true);

console.log();
let seed = 777;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let sortOk = true;
let searchOk = true;
for (let n = 0; n < 200; n++) {
  const arr = [];
  const len = nextRandom(30);
  for (let i = 0; i < len; i++) {
    arr.push(nextRandom(100) - 50);
  }
  const b = bubbleSort(arr);
  const ins = insertionSort(arr);
  const m = mergeSort(arr);
  if (!isSorted(b) || !isSorted(ins) || !isSorted(m)) {
    sortOk = false;
  }
  if (JSON.stringify(b) !== JSON.stringify(m) || JSON.stringify(ins) !== JSON.stringify(m)) {
    sortOk = false;
  }
  for (const x of m) {
    if (m[binarySearch(m, x)] !== x) {
      searchOk = false;
    }
  }
}
check("200 random sorts agree", sortOk, true);
check("binary search finds all", searchOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
