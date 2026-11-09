const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class RopeNode {
  constructor(left, right, text, weight) {
    this.left = left || null;
    this.right = right || null;
    this.text = text || null;
    this.weight = weight !== undefined ? weight : (text ? text.length : 0);
    this.height = 1 + Math.max(left ? left.height : 0, right ? right.height : 0);
  }
  get length() {
    if (this.text !== null) return this.text.length;
    return (this.left ? this.left.length : 0) + (this.right ? this.right.length : 0);
  }
  isLeaf() { return this.text !== null; }
}

class Rope {
  constructor(text) {
    this.root = text ? new RopeNode(null, null, text) : null;
    this.maxLeafSize = 256;
  }

  static fromString(text) { return new Rope(text); }
  static concat(left, right) {
    if (!left.root) return right;
    if (!right.root) return left;
    const rope = new Rope(null);
    rope.root = new RopeNode(left.root, right.root, null, left.root.length);
    return rope;
  }

  length() { return this.root ? this.root.length : 0; }
  isEmpty() { return !this.root; }

  charAt(index) {
    if (index < 0 || index >= this.length()) throw new Error("index out of bounds");
    return this._charAt(this.root, index);
  }

  _charAt(node, index) {
    if (node.isLeaf()) return node.text[index];
    if (index < node.weight) return this._charAt(node.left, index);
    return this._charAt(node.right, index - node.weight);
  }

  substring(start, end) {
    if (start < 0) start = 0;
    if (end === undefined || end > this.length()) end = this.length();
    if (start >= end) return "";
    return this._substring(this.root, start, end);
  }

  _substring(node, start, end) {
    if (!node) return "";
    if (node.isLeaf()) return node.text.slice(start, end);
    const leftLen = node.weight;
    if (end <= leftLen) return this._substring(node.left, start, end);
    if (start >= leftLen) return this._substring(node.right, start - leftLen, end - leftLen);
    return this._substring(node.left, start, leftLen) + this._substring(node.right, 0, end - leftLen);
  }

  split(index) {
    if (index <= 0) return { left: new Rope(""), right: this };
    if (index >= this.length()) return { left: this, right: new Rope("") };
    const result = this._split(this.root, index);
    const left = new Rope(null); left.root = result.left;
    const right = new Rope(null); right.root = result.right;
    return { left, right };
  }

  _split(node, index) {
    if (node.isLeaf()) {
      return {
        left: new RopeNode(null, null, node.text.slice(0, index)),
        right: new RopeNode(null, null, node.text.slice(index))
      };
    }
    if (index < node.weight) {
      const result = this._split(node.left, index);
      return {
        left: result.left,
        right: result.right ? new RopeNode(result.right, node.right, null, result.right.length) : node.right
      };
    } else if (index === node.weight) {
      return { left: node.left, right: node.right };
    } else {
      const result = this._split(node.right, index - node.weight);
      return {
        left: result.left ? new RopeNode(node.left, result.left, null, node.weight + result.left.length) : node.left,
        right: result.right
      };
    }
  }

  insert(index, text) {
    const { left, right } = this.split(index);
    const middle = new Rope(text);
    return Rope.concat(Rope.concat(left, middle), right);
  }

  delete(start, end) {
    const { left } = this.split(start);
    const { right } = this.split(end);
    return Rope.concat(left, right);
  }

  toString() { return this.substring(0, this.length()); }

  balance() {
    if (!this.root) return this;
    const leaves = [];
    this._collectLeaves(this.root, leaves);
    if (leaves.length <= 1) return this;
    const merged = [];
    for (let i = 0; i < leaves.length; i += 2) {
      if (i + 1 < leaves.length) {
        merged.push(new RopeNode(leaves[i], leaves[i + 1], null, leaves[i].length));
      } else {
        merged.push(leaves[i]);
      }
    }
    while (merged.length > 1) {
      const next = [];
      for (let i = 0; i < merged.length; i += 2) {
        if (i + 1 < merged.length) {
          next.push(new RopeNode(merged[i], merged[i + 1], null, merged[i].length + merged[i + 1].length));
        } else {
          next.push(merged[i]);
        }
      }
      merged.length = 0;
      merged.push(...next);
    }
    const rope = new Rope(null);
    rope.root = merged[0];
    return rope;
  }

  _collectLeaves(node, leaves) {
    if (!node) return;
    if (node.isLeaf()) { leaves.push(node); return; }
    this._collectLeaves(node.left, leaves);
    this._collectLeaves(node.right, leaves);
  }

  indexOf(searchStr, fromIndex) {
    const str = this.toString();
    return str.indexOf(searchStr, fromIndex || 0);
  }

  equals(other) { return this.toString() === other.toString(); }
}

console.log("=== ROPE BASIC ===");
check("rope from string", (() => new Rope("hello").toString())(), "hello");
check("rope length", new Rope("hello").length(), 5);
check("rope empty", new Rope("").isEmpty(), true);
check("rope charAt", (() => new Rope("hello").charAt(1))(), "e");
check("rope charAt oob throws", raises(() => new Rope("hi").charAt(5)), true);
check("rope substring", (() => new Rope("hello world").substring(0, 5))(), "hello");
check("rope substring middle", (() => new Rope("abcdef").substring(2, 4))(), "cd");
check("rope indexOf", (() => new Rope("hello world").indexOf("world"))(), 6);
check("rope indexOf miss", (() => new Rope("hello").indexOf("xyz"))(), -1);

console.log("\n=== ROPE CONCAT ===");
check("concat two ropes", (() => Rope.concat(new Rope("hello "), new Rope("world")).toString())(), "hello world");
check("concat with empty", (() => Rope.concat(new Rope("hello"), new Rope("")).toString())(), "hello");
check("concat empty with rope", (() => Rope.concat(new Rope(""), new Rope("world")).toString())(), "world");
check("concat multiple", (() => { let r = new Rope("a"); r = Rope.concat(r, new Rope("b")); r = Rope.concat(r, new Rope("c")); return r.toString(); })(), "abc");

console.log("\n=== ROPE SPLIT ===");
check("split at beginning", (() => { const { left, right } = new Rope("hello").split(0); return [left.toString(), right.toString()]; })(), ["", "hello"]);
check("split at end", (() => { const { left, right } = new Rope("hello").split(5); return [left.toString(), right.toString()]; })(), ["hello", ""]);
check("split in middle", (() => { const { left, right } = new Rope("hello").split(2); return [left.toString(), right.toString()]; })(), ["he", "llo"]);

console.log("\n=== ROPE INSERT DELETE ===");
check("insert at beginning", (() => new Rope("world").insert(0, "hello ").toString())(), "hello world");
check("insert at end", (() => new Rope("hello").insert(5, " world").toString())(), "hello world");
check("insert in middle", (() => new Rope("hllo").insert(1, "e").toString())(), "hello");
check("delete range", (() => new Rope("hello world").delete(5, 11).toString())(), "hello");
check("delete from start", (() => new Rope("hello world").delete(0, 6).toString())(), "world");

console.log("\n=== ROPE BALANCE ===");
check("balance preserves content", (() => { let r = new Rope("a"); for (let i = 0; i < 20; i++) r = Rope.concat(r, new Rope("b")); return r.balance().toString(); })(), "a" + "b".repeat(20));
check("equals", (() => new Rope("abc").equals(new Rope("abc")))(), true);
check("not equals", (() => new Rope("abc").equals(new Rope("def")))(), false);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
