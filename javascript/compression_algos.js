const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class ShannonFano {
  constructor() {
    this.codes = new Map();
    this.tree = null;
  }
  buildFrequencies(data) {
    const freq = new Map();
    for (const ch of data) freq.set(ch, (freq.get(ch) || 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1]);
  }
  buildCodes(freqPairs) {
    this.codes.clear();
    if (freqPairs.length === 0) return;
    if (freqPairs.length === 1) { this.codes.set(freqPairs[0][0], "0"); return; }
    this._split(freqPairs, "");
  }
  _split(pairs, prefix) {
    if (pairs.length === 1) { this.codes.set(pairs[0][0], prefix || "0"); return; }
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let sum = 0, splitIdx = 0;
    for (let i = 0; i < pairs.length - 1; i++) {
      sum += pairs[i][1];
      if (sum >= total / 2) { splitIdx = i + 1; break; }
    }
    if (splitIdx === 0) splitIdx = 1;
    this._split(pairs.slice(0, splitIdx), prefix + "0");
    this._split(pairs.slice(splitIdx), prefix + "1");
  }
  encode(data) {
    if (this.codes.size === 0) this.buildCodes(this.buildFrequencies(data));
    let bits = "";
    for (const ch of data) bits += this.codes.get(ch);
    return bits;
  }
  decode(bits, originalData) {
    if (this.codes.size === 0 && originalData) this.buildCodes(this.buildFrequencies(originalData));
    const reverse = new Map();
    for (const [ch, code] of this.codes) reverse.set(code, ch);
    let result = "", cur = "";
    for (const bit of bits) {
      cur += bit;
      if (reverse.has(cur)) { result += reverse.get(cur); cur = ""; }
    }
    return result;
  }
  getCodeLengths() {
    const lengths = {};
    for (const [ch, code] of this.codes) lengths[ch] = code.length;
    return lengths;
  }
  averageCodeLength(freqPairs) {
    const total = freqPairs.reduce((s, p) => s + p[1], 0);
    let weighted = 0;
    for (const [ch, freq] of freqPairs) weighted += (this.codes.get(ch) || "").length * freq;
    return weighted / total;
  }
}

class ArithmeticCoder {
  constructor(precision) {
    this.precision = precision || 16;
    this.fullRange = 1 << this.precision;
    this.quarter = this.fullRange >> 2;
    this.half = this.fullRange >> 1;
    this.threeQuarter = this.quarter * 3;
  }
  buildModel(data) {
    const freq = new Map();
    for (const ch of data) freq.set(ch, (freq.get(ch) || 0) + 1);
    const total = data.length;
    const model = new Map();
    let cumLow = 0;
    const sorted = [...freq.entries()].sort((a, b) => a[0].charCodeAt(0) - b[0].charCodeAt(0));
    for (const [ch, count] of sorted) {
      const range = Math.round((count / total) * this.fullRange);
      model.set(ch, { low: cumLow, high: cumLow + Math.max(range, 1) });
      cumLow += Math.max(range, 1);
    }
    return model;
  }
  encode(data, model) {
    let low = 0, high = this.fullRange;
    const bits = [];
    let pending = 0;
    for (const ch of data) {
      const range = high - low;
      const sym = model.get(ch);
      high = low + Math.floor(range * sym.high / this.fullRange);
      low = low + Math.floor(range * sym.low / this.fullRange);
      while (true) {
        if (high <= this.half) {
          bits.push(0);
          while (pending > 0) { bits.push(1); pending--; }
          low <<= 1; high <<= 1;
        } else if (low >= this.half) {
          bits.push(1);
          while (pending > 0) { bits.push(0); pending--; }
          low = (low - this.half) << 1;
          high = (high - this.half) << 1;
        } else if (low >= this.quarter && high <= this.threeQuarter) {
          pending++;
          low = (low - this.quarter) << 1;
          high = (high - this.quarter) << 1;
        } else break;
        low &= (this.fullRange - 1);
        high &= (this.fullRange - 1);
        if (high === 0) high = this.fullRange;
      }
    }
    pending += 2;
    if (low < this.quarter) {
      bits.push(0);
      for (let i = 0; i < pending - 1; i++) bits.push(1);
    } else {
      bits.push(1);
      for (let i = 0; i < pending - 1; i++) bits.push(0);
    }
    return bits.join("");
  }
  compressionRatio(original, encoded) {
    const origBits = original.length * 8;
    const encBits = encoded.length;
    return encBits / origBits;
  }
}

