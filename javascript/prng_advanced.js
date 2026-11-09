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
  constructor(seed, a, c, m) { this.state = seed >>> 0; this.a = a || 1664525; this.c = c || 1013904223; this.m = m || 4294967296; }
  next() { this.state = (this.a * this.state + this.c) % this.m; return this.state; }
  nextFloat() { return this.next() / this.m; }
  nextInt(min, max) { return min + (this.next() % (max - min + 1)); }
  getState() { return this.state; }
  setState(s) { this.state = s >>> 0; }
}

class XorShift128Plus {
  constructor(seed) { this.s0 = (seed || 12345) >>> 0; this.s1 = 67890 >>> 0; }
  next() {
    let s1 = this.s0, s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    return ((this.s0 + this.s1) >>> 0);
  }
  nextFloat() { return this.next() / 4294967296; }
}

class PCG32 {
  constructor(seed, stream) {
    this.state = BigInt(seed || 42);
    this.inc = (BigInt(stream || 54) << 1n) | 1n;
    this.multiplier = 6364136223846793005n;
    this.mask = (1n << 64n) - 1n;
    this._step();
  }
  _step() { this.state = ((this.state * this.multiplier + this.inc) & this.mask); }
  next() {
    const oldState = this.state;
    this._step();
    const xorshifted = Number(((oldState >> 18n) ^ oldState) >> 27n);
    const rot = Number(oldState >> 59n);
    return ((xorshifted >>> rot) | (xorshifted << ((-rot) & 31))) >>> 0;
  }
  nextFloat() { return this.next() / 4294967296; }
}

