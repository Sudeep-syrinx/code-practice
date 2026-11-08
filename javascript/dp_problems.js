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

function checkCoins(coins) {
  if (!Array.isArray(coins) || coins.some((c) => !Number.isInteger(c) || c < 1)) {
    throw new Error("coins must be positive integers");
  }
}

function checkAmount(amount) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("amount must be a non-negative integer");
  }
}

function coinChange(coins, amount) {
  checkCoins(coins);
  checkAmount(amount);
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && best[a - c] + 1 < best[a]) {
        best[a] = best[a - c] + 1;
      }
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}

function coinWays(coins, amount) {
  checkCoins(coins);
  checkAmount(amount);
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) {
    for (let a = c; a <= amount; a++) {
      ways[a] += ways[a - c];
    }
  }
  return ways[amount];
}

function lcsTable(a, b) {
  const t = [];
  for (let i = 0; i <= a.length; i++) {
    t.push(new Array(b.length + 1).fill(0));
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        t[i][j] = t[i - 1][j - 1] + 1;
      } else {
        t[i][j] = Math.max(t[i - 1][j], t[i][j - 1]);
      }
    }
  }
  return t;
}

function lcsLength(a, b) {
  return lcsTable(a, b)[a.length][b.length];
}

function lcs(a, b) {
  const t = lcsTable(a, b);
  let i = a.length;
  let j = b.length;
  let out = "";
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out = a[i - 1] + out;
      i--;
      j--;
    } else if (t[i - 1][j] >= t[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return out;
}

function editDistance(a, b) {
  const t = [];
  for (let i = 0; i <= a.length; i++) {
    t.push(new Array(b.length + 1).fill(0));
    t[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    t[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        t[i][j] = t[i - 1][j - 1];
      } else {
        t[i][j] = 1 + Math.min(t[i - 1][j], t[i][j - 1], t[i - 1][j - 1]);
      }
    }
  }
  return t[a.length][b.length];
}

function knapsack(weights, values, cap) {
  if (!Array.isArray(weights) || !Array.isArray(values) || weights.length !== values.length) {
    throw new Error("weights and values must be arrays of the same length");
  }
  if (!Number.isInteger(cap) || cap < 0) {
    throw new Error("capacity must be a non-negative integer");
  }
  const dp = new Array(cap + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = cap; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[cap];
}

function lis(nums) {
  if (nums.length === 0) {
    return 0;
  }
  const best = new Array(nums.length).fill(1);
  let top = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && best[j] + 1 > best[i]) {
        best[i] = best[j] + 1;
      }
    }
    top = Math.max(top, best[i]);
  }
  return top;
}

function maxSubarray(nums) {
  if (nums.length === 0) {
    throw new Error("array must not be empty");
  }
  let current = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}

function climbStairs(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a non-negative integer");
  }
  let a = 1;
  let b = 1;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

function gridPaths(rows, cols) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error("rows and cols must be positive integers");
  }
  const dp = new Array(cols).fill(1);
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      dp[c] += dp[c - 1];
    }
  }
  return dp[cols - 1];
}

function canPartition(nums) {
  if (!Array.isArray(nums) || nums.some((x) => !Number.isInteger(x) || x < 0)) {
    throw new Error("numbers must be non-negative integers");
  }
  const total = nums.reduce((s, x) => s + x, 0);
  if (total % 2 !== 0) {
    return false;
  }
  const target = total / 2;
  const can = new Array(target + 1).fill(false);
  can[0] = true;
  for (const x of nums) {
    for (let s = target; s >= x; s--) {
      if (can[s - x]) {
        can[s] = true;
      }
    }
  }
  return can[target];
}

check("coins 11", coinChange([1, 2, 5], 11), 3);
check("coins impossible", coinChange([2], 3), -1);
check("coins zero amount", coinChange([1], 0), 0);
check("coins exact", coinChange([5], 25), 5);
check("coins greedy fails", coinChange([1, 3, 4], 6), 2);
check("coins empty list", coinChange([], 5), -1);
check("coins empty zero", coinChange([], 0), 0);
check("coins bad coin", raises(() => coinChange([0, 1], 5)), true);
check("coins text coin", raises(() => coinChange(["1"], 5)), true);
check("coins bad amount", raises(() => coinChange([1], -1)), true);
check("coins decimal amount", raises(() => coinChange([1], 2.5)), true);
check("ways 5", coinWays([1, 2, 5], 5), 4);
check("ways impossible", coinWays([2], 3), 0);
check("ways zero", coinWays([1, 2], 0), 1);
check("ways 123 for 4", coinWays([1, 2, 3], 4), 4);
check("ways one coin", coinWays([3], 9), 1);
check("ways bad input", raises(() => coinWays([1], -5)), true);

