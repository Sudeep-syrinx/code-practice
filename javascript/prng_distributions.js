const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class LCG {
  constructor(seed, a, c, m) {
    this.state = seed >>> 0;
    this.a = a || 1664525;
    this.c = c || 1013904223;
    this.m = m || 4294967296;
  }
  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }
  nextFloat() { return this.next() / this.m; }
  nextInt(min, max) { return min + (this.next() % (max - min + 1)); }
  getState() { return this.state; }
  setState(s) { this.state = s >>> 0; }
}

class MersenneTwister {
  constructor(seed) {
    this.N = 624;
    this.M = 397;
    this.mt = new Uint32Array(this.N);
    this.mti = this.N + 1;
    this.init(seed !== undefined ? seed : 5489);
  }
  init(seed) {
    this.mt[0] = seed >>> 0;
    for (this.mti = 1; this.mti < this.N; this.mti++) {
      const s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253 + this.mti) >>> 0;
    }
  }
  next() {
    let y;
    const mag01 = new Uint32Array([0x0, 0x9908b0df]);
    if (this.mti >= this.N) {
      let kk;
      for (kk = 0; kk < this.N - this.M; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < this.N - 1; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (this.mt[this.N - 1] & 0x80000000) | (this.mt[0] & 0x7fffffff);
      this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];
      this.mti = 0;
    }
    y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);
    return y >>> 0;
  }
  nextFloat() { return this.next() / 4294967296; }
  nextInt(min, max) { return min + (this.next() % (max - min + 1)); }
}

class XorShift128 {
  constructor(seed) {
    this.s0 = (seed || 12345) >>> 0;
    this.s1 = 67890 >>> 0;
    this.s2 = 11111 >>> 0;
    this.s3 = 22222 >>> 0;
  }
  next() {
    let t = this.s3;
    const s = this.s0;
    this.s3 = this.s2;
    this.s2 = this.s1;
    this.s1 = s;
    t ^= t << 11;
    t ^= t >>> 8;
    this.s0 = t ^ s ^ (s >>> 19);
    return this.s0 >>> 0;
  }
  nextFloat() { return this.next() / 4294967296; }
}

class RandomDistribution {
  constructor(rng) {
    this.rng = rng;
  }
  uniform(min, max) { return min + this.rng.nextFloat() * (max - min); }
  normal(mean, stddev) {
    const u1 = this.rng.nextFloat();
    const u2 = this.rng.nextFloat();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }
  exponential(lambda) {
    const u = this.rng.nextFloat();
    return -Math.log(u || 1e-10) / lambda;
  }
  poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= this.rng.nextFloat(); } while (p > L);
    return k - 1;
  }
  bernoulli(probability) { return this.rng.nextFloat() < probability; }
  binomial(n, p) {
    let successes = 0;
    for (let i = 0; i < n; i++) if (this.bernoulli(p)) successes++;
    return successes;
  }
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.rng.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  sample(array, count) {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
  weightedChoice(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.rng.nextFloat() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

class StatisticalTests {
  static chiSquaredUniform(observed, expected) {
    let chi2 = 0;
    for (let i = 0; i < observed.length; i++) {
      chi2 += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
    return chi2;
  }
  static kolmogorovSmirnov(samples, cdfFn) {
    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;
    let maxD = 0;
    for (let i = 0; i < n; i++) {
      const empirical = (i + 1) / n;
      const theoretical = cdfFn(sorted[i]);
      maxD = Math.max(maxD, Math.abs(empirical - theoretical));
    }
    return maxD;
  }
  static mean(values) { return values.reduce((s, v) => s + v, 0) / values.length; }
  static variance(values) {
    const m = StatisticalTests.mean(values);
    return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  }
  static stddev(values) { return Math.sqrt(StatisticalTests.variance(values)); }
}

console.log("=== LCG ===");
check("lcg deterministic", (() => {
  const a = new LCG(42);
  const b = new LCG(42);
  return a.next() === b.next() && a.next() === b.next();
})(), true);
check("lcg different seeds differ", (() => {
  const a = new LCG(1);
  const b = new LCG(2);
  return a.next() !== b.next();
})(), true);
check("lcg state save restore", (() => {
  const rng = new LCG(42);
  rng.next(); rng.next();
  const saved = rng.getState();
  const v1 = rng.next();
  rng.setState(saved);
  return rng.next() === v1;
})(), true);
check("lcg nextFloat in [0,1)", (() => {
  const rng = new LCG(42);
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = rng.nextFloat();
    if (v < 0 || v >= 1) { allValid = false; break; }
  }
  return allValid;
})(), true);
check("lcg nextInt range", (() => {
  const rng = new LCG(42);
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = rng.nextInt(5, 10);
    if (v < 5 || v > 10) { allValid = false; break; }
  }
  return allValid;
})(), true);

console.log("\n=== MERSENNE TWISTER ===");
check("mt deterministic", (() => {
  const a = new MersenneTwister(42);
  const b = new MersenneTwister(42);
  return a.next() === b.next() && a.next() === b.next();
})(), true);
check("mt different seeds differ", (() => {
  return new MersenneTwister(1).next() !== new MersenneTwister(2).next();
})(), true);
check("mt nextFloat in [0,1)", (() => {
  const rng = new MersenneTwister(42);
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = rng.nextFloat();
    if (v < 0 || v >= 1) { allValid = false; break; }
  }
  return allValid;
})(), true);

