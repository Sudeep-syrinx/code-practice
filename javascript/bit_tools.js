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

const MAX = 4294967295;

function checkNumber(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX) {
    throw new Error("n must be an integer from 0 to 4294967295");
  }
}

function checkIndex(i) {
  if (!Number.isInteger(i) || i < 0 || i > 31) {
    throw new Error("bit index must be an integer from 0 to 31");
  }
}

function popcount(n) {
  checkNumber(n);
  let count = 0;
  n = n >>> 0;
  while (n !== 0) {
    n = (n & (n - 1)) >>> 0;
    count++;
  }
  return count;
}

function isPowerOfTwo(n) {
  checkNumber(n);
  return n !== 0 && (n & (n - 1)) === 0;
}

function nextPowerOfTwo(n) {
  checkNumber(n);
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
}

function getBit(n, i) {
  checkNumber(n);
  checkIndex(i);
  return (n >>> i) & 1;
}

function setBit(n, i) {
  checkNumber(n);
  checkIndex(i);
  return (n | (1 << i)) >>> 0;
}

function clearBit(n, i) {
  checkNumber(n);
  checkIndex(i);
  return (n & ~(1 << i)) >>> 0;
}

function toggleBit(n, i) {
  checkNumber(n);
  checkIndex(i);
  return (n ^ (1 << i)) >>> 0;
}

function toBits(n, width) {
  checkNumber(n);
  if (!Number.isInteger(width) || width < 1 || width > 32) {
    throw new Error("width must be an integer from 1 to 32");
  }
  const text = n.toString(2);
  if (text.length > width) {
    throw new Error("number does not fit in " + width + " bits");
  }
  return text.padStart(width, "0");
}

function fromBits(text) {
  if (typeof text !== "string" || !/^[01]+$/.test(text) || text.length > 32) {
    throw new Error("bad bit string");
  }
  return parseInt(text, 2);
}

function parity(n) {
  return popcount(n) % 2;
}

function isolateLowestBit(n) {
  checkNumber(n);
  return (n & -n) >>> 0;
}

function trailingZeros(n) {
  checkNumber(n);
  if (n === 0) {
    return 32;
  }
  let count = 0;
  while ((n & 1) === 0) {
    n = n >>> 1;
    count++;
  }
  return count;
}

function hamming(a, b) {
  checkNumber(a);
  checkNumber(b);
  return popcount((a ^ b) >>> 0);
}

function gray(n) {
  checkNumber(n);
  return (n ^ (n >>> 1)) >>> 0;
}

function fromGray(g) {
  checkNumber(g);
  let n = g;
  for (let s = g >>> 1; s !== 0; s = s >>> 1) {
    n = (n ^ s) >>> 0;
  }
  return n;
}

function reverseBits8(n) {
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error("n must be an integer from 0 to 255");
  }
  let r = 0;
  for (let i = 0; i < 8; i++) {
    r = (r << 1) | ((n >> i) & 1);
  }
  return r;
}

check("popcount 0", popcount(0), 0);
check("popcount 1", popcount(1), 1);
check("popcount 255", popcount(255), 8);
check("popcount 256", popcount(256), 1);
check("popcount 2 to 31", popcount(2147483648), 1);
check("popcount max", popcount(4294967295), 32);
check("popcount 1000", popcount(1000), 6);
check("popcount negative", raises(() => popcount(-1)), true);
check("popcount decimal", raises(() => popcount(1.5)), true);
check("popcount text", raises(() => popcount("1")), true);
check("popcount too big", raises(() => popcount(4294967296)), true);
check("parity odd", parity(7), 1);
check("parity even", parity(5), 0);
check("hamming same", hamming(9, 9), 0);
check("hamming 1 and 4", hamming(1, 4), 2);
check("hamming 255 and 0", hamming(255, 0), 8);
check("hamming 7 and 10", hamming(7, 10), 3);

console.log();
check("power of two 1", isPowerOfTwo(1), true);
check("power of two 64", isPowerOfTwo(64), true);
check("power of two 2 to 31", isPowerOfTwo(2147483648), true);
check("power of two 0", isPowerOfTwo(0), false);
check("power of two 3", isPowerOfTwo(3), false);
check("power of two 100", isPowerOfTwo(100), false);
check("power of two max", isPowerOfTwo(4294967295), false);
check("next power 0", nextPowerOfTwo(0), 1);
check("next power 1", nextPowerOfTwo(1), 1);
check("next power 2", nextPowerOfTwo(2), 2);
check("next power 3", nextPowerOfTwo(3), 4);
check("next power 5", nextPowerOfTwo(5), 8);
check("next power 16", nextPowerOfTwo(16), 16);
check("next power 17", nextPowerOfTwo(17), 32);
check("next power 1000", nextPowerOfTwo(1000), 1024);