console.log();
check("lcs length", lcsLength("abcde", "ace"), 3);
check("lcs same", lcsLength("abc", "abc"), 3);
check("lcs none", lcsLength("abc", "def"), 0);
check("lcs empty", lcsLength("", "abc"), 0);
check("lcs classic", lcsLength("AGGTAB", "GXTXAYB"), 4);
check("lcs text classic", lcs("AGGTAB", "GXTXAYB"), "GTAB");
check("lcs text simple", lcs("abcde", "ace"), "ace");
check("lcs text none", lcs("abc", "def"), "");
check("lcs text empty", lcs("", ""), "");
check("lcs text same", lcs("hello", "hello"), "hello");

console.log();
check("edit kitten", editDistance("kitten", "sitting"), 3);
check("edit horse", editDistance("horse", "ros"), 3);
check("edit intention", editDistance("intention", "execution"), 5);
check("edit sunday", editDistance("sunday", "saturday"), 3);
check("edit flaw", editDistance("flaw", "lawn"), 2);
check("edit same", editDistance("abc", "abc"), 0);
check("edit from empty", editDistance("", "abc"), 3);
check("edit to empty", editDistance("abcd", ""), 4);
check("edit both empty", editDistance("", ""), 0);
check("edit one letter", editDistance("a", "b"), 1);
check("edit symmetric", editDistance("sunday", "saturday") === editDistance("saturday", "sunday"), true);

console.log();
check("knapsack small", knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7), 9);
check("knapsack classic", knapsack([10, 20, 30], [60, 100, 120], 50), 220);
check("knapsack zero cap", knapsack([1, 2], [5, 6], 0), 0);
check("knapsack too heavy", knapsack([10], [5], 3), 0);
check("knapsack empty", knapsack([], [], 10), 0);
check("knapsack take all", knapsack([1, 1, 1], [2, 3, 4], 5), 9);
check("knapsack length mismatch", raises(() => knapsack([1], [1, 2], 5)), true);
check("knapsack bad cap", raises(() => knapsack([1], [1], -1)), true);

console.log();
check("lis example", lis([10, 9, 2, 5, 3, 7, 101, 18]), 4);
check("lis second", lis([0, 1, 0, 3, 2, 3]), 4);
check("lis equal values", lis([7, 7, 7]), 1);
check("lis mixed", lis([1, 3, 6, 7, 9, 4, 10, 5, 6]), 6);
check("lis empty", lis([]), 0);
check("lis rising", lis([1, 2, 3]), 3);
check("lis falling", lis([3, 2, 1]), 1);
check("kadane example", maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6);
check("kadane all negative", maxSubarray([-3, -1, -2]), -1);
check("kadane single", maxSubarray([5]), 5);
check("kadane all positive", maxSubarray([1, 2, 3]), 6);
check("kadane empty raises", raises(() => maxSubarray([])), true);

console.log();
check("stairs 0", climbStairs(0), 1);
check("stairs 1", climbStairs(1), 1);
check("stairs 2", climbStairs(2), 2);
check("stairs 3", climbStairs(3), 3);
check("stairs 5", climbStairs(5), 8);
check("stairs 10", climbStairs(10), 89);
check("stairs negative", raises(() => climbStairs(-1)), true);
check("grid 3 by 7", gridPaths(3, 7), 28);
check("grid 3 by 2", gridPaths(3, 2), 3);
check("grid 1 by 1", gridPaths(1, 1), 1);
check("grid one row", gridPaths(1, 5), 1);
check("grid 2 by 2", gridPaths(2, 2), 2);
check("grid zero raises", raises(() => gridPaths(0, 3)), true);
check("partition yes", canPartition([1, 5, 11, 5]), true);
check("partition odd sum", canPartition([1, 2, 3, 5]), false);
check("partition equal", canPartition([3, 3, 3, 3]), true);
check("partition pair", canPartition([1, 1]), true);
check("partition empty", canPartition([]), true);
check("partition negative raises", raises(() => canPartition([1, -1])), true);

