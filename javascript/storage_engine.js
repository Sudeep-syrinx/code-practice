const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(38) + shown.padEnd(46) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

// ============================================================================
// WRITE-AHEAD LOG STORAGE ENGINE
// Covers: WAL, B-Tree, Buffer Pool, MVCC Transactions, Crash Recovery
// ============================================================================

const PAGE_SIZE = 256;
const MAX_KEYS_PER_NODE = 5; // Small for testing splits
const WAL_ENTRY_TYPES = { INSERT: 1, DELETE: 2, COMMIT: 3, ROLLBACK: 4 };

class Page {
  constructor(id) {
    this.id = id;
    this.data = new Map();
    this.dirty = false;
    this.pinCount = 0;
  }
  clone() {
    const p = new Page(this.id);
    for (const [k, v] of this.data) p.data.set(k, v);
    p.dirty = this.dirty;
    return p;
  }
}

class BufferPool {
  constructor(maxPages) {
    if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error("Invalid maxPages");
    this.maxPages = maxPages;
    this.pages = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getPage(pageId, createIfMissing = false) {
    if (this.pages.has(pageId)) {
      this.stats.hits++;
      this._touchAccess(pageId);
      return this.pages.get(pageId);
    }
    this.stats.misses++;
    if (!createIfMissing) return null;
    if (this.pages.size >= this.maxPages) this._evict();
    const page = new Page(pageId);
    this.pages.set(pageId, page);
    this.accessOrder.push(pageId);
    return page;
  }

  _touchAccess(pageId) {
    const idx = this.accessOrder.indexOf(pageId);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(pageId);
    }
  }

  _evict() {
    // LRU: evict oldest unpinned page
    for (let i = 0; i < this.accessOrder.length; i++) {
      const candidateId = this.accessOrder[i];
      const candidate = this.pages.get(candidateId);
      if (candidate && candidate.pinCount === 0) {
        this.pages.delete(candidateId);
        this.accessOrder.splice(i, 1);
        this.stats.evictions++;
        return;
      }
    }
    throw new Error("All pages pinned, cannot evict");
  }

  flushDirty() {
    const flushed = [];
    for (const [, page] of this.pages) {
      if (page.dirty) {
        flushed.push(page.id);
        page.dirty = false;
      }
    }
    return flushed;
  }

  pin(pageId) {
    const page = this.pages.get(pageId);
    if (page) page.pinCount++;
  }

  unpin(pageId) {
    const page = this.pages.get(pageId);
    if (page && page.pinCount > 0) page.pinCount--;
  }
}

class WriteAheadLog {
  constructor() {
    this.entries = [];
    this.lsn = 0; // Log Sequence Number
  }

  append(type, txnId, key, value, prevValue) {
    if (!Object.values(WAL_ENTRY_TYPES).includes(type)) throw new Error("Invalid WAL type");
    const entry = { lsn: this.lsn++, type, txnId, key, value, prevValue, timestamp: Date.now() };
    this.entries.push(entry);
    return entry.lsn;
  }

  getEntriesSince(lsn) {
    return this.entries.filter(e => e.lsn >= lsn);
  }

  getTransactionEntries(txnId) {
    return this.entries.filter(e => e.txnId === txnId);
  }

  getLastCommitLsn(txnId) {
    const commits = this.entries.filter(e => e.txnId === txnId && e.type === WAL_ENTRY_TYPES.COMMIT);
    return commits.length > 0 ? commits[commits.length - 1].lsn : -1;
  }

  replay(bufferPool) {
    const applied = [];
    for (const entry of this.entries) {
      if (entry.type === WAL_ENTRY_TYPES.INSERT) {
        const pageId = Math.floor(entry.key / PAGE_SIZE);
        const page = bufferPool.getPage(pageId, true);
        page.data.set(entry.key, entry.value);
        page.dirty = true;
        applied.push(entry.lsn);
      } else if (entry.type === WAL_ENTRY_TYPES.DELETE) {
        const pageId = Math.floor(entry.key / PAGE_SIZE);
        const page = bufferPool.getPage(pageId, true);
        page.data.delete(entry.key);
        page.dirty = true;
        applied.push(entry.lsn);
      }
    }
    return applied;
  }

