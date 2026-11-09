const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Transaction {
  constructor(id, timestamp) {
    this.id = id;
    this.timestamp = timestamp || Date.now();
    this.operations = [];
    this.state = "active";
  }
  addOp(op) {
    if (this.state !== "active") throw new Error("transaction not active");
    this.operations.push(op);
  }
  commit() { this.state = "committed"; }
  abort() { this.state = "aborted"; }
  isActive() { return this.state === "active"; }
  isCommitted() { return this.state === "committed"; }
}

class MVCCStore {
  constructor() {
    this.data = new Map();
    this.transactions = new Map();
    this.nextTxnId = 1;
    this.committedVersions = new Map();
  }

  begin() {
    const txn = new Transaction(this.nextTxnId++);
    this.transactions.set(txn.id, txn);
    return txn.id;
  }

  read(txnId, key) {
    const txn = this.transactions.get(txnId);
    if (!txn || !txn.isActive()) throw new Error("invalid transaction");
    const ownWrite = txn.operations.find(op => op.key === key && op.type === "write");
    if (ownWrite) return ownWrite.value;
    const versions = this.committedVersions.get(key);
    if (!versions || versions.length === 0) return undefined;
    let visible = undefined;
    for (const v of versions) {
      if (v.commitTimestamp < txn.timestamp) visible = v.value;
    }
    return visible;
  }

  write(txnId, key, value) {
    const txn = this.transactions.get(txnId);
    if (!txn || !txn.isActive()) throw new Error("invalid transaction");
    txn.addOp({ type: "write", key, value });
  }

  delete(txnId, key) {
    const txn = this.transactions.get(txnId);
    if (!txn || !txn.isActive()) throw new Error("invalid transaction");
    txn.addOp({ type: "delete", key });
  }

  commit(txnId) {
    const txn = this.transactions.get(txnId);
    if (!txn || !txn.isActive()) throw new Error("invalid transaction");
    for (const op of txn.operations) {
      if (!this.committedVersions.has(op.key)) this.committedVersions.set(op.key, []);
      const versions = this.committedVersions.get(op.key);
      if (op.type === "write") {
        versions.push({ value: op.value, commitTimestamp: txn.timestamp, txnId: txn.id });
      } else if (op.type === "delete") {
        versions.push({ value: undefined, commitTimestamp: txn.timestamp, txnId: txn.id, deleted: true });
      }
    }
    txn.commit();
    return true;
  }

  abort(txnId) {
    const txn = this.transactions.get(txnId);
    if (!txn || !txn.isActive()) throw new Error("invalid transaction");
    txn.abort();
    return true;
  }

  getLatestVersion(key) {
    const versions = this.committedVersions.get(key);
    if (!versions || versions.length === 0) return undefined;
    const latest = versions[versions.length - 1];
    return latest.deleted ? undefined : latest.value;
  }

  getVersionHistory(key) {
    return (this.committedVersions.get(key) || []).map(v => ({
      value: v.value, timestamp: v.commitTimestamp, txnId: v.txnId, deleted: !!v.deleted
    }));
  }

  gc(beforeTimestamp) {
    let removed = 0;
    for (const [key, versions] of this.committedVersions) {
      const keep = [];
      let latestBeforeGc = null;
      for (const v of versions) {
        if (v.commitTimestamp >= beforeTimestamp) { keep.push(v); }
        else { latestBeforeGc = v; }
      }
      if (latestBeforeGc) keep.unshift(latestBeforeGc);
      removed += versions.length - keep.length;
      this.committedVersions.set(key, keep);
    }
    return removed;
  }
}

class SerializableScheduler {
  constructor(store) {
    this.store = store;
    this.activeReadSets = new Map();
    this.activeWriteSets = new Map();
  }

  validatedRead(txnId, key) {
    const value = this.store.read(txnId, key);
    if (!this.activeReadSets.has(txnId)) this.activeReadSets.set(txnId, new Set());
    this.activeReadSets.get(txnId).add(key);
    return value;
  }

  validatedWrite(txnId, key, value) {
    this.store.write(txnId, key, value);
    if (!this.activeWriteSets.has(txnId)) this.activeWriteSets.set(txnId, new Set());
    this.activeWriteSets.get(txnId).add(key);
  }

  validateAndCommit(txnId) {
    const readSet = this.activeReadSets.get(txnId) || new Set();
    const writeSet = this.activeWriteSets.get(txnId) || new Set();
    const txn = this.store.transactions.get(txnId);
    for (const otherTxn of this.store.transactions.values()) {
      if (otherTxn.id === txnId || !otherTxn.isCommitted()) continue;
      if (otherTxn.timestamp <= txn.timestamp) continue;
      const otherWrites = otherTxn.operations.filter(op => op.type === "write").map(op => op.key);
      for (const key of readSet) {
        if (otherWrites.includes(key)) {
          this.store.abort(txnId);
          this.activeReadSets.delete(txnId);
          this.activeWriteSets.delete(txnId);
          return { committed: false, reason: "read-write conflict with txn " + otherTxn.id };
        }
      }
    }
    this.store.commit(txnId);
    this.activeReadSets.delete(txnId);
    this.activeWriteSets.delete(txnId);
    return { committed: true };
  }
}

