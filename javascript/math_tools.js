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

function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) {
    return false;
  }
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      return false;
    }
  }
  return true;
}

function primesUpTo(n) {
  const out = [];
  for (let i = 2; i <= n; i++) {
    if (isPrime(i)) {
      out.push(i);
    }
  }
  return out;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a non-negative integer");
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function fibonacci(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a non-negative integer");
  }
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

function gcd(a, b) {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return Math.abs(a);
}

function lcm(a, b) {
  if (a === 0 || b === 0) {
    return 0;
  }
  return Math.abs(a * b) / gcd(a, b);
}

function digitSum(n) {
  let total = 0;
  for (const ch of String(Math.abs(n))) {
    total += Number(ch);
  }
  return total;
}

function isPalindromeNumber(n) {
  const text = String(n);
  return text === text.split("").reverse().join("");
}

function toBinary(n) {
  if (n === 0) {
    return "0";
  }
  let out = "";
  while (n > 0) {
    out = (n % 2) + out;
    n = Math.floor(n / 2);
  }
  return out;
}

function fromBinary(text) {
  let total = 0;
  for (const ch of text) {
    if (ch !== "0" && ch !== "1") {
      throw new Error("not binary: " + text);
    }
    total = total * 2 + Number(ch);
  }
  return total;
}

check("prime 2", isPrime(2), true);
check("prime 17", isPrime(17), true);
check("prime 1", isPrime(1), false);
check("prime 0", isPrime(0), false);
check("prime 9", isPrime(9), false);
check("prime negative", isPrime(-7), false);
check("prime decimal", isPrime(2.5), false);
check("primes up to 20", primesUpTo(20), [2, 3, 5, 7, 11, 13, 17, 19]);
check("prime count 100", primesUpTo(100).length, 25);

console.log();
check("factorial 0", factorial(0), 1);
check("factorial 5", factorial(5), 120);
check("factorial 10", factorial(10), 3628800);
check("factorial negative", raises(() => factorial(-1)), true);
check("fibonacci 0", fibonacci(0), 0);
check("fibonacci 1", fibonacci(1), 1);
check("fibonacci 10", fibonacci(10), 55);
check("fibonacci 20", fibonacci(20), 6765);
check("fibonacci negative", raises(() => fibonacci(-3)), true);

console.log();
check("gcd 12 18", gcd(12, 18), 6);
check("gcd coprime", gcd(7, 13), 1);
check("gcd with zero", gcd(5, 0), 5);
check("lcm 4 6", lcm(4, 6), 12);
check("lcm with zero", lcm(0, 5), 0);
check("digit sum", digitSum(12345), 15);
check("digit sum negative", digitSum(-99), 18);
check("palindrome yes", isPalindromeNumber(12321), true);
check("palindrome no", isPalindromeNumber(123), false);
check("to binary 10", toBinary(10), "1010");
check("to binary 0", toBinary(0), "0");
check("from binary", fromBinary("1010"), 10);
check("from binary bad", raises(() => fromBinary("102")), true);

let binaryOk = true;
for (let i = 0; i <= 2000; i++) {
  if (fromBinary(toBinary(i)) !== i) {
    binaryOk = false;
  }
}
check("2001 binary round trip", binaryOk, true);

let gcdOk = true;
for (let a = 1; a <= 40; a++) {
  for (let b = 1; b <= 40; b++) {
    if (gcd(a, b) * lcm(a, b) !== a * b) {
      gcdOk = false;
    }
  }
}
check("gcd times lcm", gcdOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