  rollback(txnId, bufferPool) {
    const txnEntries = this.getTransactionEntries(txnId).reverse();
    const rolledBack = [];
    for (const entry of txnEntries) {
      if (entry.type === WAL_ENTRY_TYPES.COMMIT || entry.type === WAL_ENTRY_TYPES.ROLLBACK) continue;
      const pageId = Math.floor(entry.key / PAGE_SIZE);
      const page = bufferPool.getPage(pageId, true);
      if (entry.type === WAL_ENTRY_TYPES.INSERT) {
        page.data.delete(entry.key);
      } else if (entry.type === WAL_ENTRY_TYPES.DELETE && entry.prevValue !== undefined) {
        page.data.set(entry.key, entry.prevValue);
      }
      page.dirty = true;
      rolledBack.push(entry.lsn);
    }
    this.append(WAL_ENTRY_TYPES.ROLLBACK, txnId, null, null, null);
    return rolledBack;
  }

  clear() { this.entries = []; this.lsn = 0; }
  get length() { return this.entries.length; }
}

class BTreeNode {
  constructor(isLeaf) {
    this.keys = [];
    this.children = []; // Only for internal nodes
    this.values = [];   // Only for leaf nodes (stores actual data or record pointers)
    this.isLeaf = isLeaf;
    this.nextLeaf = null; // For leaf linked list (range scans)
  }

  isFull() { return this.keys.length >= MAX_KEYS_PER_NODE; }

  insertKey(key, value) {
    let i = 0;
    while (i < this.keys.length && this.keys[i] < key) i++;
    this.keys.splice(i, 0, key);
    if (this.isLeaf) this.values.splice(i, 0, value);
    return i;
  }

  split() {
    const mid = Math.floor(this.keys.length / 2);
    const right = new BTreeNode(this.isLeaf);
    right.keys = this.keys.splice(mid + 1);
    if (this.isLeaf) {
      right.values = this.values.splice(mid + 1);
      right.nextLeaf = this.nextLeaf;
      this.nextLeaf = right;
    } else {
      right.children = this.children.splice(mid + 1);
    }
    const promotedKey = this.keys.pop();
    if (!this.isLeaf) this.children.splice(mid, 0); // cleanup
    return { promotedKey, rightNode: right };
  }

  findChildIndex(key) {
    let lo = 0, hi = this.keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.keys[mid] <= key) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

class BTree {
  constructor() {
    this.root = new BTreeNode(true);
    this.height = 1;
    this.size = 0;
  }

  search(key) {
    let node = this.root;
    while (!node.isLeaf) {
      const idx = node.findChildIndex(key);
      node = node.children[idx];
    }
    const idx = node.keys.indexOf(key);
    return idx !== -1 ? node.values[idx] : undefined;
  }

  insert(key, value) {
    if (this.root.isFull()) {
      const oldRoot = this.root;
      this.root = new BTreeNode(false);
      this.root.children.push(oldRoot);
      const { promotedKey, rightNode } = oldRoot.split();
      this.root.keys.push(promotedKey);
      this.root.children.push(rightNode);
      this.height++;
    }
    this._insertNonFull(this.root, key, value);
    this.size++;
  }

  _insertNonFull(node, key, value) {
    if (node.isLeaf) {
      // Update existing or insert new
      const existingIdx = node.keys.indexOf(key);
      if (existingIdx !== -1) {
        node.values[existingIdx] = value;
        this.size--; // Compensate for increment in caller
        return;
      }
      node.insertKey(key, value);
      if (node.isFull()) {
        // Leaf split handled by parent
      }
      return;
    }

    const idx = node.findChildIndex(key);
    const child = node.children[idx];

    if (child.isFull()) {
      const { promotedKey, rightNode } = child.split();
      node.keys.splice(idx, 0, promotedKey);
      node.children.splice(idx + 1, 0, rightNode);
      // Decide which child to descend into
      if (key > promotedKey) {
        this._insertNonFull(rightNode, key, value);
      } else {
        this._insertNonFull(child, key, value);
      }
    } else {
      this._insertNonFull(child, key, value);
    }
  }

