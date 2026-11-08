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

function clean(s, label) {
  if (typeof s !== "string" || !/^[0-9]+$/.test(s)) {
    throw new Error(label + " must be a string of digits");
  }
  const t = s.replace(/^0+/, "");
  return t === "" ? "0" : t;
}

function compare(a, b) {
  a = clean(a, "a");
  b = clean(b, "b");
  if (a.length !== b.length) {
    return a.length < b.length ? -1 : 1;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function add(a, b) {
  a = clean(a, "a");
  b = clean(b, "b");
  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  const out = [];
  while (i >= 0 || j >= 0 || carry > 0) {
    const sum = (i >= 0 ? Number(a[i]) : 0) + (j >= 0 ? Number(b[j]) : 0) + carry;
    out.push(sum % 10);
    carry = Math.floor(sum / 10);
    i--;
    j--;
  }
  return out.reverse().join("");
}

function sub(a, b) {
  a = clean(a, "a");
  b = clean(b, "b");
  const c = compare(a, b);
  if (c === 0) {
    return "0";
  }
  if (c < 0) {
    return "-" + sub(b, a);
  }
  let i = a.length - 1;
  let j = b.length - 1;
  let borrow = 0;
  const out = [];
  while (i >= 0) {
    let d = Number(a[i]) - borrow - (j >= 0 ? Number(b[j]) : 0);
    if (d < 0) {
      d += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    out.push(d);
    i--;
    j--;
  }
  const text = out.reverse().join("").replace(/^0+/, "");
  return text === "" ? "0" : text;
}

function mul(a, b) {
  a = clean(a, "a");
  b = clean(b, "b");
  if (a === "0" || b === "0") {
    return "0";
  }
  const res = new Array(a.length + b.length).fill(0);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const p = Number(a[i]) * Number(b[j]) + res[i + j + 1];
      res[i + j + 1] = p % 10;
      res[i + j] += Math.floor(p / 10);
    }
  }
  return res.join("").replace(/^0+/, "");
}

function power(base, exp) {
  if (!Number.isInteger(exp) || exp < 0 || exp > 2000) {
    throw new Error("exponent must be an integer from 0 to 2000");
  }
  let result = "1";
  let b = clean(base, "base");
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) {
      result = mul(result, b);
    }
    e = Math.floor(e / 2);
    if (e > 0) {
      b = mul(b, b);
    }
  }
  return result;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 500) {
    throw new Error("n must be an integer from 0 to 500");
  }
  let result = "1";
  for (let i = 2; i <= n; i++) {
    result = mul(result, String(i));
  }
  return result;
}

function fib(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1000) {
    throw new Error("n must be an integer from 0 to 1000");
  }
  let a = "0";
  let b = "1";
  for (let i = 0; i < n; i++) {
    const next = add(a, b);
    a = b;
    b = next;
  }
  return a;
}

function digitSum(s) {
  let total = 0;
  for (const ch of clean(s, "s")) {
    total += Number(ch);
  }
  return total;
}

function divSmall(a, d) {
  a = clean(a, "a");
  if (!Number.isInteger(d) || d < 1 || d > 1000000) {
    throw new Error("divisor must be an integer from 1 to 1000000");
  }
  let rem = 0;
  let q = "";
  for (const ch of a) {
    rem = rem * 10 + Number(ch);
    q += String(Math.floor(rem / d));
    rem = rem % d;
  }
  q = q.replace(/^0+/, "");
  return { quotient: q === "" ? "0" : q, remainder: rem };
}

check("add small", add("2", "3"), "5");
check("add carry", add("999", "1"), "1000");
check("add zeros", add("0", "0"), "0");
check("add big", add("123456789123456789", "987654321987654321"), "1111111111111111110");
check("add uneven", add("1", "99999"), "100000");
check("add leading zeros", add("007", "3"), "10");
check("add empty raises", raises(() => add("", "1")), true);
check("add letters raises", raises(() => add("12a", "1")), true);
check("add negative raises", raises(() => add("-5", "1")), true);
check("add number raises", raises(() => add(5, "1")), true);

console.log();
check("sub small", sub("10", "3"), "7");
check("sub borrow", sub("1000", "1"), "999");
check("sub same", sub("5", "5"), "0");
check("sub negative", sub("5", "10"), "-5");
check("sub keeps zero out", sub("100", "99"), "1");
check("sub big", sub("1000000000000000000000", "1"), "999999999999999999999");
check("sub from zero", sub("0", "7"), "-7");
check("sub leading zeros", sub("0100", "0099"), "1");
check("sub bad input", raises(() => sub("x", "1")), true);

console.log();
check("mul small", mul("12", "12"), "144");
check("mul nines", mul("999", "999"), "998001");
check("mul by zero", mul("0", "123"), "0");
check("mul zero right", mul("123", "0"), "0");
check("mul by one", mul("987654321", "1"), "987654321");
check("mul classic", mul("123456789", "987654321"), "121932631112635269");
check("mul powers of ten", mul("1000", "1000"), "1000000");
check("mul bad input", raises(() => mul("1.5", "2")), true);

