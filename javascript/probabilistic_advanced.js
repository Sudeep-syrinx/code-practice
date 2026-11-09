const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BloomFilter {
  constructor(expectedItems, fpRate) {
    this.size = Math.ceil(-expectedItems * Math.log(fpRate) / (Math.log(2) ** 2));
    this.hashCount = Math.ceil(this.size / expectedItems * Math.log(2));
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
    this.count = 0;
  }
  _hashes(item) {
    const hashes = [];
    const s = String(item);
    for (let i = 0; i < this.hashCount; i++) {
      let h = 0;
      const salt = s + ":" + i;
      for (let j = 0; j < salt.length; j++) { h = ((h << 5) - h + salt.charCodeAt(j)) | 0; }
      hashes.push((h >>> 0) % this.size);
    }
    return hashes;
  }
  add(item) {
    for (const h of this._hashes(item)) { this.bits[h >> 3] |= (1 << (h & 7)); }
    this.count++;
  }
  test(item) {
    for (const h of this._hashes(item)) {
      if (!(this.bits[h >> 3] & (1 << (h & 7)))) return false;
    }
    return true;
  }
  getCount() { return this.count; }
  getBitCount() { return this.size; }
  getFillRatio() {
    let setBits = 0;
    for (const byte of this.bits) { let b = byte; while (b) { setBits += b & 1; b >>= 1; } }
    return setBits / this.size;
  }
}

class CountMinSketch {
  constructor(width, depth) {
    this.width = width;
    this.depth = depth;
    this.table = Array.from({ length: depth }, () => new Int32Array(width));
  }
  _hashes(item) {
    const hashes = [];
    const s = String(item);
    for (let i = 0; i < this.depth; i++) {
      let h = 0;
      const salt = s + "#" + i;
      for (let j = 0; j < salt.length; j++) { h = ((h << 5) - h + salt.charCodeAt(j)) | 0; }
      hashes.push((h >>> 0) % this.width);
    }
    return hashes;
  }
  add(item, count) {
    if (count === undefined) count = 1;
    const hashes = this._hashes(item);
    for (let i = 0; i < this.depth; i++) { this.table[i][hashes[i]] += count; }
  }
  estimate(item) {
    const hashes = this._hashes(item);
    let min = Infinity;
    for (let i = 0; i < this.depth; i++) { min = Math.min(min, this.table[i][hashes[i]]); }
    return min;
  }
}

class HyperLogLog {
  constructor(precision) {
    this.p = precision || 14;
    this.m = 1 << this.p;
    this.registers = new Uint8Array(this.m);
  }
  _hash(item) {
    let h = 0;
    const s = String(item);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return h >>> 0;
  }
  _rho(hash) {
    let r = 1;
    for (let i = this.p; i < 32; i++) {
      if ((hash >> i) & 1) return r;
      r++;
    }
    return r;
  }
  add(item) {
    const hash = this._hash(item);
    const idx = hash & (this.m - 1);
    const rho = this._rho(hash >>> this.p);
    if (rho > this.registers[idx]) this.registers[idx] = rho;
  }
  estimate() {
    const alpha = this.m === 16 ? 0.673 : this.m === 32 ? 0.697 : this.m === 64 ? 0.709 : 0.7213 / (1 + 1.079 / this.m);
    let sum = 0, zeros = 0;
    for (let i = 0; i < this.m; i++) {
      sum += 1 / (1 << this.registers[i]);
      if (this.registers[i] === 0) zeros++;
    }
    let estimate = alpha * this.m * this.m / sum;
    if (estimate <= 2.5 * this.m && zeros > 0) {
      estimate = this.m * Math.log(this.m / zeros);
    }
    return Math.round(estimate);
  }
  merge(other) {
    if (this.m !== other.m) throw new Error("precision mismatch");
    for (let i = 0; i < this.m; i++) {
      if (other.registers[i] > this.registers[i]) this.registers[i] = other.registers[i];
    }
  }
}

class TDigest {
  constructor(compression) {
    this.compression = compression || 100;
    this.centroids = [];
    this.totalWeight = 0;
    this.buffer = [];
    this.bufferLimit = this.compression * 5;
  }
  add(value, weight) {
    if (weight === undefined) weight = 1;
    this.buffer.push({ value, weight });
    this.totalWeight += weight;
    if (this.buffer.length >= this.bufferLimit) this._flush();
  }
  _flush() {
    if (this.buffer.length === 0) return;
    const all = [...this.centroids, ...this.buffer];
    all.sort((a, b) => a.value - b.value);
    this.centroids = [];
    this.buffer = [];
    let currentSum = 0;
    for (const c of all) {
      const q = (currentSum + c.weight / 2) / this.totalWeight;
      const maxSize = 4 * this.totalWeight * q * (1 - q) / this.compression;
      if (this.centroids.length === 0) {
        this.centroids.push({ value: c.value, weight: c.weight });
      } else {
        const last = this.centroids[this.centroids.length - 1];
        if (last.weight + c.weight <= Math.max(maxSize, 1)) {
          last.value = (last.value * last.weight + c.value * c.weight) / (last.weight + c.weight);
          last.weight += c.weight;
        } else {
          this.centroids.push({ value: c.value, weight: c.weight });
        }
      }
      currentSum += c.weight;
    }
  }
  quantile(q) {
    this._flush();
    if (this.centroids.length === 0) return NaN;
    if (q <= 0) return this.centroids[0].value;
    if (q >= 1) return this.centroids[this.centroids.length - 1].value;
    const target = q * this.totalWeight;
    let cumWeight = 0;
    for (let i = 0; i < this.centroids.length; i++) {
      const c = this.centroids[i];
      if (cumWeight + c.weight >= target) {
        const prevCum = cumWeight;
        const fraction = (target - prevCum) / c.weight;
        if (i === 0) return c.value;
        const prev = this.centroids[i - 1];
        return prev.value + fraction * (c.value - prev.value);
      }
      cumWeight += c.weight;
    }
    return this.centroids[this.centroids.length - 1].value;
  }
  median() { return this.quantile(0.5); }
  percentile(p) { return this.quantile(p / 100); }
  size() { this._flush(); return this.centroids.length; }
  getTotalWeight() { return this.totalWeight; }
}