  rangeScan(startKey, endKey) {
    const result = [];
    // Find leftmost leaf containing startKey
    let node = this.root;
    while (!node.isLeaf) {
      const idx = node.findChildIndex(startKey);
      node = node.children[idx];
    }
    // Scan through leaf linked list
    while (node) {
      for (let i = 0; i < node.keys.length; i++) {
        if (node.keys[i] >= startKey && node.keys[i] <= endKey) {
          result.push({ key: node.keys[i], value: node.values[i] });
        }
        if (node.keys[i] > endKey) return result;
      }
      node = node.nextLeaf;
    }
    return result;
  }

  getAllKeys() {
    const keys = [];
    let node = this.root;
    while (!node.isLeaf) node = node.children[0];
    while (node) {
      keys.push(...node.keys);
      node = node.nextLeaf;
    }
    return keys;
  }
}

class TransactionManager {
  constructor(bufferPool, wal, btree) {
    this.bufferPool = bufferPool;
    this.wal = wal;
    this.btree = btree;
    this.activeTxns = new Map(); // txnId -> { startTime, writes: [] }
    this.nextTxnId = 1;
    this.committedVersions = new Map(); // key -> [{ value, txnId, committedAt }]
  }

  begin() {
    const txnId = this.nextTxnId++;
    this.activeTxns.set(txnId, { startTime: Date.now(), writes: [], snapshot: new Map() });
    return txnId;
  }

  read(txnId, key) {
    if (!this.activeTxns.has(txnId)) throw new Error("Transaction not active");
    const txn = this.activeTxns.get(txnId);
    // Read own writes first
    const ownWrite = txn.writes.find(w => w.key === key);
    if (ownWrite) return ownWrite.type === WAL_ENTRY_TYPES.DELETE ? undefined : ownWrite.value;
    // Otherwise read from B-Tree (simplified MVCC: latest committed version)
    return this.btree.search(key);
  }

  write(txnId, key, value) {
    if (!this.activeTxns.has(txnId)) throw new Error("Transaction not active");
    const txn = this.activeTxns.get(txnId);
    const prevValue = this.btree.search(key);
    const lsn = this.wal.append(WAL_ENTRY_TYPES.INSERT, txnId, key, value, prevValue);
    txn.writes.push({ type: WAL_ENTRY_TYPES.INSERT, key, value, lsn });
  }

  delete(txnId, key) {
    if (!this.activeTxns.has(txnId)) throw new Error("Transaction not active");
    const txn = this.activeTxns.get(txnId);
    const prevValue = this.btree.search(key);
    const lsn = this.wal.append(WAL_ENTRY_TYPES.DELETE, txnId, key, null, prevValue);
    txn.writes.push({ type: WAL_ENTRY_TYPES.DELETE, key, value: null, lsn, prevValue });
  }

  commit(txnId) {
    if (!this.activeTxns.has(txnId)) throw new Error("Transaction not active");
    const txn = this.activeTxns.get(txnId);
    // Apply writes to B-Tree
    for (const w of txn.writes) {
      if (w.type === WAL_ENTRY_TYPES.INSERT) this.btree.insert(w.key, w.value);
      else if (w.type === WAL_ENTRY_TYPES.DELETE) {
        // B-Tree doesn't have delete in this impl, mark as tombstone
        this.btree.insert(w.key, undefined);
      }
    }
    this.wal.append(WAL_ENTRY_TYPES.COMMIT, txnId, null, null, null);
    this.activeTxns.delete(txnId);
    return true;
  }

  abort(txnId) {
    if (!this.activeTxns.has(txnId)) throw new Error("Transaction not active");
    this.wal.rollback(txnId, this.bufferPool);
    this.activeTxns.delete(txnId);
    return true;
  }