class RandomDistribution {
  constructor(rng) { this.rng = rng; }
  uniform(min, max) { return min + this.rng.nextFloat() * (max - min); }
  normal(mean, stddev) {
    const u1 = this.rng.nextFloat() || 1e-10;
    const u2 = this.rng.nextFloat();
    return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  exponential(lambda) { return -Math.log(this.rng.nextFloat() || 1e-10) / lambda; }
  poisson(lambda) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= this.rng.nextFloat(); } while (p > L); return k - 1; }
  bernoulli(p) { return this.rng.nextFloat() < p; }
  binomial(n, p) { let s = 0; for (let i = 0; i < n; i++) if (this.bernoulli(p)) s++; return s; }
  gamma(shape, scale) {
    if (shape < 1) { return this.gamma(shape + 1, scale) * Math.pow(this.rng.nextFloat() || 1e-10, 1 / shape); }
    const d = shape - 1/3, c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do { x = this.normal(0, 1); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = this.rng.nextFloat() || 1e-10;
      if (u < 1 - 0.0331 * (x*x) * (x*x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }
  beta(alpha, betaParam) { const x = this.gamma(alpha, 1); const y = this.gamma(betaParam, 1); return x / (x + y); }
  shuffle(array) { const arr = [...array]; for (let i = arr.length - 1; i > 0; i--) { const j = this.rng.nextInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  sample(array, count) { return this.shuffle(array).slice(0, count); }
  weightedChoice(items, weights) { const total = weights.reduce((s, w) => s + w, 0); let r = this.rng.nextFloat() * total; for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
}

class StatisticalTests {
  static mean(values) { return values.reduce((s, v) => s + v, 0) / values.length; }
  static variance(values) { const m = StatisticalTests.mean(values); return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length; }
  static stddev(values) { return Math.sqrt(StatisticalTests.variance(values)); }
  static chiSquaredUniform(observed, expected) { let chi2 = 0; for (let i = 0; i < observed.length; i++) chi2 += Math.pow(observed[i] - expected[i], 2) / expected[i]; return chi2; }
  static kolmogorovSmirnov(samples, cdfFn) {
    const sorted = [...samples].sort((a, b) => a - b);
    let maxD = 0;
    for (let i = 0; i < sorted.length; i++) {
      maxD = Math.max(maxD, Math.abs((i + 1) / sorted.length - cdfFn(sorted[i])));
    }
    return maxD;
  }
  static autocorrelation(values, lag) {
    const n = values.length;
    const mean = StatisticalTests.mean(values);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) den += (values[i] - mean) ** 2;
    for (let i = 0; i < n - lag; i++) num += (values[i] - mean) * (values[i + lag] - mean);
    return den === 0 ? 0 : num / den;
  }
}

console.log("=== LCG ===");
check("lcg deterministic", (() => { const a = new LCG(42); const b = new LCG(42); return a.next() === b.next() && a.next() === b.next(); })(), true);
check("lcg different seeds", (() => new LCG(1).next() !== new LCG(2).next())(), true);
check("lcg state save restore", (() => { const rng = new LCG(42); rng.next(); rng.next(); const saved = rng.getState(); const v1 = rng.next(); rng.setState(saved); return rng.next() === v1; })(), true);
check("lcg float in [0,1)", (() => { const rng = new LCG(42); for (let i = 0; i < 1000; i++) { const v = rng.nextFloat(); if (v < 0 || v >= 1) return false; } return true; })(), true);
check("lcg int range", (() => { const rng = new LCG(42); for (let i = 0; i < 1000; i++) { const v = rng.nextInt(5, 10); if (v < 5 || v > 10) return false; } return true; })(), true);

console.log("\n=== XORSHIFT128+ ===");
check("xorshift128+ deterministic", (() => { const a = new XorShift128Plus(42); const b = new XorShift128Plus(42); return a.next() === b.next() && a.next() === b.next(); })(), true);
check("xorshift128+ float in [0,1)", (() => { const rng = new XorShift128Plus(42); for (let i = 0; i < 1000; i++) { const v = rng.nextFloat(); if (v < 0 || v >= 1) return false; } return true; })(), true);

console.log("\n=== PCG32 ===");
check("pcg32 deterministic", (() => { const a = new PCG32(42); const b = new PCG32(42); return a.next() === b.next() && a.next() === b.next(); })(), true);
check("pcg32 float in [0,1)", (() => { const rng = new PCG32(42); for (let i = 0; i < 1000; i++) { const v = rng.nextFloat(); if (v < 0 || v >= 1) return false; } return true; })(), true);
check("pcg32 different streams differ", (() => new PCG32(42, 1).next() !== new PCG32(42, 2).next())(), true);

console.log("\n=== DISTRIBUTIONS ===");
check("uniform range", (() => { const d = new RandomDistribution(new LCG(42)); for (let i = 0; i < 1000; i++) { const v = d.uniform(5, 10); if (v < 5 || v > 10) return false; } return true; })(), true);
check("normal mean approx", (() => { const d = new RandomDistribution(new PCG32(42)); const samples = []; for (let i = 0; i < 10000; i++) samples.push(d.normal(100, 15)); return Math.abs(StatisticalTests.mean(samples) - 100) < 2; })(), true);
check("exponential positive", (() => { const d = new RandomDistribution(new LCG(42)); for (let i = 0; i < 1000; i++) if (d.exponential(1) < 0) return false; return true; })(), true);
check("poisson non-neg int", (() => { const d = new RandomDistribution(new LCG(42)); for (let i = 0; i < 1000; i++) { const v = d.poisson(5); if (!Number.isInteger(v) || v < 0) return false; } return true; })(), true);
check("gamma positive", (() => { const d = new RandomDistribution(new PCG32(42)); for (let i = 0; i < 500; i++) if (d.gamma(2, 1) < 0) return false; return true; })(), true);
check("beta in [0,1]", (() => { const d = new RandomDistribution(new PCG32(42)); for (let i = 0; i < 500; i++) { const v = d.beta(2, 5); if (v < 0 || v > 1) return false; } return true; })(), true);
check("shuffle preserves elements", (() => { const d = new RandomDistribution(new LCG(42)); const orig = [1,2,3,4,5]; return d.shuffle(orig).sort().join(",") === orig.sort().join(","); })(), true);
check("sample correct size", (() => new RandomDistribution(new LCG(42)).sample([1,2,3,4,5], 3).length)(), 3);
check("weighted choice valid", (() => { const d = new RandomDistribution(new LCG(42)); const items = ["a","b","c"]; for (let i = 0; i < 100; i++) if (!items.includes(d.weightedChoice(items, [1,1,1]))) return false; return true; })(), true);

console.log("\n=== STATISTICAL TESTS ===");
check("mean", StatisticalTests.mean([2,4,6]), 4);
check("variance", (() => Math.abs(StatisticalTests.variance([2,4,6]) - 2.666666) < 0.001)(), true);
check("stddev", (() => Math.abs(StatisticalTests.stddev([2,4,6]) - Math.sqrt(2.666666)) < 0.001)(), true);
check("chi-squared perfect", StatisticalTests.chiSquaredUniform([100,100,100], [100,100,100]), 0);
check("autocorrelation lag 0", (() => Math.abs(StatisticalTests.autocorrelation([1,2,3,4,5], 0) - 1) < 0.001)(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
