const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class WaveletTreeNode {
  constructor(bitArray, left, right) {
    this.bitArray = bitArray;
    this.left = left;
    this.right = right;
  }
}

class WaveletTree {
  constructor(values) {
    this.values = values;
    this.minVal = Math.min(...values);
    this.maxVal = Math.max(...values);
    this.sigma = this.maxVal - this.minVal + 1;
    this.bits = Math.ceil(Math.log2(this.sigma + 1)) || 1;
    this.root = this._build(values.map(v => v - this.minVal), 0);
  }

  _build(vals, depth) {
    if (depth >= this.bits || vals.length === 0) return null;
    const bit = this.bits - 1 - depth;
    const bitArray = new Uint8Array(vals.length);
    const leftVals = [], rightVals = [];
    for (let i = 0; i < vals.length; i++) {
      const b = (vals[i] >> bit) & 1;
      bitArray[i] = b;
      if (b === 0) leftVals.push(vals[i]);
      else rightVals.push(vals[i]);
    }
    return new WaveletTreeNode(
      bitArray,
      this._build(leftVals, depth + 1),
      this._build(rightVals, depth + 1)
    );
  }

  rank(pos, value) {
    const adjustedValue = value - this.minVal;
    if (adjustedValue < 0 || adjustedValue >= this.sigma) return 0;
    return this._rank(this.root, pos, adjustedValue, 0);
  }

  _rank(node, pos, value, depth) {
    if (!node || pos <= 0) return 0;
    const bit = this.bits - 1 - depth;
    const valueBit = (value >> bit) & 1;
    let zerosBeforePos = 0;
    for (let i = 0; i < pos; i++) if (node.bitArray[i] === 0) zerosBeforePos++;
    if (valueBit === 0) {
      return this._rank(node.left, zerosBeforePos, value, depth + 1);
    } else {
      const onesBeforePos = pos - zerosBeforePos;
      return this._rank(node.right, onesBeforePos, value, depth + 1);
    }
  }

  select(occurrence, value) {
    const adjustedValue = value - this.minVal;
    if (adjustedValue < 0 || adjustedValue >= this.sigma) return -1;
    const result = this._select(this.root, occurrence, adjustedValue, 0);
    return result;
  }

  _select(node, occurrence, value, depth) {
    if (!node) return -1;
    const bit = this.bits - 1 - depth;
    const valueBit = (value >> bit) & 1;
    if (valueBit === 0) {
      const newPos = this._select(node.left, occurrence, value, depth + 1);
      if (newPos === -1) return -1;
      let count = 0;
      for (let i = 0; i < node.bitArray.length; i++) {
        if (node.bitArray[i] === 0) { if (count === newPos) return i; count++; }
      }
      return -1;
    } else {
      const newPos = this._select(node.right, occurrence, value, depth + 1);
      if (newPos === -1) return -1;
      let count = 0;
      for (let i = 0; i < node.bitArray.length; i++) {
        if (node.bitArray[i] === 1) { if (count === newPos) return i; count++; }
      }
      return -1;
    }
  }

  access(pos) {
    if (pos < 0 || pos >= this.values.length) throw new Error("index out of bounds");
    return this._access(this.root, pos, 0) + this.minVal;
  }

  _access(node, pos, depth) {
    if (!node) return 0;
    const bit = this.bits - 1 - depth;
    const b = node.bitArray[pos];
    let newPos;
    if (b === 0) {
      let zeros = 0;
      for (let i = 0; i < pos; i++) if (node.bitArray[i] === 0) zeros++;
      newPos = zeros;
      return this._access(node.left, newPos, depth + 1);
    } else {
      let ones = 0;
      for (let i = 0; i < pos; i++) if (node.bitArray[i] === 1) ones++;
      newPos = ones;
      return (1 << bit) | this._access(node.right, newPos, depth + 1);
    }
  }

  rangeCount(lo, hi, lowVal, highVal) {
    let count = 0;
    for (let i = lo; i <= hi; i++) {
      const v = this.access(i);
      if (v >= lowVal && v <= highVal) count++;
    }
    return count;
  }

  length() { return this.values.length; }
}

console.log("=== WAVELET TREE ACCESS ===");
check("access returns original value", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.access(0); })(), 3);
check("access all positions", (() => { const arr = [3, 1, 4, 1, 5, 9, 2, 6]; const wt = new WaveletTree(arr); for (let i = 0; i < arr.length; i++) if (wt.access(i) !== arr[i]) return false; return true; })(), true);
check("access oob throws", raises(() => new WaveletTree([1, 2, 3]).access(5)), true);
check("single element", (() => new WaveletTree([42]).access(0))(), 42);

console.log("\n=== WAVELET TREE RANK ===");
check("rank counts occurrences", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.rank(4, 1); })(), 2);
check("rank zero for missing", (() => new WaveletTree([3, 1, 4]).rank(3, 99))(), 0);
check("rank full array", (() => { const wt = new WaveletTree([1, 2, 1, 3, 1]); return wt.rank(5, 1); })(), 3);
check("rank partial", (() => { const wt = new WaveletTree([1, 2, 1, 3, 1]); return wt.rank(3, 1); })(), 2);

console.log("\n=== WAVELET TREE SELECT ===");
check("select finds nth occurrence", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.select(1, 1); })(), 1);
check("select second occurrence", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.select(2, 1); })(), 3);
check("select missing returns -1", (() => new WaveletTree([1, 2, 3]).select(1, 99))(), -1);

console.log("\n=== WAVELET TREE RANGE COUNT ===");
check("range count basic", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5, 9, 2, 6]); return wt.rangeCount(0, 7, 1, 4); })(), 5);
check("range count single value", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.rangeCount(0, 4, 1, 1); })(), 2);
check("range count empty range", (() => { const wt = new WaveletTree([3, 1, 4, 1, 5]); return wt.rangeCount(0, 4, 10, 20); })(), 0);

console.log("\n=== WAVELET TREE STRESS ===");
check("large array access correct", (() => { const arr = []; for (let i = 0; i < 200; i++) arr.push(i % 50); const wt = new WaveletTree(arr); for (let i = 0; i < 200; i++) if (wt.access(i) !== arr[i]) return false; return true; })(), true);
check("length matches input", (() => new WaveletTree([1, 2, 3, 4, 5]).length())(), 5);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