console.log();
check("get bit 0", getBit(5, 0), 1);
check("get bit 1", getBit(5, 1), 0);
check("get bit 2", getBit(5, 2), 1);
check("get bit 31", getBit(2147483648, 31), 1);
check("set bit 3", setBit(0, 3), 8);
check("set bit 31", setBit(0, 31), 2147483648);
check("set bit already set", setBit(8, 3), 8);
check("clear bit 0", clearBit(15, 0), 14);
check("clear bit unset", clearBit(0, 5), 0);
check("clear bit 31", clearBit(4294967295, 31), 2147483647);
check("toggle on", toggleBit(5, 1), 7);
check("toggle off", toggleBit(7, 1), 5);
check("index too high", raises(() => getBit(5, 32)), true);
check("index negative", raises(() => setBit(5, -1)), true);
check("index decimal", raises(() => clearBit(5, 1.5)), true);
check("bit of negative", raises(() => toggleBit(-5, 1)), true);

console.log();
check("to bits 5", toBits(5, 8), "00000101");
check("to bits 255", toBits(255, 8), "11111111");
check("to bits zero", toBits(0, 4), "0000");
check("to bits exact fit", toBits(15, 4), "1111");
check("to bits overflow", raises(() => toBits(256, 8)), true);
check("to bits bad width", raises(() => toBits(1, 0)), true);
check("to bits wide", toBits(1, 32).length, 32);
check("from bits 101", fromBits("101"), 5);
check("from bits padded", fromBits("00000101"), 5);
check("from bits zero", fromBits("0"), 0);
check("from bits empty", raises(() => fromBits("")), true);
check("from bits bad digit", raises(() => fromBits("102")), true);
check("from bits too long", raises(() => fromBits("1".repeat(33))), true);
check("from bits 32 ones", fromBits("1".repeat(32)), 4294967295);

console.log();
check("lowest bit 12", isolateLowestBit(12), 4);
check("lowest bit 1", isolateLowestBit(1), 1);
check("lowest bit 0", isolateLowestBit(0), 0);
check("lowest bit 40", isolateLowestBit(40), 8);
check("trailing zeros 8", trailingZeros(8), 3);
check("trailing zeros 1", trailingZeros(1), 0);
check("trailing zeros 12", trailingZeros(12), 2);
check("trailing zeros 0", trailingZeros(0), 32);
check("trailing zeros 2 to 31", trailingZeros(2147483648), 31);
check("reverse 1", reverseBits8(1), 128);
check("reverse 3", reverseBits8(3), 192);
check("reverse 13", reverseBits8(13), 176);
check("reverse 255", reverseBits8(255), 255);
check("reverse 0", reverseBits8(0), 0);
check("reverse too big", raises(() => reverseBits8(256)), true);
let reverseOk = true;
for (let i = 0; i < 256; i++) {
  if (reverseBits8(reverseBits8(i)) !== i) {
    reverseOk = false;
  }
}
check("256 double reverses", reverseOk, true);

console.log();
check("gray 0 to 7", [0, 1, 2, 3, 4, 5, 6, 7].map((x) => gray(x)), [0, 1, 3, 2, 6, 7, 5, 4]);
check("from gray 0 to 7", [0, 1, 3, 2, 6, 7, 5, 4].map((x) => fromGray(x)), [0, 1, 2, 3, 4, 5, 6, 7]);
let grayOk = true;
for (let i = 0; i <= 5000; i++) {
  if (fromGray(gray(i)) !== i) {
    grayOk = false;
  }
}
check("5001 gray round trips", grayOk, true);
let stepOk = true;
for (let i = 0; i < 1000; i++) {
  if (popcount((gray(i) ^ gray(i + 1)) >>> 0) !== 1) {
    stepOk = false;
  }
}
check("gray steps flip one bit", stepOk, true);

console.log();
let seed = 8086;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomNumber() {
  return nextRandom(65536) * 65536 + nextRandom(65536);
}
let popOk = true;
let powerOk = true;
let bitOk = true;
let lowOk = true;
for (let n = 0; n < 500; n++) {
  const x = randomNumber();
  const ones = x.toString(2).split("1").length - 1;
  if (popcount(x) !== ones) {
    popOk = false;
  }
  if (isPowerOfTwo(x) !== (x > 0 && ones === 1)) {
    powerOk = false;
  }
  const i = nextRandom(32);
  if (getBit(setBit(x, i), i) !== 1) {
    bitOk = false;
  }
  if (getBit(clearBit(x, i), i) !== 0) {
    bitOk = false;
  }
  if (toggleBit(toggleBit(x, i), i) !== x) {
    bitOk = false;
  }
  if (fromBits(toBits(x, 32)) !== x) {
    bitOk = false;
  }
  if (x > 0 && isolateLowestBit(x) !== Math.pow(2, trailingZeros(x))) {
    lowOk = false;
  }
}
check("500 random popcounts", popOk, true);
check("500 random power checks", powerOk, true);
check("500 random bit edits", bitOk, true);
check("500 random lowest bits", lowOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
