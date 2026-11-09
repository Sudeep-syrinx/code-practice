const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class DHTNode {
  constructor(nodeId, totalBits) {
    this.nodeId = nodeId;
    this.totalBits = totalBits || 160;
    this.maxId = BigInt("0x" + "F".repeat(this.totalBits / 4));
    this.routingTable = [];
    for (let i = 0; i < this.totalBits; i++) this.routingTable.push([]);
    this.store = new Map();
    this.peers = new Map();
  }
  distance(a, b) {
    const ba = BigInt("0x" + a);
    const bb = BigInt("0x" + b);
    return ba ^ bb;
  }
  bucketIndex(targetId) {
    const dist = this.distance(this.nodeId, targetId);
    if (dist === 0n) return -1;
    let bits = 0;
    let d = dist;
    while (d > 0n) { d >>= 1n; bits++; }
    return bits - 1;
  }
  addPeer(peerId, peerRef) {
    this.peers.set(peerId, peerRef);
    const bucket = this.bucketIndex(peerId);
    if (bucket < 0) return;
    const kBucket = this.routingTable[bucket];
    if (kBucket.find(p => p.id === peerId)) return;
    if (kBucket.length < 20) {
      kBucket.push({ id: peerId, ref: peerRef });
    }
  }
  removePeer(peerId) {
    this.peers.delete(peerId);
    const bucket = this.bucketIndex(peerId);
    if (bucket >= 0) {
      this.routingTable[bucket] = this.routingTable[bucket].filter(p => p.id !== peerId);
    }
  }
  findClosest(targetId, count) {
    const all = [...this.peers.entries()].map(([id, ref]) => ({ id, ref, dist: this.distance(targetId, id) }));
    all.sort((a, b) => (a.dist < b.dist ? -1 : a.dist > b.dist ? 1 : 0));
    return all.slice(0, count || 20);
  }
  storeValue(key, value) {
    this.store.set(key, { value, timestamp: Date.now() });
  }
  lookupLocal(key) {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }
  findValue(key, network) {
    const local = this.lookupLocal(key);
    if (local !== null) return local;
    let closest = this.findClosest(key, 3);
    const queried = new Set([this.nodeId]);
    for (let round = 0; round < 10; round++) {
      let found = null;
      const nextClosest = [];
      for (const peer of closest) {
        if (queried.has(peer.id)) continue;
        queried.add(peer.id);
        const peerNode = network.get(peer.id);
        if (!peerNode) continue;
        const val = peerNode.lookupLocal(key);
        if (val !== null) { found = val; break; }
        const peerClosest = peerNode.findClosest(key, 3);
        for (const pc of peerClosest) {
          if (!queried.has(pc.id)) nextClosest.push(pc);
        }
      }
      if (found !== null) return found;
      nextClosest.sort((a, b) => (a.dist < b.dist ? -1 : a.dist > b.dist ? 1 : 0));
      closest = nextClosest.slice(0, 3);
      if (closest.length === 0) break;
    }
    return null;
  }
  getRoutingTableSize() {
    return this.routingTable.reduce((sum, bucket) => sum + bucket.length, 0);
  }
}

class DHTNetwork {
  constructor(nodeCount, totalBits) {
    this.nodes = new Map();
    this.totalBits = totalBits || 160;
    for (let i = 0; i < nodeCount; i++) {
      const id = i.toString(16).padStart(totalBits / 4, "0");
      this.nodes.set(id, new DHTNode(id, totalBits));
    }
    this._bootstrap();
  }
  _bootstrap() {
    const ids = [...this.nodes.keys()];
    for (const id of ids) {
      const node = this.nodes.get(id);
      for (const otherId of ids) {
        if (otherId !== id) node.addPeer(otherId, this.nodes.get(otherId));
      }
    }
  }
  get(nodeId) { return this.nodes.get(nodeId); }
  store(key, value) {
    const ids = [...this.nodes.keys()];
    const targetNode = this.nodes.get(ids[0]);
    const closest = targetNode.findClosest(key, 3);
    for (const peer of closest) {
      const node = this.nodes.get(peer.id);
      if (node) node.storeValue(key, value);
    }
  }
  lookup(key) {
    const ids = [...this.nodes.keys()];
    return this.nodes.get(ids[0]).findValue(key, this.nodes);
  }
  size() { return this.nodes.size; }
}

check("dht distance xor", (() => {
  const n = new DHTNode("0000", 16);
  return n.distance("0000", "0001");
})(), 1n);
check("dht distance symmetric", (() => {
  const n = new DHTNode("0000", 16);
  return n.distance("00ab", "00cd") === n.distance("00cd", "00ab");
})(), true);
check("dht bucket index", (() => {
  const n = new DHTNode("0000", 16);
  return n.bucketIndex("0001");
})(), 0);
check("dht add peer to routing table", (() => {
  const n = new DHTNode("0000", 16);
  n.addPeer("0001", {});
  return n.getRoutingTableSize();
})(), 1);
check("dht duplicate peer ignored", (() => {
  const n = new DHTNode("0000", 16);
  n.addPeer("0001", {});
  n.addPeer("0001", {});
  return n.getRoutingTableSize();
})(), 1);
check("dht find closest sorted", (() => {
  const n = new DHTNode("0000", 16);
  n.addPeer("0001", {}); n.addPeer("0002", {}); n.addPeer("00ff", {});
  const closest = n.findClosest("0003", 3);
  return closest[0].id === "0002" || closest[0].id === "0001";
})(), true);
check("dht store and lookup local", (() => {
  const n = new DHTNode("0000", 16);
  n.storeValue("key1", "val1");
  return n.lookupLocal("key1");
})(), "val1");
check("dht lookup miss returns null", (() => {
  const n = new DHTNode("0000", 16);
  return n.lookupLocal("missing");
})(), null);
check("dht network store and lookup", (() => {
  const net = new DHTNetwork(10, 16);
  net.store("mykey", "myval");
  return net.lookup("mykey");
})(), "myval");
check("dht network size", (() => {
  const net = new DHTNetwork(5, 16);
  return net.size();
})(), 5);
check("dht remove peer", (() => {
  const n = new DHTNode("0000", 16);
  n.addPeer("0001", {});
  n.removePeer("0001");
  return n.getRoutingTableSize();
})(), 0);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