console.log();
function bruteEdit(a, b) {
  if (a === "") {
    return b.length;
  }
  if (b === "") {
    return a.length;
  }
  if (a[0] === b[0]) {
    return bruteEdit(a.slice(1), b.slice(1));
  }
  return 1 + Math.min(bruteEdit(a.slice(1), b), bruteEdit(a, b.slice(1)), bruteEdit(a.slice(1), b.slice(1)));
}

function bruteLcs(a, b) {
  if (a === "" || b === "") {
    return 0;
  }
  if (a[0] === b[0]) {
    return 1 + bruteLcs(a.slice(1), b.slice(1));
  }
  return Math.max(bruteLcs(a.slice(1), b), bruteLcs(a, b.slice(1)));
}

function bruteCoins(coins, amount) {
  if (amount === 0) {
    return 0;
  }
  let best = Infinity;
  for (const c of coins) {
    if (c <= amount) {
      best = Math.min(best, 1 + bruteCoins(coins, amount - c));
    }
  }
  return best;
}

function isSubsequence(small, big) {
  let i = 0;
  for (const ch of big) {
    if (i < small.length && small[i] === ch) {
      i++;
    }
  }
  return i === small.length;
}

let seed = 2718;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}

function randomText(maxLen) {
  let s = "";
  const len = nextRandom(maxLen + 1);
  for (let i = 0; i < len; i++) {
    s += "ab"[nextRandom(2)];
  }
  return s;
}

let editOk = true;
let lcsOk = true;
for (let n = 0; n < 150; n++) {
  const a = randomText(5);
  const b = randomText(5);
  if (editDistance(a, b) !== bruteEdit(a, b)) {
    editOk = false;
  }
  if (editDistance(a, b) !== editDistance(b, a)) {
    editOk = false;
  }
  const common = lcs(a, b);
  if (lcsLength(a, b) !== bruteLcs(a, b)) {
    lcsOk = false;
  }
  if (common.length !== lcsLength(a, b)) {
    lcsOk = false;
  }
  if (!isSubsequence(common, a) || !isSubsequence(common, b)) {
    lcsOk = false;
  }
}
check("150 random edit distances", editOk, true);
check("150 random lcs checks", lcsOk, true);

let knapOk = true;
let coinOk = true;
let kadaneOk = true;
let partitionOk = true;
for (let n = 0; n < 150; n++) {
  const count = nextRandom(8);
  const weights = [];
  const values = [];
  for (let i = 0; i < count; i++) {
    weights.push(1 + nextRandom(9));
    values.push(1 + nextRandom(20));
  }
  const cap = nextRandom(21);
  let best = 0;
  for (let mask = 0; mask < 1 << count; mask++) {
    let w = 0;
    let v = 0;
    for (let i = 0; i < count; i++) {
      if (mask & (1 << i)) {
        w += weights[i];
        v += values[i];
      }
    }
    if (w <= cap && v > best) {
      best = v;
    }
  }
  if (knapsack(weights, values, cap) !== best) {
    knapOk = false;
  }

  const coins = [];
  const coinCount = 1 + nextRandom(3);
  for (let i = 0; i < coinCount; i++) {
    coins.push(1 + nextRandom(5));
  }
  const amount = nextRandom(9);
  const expected = bruteCoins(coins, amount);
  if (coinChange(coins, amount) !== (expected === Infinity ? -1 : expected)) {
    coinOk = false;
  }

  const arr = [];
  const len = 1 + nextRandom(15);
  for (let i = 0; i < len; i++) {
    arr.push(nextRandom(21) - 10);
  }
  let bestSum = -Infinity;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let j = i; j < len; j++) {
      sum += arr[j];
      if (sum > bestSum) {
        bestSum = sum;
      }
    }
  }
  if (maxSubarray(arr) !== bestSum) {
    kadaneOk = false;
  }

  const nums = [];
  const numCount = nextRandom(9);
  let total = 0;
  for (let i = 0; i < numCount; i++) {
    const x = nextRandom(10);
    nums.push(x);
    total += x;
  }
  let possible = false;
  if (total % 2 === 0) {
    for (let mask = 0; mask < 1 << numCount; mask++) {
      let sum = 0;
      for (let i = 0; i < numCount; i++) {
        if (mask & (1 << i)) {
          sum += nums[i];
        }
      }
      if (sum === total / 2) {
        possible = true;
        break;
      }
    }
  }
  if (canPartition(nums) !== possible) {
    partitionOk = false;
  }
}
check("150 random knapsacks", knapOk, true);
check("150 random coin changes", coinOk, true);
check("150 random max subarrays", kadaneOk, true);
check("150 random partitions", partitionOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
