const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BitStream {
  constructor(buffer) {
    this.buffer = buffer || new Uint8Array(1024);
    this.bitOffset = 0;
    this.byteCapacity = this.buffer.length;
  }
  writeBit(bit) {
    const byteIdx = this.bitOffset >> 3;
    if (byteIdx >= this.byteCapacity) throw new Error("buffer overflow");
    if (bit) this.buffer[byteIdx] |= (1 << (7 - (this.bitOffset & 7)));
    this.bitOffset++;
  }
  readBit() {
    const byteIdx = this.bitOffset >> 3;
    if (byteIdx >= this.byteCapacity) throw new Error("read past end");
    const bit = (this.buffer[byteIdx] >> (7 - (this.bitOffset & 7))) & 1;
    this.bitOffset++;
    return bit;
  }
  writeBits(value, count) {
    for (let i = count - 1; i >= 0; i--) this.writeBit((value >> i) & 1);
  }
  readBits(count) {
    let value = 0;
    for (let i = 0; i < count; i++) value = (value << 1) | this.readBit();
    return value;
  }
  writeUnary(value) {
    for (let i = 0; i < value; i++) this.writeBit(1);
    this.writeBit(0);
  }
  readUnary() {
    let value = 0;
    while (this.readBit() === 1) value++;
    return value;
  }
  writeGamma(value) {
    if (value <= 0) throw new Error("gamma coding requires positive integer");
    const bits = Math.floor(Math.log2(value));
    this.writeUnary(bits);
    this.writeBits(value, bits + 1);
  }
  readGamma() {
    const bits = this.readUnary();
    return this.readBits(bits + 1);
  }
  writeDelta(value) {
    if (value <= 0) throw new Error("delta coding requires positive integer");
    const bits = Math.floor(Math.log2(value));
    this.writeGamma(bits + 1);
    if (bits > 0) this.writeBits(value, bits);
  }
  readDelta() {
    const bitsPlusOne = this.readGamma();
    const bits = bitsPlusOne - 1;
    if (bits === 0) return 1;
    return (1 << bits) | this.readBits(bits);
  }
  resetRead() { this.bitOffset = 0; }
  bitsWritten() { return this.bitOffset; }
  bytesUsed() { return (this.bitOffset + 7) >> 3; }
  toSlice() { return this.buffer.slice(0, this.bytesUsed()); }
}

class HuffmanCoder {
  constructor() {
    this.codes = new Map();
    this.decodeTree = null;
  }
  buildFromFrequencies(freqMap) {
    const entries = [...freqMap.entries()].sort((a, b) => a[1] - b[1]);
    if (entries.length === 0) return;
    if (entries.length === 1) { this.codes.set(entries[0][0], [0]); this.decodeTree = { symbol: entries[0][0] }; return; }
    const nodes = entries.map(([sym, freq]) => ({ sym, freq, left: null, right: null }));
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const left = nodes.shift(), right = nodes.shift();
      nodes.push({ freq: left.freq + right.freq, left, right });
    }
    this.decodeTree = nodes[0];
    this.codes.clear();
    const buildCodes = (node, code) => {
      if (!node.left && !node.right) { this.codes.set(node.sym, [...code]); return; }
      if (node.left) buildCodes(node.left, [...code, 0]);
      if (node.right) buildCodes(node.right, [...code, 1]);
    };
    buildCodes(this.decodeTree, []);
  }
  encode(data, stream) {
    for (const sym of data) {
      const code = this.codes.get(sym);
      if (!code) throw new Error("symbol not in codebook: " + sym);
      for (const bit of code) stream.writeBit(bit);
    }
  }
  decode(stream, length) {
    const result = [];
    for (let i = 0; i < length; i++) {
      let node = this.decodeTree;
      while (node.left || node.right) {
        const bit = stream.readBit();
        node = bit === 0 ? node.left : node.right;
      }
      result.push(node.sym);
    }
    return result;
  }
  averageCodeLength(freqMap) {
    const total = [...freqMap.values()].reduce((s, f) => s + f, 0);
    let weighted = 0;
    for (const [sym, freq] of freqMap) weighted += (this.codes.get(sym) || []).length * freq;
    return weighted / total;
  }
}

class EliasFanoEncoder {
  static encode(values) {
    if (values.length === 0) return { highBits: new Uint8Array(0), lowBits: new Uint8Array(0), lowBitWidth: 0, count: 0 };
    const maxVal = Math.max(...values);
    const n = values.length;
    const lowBitWidth = maxVal > 0 ? Math.max(0, Math.floor(Math.log2(maxVal / n))) : 0;
    const lowMask = (1 << lowBitWidth) - 1;
    const lowBits = new Uint8Array(n);
    const highCounts = new Map();
    for (let i = 0; i < n; i++) {
      lowBits[i] = values[i] & lowMask;
      const high = values[i] >>> lowBitWidth;
      highCounts.set(high, (highCounts.get(high) || 0) + 1);
    }
    const maxHigh = Math.max(...values.map(v => v >>> lowBitWidth));
    const highBitsLen = maxHigh + n;
    const highBits = new Uint8Array(Math.ceil(highBitsLen / 8));
    let pos = 0;
    for (let i = 0; i <= maxHigh; i++) {
      const count = highCounts.get(i) || 0;
      for (let j = 0; j < count; j++) { highBits[pos >> 3] |= (1 << (pos & 7)); pos++; }
      pos++;
    }
    return { highBits, lowBits, lowBitWidth, count: n };
  }
  static decode(encoded) {
    const { highBits, lowBits, lowBitWidth, count } = encoded;
    if (count === 0) return [];
    const values = [];
    let highVal = 0, bitPos = 0;
    for (let i = 0; i < count; i++) {
      while (!((highBits[bitPos >> 3] >> (bitPos & 7)) & 1)) { bitPos++; highVal++; }
      bitPos++;
      const low = lowBits[i];
      values.push((highVal << lowBitWidth) | low);
    }
    return values;
  }
}