  recover() {
    // Redo committed transactions, undo uncommitted ones
    const allTxnIds = new Set(this.wal.entries.map(e => e.txnId));
    const committed = new Set();
    for (const id of allTxnIds) {
      if (this.wal.getLastCommitLsn(id) !== -1) committed.add(id);
    }
    // Redo committed
    for (const entry of this.wal.entries) {
      if (committed.has(entry.txnId) && entry.type === WAL_ENTRY_TYPES.INSERT) {
        this.btree.insert(entry.key, entry.value);
      }
    }
    // Undo uncommitted (in reverse order)
    const uncommitted = [...allTxnIds].filter(id => !committed.has(id));
    for (const txnId of uncommitted) {
      this.wal.rollback(txnId, this.bufferPool);
    }
    return { redone: committed.size, undone: uncommitted.length };
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== BUFFER POOL TESTS ===");
check("bp get creates page", (() => {
  const bp = new BufferPool(3);
  return bp.getPage(0, true)?.id;
})(), 0);
check("bp get returns null missing", new BufferPool(3).getPage(99), null);
check("bp hit stat", (() => {
  const bp = new BufferPool(3);
  bp.getPage(0, true);
  bp.getPage(0);
  return bp.stats.hits;
})(), 1);
check("bp miss stat", (() => {
  const bp = new BufferPool(3);
  bp.getPage(0, true);
  return bp.stats.misses;
})(), 1);
check("bp eviction lru", (() => {
  const bp = new BufferPool(2);
  bp.getPage(0, true);
  bp.getPage(1, true);
  bp.getPage(0); // touch 0, making 1 the LRU
  bp.getPage(2, true); // should evict 1
  return bp.getPage(1) === null && bp.getPage(0) !== null;
})(), true);
check("bp eviction stat", (() => {
  const bp = new BufferPool(1);
  bp.getPage(0, true);
  bp.getPage(1, true);
  return bp.stats.evictions;
})(), 1);
check("bp pin prevents eviction", (() => {
  const bp = new BufferPool(1);
  bp.getPage(0, true);
  bp.pin(0);
  return raises(() => bp.getPage(1, true));
})(), true);
check("bp unpin allows eviction", (() => {
  const bp = new BufferPool(1);
  bp.getPage(0, true);
  bp.pin(0);
  bp.unpin(0);
  bp.getPage(1, true);
  return bp.getPage(0) === null;
})(), true);
check("bp flush dirty", (() => {
  const bp = new BufferPool(3);
  const p = bp.getPage(0, true);
  p.dirty = true;
  const flushed = bp.flushDirty();
  return flushed.length === 1 && !p.dirty;
})(), true);
check("bp invalid max throws", raises(() => new BufferPool(0)), true);

console.log("\n=== WAL TESTS ===");
check("wal append returns lsn", (() => {
  const w = new WriteAheadLog();
  return w.append(WAL_ENTRY_TYPES.INSERT, 1, "k", "v", null);
})(), 0);
check("wal lsn increments", (() => {
  const w = new WriteAheadLog();
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "a", "1", null);
  return w.append(WAL_ENTRY_TYPES.INSERT, 1, "b", "2", null);
})(), 1);
check("wal get entries since", (() => {
  const w = new WriteAheadLog();
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "a", "1", null);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "b", "2", null);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "c", "3", null);
  return w.getEntriesSince(1).length;
})(), 2);
check("wal get txn entries", (() => {
  const w = new WriteAheadLog();
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "a", "1", null);
  w.append(WAL_ENTRY_TYPES.INSERT, 2, "b", "2", null);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "c", "3", null);
  return w.getTransactionEntries(1).length;
})(), 2);
check("wal last commit lsn", (() => {
  const w = new WriteAheadLog();
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "a", "1", null);
  w.append(WAL_ENTRY_TYPES.COMMIT, 1, null, null, null);
  return w.getLastCommitLsn(1);
})(), 1);
check("wal no commit returns -1", new WriteAheadLog().getLastCommitLsn(99), -1);
check("wal replay applies inserts", (() => {
  const w = new WriteAheadLog();
  const bp = new BufferPool(10);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, 5, "val5", null);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, 300, "val300", null);
  w.replay(bp);
  return bp.getPage(0).data.get(5) === "val5" && bp.getPage(1).data.get(300) === "val300";
})(), true);
check("wal rollback undoes insert", (() => {
  const w = new WriteAheadLog();
  const bp = new BufferPool(10);
  w.append(WAL_ENTRY_TYPES.INSERT, 1, 10, "x", null);
  w.rollback(1, bp);
  return bp.getPage(0).data.has(10) === false;
})(), true);
check("wal rollback restores delete", (() => {
  const w = new WriteAheadLog();
  const bp = new BufferPool(10);
  const p = bp.getPage(0, true);
  p.data.set(10, "original");
  w.append(WAL_ENTRY_TYPES.DELETE, 1, 10, null, "original");
  w.rollback(1, bp);
  return bp.getPage(0).data.get(10) === "original";
})(), true);
check("wal invalid type throws", raises(() => new WriteAheadLog().append(99, 1, "k", "v", null)), true);
check("wal clear resets", (() => {
  const w = new WriteAheadLog();
  w.append(WAL_ENTRY_TYPES.INSERT, 1, "a", "1", null);
  w.clear();
  return w.length === 0 && w.lsn === 0;
})(), true);