class AdaptiveHuffman {
  constructor(alphabetSize) {
    this.alphabetSize = alphabetSize || 256;
    this.codes = new Map();
    this.freq = new Map();
  }
  update(ch) {
    this.freq.set(ch, (this.freq.get(ch) || 0) + 1);
    this._rebuildCodes();
  }
  _rebuildCodes() {
    const sorted = [...this.freq.entries()].sort((a, b) => b[1] - a[1]);
    this.codes.clear();
    if (sorted.length === 0) return;
    if (sorted.length === 1) { this.codes.set(sorted[0][0], "0"); return; }
    const queue = sorted.map(([ch, f]) => ({ ch, freq: f, code: "" }));
    while (queue.length > 1) {
      queue.sort((a, b) => a.freq - b.freq);
      const left = queue.shift();
      const right = queue.shift();
      if (left.ch !== undefined) this.codes.set(left.ch, "0" + (this.codes.get(left.ch) || ""));
      if (right.ch !== undefined) this.codes.set(right.ch, "1" + (this.codes.get(right.ch) || ""));
      queue.push({ freq: left.freq + right.freq, code: "" });
    }
  }
  encode(data) {
    this.freq.clear();
    this.codes.clear();
    let bits = "";
    for (const ch of data) {
      this.update(ch);
      bits += this.codes.get(ch) || "0";
    }
    return bits;
  }
  getSymbolCount() { return this.freq.size; }
}

check("shannon fano basic encode decode", (() => {
  const sf = new ShannonFano();
  const data = "aabbbcccc";
  const encoded = sf.encode(data);
  return sf.decode(encoded, data);
})(), "aabbbcccc");
check("shannon fano single char", (() => {
  const sf = new ShannonFano();
  return sf.encode("aaaa");
})(), "0000");
check("shannon fano code lengths vary", (() => {
  const sf = new ShannonFano();
  sf.buildCodes(sf.buildFrequencies("aaabbc"));
  const lens = sf.getCodeLengths();
  return lens["a"] <= lens["c"];
})(), true);
check("shannon fano avg length reasonable", (() => {
  const sf = new ShannonFano();
  const freq = sf.buildFrequencies("aaaaabbbcc");
  sf.buildCodes(freq);
  return sf.averageCodeLength(freq) < 3;
})(), true);
check("arithmetic coder encode produces bits", (() => {
  const ac = new ArithmeticCoder(12);
  const model = ac.buildModel("abcabc");
  const bits = ac.encode("abc", model);
  return typeof bits === "string" && bits.length > 0;
})(), true);
check("arithmetic coder compression ratio", (() => {
  const ac = new ArithmeticCoder(12);
  const data = "aaaaaaaaaa";
  const model = ac.buildModel(data);
  const bits = ac.encode(data, model);
  return ac.compressionRatio(data, bits) < 1;
})(), true);
check("adaptive huffman updates freq", (() => {
  const ah = new AdaptiveHuffman();
  ah.update("a"); ah.update("a"); ah.update("b");
  return ah.getSymbolCount();
})(), 2);
check("adaptive huffman encode non-empty", (() => {
  const ah = new AdaptiveHuffman();
  return ah.encode("hello").length > 0;
})(), true);

let seed = 55555;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }
let sfRoundtripOk = true;
for (let t = 0; t < 50; t++) {
  const len = 5 + nextRandom(30);
  const chars = "abcdef";
  const data = Array.from({ length: len }, () => chars[nextRandom(chars.length)]).join("");
  const sf = new ShannonFano();
  const encoded = sf.encode(data);
  const decoded = sf.decode(encoded, data);
  if (decoded !== data) { sfRoundtripOk = false; break; }
}
check("50 shannon fano roundtrips", sfRoundtripOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
