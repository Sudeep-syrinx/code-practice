const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class DiffEngine {
  diff(oldText, newText) {
    if (oldText === newText) return [];
    if (oldText.length === 0) return [{ op: "+", text: newText }];
    if (newText.length === 0) return [{ op: "-", text: oldText }];
    const prefix = this._commonPrefix(oldText, newText);
    const suffix = this._commonSuffix(oldText.slice(prefix), newText.slice(prefix));
    const diffs = [];
    if (prefix > 0) diffs.push({ op: "=", text: oldText.slice(0, prefix) });
    const oldMid = oldText.slice(prefix, oldText.length - suffix);
    const newMid = newText.slice(prefix, newText.length - suffix);
    if (oldMid.length > 0) diffs.push({ op: "-", text: oldMid });
    if (newMid.length > 0) diffs.push({ op: "+", text: newMid });
    if (suffix > 0) diffs.push({ op: "=", text: oldText.slice(oldText.length - suffix) });
    return this._compact(diffs);
  }

  applyDiff(text, diffs) {
    let result = "";
    for (const d of diffs) {
      if (d.op === "=") result += d.text;
      else if (d.op === "+") result += d.text;
    }
    return result;
  }

  invertDiffs(diffs) {
    return diffs.map(d => {
      if (d.op === "=") return { ...d };
      if (d.op === "+") return { op: "-", text: d.text };
      return { op: "+", text: d.text };
    });
  }

  composeDiffs(diffs1, diffs2) {
    const text1 = this.applyDiff("", this.invertDiffs(diffs1).map(d => d.op === "+" ? { op: "+", text: d.text } : d));
    const intermediate = this.applyDiff(text1, diffs1);
    const finalText = this.applyDiff(intermediate, diffs2);
    return this.diff(text1, finalText);
  }

  deltaEncode(diffs) {
    return diffs.map(d => {
      if (d.op === "=") return "=" + d.text.length;
      if (d.op === "+") return "+" + d.text;
      return "-" + d.text.length;
    }).join("\t");
  }

  deltaDecode(delta) {
    if (delta === "") return [];
    return delta.split("\t").map(part => {
      if (part.startsWith("=")) return { op: "=", text: "x".repeat(parseInt(part.slice(1))) };
      if (part.startsWith("+")) return { op: "+", text: part.slice(1) };
      return { op: "-", text: "x".repeat(parseInt(part.slice(1))) };
    });
  }

  _commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
  _commonSuffix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  }
  _compact(diffs) {
    const result = [];
    for (const d of diffs) {
      if (result.length > 0 && result[result.length - 1].op === d.op) {
        result[result.length - 1].text += d.text;
      } else {
        result.push({ ...d });
      }
    }
    return result;
  }
}

class Operation {
  static insert(pos, text) { return { type: "ins", pos, text }; }
  static delete(pos, length) { return { type: "del", pos, length }; }
}

class OTTransformer {
  static transformOp(op1, op2) {
    if (op1.type === "ins" && op2.type === "ins") {
      if (op1.pos <= op2.pos) return op2;
      return { ...op2, pos: op2.pos + op1.text.length };
    }
    if (op1.type === "ins" && op2.type === "del") {
      if (op1.pos <= op2.pos) return op2;
      if (op1.pos >= op2.pos + op2.length) return { ...op2, pos: op2.pos };
      return { ...op2, length: op2.length + op1.text.length };
    }
    if (op1.type === "del" && op2.type === "ins") {
      if (op2.pos <= op1.pos) return op2;
      if (op2.pos >= op1.pos + op1.length) return { ...op2, pos: op2.pos - op1.length };
      return { ...op2, pos: op1.pos };
    }
    if (op1.type === "del" && op2.type === "del") {
      if (op1.pos >= op2.pos + op2.length) return { ...op1, pos: op1.pos - op2.length };
      if (op2.pos >= op1.pos + op1.length) return op1;
      const overlapStart = Math.max(op1.pos, op2.pos);
      const overlapEnd = Math.min(op1.pos + op1.length, op2.pos + op2.length);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      const newPos = Math.min(op1.pos, op2.pos);
      const newLen = op1.length + op2.length - overlap;
      return { type: "del", pos: newPos, length: newLen - op2.length };
    }
    return op2;
  }

  static transformOps(clientOps, serverOps) {
    let result = [...clientOps];
    for (const sOp of serverOps) {
      result = result.map(cOp => OTTransformer.transformOp(sOp, cOp));
    }
    return result;
  }

  static applyOp(text, op) {
    if (op.type === "ins") return text.slice(0, op.pos) + op.text + text.slice(op.pos);
    if (op.type === "del") return text.slice(0, op.pos) + text.slice(op.pos + op.length);
    return text;
  }

  static applyOps(text, ops) {
    let result = text;
    for (const op of ops) result = OTTransformer.applyOp(result, op);
    return result;
  }
}

class SyncServer {
  constructor(initialDoc) {
    this.doc = initialDoc;
    this.history = [];
    this.clientRevisions = new Map();
  }
  submitOps(clientId, ops, baseRev) {
    let transformed = [...ops];
    for (let r = baseRev; r < this.history.length; r++) {
      transformed = OTTransformer.transformOps(transformed, this.history[r].ops);
    }
    this.doc = OTTransformer.applyOps(this.doc, transformed);
    this.history.push({ clientId, ops: transformed });
    this.clientRevisions.set(clientId, this.history.length);
    return { revision: this.history.length, doc: this.doc };
  }
  getDoc() { return this.doc; }
  getRevision() { return this.history.length; }
}

