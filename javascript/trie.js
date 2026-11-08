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

class Trie {
  constructor() {
    this.root = { children: new Map(), end: false };
    this.total = 0;
  }

  checkWord(word) {
    if (typeof word !== "string" || word === "") {
      throw new Error("word must be a non-empty string");
    }
  }

  insert(word) {
    this.checkWord(word);
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), end: false });
      }
      node = node.children.get(ch);
    }
    if (node.end) {
      return false;
    }
    node.end = true;
    this.total++;
    return true;
  }

  find(text) {
    let node = this.root;
    for (const ch of text) {
      if (!node.children.has(ch)) {
        return null;
      }
      node = node.children.get(ch);
    }
    return node;
  }

  has(word) {
    const node = this.find(word);
    return node !== null && node.end;
  }

  startsWith(prefix) {
    return this.find(prefix) !== null;
  }

  size() {
    return this.total;
  }

  withPrefix(prefix) {
    const start = this.find(prefix);
    if (start === null) {
      return [];
    }
    const out = [];
    const walk = (node, text) => {
      if (node.end) {
        out.push(text);
      }
      for (const ch of Array.from(node.children.keys()).sort()) {
        walk(node.children.get(ch), text + ch);
      }
    };
    walk(start, prefix);
    return out;
  }

  words() {
    return this.withPrefix("");
  }

  autocomplete(prefix, limit) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error("limit must be a non-negative integer");
    }
    return this.withPrefix(prefix).slice(0, limit);
  }

  remove(word) {
    if (typeof word !== "string" || word === "") {
      return false;
    }
    const chars = Array.from(word);
    const path = [this.root];
    let node = this.root;
    for (const ch of chars) {
      if (!node.children.has(ch)) {
        return false;
      }
      node = node.children.get(ch);
      path.push(node);
    }
    if (!node.end) {
      return false;
    }
    node.end = false;
    this.total--;
    for (let i = chars.length; i > 0; i--) {
      const cur = path[i];
      if (cur.end || cur.children.size > 0) {
        break;
      }
      path[i - 1].children.delete(chars[i - 1]);
    }
    return true;
  }

  longestCommonPrefix() {
    let node = this.root;
    let text = "";
    while (!node.end && node.children.size === 1) {
      const entry = Array.from(node.children.entries())[0];
      text += entry[0];
      node = entry[1];
    }
    return text;
  }
}

function build(words) {
  const t = new Trie();
  for (const w of words) {
    t.insert(w);
  }
  return t;
}

const WORDS = ["apple", "app", "apply", "ape", "bat", "bath", "batman", "cat"];

const empty = new Trie();
check("empty size", empty.size(), 0);
check("empty words", empty.words(), []);
check("empty has", empty.has("a"), false);
check("empty has blank", empty.has(""), false);
check("empty prefix", empty.withPrefix("a"), []);
check("empty common prefix", empty.longestCommonPrefix(), "");
check("insert empty raises", raises(() => empty.insert("")), true);
check("insert number raises", raises(() => empty.insert(5)), true);

console.log();
const t = build(WORDS);
check("size", t.size(), 8);
check("has app", t.has("app"), true);
check("has apple", t.has("apple"), true);
check("has ap", t.has("ap"), false);
check("has apples", t.has("apples"), false);
check("starts with ap", t.startsWith("ap"), true);
check("starts with bath", t.startsWith("bath"), true);
check("starts with z", t.startsWith("z"), false);
check("starts with batz", t.startsWith("batz"), false);
check("duplicate insert", t.insert("app"), false);
check("size unchanged", t.size(), 8);
check("new insert", t.insert("bar"), true);
check("size grows", t.size(), 9);
t.remove("bar");

console.log();
check("prefix app", t.withPrefix("app"), ["app", "apple", "apply"]);
check("prefix ba", t.withPrefix("ba"), ["bat", "bath", "batman"]);
check("prefix exact", t.withPrefix("cat"), ["cat"]);
check("prefix none", t.withPrefix("dog"), []);
check("all words sorted", t.words(), ["ape", "app", "apple", "apply", "bat", "bath", "batman", "cat"]);
check("autocomplete 2", t.autocomplete("ba", 2), ["bat", "bath"]);
check("autocomplete 0", t.autocomplete("ba", 0), []);
check("autocomplete big", t.autocomplete("c", 10), ["cat"]);
check("autocomplete negative", raises(() => t.autocomplete("a", -1)), true);
check("autocomplete decimal", raises(() => t.autocomplete("a", 1.5)), true);

console.log();
const r = build(WORDS);
check("remove inner word", r.remove("app"), true);
check("inner gone", r.has("app"), false);
check("longer words stay", r.has("apple"), true);
check("prefix still valid", r.startsWith("app"), true);
check("remove missing", r.remove("zzz"), false);
check("remove non word", r.remove("ap"), false);
check("remove twice", r.remove("app"), false);
check("remove blank", r.remove(""), false);
check("remove number", r.remove(5), false);
check("size after removes", r.size(), 7);
check("remove last of branch", r.remove("cat"), true);
check("branch pruned", r.startsWith("c"), false);
check("other branches stay", r.startsWith("b"), true);
for (const w of r.words()) {
  r.remove(w);
}
check("all removed size", r.size(), 0);
check("all removed pruned", r.root.children.size, 0);

console.log();
check("common prefix fl", build(["flower", "flow", "flight"]).longestCommonPrefix(), "fl");
check("common prefix inter", build(["interview", "internet", "internal"]).longestCommonPrefix(), "inter");
check("common prefix none", build(["dog", "racecar"]).longestCommonPrefix(), "");
check("common prefix single", build(["solo"]).longestCommonPrefix(), "solo");
check("common prefix word end", build(["ab", "abc"]).longestCommonPrefix(), "ab");

console.log();
let seed = 909;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomWord(minLen, spread) {
  const len = minLen + nextRandom(spread);
  let w = "";
  for (let i = 0; i < len; i++) {
    w += "abc"[nextRandom(3)];
  }
  return w;
}
const rt = new Trie();
const model = new Set();
let insertOk = true;
for (let i = 0; i < 400; i++) {
  const w = randomWord(1, 5);
  const added = rt.insert(w);
  if (added === model.has(w)) {
    insertOk = false;
  }
  model.add(w);
}
check("400 random inserts", insertOk, true);
check("random size", rt.size(), model.size);
check("random words", rt.words(), Array.from(model).sort());
let prefixOk = true;
for (let i = 0; i < 200; i++) {
  const p = randomWord(0, 4);
  const expected = Array.from(model).filter((w) => w.startsWith(p)).sort();
  if (JSON.stringify(rt.withPrefix(p)) !== JSON.stringify(expected)) {
    prefixOk = false;
  }
  if (rt.startsWith(p) !== expected.length > 0) {
    prefixOk = false;
  }
}
check("200 random prefixes", prefixOk, true);
let removeOk = true;
for (let i = 0; i < 300; i++) {
  const w = randomWord(1, 5);
  if (rt.remove(w) !== model.has(w)) {
    removeOk = false;
  }
  model.delete(w);
}
check("300 random removes", removeOk, true);
check("words after removes", rt.words(), Array.from(model).sort());
check("size after removes", rt.size(), model.size);
for (const w of Array.from(model)) {
  rt.remove(w);
}
check("fully pruned", rt.root.children.size, 0);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
