const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}
function gfDiv(a, b) {
  if (b === 0) throw new Error("GF div by zero");
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a] - GF_LOG[b] + 255) % 255];
}
function gfPow(x, n) {
  if (n === 0) return 1;
  if (x === 0) return 0;
  return GF_EXP[(GF_LOG[x] * n) % 255];
}
function gfInverse(x) {
  if (x === 0) throw new Error("inverse of zero");
  return GF_EXP[255 - GF_LOG[x]];
}

function polyMul(a, b) {
  const r = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      r[i + j] ^= gfMul(a[i], b[j]);
  return r;
}
function polyAdd(a, b) {
  const len = Math.max(a.length, b.length);
  const r = new Uint8Array(len);
  for (let i = 0; i < a.length; i++) r[i + len - a.length] ^= a[i];
  for (let i = 0; i < b.length; i++) r[i + len - b.length] ^= b[i];
  return r;
}
function polyEval(poly, x) {
  let result = 0;
  for (let i = 0; i < poly.length; i++)
    result ^= gfMul(poly[i], gfPow(x, poly.length - 1 - i));
  return result;
}
function polyScale(poly, scalar) {
  const r = new Uint8Array(poly.length);
  for (let i = 0; i < poly.length; i++) r[i] = gfMul(poly[i], scalar);
  return r;
}
function polyTrim(poly) {
  let start = 0;
  while (start < poly.length && poly[start] === 0) start++;
  return poly.slice(start);
}

function generatorPoly(nsym) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < nsym; i++)
    g = polyMul(g, new Uint8Array([1, GF_EXP[i]]));
  return g;
}

class ReedSolomon {
  constructor(dataBytes, eccBytes) {
    this.dataBytes = dataBytes;
    this.eccBytes = eccBytes;
    this.genPoly = generatorPoly(eccBytes);
  }