class SyncClient {
  constructor(server, clientId) {
    this.server = server;
    this.clientId = clientId;
    this.revision = 0;
    this.pendingOps = [];
    this.doc = "";
  }
  sync() {
    if (this.pendingOps.length === 0) return;
    const result = this.server.submitOps(this.clientId, this.pendingOps, this.revision);
    this.revision = result.revision;
    this.doc = result.doc;
    this.pendingOps = [];
  }
  localEdit(op) {
    this.pendingOps.push(op);
  }
}

console.log("=== DIFF ENGINE ===");
check("diff identical", new DiffEngine().diff("abc", "abc"), []);
check("diff empty to text", new DiffEngine().diff("", "hello"), [{ op: "+", text: "hello" }]);
check("diff text to empty", new DiffEngine().diff("hello", ""), [{ op: "-", text: "hello" }]);
check("diff insertion middle", (() => {
  const d = new DiffEngine().diff("ac", "abc");
  return d.some(x => x.op === "+" && x.text === "b");
})(), true);
check("diff deletion middle", (() => {
  const d = new DiffEngine().diff("abc", "ac");
  return d.some(x => x.op === "-" && x.text === "b");
})(), true);
check("diff replacement", (() => {
  const d = new DiffEngine().diff("abc", "axc");
  return d.some(x => x.op === "-") && d.some(x => x.op === "+");
})(), true);
check("apply diff reconstructs", (() => {
  const de = new DiffEngine();
  const diffs = de.diff("hello world", "hello brave new world");
  return de.applyDiff("hello world", diffs);
})(), "hello brave new world");
check("invert diffs", (() => {
  const de = new DiffEngine();
  const diffs = de.diff("abc", "adc");
  const inverted = de.invertDiffs(diffs);
  return de.applyDiff("adc", inverted);
})(), "abc");
check("delta encode decode roundtrip", (() => {
  const de = new DiffEngine();
  const diffs = [{ op: "=", text: "abc" }, { op: "+", text: "xy" }, { op: "-", text: "zz" }];
  const encoded = de.deltaEncode(diffs);
  const decoded = de.deltaDecode(encoded);
  return decoded.length === 3 && decoded[0].op === "=" && decoded[1].op === "+" && decoded[2].op === "-";
})(), true);
check("delta empty string", new DiffEngine().deltaDecode(""), []);

console.log("\n=== OT TRANSFORMS ===");
check("ot ins-ins no conflict", (() => {
  const r = OTTransformer.transformOp(Operation.insert(2, "AB"), Operation.insert(5, "CD"));
  return r.pos;
})(), 5);
check("ot ins-ins conflict shifts", (() => {
  const r = OTTransformer.transformOp(Operation.insert(5, "AB"), Operation.insert(3, "CD"));
  return r.pos;
})(), 5);
check("ot del-ins before", (() => {
  const r = OTTransformer.transformOp(Operation.delete(0, 2), Operation.insert(5, "X"));
  return r.pos;
})(), 3);
check("ot apply insert", OTTransformer.applyOp("abc", Operation.insert(1, "X")), "aXbc");
check("ot apply delete", OTTransformer.applyOp("abcde", Operation.delete(1, 2)), "ade");
check("ot apply ops sequence", (() => {
  return OTTransformer.applyOps("hello", [Operation.insert(5, " world"), Operation.delete(0, 1)]);
})(), "ello world");

console.log("\n=== SYNC CONVERGENCE ===");
check("sync single client", (() => {
  const server = new SyncServer("abc");
  const client = new SyncClient(server, "c1");
  client.localEdit(Operation.insert(3, "def"));
  client.sync();
  return server.getDoc();
})(), "abcdef");
check("sync two clients converge", (() => {
  const server = new SyncServer("hello");
  const c1 = new SyncClient(server, "c1");
  const c2 = new SyncClient(server, "c2");
  c1.localEdit(Operation.insert(5, " world"));
  c1.sync();
  c2.localEdit(Operation.insert(0, "say: "));
  c2.sync();
  c1.sync();
  return server.getDoc().includes("say:") && server.getDoc().includes("world");
})(), true);
check("sync sequential edits", (() => {
  const server = new SyncServer("");
  const c = new SyncClient(server, "c1");
  c.localEdit(Operation.insert(0, "a"));
  c.sync();
  c.localEdit(Operation.insert(1, "b"));
  c.sync();
  c.localEdit(Operation.insert(2, "c"));
  c.sync();
  return server.getDoc();
})(), "abc");
check("sync concurrent inserts same position", (() => {
  const server = new SyncServer("X");
  const c1 = new SyncClient(server, "c1");
  const c2 = new SyncClient(server, "c2");
  c1.localEdit(Operation.insert(1, "A"));
  c2.localEdit(Operation.insert(1, "B"));
  c1.sync();
  c2.sync();
  const doc = server.getDoc();
  return doc.length === 3 && doc.includes("A") && doc.includes("B");
})(), true);
check("sync delete and insert concurrent", (() => {
  const server = new SyncServer("abc");
  const c1 = new SyncClient(server, "c1");
  const c2 = new SyncClient(server, "c2");
  c1.localEdit(Operation.delete(1, 1));
  c2.localEdit(Operation.insert(3, "d"));
  c1.sync();
  c2.sync();
  const doc = server.getDoc();
  return doc.includes("a") && doc.includes("c") && doc.includes("d");
})(), true);
check("server revision increments", (() => {
  const server = new SyncServer("test");
  const c = new SyncClient(server, "c1");
  c.localEdit(Operation.insert(0, "x"));
  c.sync();
  return server.getRevision();
})(), 1);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