console.log();
check("compare less", compare("5", "10"), -1);
check("compare greater", compare("200", "99"), 1);
check("compare equal", compare("42", "42"), 0);
check("compare leading zeros", compare("007", "7"), 0);
check("compare same length", compare("123", "124"), -1);
check("compare zero", compare("0", "000"), 0);
check("compare bad input", raises(() => compare("a", "1")), true);

console.log();
check("power 2 to 10", power("2", 10), "1024");
check("power 2 to 64", power("2", 64), "18446744073709551616");
check("power 2 to 100", power("2", 100), "1267650600228229401496703205376");
check("power ten", power("10", 20), "100000000000000000000");
check("power zero exponent", power("7", 0), "1");
check("power zero base", power("0", 5), "0");
check("power one", power("1", 500), "1");
check("power exponent one", power("12345", 1), "12345");
check("power negative exp", raises(() => power("2", -1)), true);
check("power decimal exp", raises(() => power("2", 1.5)), true);
check("power huge exp", raises(() => power("2", 5000)), true);
check("digit sum 2 to 1000", digitSum(power("2", 1000)), 1366);

console.log();
check("factorial 0", factorial(0), "1");
check("factorial 1", factorial(1), "1");
check("factorial 5", factorial(5), "120");
check("factorial 10", factorial(10), "3628800");
check("factorial 20", factorial(20), "2432902008176640000");
check("factorial 25", factorial(25), "15511210043330985984000000");
check("factorial 50 length", factorial(50).length, 65);
check("factorial 100 length", factorial(100).length, 158);
check("digit sum 100 factorial", digitSum(factorial(100)), 648);
check("factorial negative", raises(() => factorial(-1)), true);
check("factorial too big", raises(() => factorial(501)), true);

console.log();
check("fib 0", fib(0), "0");
check("fib 1", fib(1), "1");
check("fib 10", fib(10), "55");
check("fib 50", fib(50), "12586269025");
check("fib 100", fib(100), "354224848179261915075");
check("fib 1000 length", fib(1000).length, 209);
check("fib negative", raises(() => fib(-1)), true);
check("fib too big", raises(() => fib(1001)), true);
check("fib adds up", add(fib(30), fib(31)), fib(32));

console.log();
check("div simple", divSmall("100", 7), { quotient: "14", remainder: 2 });
check("div exact", divSmall("144", 12), { quotient: "12", remainder: 0 });
check("div by one", divSmall("12345", 1), { quotient: "12345", remainder: 0 });
check("div zero", divSmall("0", 5), { quotient: "0", remainder: 0 });
check("div smaller", divSmall("5", 9), { quotient: "0", remainder: 5 });
check("div big", divSmall("1000000000000000000000", 3), { quotient: "333333333333333333333", remainder: 1 });
check("div by zero raises", raises(() => divSmall("5", 0)), true);
check("div too large divisor", raises(() => divSmall("5", 2000000)), true);
check("div decimal divisor", raises(() => divSmall("5", 1.5)), true);

console.log();
let seed = 1234;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomDigits(maxLen) {
  const len = 1 + nextRandom(maxLen);
  let s = "";
  for (let i = 0; i < len; i++) {
    s += String(nextRandom(10));
  }
  return s;
}
let addOk = true;
let subOk = true;
let mulOk = true;
let cmpOk = true;
let divOk = true;
for (let n = 0; n < 300; n++) {
  const a = randomDigits(40);
  const b = randomDigits(40);
  const x = BigInt(a);
  const y = BigInt(b);
  if (add(a, b) !== (x + y).toString()) {
    addOk = false;
  }
  if (sub(a, b) !== (x - y).toString()) {
    subOk = false;
  }
  if (mul(a, b) !== (x * y).toString()) {
    mulOk = false;
  }
  const expected = x < y ? -1 : x > y ? 1 : 0;
  if (compare(a, b) !== expected) {
    cmpOk = false;
  }
  const d = 1 + nextRandom(100000);
  const result = divSmall(a, d);
  if (result.quotient !== (x / BigInt(d)).toString() || result.remainder !== Number(x % BigInt(d))) {
    divOk = false;
  }
}
check("300 random additions", addOk, true);
check("300 random subtractions", subOk, true);
check("300 random products", mulOk, true);
check("300 random comparisons", cmpOk, true);
check("300 random divisions", divOk, true);

let powerOk = true;
for (let n = 0; n < 40; n++) {
  const base = randomDigits(6);
  const exp = nextRandom(30);
  if (power(base, exp) !== (BigInt(base) ** BigInt(exp)).toString()) {
    powerOk = false;
  }
}
check("40 random powers", powerOk, true);

let factOk = true;
let running = 1n;
for (let n = 1; n <= 60; n++) {
  running *= BigInt(n);
  if (factorial(n) !== running.toString()) {
    factOk = false;
  }
}
check("60 factorials match", factOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
