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

function gcd(a, b) {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return Math.abs(a);
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function isPrime(n) {
  if (n < 2) {
    return false;
  }
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      return false;
    }
  }
  return true;
}

function primeFactors(n) {
  const out = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) {
      out.push(d);
      n = n / d;
    }
    d++;
  }
  if (n > 1) {
    out.push(n);
  }
  return out;
}

function sieve(limit) {
  if (limit < 2) {
    return [];
  }
  const flags = new Array(limit + 1).fill(true);
  flags[0] = false;
  flags[1] = false;
  for (let i = 2; i * i <= limit; i++) {
    if (flags[i]) {
      for (let j = i * i; j <= limit; j += i) {
        flags[j] = false;
      }
    }
  }
  const out = [];
  for (let k = 0; k <= limit; k++) {
    if (flags[k]) {
      out.push(k);
    }
  }
  return out;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("factorial needs a non-negative integer");
  }
  let result = 1;
  for (let k = 2; k <= n; k++) {
    result *= k;
  }
  return result;
}

function fib(n) {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

function fibList(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(fib(i));
  }
  return out;
}

function digitSum(n) {
  let total = 0;
  for (const ch of String(Math.abs(n))) {
    total += Number(ch);
  }
  return total;
}

function reverseNumber(n) {
  const sign = n < 0 ? -1 : 1;
  const text = String(Math.abs(n)).split("").reverse().join("");
  return sign * Number(text);
}

function isArmstrong(n) {
  const digits = String(n).split("");
  let total = 0;
  for (const d of digits) {
    total += Math.pow(Number(d), digits.length);
  }
  return total === n;
}

function divisorSum(n) {
  let total = 0;
  for (let i = 1; i < n; i++) {
    if (n % i === 0) {
      total += i;
    }
  }
  return total;
}

function isPerfect(n) {
  return n > 1 && divisorSum(n) === n;
}

function collatz(n) {
  let steps = 0;
  while (n !== 1) {
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
    steps++;
  }
  return steps;
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
  if (!/^[01]+$/.test(text)) {
    throw new Error("not a binary string: " + text);
  }
  let total = 0;
  for (const ch of text) {
    total = total * 2 + Number(ch);
  }
  return total;
}

function countBits(n) {
  let count = 0;
  while (n > 0) {
    count += n % 2;
    n = Math.floor(n / 2);
  }
  return count;
}

function isPowerOfTwo(n) {
  return n > 0 && countBits(n) === 1;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function roundTo(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function percent(part, whole) {
  if (whole === 0) {
    throw new Error("whole cannot be zero");
  }
  return (part * 100) / whole;
}

function sumRange(from, to) {
  let total = 0;
  for (let i = from; i <= to; i++) {
    total += i;
  }
  return total;
}

function withCommas(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function words(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999) {
    throw new Error("number must be an integer from 0 to 999");
  }
  if (n < 20) {
    return ONES[n];
  }
  if (n < 100) {
    const rest = n % 10;
    return rest === 0 ? TENS[Math.floor(n / 10)] : TENS[Math.floor(n / 10)] + "-" + ONES[rest];
  }
  const head = ONES[Math.floor(n / 100)] + " hundred";
  const rest = n % 100;
  return rest === 0 ? head : head + " " + words(rest);
}

const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const ROMAN_VALUE = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new Error("number must be from 1 to 3999");
  }
  let out = "";
  for (const [value, symbol] of ROMAN) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

function fromRoman(text) {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const value = ROMAN_VALUE[text[i]];
    if (value === undefined) {
      throw new Error("bad letter: " + text[i]);
    }
    const next = ROMAN_VALUE[text[i + 1]] || 0;
    total += value < next ? -value : value;
  }
  return total;
}

check("gcd", gcd(48, 18), 6);
check("gcd with zero", gcd(7, 0), 7);
check("gcd negative", gcd(-12, 18), 6);
check("lcm", lcm(4, 6), 12);
check("lcm 21 6", lcm(21, 6), 42);
check("prime 97", isPrime(97), true);
check("not prime 91", isPrime(91), false);
check("one not prime", isPrime(1), false);
check("two is prime", isPrime(2), true);
check("factors 360", primeFactors(360), [2, 2, 2, 3, 3, 5]);
check("factors prime", primeFactors(97), [97]);
check("factors one", primeFactors(1), []);

