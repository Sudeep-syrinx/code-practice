const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class SuffixArray {
  constructor(text) {
    this.text = text;
    this.sa = this._build(text);
    this.lcp = this._buildLCP(text, this.sa);
  }
  _build(text) {
    const n = text.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    const rank = new Int32Array(n);
    const tmp = new Int32Array(n);
    for (let i = 0; i < n; i++) rank[i] = text.charCodeAt(i);
    for (let gap = 1; gap < n; gap <<= 1) {
      const cmp = (a, b) => {
        if (rank[a] !== rank[b]) return rank[a] - rank[b];
        const ra = a + gap < n ? rank[a + gap] : -1;
        const rb = b + gap < n ? rank[b + gap] : -1;
        return ra - rb;
      };
      sa.sort(cmp);
      tmp[sa[0]] = 0;
      for (let i = 1; i < n; i++) {
        tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i], sa[i - 1]) > 0 ? 1 : 0);
      }
      for (let i = 0; i < n; i++) rank[i] = tmp[i];
      if (rank[sa[n - 1]] === n - 1) break;
    }
    return sa;
  }
  _buildLCP(text, sa) {
    const n = text.length;
    const rank = new Int32Array(n);
    for (let i = 0; i < n; i++) rank[sa[i]] = i;
    const lcp = new Int32Array(n);
    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] > 0) {
        let j = sa[rank[i] - 1];
        while (i + h < n && j + h < n && text[i + h] === text[j + h]) h++;
        lcp[rank[i]] = h;
        if (h > 0) h--;
      } else {
        h = 0;
      }
    }
    return lcp;
  }
  search(pattern) {
    const n = this.text.length;
    const m = pattern.length;
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const suffix = this.text.slice(this.sa[mid], this.sa[mid] + m);
      if (suffix < pattern) lo = mid + 1;
      else hi = mid;
    }
    const start = lo;
    lo = 0; hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const suffix = this.text.slice(this.sa[mid], this.sa[mid] + m);
      if (suffix <= pattern) lo = mid + 1;
      else hi = mid;
    }
    const positions = [];
    for (let i = start; i < lo; i++) positions.push(this.sa[i]);
    return positions.sort((a, b) => a - b);
  }
  longestRepeatedSubstring() {
    let maxLen = 0, maxIdx = 0;
    for (let i = 1; i < this.lcp.length; i++) {
      if (this.lcp[i] > maxLen) { maxLen = this.lcp[i]; maxIdx = i; }
    }
    if (maxLen === 0) return "";
    return this.text.slice(this.sa[maxIdx], this.sa[maxIdx] + maxLen);
  }
  getSuffix(index) { return this.sa[index]; }
  getLCP(index) { return this.lcp[index]; }
  length() { return this.text.length; }
}

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.count = 0;
    this.failLink = null;
    this.outputLinks = [];
  }
}

class AhoCorasick {
  constructor() {
    this.root = new TrieNode();
    this.built = false;
  }
  addPattern(pattern, id) {
    let node = this.root;
    for (const ch of pattern) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
    node.count++;
    node.outputLinks.push(id !== undefined ? id : pattern);
  }
  buildFailureLinks() {
    const queue = [];
    for (const [, child] of this.root.children) {
      child.failLink = this.root;
      queue.push(child);
    }
    while (queue.length > 0) {
      const node = queue.shift();
      for (const [ch, child] of node.children) {
        let fail = node.failLink;
        while (fail && !fail.children.has(ch)) fail = fail.failLink;
        child.failLink = fail ? fail.children.get(ch) : this.root;
        if (child.failLink.isEnd) {
          child.outputLinks = [...child.outputLinks, ...child.failLink.outputLinks];
        }
        queue.push(child);
      }
    }
    this.built = true;
  }
  search(text) {
    if (!this.built) throw new Error("must call buildFailureLinks first");
    const matches = [];
    let node = this.root;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node && !node.children.has(ch)) node = node.failLink;
      if (!node) { node = this.root; continue; }
      node = node.children.get(ch);
      if (node.isEnd || node.outputLinks.length > 0) {
        for (const id of node.outputLinks) {
          matches.push({ position: i, pattern: id });
        }
      }
    }
    return matches;
  }
  countMatches(text) { return this.search(text).length; }
}

console.log("=== SUFFIX ARRAY CONSTRUCTION ===");
check("sa banana sorted", (() => {
  const sa = new SuffixArray("banana");
  const suffixes = [];
  for (let i = 0; i < 6; i++) suffixes.push("banana".slice(sa.getSuffix(i)));
  for (let i = 1; i < suffixes.length; i++) {
    if (suffixes[i] < suffixes[i - 1]) return false;
  }
  return true;
})(), true);
check("sa single char", (() => {
  const sa = new SuffixArray("a");
  return sa.getSuffix(0);
})(), 0);
check("sa length", new SuffixArray("hello").length(), 5);

console.log("\n=== SUFFIX ARRAY SEARCH ===");
check("sa search found", (() => {
  const sa = new SuffixArray("banana");
  return sa.search("ana");
})(), [1, 3]);
check("sa search not found", (() => {
  const sa = new SuffixArray("banana");
  return sa.search("xyz");
})(), []);
check("sa search single char", (() => {
  const sa = new SuffixArray("abcabc");
  return sa.search("a");
})(), [0, 3]);
check("sa search full string", (() => {
  const sa = new SuffixArray("hello");
  return sa.search("hello");
})(), [0]);

console.log("\n=== LCP ARRAY ===");
check("lcp banana", (() => {
  const sa = new SuffixArray("banana");
  const lcpVals = [];
  for (let i = 0; i < 6; i++) lcpVals.push(sa.getLCP(i));
  return lcpVals.some(v => v === 3);
})(), true);
check("longest repeated substring", (() => {
  const sa = new SuffixArray("banana");
  return sa.longestRepeatedSubstring();
})(), "ana");
check("no repeated substring", (() => {
  const sa = new SuffixArray("abcdefg");
  return sa.longestRepeatedSubstring();
})(), "");

console.log("\n=== AHO-CORASICK BUILD ===");
check("ac single pattern", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("he");
  ac.buildFailureLinks();
  return ac.countMatches("she he");
})(), 2);
check("ac multiple patterns", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("he", "p1");
  ac.addPattern("she", "p2");
  ac.addPattern("his", "p3");
  ac.buildFailureLinks();
  const matches = ac.search("ahishers");
  return matches.length;
})(), 4);
check("ac overlapping matches", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("ab", "p1");
  ac.addPattern("bc", "p2");
  ac.buildFailureLinks();
  return ac.countMatches("abc");
})(), 2);
check("ac no match", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("xyz");
  ac.buildFailureLinks();
  return ac.countMatches("abcdef");
})(), 0);
check("ac must build first", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("test");
  return raises(() => ac.search("test"));
})(), true);
check("ac pattern with id", (() => {
  const ac = new AhoCorasick();
  ac.addPattern("cat", 42);
  ac.buildFailureLinks();
  const matches = ac.search("the cat sat");
  return matches[0].pattern;
})(), 42);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