console.log("=== BIT STREAM ===");
check("write read single bit", (() => {
  const bs = new BitStream();
  bs.writeBit(1);
  bs.resetRead();
  return bs.readBit();
})(), 1);
check("write read multiple bits", (() => {
  const bs = new BitStream();
  bs.writeBits(0b10110, 5);
  bs.resetRead();
  return bs.readBits(5);
})(), 0b10110);
check("write read byte aligned", (() => {
  const bs = new BitStream();
  bs.writeBits(0xAB, 8);
  bs.resetRead();
  return bs.readBits(8);
})(), 0xAB);
check("unary encode decode", (() => {
  const bs = new BitStream();
  bs.writeUnary(5);
  bs.resetRead();
  return bs.readUnary();
})(), 5);
check("unary zero", (() => {
  const bs = new BitStream();
  bs.writeUnary(0);
  bs.resetRead();
  return bs.readUnary();
})(), 0);
check("gamma encode decode", (() => {
  const bs = new BitStream();
  bs.writeGamma(42);
  bs.resetRead();
  return bs.readGamma();
})(), 42);
check("gamma one", (() => {
  const bs = new BitStream();
  bs.writeGamma(1);
  bs.resetRead();
  return bs.readGamma();
})(), 1);
check("gamma invalid throws", raises(() => new BitStream().writeGamma(0)), true);
check("delta encode decode", (() => {
  const bs = new BitStream();
  bs.writeDelta(100);
  bs.resetRead();
  return bs.readDelta();
})(), 100);
check("delta one", (() => {
  const bs = new BitStream();
  bs.writeDelta(1);
  bs.resetRead();
  return bs.readDelta();
})(), 1);
check("bits written tracking", (() => {
  const bs = new BitStream();
  bs.writeBits(0xFF, 8);
  return bs.bitsWritten();
})(), 8);
check("bytes used rounding", (() => {
  const bs = new BitStream();
  bs.writeBits(0x7, 3);
  return bs.bytesUsed();
})(), 1);

console.log("\n=== HUFFMAN CODING ===");
check("huffman single symbol", (() => {
  const hc = new HuffmanCoder();
  hc.buildFromFrequencies(new Map([["a", 10]]));
  const bs = new BitStream();
  hc.encode(["a", "a", "a"], bs);
  bs.resetRead();
  return hc.decode(bs, 3);
})(), ["a", "a", "a"]);
check("huffman two symbols", (() => {
  const hc = new HuffmanCoder();
  hc.buildFromFrequencies(new Map([["a", 5], ["b", 3]]));
  const bs = new BitStream();
  hc.encode(["a", "b", "a"], bs);
  bs.resetRead();
  return hc.decode(bs, 3);
})(), ["a", "b", "a"]);
check("huffman avg code length optimal", (() => {
  const hc = new HuffmanCoder();
  hc.buildFromFrequencies(new Map([["a", 50], ["b", 25], ["c", 15], ["d", 10]]));
  const avg = hc.averageCodeLength(new Map([["a", 50], ["b", 25], ["c", 15], ["d", 10]]));
  return avg < 2.5;
})(), true);
check("huffman roundtrip large", (() => {
  const hc = new HuffmanCoder();
  const freq = new Map([["a", 40], ["b", 30], ["c", 20], ["d", 10]]);
  hc.buildFromFrequencies(freq);
  const data = ["a", "b", "c", "d", "a", "a", "b", "c"];
  const bs = new BitStream();
  hc.encode(data, bs);
  bs.resetRead();
  return hc.decode(bs, data.length);
})(), ["a", "b", "c", "d", "a", "a", "b", "c"]);

console.log("\n=== ELIAS-FANO ===");
check("elias fano encode decode", (() => {
  const values = [2, 5, 8, 12, 15];
  const encoded = EliasFanoEncoder.encode(values);
  return EliasFanoEncoder.decode(encoded);
})(), [2, 5, 8, 12, 15]);
check("elias fano empty", EliasFanoEncoder.decode(EliasFanoEncoder.encode([])), []);
check("elias fano single value", (() => {
  return EliasFanoEncoder.decode(EliasFanoEncoder.encode([42]));
})(), [42]);
check("elias fano duplicates", (() => {
  return EliasFanoEncoder.decode(EliasFanoEncoder.encode([3, 3, 3]));
})(), [3, 3, 3]);
check("elias fano consecutive", (() => {
  const vals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return EliasFanoEncoder.decode(EliasFanoEncoder.encode(vals));
})(), vals);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