console.log("=== MVCC BASIC ===");
check("begin returns txn id", (() => {
  const store = new MVCCStore();
  return typeof store.begin() === "number";
})(), true);
check("write and read within txn", (() => {
  const store = new MVCCStore();
  const txn = store.begin();
  store.write(txn, "k", "v");
  return store.read(txn, "k");
})(), "v");
check("read uncommitted invisible", (() => {
  const store = new MVCCStore();
  const t1 = store.begin();
  store.write(t1, "k", "secret");
  const t2 = store.begin();
  return store.read(t2, "k");
})(), undefined);
check("committed value visible to later txn", (() => {
  const store = new MVCCStore();
  const t1 = store.begin();
  store.write(t1, "k", "visible");
  store.commit(t1);
  const t2 = store.begin();
  return store.read(t2, "k");
})(), "visible");
check("abort discards writes", (() => {
  const store = new MVCCStore();
  const t1 = store.begin();
  store.write(t1, "k", "gone");
  store.abort(t1);
  const t2 = store.begin();
  return store.read(t2, "k");
})(), undefined);
check("overwrite within same txn", (() => {
  const store = new MVCCStore();
  const txn = store.begin();
  store.write(txn, "k", "first");
  store.write(txn, "k", "second");
  return store.read(txn, "k");
})(), "second");
check("delete marks as undefined", (() => {
  const store = new MVCCStore();
  const t1 = store.begin();
  store.write(t1, "k", "val");
  store.commit(t1);
  const t2 = store.begin();
  store.delete(t2, "k");
  return store.read(t2, "k");
})(), undefined);
check("invalid txn throws on read", (() => {
  const store = new MVCCStore();
  return raises(() => store.read(999, "k"));
})(), true);
check("invalid txn throws on write", (() => {
  const store = new MVCCStore();
  return raises(() => store.write(999, "k", "v"));
})(), true);

console.log("\n=== VERSION HISTORY ===");
check("version history tracks commits", (() => {
  const store = new MVCCStore();
  const t1 = store.begin(); store.write(t1, "k", "v1"); store.commit(t1);
  const t2 = store.begin(); store.write(t2, "k", "v2"); store.commit(t2);
  return store.getVersionHistory("k").length;
})(), 2);
check("latest version returns most recent", (() => {
  const store = new MVCCStore();
  const t1 = store.begin(); store.write(t1, "k", "old"); store.commit(t1);
  const t2 = store.begin(); store.write(t2, "k", "new"); store.commit(t2);
  return store.getLatestVersion("k");
})(), "new");
check("latest version after delete", (() => {
  const store = new MVCCStore();
  const t1 = store.begin(); store.write(t1, "k", "val"); store.commit(t1);
  const t2 = store.begin(); store.delete(t2, "k"); store.commit(t2);
  return store.getLatestVersion("k");
})(), undefined);

console.log("\n=== GARBAGE COLLECTION ===");
check("gc removes old versions", (() => {
  const store = new MVCCStore();
  const t1 = store.begin(); store.write(t1, "k", "v1"); store.commit(t1);
  const cutoff = Date.now() + 1;
  const t2 = store.begin(); store.write(t2, "k", "v2"); store.commit(t2);
  const removed = store.gc(cutoff);
  return removed > 0;
})(), true);
check("gc preserves latest before cutoff", (() => {
  const store = new MVCCStore();
  const t1 = store.begin(); store.write(t1, "k", "v1"); store.commit(t1);
  const cutoff = Date.now() + 1000;
  store.gc(cutoff);
  return store.getLatestVersion("k") === "v1";
})(), true);

console.log("\n=== SERIALIZABLE SCHEDULER ===");
check("scheduler commit succeeds without conflict", (() => {
  const store = new MVCCStore();
  const sched = new SerializableScheduler(store);
  const txn = store.begin();
  sched.validatedWrite(txn, "k", "v");
  return sched.validateAndCommit(txn).committed;
})(), true);
check("scheduler read own write", (() => {
  const store = new MVCCStore();
  const sched = new SerializableScheduler(store);
  const txn = store.begin();
  sched.validatedWrite(txn, "k", "v");
  return sched.validatedRead(txn, "k");
})(), "v");
check("scheduler detects rw conflict", (() => {
  const store = new MVCCStore();
  const sched = new SerializableScheduler(store);
  const t1 = store.begin();
  sched.validatedRead(t1, "k");
  const t2 = store.begin();
  sched.validatedWrite(t2, "k", "new");
  store.commit(t2);
  const result = sched.validateAndCommit(t1);
  return result.committed === false;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