console.log("\n=== XORSHIFT ===");
check("xorshift deterministic", (() => {
  const a = new XorShift128(42);
  const b = new XorShift128(42);
  return a.next() === b.next() && a.next() === b.next();
})(), true);
check("xorshift nextFloat in [0,1)", (() => {
  const rng = new XorShift128(42);
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = rng.nextFloat();
    if (v < 0 || v >= 1) { allValid = false; break; }
  }
  return allValid;
})(), true);

console.log("\n=== DISTRIBUTIONS ===");
check("uniform distribution range", (() => {
  const dist = new RandomDistribution(new LCG(42));
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = dist.uniform(5, 10);
    if (v < 5 || v > 10) { allValid = false; break; }
  }
  return allValid;
})(), true);
check("normal distribution mean approx", (() => {
  const dist = new RandomDistribution(new MersenneTwister(42));
  const samples = [];
  for (let i = 0; i < 10000; i++) samples.push(dist.normal(100, 15));
  const m = StatisticalTests.mean(samples);
  return Math.abs(m - 100) < 2;
})(), true);
check("exponential positive", (() => {
  const dist = new RandomDistribution(new LCG(42));
  let allPositive = true;
  for (let i = 0; i < 1000; i++) {
    if (dist.exponential(1) < 0) { allPositive = false; break; }
  }
  return allPositive;
})(), true);
check("poisson non-negative integer", (() => {
  const dist = new RandomDistribution(new LCG(42));
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = dist.poisson(5);
    if (!Number.isInteger(v) || v < 0) { allValid = false; break; }
  }
  return allValid;
})(), true);
check("bernoulli boolean", (() => {
  const dist = new RandomDistribution(new LCG(42));
  let hasTrue = false, hasFalse = false;
  for (let i = 0; i < 1000; i++) {
    const v = dist.bernoulli(0.5);
    if (typeof v !== "boolean") return false;
    if (v) hasTrue = true; else hasFalse = true;
  }
  return hasTrue && hasFalse;
})(), true);
check("binomial range", (() => {
  const dist = new RandomDistribution(new LCG(42));
  let allValid = true;
  for (let i = 0; i < 1000; i++) {
    const v = dist.binomial(10, 0.5);
    if (v < 0 || v > 10) { allValid = false; break; }
  }
  return allValid;
})(), true);
check("shuffle preserves elements", (() => {
  const dist = new RandomDistribution(new LCG(42));
  const original = [1, 2, 3, 4, 5];
  const shuffled = dist.shuffle(original);
  return shuffled.sort().join(",") === original.sort().join(",");
})(), true);
check("sample correct size", (() => {
  const dist = new RandomDistribution(new LCG(42));
  return dist.sample([1, 2, 3, 4, 5], 3).length;
})(), 3);
check("weighted choice from set", (() => {
  const dist = new RandomDistribution(new LCG(42));
  const items = ["a", "b", "c"];
  const weights = [1, 1, 1];
  let allValid = true;
  for (let i = 0; i < 100; i++) {
    if (!items.includes(dist.weightedChoice(items, weights))) { allValid = false; break; }
  }
  return allValid;
})(), true);

console.log("\n=== STATISTICAL TESTS ===");
check("mean calculation", StatisticalTests.mean([2, 4, 6]), 4);
check("variance calculation", (() => {
  return Math.abs(StatisticalTests.variance([2, 4, 6]) - 2.666666) < 0.001;
})(), true);
check("stddev calculation", (() => {
  return Math.abs(StatisticalTests.stddev([2, 4, 6]) - Math.sqrt(2.666666)) < 0.001;
})(), true);
check("chi-squared uniform", (() => {
  const observed = [100, 100, 100];
  const expected = [100, 100, 100];
  return StatisticalTests.chiSquaredUniform(observed, expected);
})(), 0);
check("ks test perfect uniform", (() => {
  const samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const d = StatisticalTests.kolmogorovSmirnov(samples, x => x);
  return d < 0.2;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
