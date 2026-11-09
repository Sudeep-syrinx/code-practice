const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class SortedRun {
  constructor(entries) {
    this.entries = entries.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  }
  get(key) {
    let lo = 0, hi = this.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.entries[mid].key < key) lo = mid + 1;
      else hi = mid;
    }
    if (lo < this.entries.length && this.entries[lo].key === key) return this.entries[lo];
    return null;
  }
  size() { return this.entries.length; }
  minKey() { return this.entries.length > 0 ? this.entries[0].key : null; }
  maxKey() { return this.entries.length > 0 ? this.entries[this.entries.length - 1].key : null; }
}

class MemTable {
  constructor(maxSize) {
    this.maxSize = maxSize || 64;
    this.entries = new Map();
    this.size = 0;
  }
  put(key, value) {
    if (!this.entries.has(key)) this.size++;
    this.entries.set(key, { key, value, tombstone: false });
  }
  delete(key) {
    if (!this.entries.has(key)) this.size++;
    this.entries.set(key, { key, value: null, tombstone: true });
  }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.tombstone) return null;
    return entry.value;
  }
  isFull() { return this.size >= this.maxSize; }
  flush() {
    const entries = [...this.entries.values()];
    this.entries.clear();
    this.size = 0;
    return new SortedRun(entries);
  }
  entryCount() { return this.size; }
}

class LSMTree {
  constructor(options) {
    this.memTableMaxSize = (options && options.memTableMaxSize) || 32;
    this.levelSizeRatio = (options && options.levelSizeRatio) || 4;
    this.maxLevels = (options && options.maxLevels) || 5;
    this.memTable = new MemTable(this.memTableMaxSize);
    this.levels = [];
    for (let i = 0; i < this.maxLevels; i++) this.levels.push([]);
    this.stats = { puts: 0, gets: 0, compactions: 0, memFlushes: 0 };
  }
  put(key, value) {
    this.memTable.put(key, value);
    this.stats.puts++;
    if (this.memTable.isFull()) this._flushMemTable();
  }
  delete(key) {
    this.memTable.delete(key);
    this.stats.puts++;
    if (this.memTable.isFull()) this._flushMemTable();
  }
  get(key) {
    this.stats.gets++;
    const memVal = this.memTable.get(key);
    if (memVal !== undefined) return memVal;
    for (let level = 0; level < this.levels.length; level++) {
      for (let i = this.levels[level].length - 1; i >= 0; i--) {
        const entry = this.levels[level][i].get(key);
        if (entry) return entry.tombstone ? null : entry.value;
      }
    }
    return undefined;
  }
  _flushMemTable() {
    const run = this.memTable.flush();
    this.levels[0].push(run);
    this.stats.memFlushes++;
    this._maybeCompact(0);
  }
  _maybeCompact(level) {
    const threshold = Math.pow(this.levelSizeRatio, level + 1);
    const totalEntries = this.levels[level].reduce((s, r) => s + r.size(), 0);
    if (totalEntries > threshold && level < this.maxLevels - 1) {
      this._compact(level);
    }
  }
  _compact(level) {
    const runs = this.levels[level];
    if (runs.length === 0) return;
    const merged = this._mergeRuns(runs);
    this.levels[level] = [];
    this.levels[level + 1].push(merged);
    this.stats.compactions++;
    this._maybeCompact(level + 1);
  }
  _mergeRuns(runs) {
    const allEntries = [];
    for (const run of runs) {
      for (const entry of run.entries) allEntries.push(entry);
    }
    allEntries.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    const deduped = new Map();
    for (const entry of allEntries) deduped.set(entry.key, entry);
    return new SortedRun([...deduped.values()]);
  }
  getStats() { return { ...this.stats, levels: this.levels.map(l => l.length), memTableSize: this.memTable.entryCount() }; }
  totalEntries() {
    let total = this.memTable.entryCount();
    for (const level of this.levels) for (const run of level) total += run.size();
    return total;
  }
}

check("lsm put and get", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 100 });
  lsm.put("a", 1);
  return lsm.get("a");
})(), 1);
check("lsm get missing returns undefined", (() => {
  const lsm = new LSMTree();
  return lsm.get("missing");
})(), undefined);
check("lsm overwrite value", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 100 });
  lsm.put("k", 1);
  lsm.put("k", 2);
  return lsm.get("k");
})(), 2);
check("lsm delete returns null", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 100 });
  lsm.put("k", 1);
  lsm.delete("k");
  return lsm.get("k");
})(), null);
check("lsm memtable flush on full", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 4 });
  for (let i = 0; i < 5; i++) lsm.put("k" + i, i);
  return lsm.getStats().memFlushes;
})(), 1);
check("lsm data survives flush", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 4 });
  for (let i = 0; i < 8; i++) lsm.put("k" + i, i * 10);
  return lsm.get("k3");
})(), 30);
check("lsm compaction merges levels", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 4, levelSizeRatio: 2, maxLevels: 3 });
  for (let i = 0; i < 20; i++) lsm.put("k" + i, i);
  return lsm.getStats().compactions > 0;
})(), true);
check("lsm latest value wins after compaction", (() => {
  const lsm = new LSMTree({ memTableMaxSize: 4, levelSizeRatio: 2 });
  for (let round = 0; round < 5; round++) {
    lsm.put("target", round);
    for (let i = 0; i < 8; i++) lsm.put("filler" + i + "_" + round, i);
  }
  return lsm.get("target");
})(), 4);
check("sorted run binary search", (() => {
  const sr = new SortedRun([{ key: "a", value: 1 }, { key: "c", value: 3 }, { key: "e", value: 5 }]);
  return sr.get("c").value;
})(), 3);
check("sorted run miss returns null", (() => {
  const sr = new SortedRun([{ key: "a", value: 1 }]);
  return sr.get("b");
})(), null);
check("memtable tombstone", (() => {
  const mt = new MemTable(10);
  mt.put("x", 1);
  mt.delete("x");
  return mt.get("x");
})(), null);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