console.log("\n=== B-TREE TESTS ===");
check("bt insert and search", (() => {
  const bt = new BTree();
  bt.insert(10, "ten");
  return bt.search(10);
})(), "ten");
check("bt search missing", new BTree().search(99), undefined);
check("bt update existing", (() => {
  const bt = new BTree();
  bt.insert(5, "old");
  bt.insert(5, "new");
  return bt.search(5);
})(), "new");
check("bt size tracks inserts", (() => {
  const bt = new BTree();
  bt.insert(1, "a");
  bt.insert(2, "b");
  bt.insert(1, "c"); // update, not new
  return bt.size;
})(), 2);
check("bt split on overflow", (() => {
  const bt = new BTree();
  for (let i = 0; i < MAX_KEYS_PER_NODE + 2; i++) bt.insert(i, "v" + i);
  return bt.height > 1;
})(), true);
check("bt all keys after splits", (() => {
  const bt = new BTree();
  const n = MAX_KEYS_PER_NODE * 3;
  for (let i = 0; i < n; i++) bt.insert(i, "v");
  return bt.getAllKeys().length === n;
})(), true);
check("bt keys sorted after splits", (() => {
  const bt = new BTree();
  for (let i = 20; i >= 0; i--) bt.insert(i, "v");
  const keys = bt.getAllKeys();
  for (let i = 1; i < keys.length; i++) if (keys[i] <= keys[i-1]) return false;
  return true;
})(), true);
check("bt range scan basic", (() => {
  const bt = new BTree();
  for (let i = 0; i < 10; i++) bt.insert(i, "v" + i);
  return bt.rangeScan(3, 6).map(r => r.key);
})(), [3, 4, 5, 6]);
check("bt range scan empty", (() => {
  const bt = new BTree();
  for (let i = 0; i < 10; i++) bt.insert(i, "v");
  return bt.rangeScan(20, 30);
})(), []);
check("bt range scan full", (() => {
  const bt = new BTree();
  for (let i = 0; i < 5; i++) bt.insert(i, "v");
  return bt.rangeScan(0, 100).length;
})(), 5);
check("bt large insert search", (() => {
  const bt = new BTree();
  for (let i = 0; i < 200; i++) bt.insert(i, "val" + i);
  return bt.search(150) === "val150" && bt.search(199) === "val199" && bt.search(0) === "val0";
})(), true);