console.log("=== BLOOM FILTER ===");
check("bloom add and test", (() => { const bf = new BloomFilter(100, 0.01); bf.add("hello"); return bf.test("hello"); })(), true);
check("bloom missing likely false", (() => { const bf = new BloomFilter(100, 0.01); bf.add("present"); return bf.test("absent"); })(), false);
check("bloom all added found", (() => {
  const bf = new BloomFilter(1000, 0.01);
  for (let i = 0; i < 100; i++) bf.add("item" + i);
  let found = 0;
  for (let i = 0; i < 100; i++) if (bf.test("item" + i)) found++;
  return found;
})(), 100);
check("bloom count tracked", (() => { const bf = new BloomFilter(100, 0.01); bf.add("a"); bf.add("b"); return bf.getCount(); })(), 2);
check("bloom fill ratio increases", (() => {
  const bf = new BloomFilter(100, 0.01);
  const before = bf.getFillRatio();
  for (let i = 0; i < 50; i++) bf.add("item" + i);
  return bf.getFillRatio() > before;
})(), true);

console.log("\n=== COUNT-MIN SKETCH ===");
check("cms add and estimate", (() => { const cms = new CountMinSketch(100, 5); cms.add("apple", 10); return cms.estimate("apple"); })(), 10);
check("cms never underestimates", (() => { const cms = new CountMinSketch(50, 4); cms.add("x", 5); return cms.estimate("x") >= 5; })(), true);
check("cms unknown item low", (() => { const cms = new CountMinSketch(1000, 5); cms.add("known", 100); return cms.estimate("unknown") <= 10; })(), true);
check("cms multiple adds accumulate", (() => { const cms = new CountMinSketch(100, 5); cms.add("x", 3); cms.add("x", 7); return cms.estimate("x"); })(), 10);

console.log("\n=== HYPERLOGLOG ===");
check("hll small cardinality", (() => {
  const hll = new HyperLogLog(14);
  for (let i = 0; i < 100; i++) hll.add("item" + i);
  const est = hll.estimate();
  return est >= 80 && est <= 120;
})(), true);
check("hll medium cardinality", (() => {
  const hll = new HyperLogLog(14);
  for (let i = 0; i < 10000; i++) hll.add("item" + i);
  const est = hll.estimate();
  return est >= 9000 && est <= 11000;
})(), true);
check("hll duplicates don't inflate", (() => {
  const hll = new HyperLogLog(14);
  for (let i = 0; i < 1000; i++) hll.add("same");
  return hll.estimate() <= 5;
})(), true);
check("hll merge combines", (() => {
  const a = new HyperLogLog(14);
  const b = new HyperLogLog(14);
  for (let i = 0; i < 500; i++) a.add("a" + i);
  for (let i = 0; i < 500; i++) b.add("b" + i);
  a.merge(b);
  const est = a.estimate();
  return est >= 800 && est <= 1200;
})(), true);
check("hll merge precision mismatch throws", (() => {
  const a = new HyperLogLog(10);
  const b = new HyperLogLog(14);
  return raises(() => a.merge(b));
})(), true);

console.log("\n=== T-DIGEST ===");
check("tdigest median", (() => {
  const td = new TDigest(100);
  for (let i = 1; i <= 100; i++) td.add(i);
  return Math.abs(td.median() - 50.5) < 5;
})(), true);
check("tdigest p99", (() => {
  const td = new TDigest(100);
  for (let i = 1; i <= 1000; i++) td.add(i);
  return td.percentile(99) >= 980;
})(), true);
check("tdigest quantile 0", (() => {
  const td = new TDigest(100);
  for (let i = 1; i <= 100; i++) td.add(i);
  return td.quantile(0);
})(), 1);
check("tdigest quantile 1", (() => {
  const td = new TDigest(100);
  for (let i = 1; i <= 100; i++) td.add(i);
  return td.quantile(1);
})(), 100);
check("tdigest total weight", (() => {
  const td = new TDigest(100);
  td.add(1, 5); td.add(2, 3);
  return td.getTotalWeight();
})(), 8);
check("tdigest empty returns NaN", (() => {
  const td = new TDigest(100);
  return isNaN(td.median());
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