  encode(data) {
    if (data.length !== this.dataBytes) throw new Error("data length mismatch");
    const msg = new Uint8Array(this.dataBytes + this.eccBytes);
    msg.set(data);
    const gen = this.genPoly;
    for (let i = 0; i < this.dataBytes; i++) {
      const coef = msg[i];
      if (coef !== 0) {
        for (let j = 1; j < gen.length; j++) {
          msg[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    const encoded = new Uint8Array(this.dataBytes + this.eccBytes);
    encoded.set(data);
    for (let i = 0; i < this.eccBytes; i++) encoded[this.dataBytes + i] = msg[this.dataBytes + i];
    return encoded;
  }

  decode(received) {
    if (received.length !== this.dataBytes + this.eccBytes) throw new Error("received length mismatch");
    const n = this.dataBytes + this.eccBytes;
    const syndromes = new Uint8Array(this.eccBytes);
    let hasError = false;
    for (let i = 0; i < this.eccBytes; i++) {
      syndromes[i] = polyEval(received, GF_EXP[i]);
      if (syndromes[i] !== 0) hasError = true;
    }
    if (!hasError) return received.slice(0, this.dataBytes);

    const errLoc = this._berlekampMassey(syndromes);
    if (!errLoc) throw new Error("uncorrectable: BM failed");

    const errorPositions = [];
    for (let i = 0; i < n; i++) {
      const xiInv = GF_EXP[255 - i];
      if (polyEval(errLoc, xiInv) === 0) errorPositions.push(i);
    }

    const numErrors = errorPositions.length;
    const degree = errLoc.length - 1;
    if (numErrors !== degree) throw new Error("uncorrectable: error count mismatch (" + numErrors + " vs degree " + degree + ")");

    const omega = this._computeOmega(syndromes, errLoc);
    const formalDeriv = new Uint8Array(errLoc.length - 1);
    for (let i = 1; i < errLoc.length; i++) {
      if (i % 2 === 1) formalDeriv[i - 1] = errLoc[i];
    }

    const corrected = new Uint8Array(received);
    for (const pos of errorPositions) {
      const xi = GF_EXP[pos];
      const xiInv = GF_EXP[255 - pos];
      const omegaVal = polyEval(omega, xiInv);
      const derivVal = polyEval(formalDeriv, xiInv);
      if (derivVal === 0) throw new Error("forney: zero derivative");
      const magnitude = gfDiv(gfMul(xi, omegaVal), derivVal);
      corrected[pos] ^= magnitude;
    }

    const verifySyndromes = new Uint8Array(this.eccBytes);
    for (let i = 0; i < this.eccBytes; i++) {
      verifySyndromes[i] = polyEval(corrected, GF_EXP[i]);
    }
    for (let i = 0; i < this.eccBytes; i++) {
      if (verifySyndromes[i] !== 0) throw new Error("post-correction syndrome check failed");
    }

    return corrected.slice(0, this.dataBytes);
  }

  _berlekampMassey(syndromes) {
    const n = syndromes.length;
    let C = new Uint8Array(n + 1); C[0] = 1;
    let B = new Uint8Array(n + 1); B[0] = 1;
    let L = 0, m = 1, b = 1;
    for (let i = 0; i < n; i++) {
      let d = syndromes[i];
      for (let j = 1; j <= L; j++) d ^= gfMul(C[j], syndromes[i - j]);
      if (d === 0) { m++; continue; }
      const T = new Uint8Array(C);
      const factor = gfDiv(d, b);
      for (let j = 0; j + m < C.length && j < B.length; j++) {
        C[j + m] ^= gfMul(factor, B[j]);
      }
      if (2 * L <= i) {
        L = i + 1 - L;
        B = T;
        b = d;
        m = 1;
      } else {
        m++;
      }
    }
    if (L > Math.floor(this.eccBytes / 2)) return null;
    const trimmed = polyTrim(C);
    return trimmed.length > 0 ? trimmed : new Uint8Array([1]);
  }

  _computeOmega(syndromes, errLoc) {
    const product = polyMul(errLoc, syndromes);
    const omegaLen = Math.min(product.length, errLoc.length);
    return product.slice(0, omegaLen);
  }
}

console.log("=== GF(256) ARITHMETIC ===");
check("gf mul identity", gfMul(1, 42), 42);
check("gf mul zero left", gfMul(0, 42), 0);
check("gf mul zero right", gfMul(42, 0), 0);
check("gf mul commutative", gfMul(100, 37) === gfMul(37, 100), true);
check("gf div roundtrip", (() => {
  const a = 100, b = 37;
  return gfMul(gfDiv(a, b), b) === a;
})(), true);
check("gf inverse roundtrip", (() => {
  const x = 42;
  return gfMul(x, gfInverse(x)) === 1;
})(), true);
check("gf pow zero exponent", gfPow(42, 0), 1);
check("gf pow one exponent", gfPow(42, 1), 42);
check("gf div by zero throws", raises(() => gfDiv(1, 0)), true);
check("gf inverse zero throws", raises(() => gfInverse(0)), true);

console.log("\n=== POLYNOMIAL OPS ===");
check("poly mul degree", (() => {
  const a = new Uint8Array([1, 2]);
  const b = new Uint8Array([3, 4]);
  return polyMul(a, b).length;
})(), 3);
check("poly eval constant", (() => {
  return polyEval(new Uint8Array([42]), GF_EXP[0]);
})(), 42);
check("poly add same length", (() => {
  const r = polyAdd(new Uint8Array([1, 2]), new Uint8Array([3, 4]));
  return r[0] ^ 0;
})(), 0);
check("poly scale", (() => {
  const r = polyScale(new Uint8Array([1, 2, 3]), 1);
  return [...r];
})(), [1, 2, 3]);
check("generator poly degree", (() => {
  return generatorPoly(4).length;
})(), 5);

console.log("\n=== ENCODE/DECODE NO ERRORS ===");
check("rs4_3 no errors", (() => {
  const rs = new ReedSolomon(4, 3);
  const data = new Uint8Array([1, 2, 3, 4]);
  const enc = rs.encode(data);
  return [...rs.decode(enc)];
})(), [1, 2, 3, 4]);
check("rs8_4 no errors", (() => {
  const rs = new ReedSolomon(8, 4);
  const data = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const enc = rs.encode(data);
  return [...rs.decode(enc)];
})(), [10, 20, 30, 40, 50, 60, 70, 80]);
check("rs16_8 no errors", (() => {
  const rs = new ReedSolomon(16, 8);
  const data = new Uint8Array(Array.from({ length: 16 }, (_, i) => i * 7 + 1));
  const enc = rs.encode(data);
  return [...rs.decode(enc)];
})(), Array.from({ length: 16 }, (_, i) => i * 7 + 1));

console.log("\n=== SINGLE ERROR CORRECTION ===");
check("rs4_4 correct 1 error pos0", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([10, 20, 30, 40]);
  const enc = rs.encode(data);
  enc[0] ^= 0xAB;
  return [...rs.decode(enc)];
})(), [10, 20, 30, 40]);
check("rs4_4 correct 1 error pos3", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([10, 20, 30, 40]);
  const enc = rs.encode(data);
  enc[3] ^= 0xCD;
  return [...rs.decode(enc)];
})(), [10, 20, 30, 40]);
check("rs4_4 correct 1 error ecc region", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([10, 20, 30, 40]);
  const enc = rs.encode(data);
  enc[5] ^= 0xEF;
  return [...rs.decode(enc)];
})(), [10, 20, 30, 40]);
check("rs8_4 correct 1 error middle", (() => {
  const rs = new ReedSolomon(8, 4);
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const enc = rs.encode(data);
  enc[4] ^= 0xFF;
  return [...rs.decode(enc)];
})(), [1, 2, 3, 4, 5, 6, 7, 8]);