console.log("\n=== TRANSACTION MANAGER TESTS ===");
check("tm begin returns id", (() => {
  const tm = new TransactionManager(new BufferPool(10), new WriteAheadLog(), new BTree());
  return typeof tm.begin() === "number";
})(), true);
check("tm read own write", (() => {
  const tm = new TransactionManager(new BufferPool(10), new WriteAheadLog(), new BTree());
  const txn = tm.begin();
  tm.write(txn, "k1", "v1");
  return tm.read(txn, "k1");
})(), "v1");
check("tm read before commit invisible", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k", "secret");
  const t2 = tm.begin();
  return tm.read(t2, "k");
})(), undefined);
check("tm read after commit visible", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k", "visible");
  tm.commit(t1);
  const t2 = tm.begin();
  return tm.read(t2, "k");
})(), "visible");
check("tm abort discards writes", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k", "gone");
  tm.abort(t1);
  const t2 = tm.begin();
  return tm.read(t2, "k");
})(), undefined);
check("tm delete marks tombstone", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k", "val");
  tm.commit(t1);
  const t2 = tm.begin();
  tm.delete(t2, "k");
  return tm.read(t2, "k");
})(), undefined);
check("tm inactive txn throws read", (() => {
  const tm = new TransactionManager(new BufferPool(10), new WriteAheadLog(), new BTree());
  return raises(() => tm.read(999, "k"));
})(), true);
check("tm inactive txn throws write", (() => {
  const tm = new TransactionManager(new BufferPool(10), new WriteAheadLog(), new BTree());
  return raises(() => tm.write(999, "k", "v"));
})(), true);
check("tm recover redoes committed", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k1", "v1");
  tm.commit(t1);
  // Simulate crash: fresh BTree, replay WAL
  const bt2 = new BTree();
  const tm2 = new TransactionManager(bp, wal, bt2);
  tm2.recover();
  return bt2.search("k1") === "v1";
})(), true);
check("tm recover undoes uncommitted", (() => {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  tm.write(t1, "k1", "should_not_exist");
  // No commit - simulate crash
  const bt2 = new BTree();
  const tm2 = new TransactionManager(bp, wal, bt2);
  const stats = tm2.recover();
  return bt2.search("k1") === undefined && stats.undone === 1;
})(), true);

console.log("\n=== STRESS / PROPERTY TESTS ===");
let seed = 31415;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }

// Property: B-Tree maintains sort order under random inserts
let btSortOk = true;
for (let trial = 0; trial < 50; trial++) {
  const bt = new BTree();
  const count = 10 + nextRandom(100);
  const inserted = new Set();
  for (let i = 0; i < count; i++) {
    const k = nextRandom(500);
    bt.insert(k, "v");
    inserted.add(k);
  }
  const keys = bt.getAllKeys();
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] <= keys[i-1]) { btSortOk = false; break; }
  }
  if (keys.length !== inserted.size) btSortOk = false;
  if (!btSortOk) break;
}
check("50 btree random sort order", btSortOk, true);

// Property: Buffer pool never exceeds capacity
let bpCapOk = true;
for (let trial = 0; trial < 100; trial++) {
  const maxP = 2 + nextRandom(8);
  const bp = new BufferPool(maxP);
  const ops = 20 + nextRandom(50);
  for (let o = 0; o < ops; o++) {
    bp.getPage(nextRandom(30), true);
    if (bp.pages.size > maxP) { bpCapOk = false; break; }
  }
  if (!bpCapOk) break;
}
check("100 buffer pool capacity", bpCapOk, true);

// Property: WAL replay is idempotent
let walIdempotentOk = true;
for (let trial = 0; trial < 50; trial++) {
  const wal = new WriteAheadLog();
  const numEntries = 5 + nextRandom(20);
  for (let i = 0; i < numEntries; i++) {
    wal.append(WAL_ENTRY_TYPES.INSERT, 1, nextRandom(100), "v" + i, null);
  }
  const bp1 = new BufferPool(20);
  const bp2 = new BufferPool(20);
  wal.replay(bp1);
  wal.replay(bp2);
  // Both should have identical state
  for (const [id, page] of bp1.pages) {
    const p2 = bp2.getPage(id);
    if (!p2) { walIdempotentOk = false; break; }
    for (const [k, v] of page.data) {
      if (p2.data.get(k) !== v) { walIdempotentOk = false; break; }
    }
    if (!walIdempotentOk) break;
  }
  if (!walIdempotentOk) break;
}
check("50 wal replay idempotent", walIdempotentOk, true);

// Property: Transaction isolation - concurrent txns don't see each other's uncommitted writes
let txIsoOk = true;
for (let trial = 0; trial < 50; trial++) {
  const bp = new BufferPool(10);
  const wal = new WriteAheadLog();
  const bt = new BTree();
  const tm = new TransactionManager(bp, wal, bt);
  const t1 = tm.begin();
  const t2 = tm.begin();
  const k = "key_" + trial;
  tm.write(t1, k, "from_t1");
  if (tm.read(t2, k) !== undefined) { txIsoOk = false; break; }
  tm.abort(t1);
  tm.abort(t2);
}
check("50 transaction isolation", txIsoOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