console.log();
check("sieve 30", sieve(30), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
check("primes under 1000", sieve(1000).length, 168);
check("primes under 10000", sieve(10000).length, 1229);
check("sieve tiny", sieve(1), []);
check("sieve matches", sieve(200), Array.from({ length: 201 }, (_, i) => i).filter(isPrime));
check("factorial 10", factorial(10), 3628800);
check("factorial 0", factorial(0), 1);
check("factorial negative", raises(() => factorial(-1)), true);
check("factorial decimal", raises(() => factorial(2.5)), true);

console.log();
check("fib 0", fib(0), 0);
check("fib 1", fib(1), 1);
check("fib 10", fib(10), 55);
check("fib 20", fib(20), 6765);
check("fib list", fibList(8), [0, 1, 1, 2, 3, 5, 8, 13]);
check("digit sum", digitSum(12345), 15);
check("digit sum negative", digitSum(-99), 18);
check("reverse number", reverseNumber(12345), 54321);
check("reverse trailing zeros", reverseNumber(1200), 21);
check("reverse negative", reverseNumber(-123), -321);

console.log();
check("armstrong 153", isArmstrong(153), true);
check("armstrong 9474", isArmstrong(9474), true);
check("armstrong 100", isArmstrong(100), false);
check("perfect 6", isPerfect(6), true);
check("perfect 28", isPerfect(28), true);
check("not perfect 12", isPerfect(12), false);
check("perfect under 10000", Array.from({ length: 10000 }, (_, i) => i + 1).filter(isPerfect), [6, 28, 496, 8128]);
check("collatz 27", collatz(27), 111);
check("collatz 1", collatz(1), 0);
check("collatz 6", collatz(6), 8);

console.log();
check("binary 10", toBinary(10), "1010");
check("binary 0", toBinary(0), "0");
check("binary 255", toBinary(255), "11111111");
check("from binary", fromBinary("1010"), 10);
check("bad binary", raises(() => fromBinary("102")), true);
check("empty binary", raises(() => fromBinary("")), true);
let roundTrip = true;
for (let i = 0; i < 2000; i++) {
  if (fromBinary(toBinary(i)) !== i) {
    roundTrip = false;
  }
}
check("binary round trip", roundTrip, true);
check("count bits 255", countBits(255), 8);
check("count bits 1023", countBits(1023), 10);
check("power of two 64", isPowerOfTwo(64), true);
check("power of two 100", isPowerOfTwo(100), false);
check("power of two 1", isPowerOfTwo(1), true);
check("power of two 0", isPowerOfTwo(0), false);

console.log();
check("clamp high", clamp(5, 0, 3), 3);
check("clamp low", clamp(-1, 0, 3), 0);
check("clamp inside", clamp(2, 0, 3), 2);
check("round to 2", roundTo(3.14159, 2), 3.14);
check("round half up", roundTo(2.5, 0), 3);
check("round negative", roundTo(-1.234, 1), -1.2);
check("percent", percent(25, 200), 12.5);
check("percent third", roundTo(percent(1, 3), 2), 33.33);
check("percent zero whole", raises(() => percent(5, 0)), true);
check("sum range", sumRange(1, 100), 5050);
check("sum range formula", sumRange(1, 500), (500 * 501) / 2);
check("commas million", withCommas(1234567), "1,234,567");
check("commas small", withCommas(999), "999");
check("commas thousand", withCommas(1000), "1,000");
check("commas negative", withCommas(-1234), "-1,234");

console.log();
check("words 0", words(0), "zero");
check("words 7", words(7), "seven");
check("words 13", words(13), "thirteen");
check("words 21", words(21), "twenty-one");
check("words 40", words(40), "forty");
check("words 100", words(100), "one hundred");
check("words 342", words(342), "three hundred forty-two");
check("words 805", words(805), "eight hundred five");
check("words 999", words(999), "nine hundred ninety-nine");
check("words 1000", raises(() => words(1000)), true);
check("words negative", raises(() => words(-1)), true);

console.log();
check("roman 4", toRoman(4), "IV");
check("roman 1994", toRoman(1994), "MCMXCIV");
check("roman 3999", toRoman(3999), "MMMCMXCIX");
check("from roman", fromRoman("MCMXCIV"), 1994);
check("roman zero", raises(() => toRoman(0)), true);
check("roman 4000", raises(() => toRoman(4000)), true);
check("roman bad letter", raises(() => fromRoman("ABC")), true);
let romanOk = true;
for (let i = 1; i <= 3999; i++) {
  if (fromRoman(toRoman(i)) !== i) {
    romanOk = false;
  }
}
check("roman round trip", romanOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