console.log("\n=== DOUBLE ERROR CORRECTION ===");
check("rs4_4 correct 2 errors", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([10, 20, 30, 40]);
  const enc = rs.encode(data);
  enc[0] ^= 0xAA;
  enc[2] ^= 0xBB;
  return [...rs.decode(enc)];
})(), [10, 20, 30, 40]);
check("rs8_8 correct 2 errors", (() => {
  const rs = new ReedSolomon(8, 8);
  const data = new Uint8Array([5, 15, 25, 35, 45, 55, 65, 75]);
  const enc = rs.encode(data);
  enc[1] ^= 0x33;
  enc[6] ^= 0x77;
  return [...rs.decode(enc)];
})(), [5, 15, 25, 35, 45, 55, 65, 75]);
check("rs8_8 correct 4 errors max", (() => {
  const rs = new ReedSolomon(8, 8);
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const enc = rs.encode(data);
  enc[0] ^= 0x11; enc[2] ^= 0x22; enc[4] ^= 0x33; enc[7] ^= 0x44;
  return [...rs.decode(enc)];
})(), [1, 2, 3, 4, 5, 6, 7, 8]);

console.log("\n=== EDGE CASES ===");
check("encode wrong length throws", (() => {
  const rs = new ReedSolomon(4, 3);
  return raises(() => rs.encode(new Uint8Array([1, 2])));
})(), true);
check("decode wrong length throws", (() => {
  const rs = new ReedSolomon(4, 3);
  return raises(() => rs.decode(new Uint8Array([1, 2])));
})(), true);
check("all zeros data", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([0, 0, 0, 0]);
  const enc = rs.encode(data);
  enc[1] ^= 0x55;
  return [...rs.decode(enc)];
})(), [0, 0, 0, 0]);
check("all max value data", (() => {
  const rs = new ReedSolomon(4, 4);
  const data = new Uint8Array([255, 255, 255, 255]);
  const enc = rs.encode(data);
  enc[2] ^= 0x88;
  return [...rs.decode(enc)];
})(), [255, 255, 255, 255]);

console.log("\n=== STRESS TESTS ===");
let seed = 314159;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }

let singleErrOk = true;
for (let t = 0; t < 50; t++) {
  const rs = new ReedSolomon(8, 4);
  const data = new Uint8Array(8);
  for (let i = 0; i < 8; i++) data[i] = nextRandom(256);
  const enc = rs.encode(data);
  const errPos = nextRandom(12);
  enc[errPos] ^= (nextRandom(255) + 1);
  try {
    const dec = rs.decode(enc);
    for (let i = 0; i < 8; i++) {
      if (dec[i] !== data[i]) { singleErrOk = false; break; }
    }
  } catch (e) { singleErrOk = false; }
  if (!singleErrOk) break;
}
check("50 random single error corrections", singleErrOk, true);

let doubleErrOk = true;
for (let t = 0; t < 30; t++) {
  const rs = new ReedSolomon(8, 8);
  const data = new Uint8Array(8);
  for (let i = 0; i < 8; i++) data[i] = nextRandom(256);
  const enc = rs.encode(data);
  const p1 = nextRandom(16);
  let p2 = nextRandom(16);
  while (p2 === p1) p2 = nextRandom(16);
  enc[p1] ^= (nextRandom(255) + 1);
  enc[p2] ^= (nextRandom(255) + 1);
  try {
    const dec = rs.decode(enc);
    for (let i = 0; i < 8; i++) {
      if (dec[i] !== data[i]) { doubleErrOk = false; break; }
    }
  } catch (e) { doubleErrOk = false; }
  if (!doubleErrOk) break;
}
check("30 random double error corrections", doubleErrOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
