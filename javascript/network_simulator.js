const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(35) + shown.padEnd(45) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try { fn(); } catch (e) { return true; }
  return false;
}

function messageOf(fn) {
  try { fn(); } catch (e) { return e.message; }
  return "";
}

// ============================================================================
// CORE NETWORK SIMULATOR ENGINE
// Covers: Sliding Window, Congestion Control, Fragmentation, Async Routing
// ============================================================================

const NET_CONSTANTS = {
  MAX_PACKET_SIZE: 512,
  HEADER_SIZE: 20,
  INITIAL_CWND: 1,
  SLOW_START_THRESHOLD: 16,
  TIMEOUT_MS: 1000,
  DUPLICATE_ACK_THRESHOLD: 3,
  STATES: { CLOSED: 0, SYN_SENT: 1, ESTABLISHED: 2, FIN_WAIT: 3 }
};

class Packet {
  constructor(seqNum, ackNum, flags, payload, streamId) {
    if (!Number.isInteger(seqNum) || seqNum < 0) throw new Error("Invalid seqNum");
    if (!Number.isInteger(ackNum) || ackNum < 0) throw new Error("Invalid ackNum");
    this.seqNum = seqNum;
    this.ackNum = ackNum;
    this.flags = flags || {}; // { syn, ack, fin, rst }
    this.payload = payload || "";
    this.streamId = streamId || 0;
    this.timestamp = Date.now();
    this.size = NET_CONSTANTS.HEADER_SIZE + this.payload.length;
  }

  isControl() {
    return this.flags.syn || this.flags.fin || this.flags.rst;
  }

  clone() {
    const p = new Packet(this.seqNum, this.ackNum, { ...this.flags }, this.payload, this.streamId);
    p.timestamp = this.timestamp;
    return p;
  }
}

class Fragmenter {
  static fragment(data, maxPayloadSize) {
    if (typeof data !== "string") throw new Error("Data must be string");
    if (!Number.isInteger(maxPayloadSize) || maxPayloadSize < 1) throw new Error("Invalid maxPayloadSize");
    
    const chunks = [];
    for (let i = 0; i < data.length; i += maxPayloadSize) {
      chunks.push(data.slice(i, i + maxPayloadSize));
    }
    return chunks.length === 0 ? [""] : chunks;
  }

  static reassemble(fragments) {
    if (!Array.isArray(fragments)) throw new Error("Fragments must be array");
    return fragments.join("");
  }
}

class SlidingWindowSender {
  constructor(windowSize) {
    if (!Number.isInteger(windowSize) || windowSize < 1) throw new Error("Invalid window size");
    this.windowSize = windowSize;
    this.buffer = [];       // Packets waiting to be sent
    this.inFlight = new Map(); // seqNum -> { packet, sendTime, retries }
    this.nextSeq = 0;
    this.baseSeq = 0;      // Oldest unacknowledged sequence number
    this.cwnd = NET_CONSTANTS.INITIAL_CWND;
    this.ssthresh = NET_CONSTANTS.SLOW_START_THRESHOLD;
    this.dupAckCount = 0;
    this.stats = { sent: 0, retransmits: 0, timeouts: 0 };
  }

  enqueue(packet) {
    if (!(packet instanceof Packet)) throw new Error("Must enqueue Packet instance");
    packet.seqNum = this.nextSeq++;
    this.buffer.push(packet);
  }

  getEffectiveWindow() {
    return Math.min(this.windowSize, this.cwnd);
  }

  canSend() {
    return this.inFlight.size < this.getEffectiveWindow() && this.buffer.length > 0;
  }

  sendNext(currentTime) {
    if (!this.canSend()) return null;
    const packet = this.buffer.shift();
    this.inFlight.set(packet.seqNum, { 
      packet: packet.clone(), 
      sendTime: currentTime, 
      retries: 0 
    });
    this.stats.sent++;
    return packet;
  }

  processAck(ackNum, currentTime) {
    if (!Number.isInteger(ackNum)) throw new Error("Invalid ackNum");
    
    // Cumulative ACK: acknowledges all packets up to ackNum - 1
    let acknowledged = false;
    for (const [seq, entry] of this.inFlight) {
      if (seq < ackNum) {
        this.inFlight.delete(seq);
        acknowledged = true;
      }
    }

    if (acknowledged) {
      this.baseSeq = Math.max(this.baseSeq, ackNum);
      this.dupAckCount = 0;
      this._onSuccessAck();
    } else if (ackNum === this.baseSeq && this.inFlight.size > 0) {
      // Duplicate ACK
      this.dupAckCount++;
      if (this.dupAckCount >= NET_CONSTANTS.DUPLICATE_ACK_THRESHOLD) {
        this._onTripleDuplicateAck();
      }
    }
  }

  _onSuccessAck() {
    // Slow Start / Congestion Avoidance
    if (this.cwnd < this.ssthresh) {
      this.cwnd = Math.min(this.cwnd * 2, this.ssthresh);
    } else {
      this.cwnd += 1;
    }
  }

  _onTripleDuplicateAck() {
    // Fast Retransmit & Recovery
    this.ssthresh = Math.max(Math.floor(this.cwnd / 2), 1);
    this.cwnd = this.ssthresh + NET_CONSTANTS.DUPLICATE_ACK_THRESHOLD;
    this.dupAckCount = 0;
    
    // Mark oldest unacked for retransmit
    if (this.inFlight.size > 0) {
      const oldestSeq = Math.min(...this.inFlight.keys());
      const entry = this.inFlight.get(oldestSeq);
      if (entry) {
        entry.retries++;
        entry.sendTime = Date.now();
        this.stats.retransmits++;
      }
    }
  }

  checkTimeouts(currentTime) {
    const timedOut = [];
    for (const [seq, entry] of this.inFlight) {
      if (currentTime - entry.sendTime > NET_CONSTANTS.TIMEOUT_MS) {
        timedOut.push(seq);
      }
    }

    if (timedOut.length > 0) {
      // Timeout: Multiplicative Decrease
      this.ssthresh = Math.max(Math.floor(this.cwnd / 2), 1);
      this.cwnd = NET_CONSTANTS.INITIAL_CWND;
      this.dupAckCount = 0;

      for (const seq of timedOut) {
        const entry = this.inFlight.get(seq);
        if (entry) {
          entry.retries++;
          entry.sendTime = currentTime;
          this.stats.timeouts++;
          this.stats.retransmits++;
        }
      }
    }
    return timedOut;
  }

  getRetransmits() {
    const out = [];
    for (const [seq, entry] of this.inFlight) {
      if (entry.retries > 0) out.push(entry.packet.clone());
    }
    return out;
  }
}

class SlidingWindowReceiver {
  constructor(expectedStart) {
    if (!Number.isInteger(expectedStart) || expectedStart < 0) throw new Error("Invalid start");
    this.expectedSeq = expectedStart;
    this.received = new Map(); // For out-of-order buffering
    this.delivered = [];
    this.lastAckSent = expectedStart;
  }

  receive(packet) {
    if (!(packet instanceof Packet)) throw new Error("Must receive Packet instance");
    
    if (packet.seqNum === this.expectedSeq) {
      // In-order delivery
      this.delivered.push(packet.payload);
      this.expectedSeq++;
      
      // Check if we can deliver buffered out-of-order packets
      while (this.received.has(this.expectedSeq)) {
        this.delivered.push(this.received.get(this.expectedSeq));
        this.received.delete(this.expectedSeq);
        this.expectedSeq++;
      }
      this.lastAckSent = this.expectedSeq;
      return { delivered: true, ack: this.lastAckSent };
    } else if (packet.seqNum > this.expectedSeq) {
      // Out of order - buffer it
      if (!this.received.has(packet.seqNum)) {
        this.received.set(packet.seqNum, packet.payload);
      }
      // Send duplicate ACK for expected sequence
      return { delivered: false, ack: this.lastAckSent };
    }
    
    // Duplicate of already delivered packet
    return { delivered: false, ack: this.lastAckSent };
  }

  getDeliveredData() {
    return Fragmenter.reassemble(this.delivered);
  }
}

class ConnectionStateMachine {
  constructor(role) {
    if (role !== "client" && role !== "server") throw new Error("Role must be client or server");
    this.role = role;
    this.state = NET_CONSTANTS.STATES.CLOSED;
    this.sendQueue = [];
    this.recvQueue = [];
  }

  transition(event) {
    const prev = this.state;
    switch (this.state) {
      case NET_CONSTANTS.STATES.CLOSED:
        if (event === "APP_CONNECT" && this.role === "client") {
          this.state = NET_CONSTANTS.STATES.SYN_SENT;
          this.sendQueue.push(new Packet(0, 0, { syn: true }, ""));
        } else if (event === "RECV_SYN" && this.role === "server") {
          this.state = NET_CONSTANTS.STATES.ESTABLISHED;
          this.sendQueue.push(new Packet(0, 1, { syn: true, ack: true }, ""));
        }
        break;
      case NET_CONSTANTS.STATES.SYN_SENT:
        if (event === "RECV_SYN_ACK") {
          this.state = NET_CONSTANTS.STATES.ESTABLISHED;
          this.sendQueue.push(new Packet(1, 1, { ack: true }, ""));
        } else if (event === "TIMEOUT") {
          this.state = NET_CONSTANTS.STATES.CLOSED;
        }
        break;
      case NET_CONSTANTS.STATES.ESTABLISHED:
        if (event === "APP_CLOSE") {
          this.state = NET_CONSTANTS.STATES.FIN_WAIT;
          this.sendQueue.push(new Packet(999, 0, { fin: true }, ""));
        } else if (event === "RECV_FIN") {
          this.state = NET_CONSTANTS.STATES.CLOSED;
          this.sendQueue.push(new Packet(0, 0, { fin: true, ack: true }, ""));
        }
        break;
      case NET_CONSTANTS.STATES.FIN_WAIT:
        if (event === "RECV_FIN_ACK") {
          this.state = NET_CONSTANTS.STATES.CLOSED;
        }
        break;
    }
    return prev !== this.state;
  }

  getStateName() {
    return Object.keys(NET_CONSTANTS.STATES).find(k => NET_CONSTANTS.STATES[k] === this.state) || "UNKNOWN";
  }
}

class NetworkSimulator {
  constructor(options = {}) {
    this.lossRate = options.lossRate || 0;
    this.delayMs = options.delayMs || 0;
    this.eventLog = [];
    this.currentTime = 0;
    this.pendingEvents = []; // { time, type, data }
  }

  schedule(delay, type, data) {
    this.pendingEvents.push({ 
      time: this.currentTime + delay, 
      type, 
      data 
    });
    this.pendingEvents.sort((a, b) => a.time - b.time);
  }

  tick() {
    if (this.pendingEvents.length === 0) return null;
    const event = this.pendingEvents.shift();
    this.currentTime = event.time;
    this.eventLog.push({ ...event });
    return event;
  }

  shouldDrop() {
    return Math.random() < this.lossRate;
  }

  transmit(sender, receiver, currentTime) {
    const packets = [];
    while (sender.canSend()) {
      const pkt = sender.sendNext(currentTime);
      if (pkt && !this.shouldDrop()) {
        packets.push(pkt);
        this.schedule(this.delayMs, "DELIVER", pkt);
      }
    }
    return packets;
  }

  getStats() {
    return {
      eventsProcessed: this.eventLog.length,
      pendingEvents: this.pendingEvents.length,
      currentTime: this.currentTime
    };
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log("=== PACKET & FRAGMENTATION TESTS ===");
check("create packet", new Packet(0, 0, {}, "hi").payload, "hi");
check("packet size calc", new Packet(0, 0, {}, "hello").size, 25);
check("packet is control syn", new Packet(0, 0, { syn: true }).isControl(), true);
check("packet is control data", new Packet(0, 0, {}, "data").isControl(), false);
check("packet clone independence", (() => {
  const p = new Packet(1, 2, { ack: true }, "test");
  const c = p.clone();
  c.payload = "modified";
  return p.payload;
})(), "test");
check("invalid seq throws", raises(() => new Packet(-1, 0, {})), true);
check("invalid ack throws", raises(() => new Packet(0, -1, {})), true);

console.log();
check("fragment small", Fragmenter.fragment("abc", 10), ["abc"]);
check("fragment exact", Fragmenter.fragment("abcd", 2), ["ab", "cd"]);
check("fragment uneven", Fragmenter.fragment("abcde", 2), ["ab", "cd", "e"]);
check("fragment empty", Fragmenter.fragment("", 5), [""]);
check("fragment single char", Fragmenter.fragment("x", 1), ["x"]);
check("fragment invalid size", raises(() => Fragmenter.fragment("a", 0)), true);
check("fragment non-string", raises(() => Fragmenter.fragment(123, 5)), true);
check("reassemble basic", Fragmenter.reassemble(["ab", "cd"]), "abcd");
check("reassemble empty arr", Fragmenter.reassemble([]), "");
check("reassemble single", Fragmenter.reassemble(["xyz"]), "xyz");
check("reassemble non-array", raises(() => Fragmenter.reassemble("abc")), true);
check("roundtrip fragment", Fragmenter.reassemble(Fragmenter.fragment("hello world!", 3)), "hello world!");

console.log("\n=== SLIDING WINDOW SENDER TESTS ===");
check("sender init cwnd", new SlidingWindowSender(10).cwnd, 1);
check("sender effective win", new SlidingWindowSender(5).getEffectiveWindow(), 1);
check("sender enqueue assigns seq", (() => {
  const s = new SlidingWindowSender(10);
  const p = new Packet(0, 0, {}, "a");
  s.enqueue(p);
  return p.seqNum;
})(), 0);
check("sender enqueue increments", (() => {
  const s = new SlidingWindowSender(10);
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.enqueue(new Packet(0, 0, {}, "b"));
  return s.nextSeq;
})(), 2);
check("sender can send when space", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 5;
  s.enqueue(new Packet(0, 0, {}, "a"));
  return s.canSend();
})(), true);
check("sender cannot send empty buf", new SlidingWindowSender(10).canSend(), false);
check("sender cannot send full win", (() => {
  const s = new SlidingWindowSender(1);
  s.cwnd = 1;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.enqueue(new Packet(0, 0, {}, "b"));
  return s.canSend();
})(), false);
check("send returns packet", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "test"));
  return s.sendNext(100)?.payload;
})(), "test");
check("send moves to inflight", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "x"));
  s.sendNext(0);
  return s.inFlight.size;
})(), 1);
check("send updates stats", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "x"));
  s.sendNext(0);
  return s.stats.sent;
})(), 1);
check("process ack removes inflight", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(1, 100);
  return s.inFlight.size;
})(), 0);
check("ack grows cwnd slow start", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 1;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(1, 100);
  return s.cwnd;
})(), 2);
check("cwnd caps at ssthresh", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 8;
  s.ssthresh = 16;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(1, 100);
  return s.cwnd;
})(), 16);
check("cwnd linear after ssthresh", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 16;
  s.ssthresh = 16;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(1, 100);
  return s.cwnd;
})(), 17);
check("dup ack increments count", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(0, 100);
  return s.dupAckCount;
})(), 1);
check("triple dup ack triggers fast retransmit", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.ssthresh = 16;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(0, 100);
  s.processAck(0, 101);
  s.processAck(0, 102);
  return s.stats.retransmits;
})(), 1);
check("fast retransmit halves ssthresh", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.ssthresh = 16;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.processAck(0, 100);
  s.processAck(0, 101);
  s.processAck(0, 102);
  return s.ssthresh;
})(), 5);
check("timeout resets cwnd", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.checkTimeouts(NET_CONSTANTS.TIMEOUT_MS + 1);
  return s.cwnd;
})(), 1);
check("timeout counts retransmit", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  s.checkTimeouts(NET_CONSTANTS.TIMEOUT_MS + 1);
  return s.stats.timeouts;
})(), 1);
check("no timeout before deadline", (() => {
  const s = new SlidingWindowSender(10);
  s.cwnd = 10;
  s.enqueue(new Packet(0, 0, {}, "a"));
  s.sendNext(0);
  return s.checkTimeouts(NET_CONSTANTS.TIMEOUT_MS - 1).length;
})(), 0);
check("enqueue non-packet throws", raises(() => new SlidingWindowSender(10).enqueue("bad")), true);
check("invalid window size throws", raises(() => new SlidingWindowSender(0)), true);

console.log("\n=== SLIDING WINDOW RECEIVER TESTS ===");
check("receiver in-order delivery", (() => {
  const r = new SlidingWindowReceiver(0);
  const result = r.receive(new Packet(0, 0, {}, "hello"));
  return result.delivered;
})(), true);
check("receiver returns correct ack", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(0, 0, {}, "a"));
  return r.lastAckSent;
})(), 1);
check("receiver buffers out-of-order", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(1, 0, {}, "b"));
  return r.received.size;
})(), 1);
check("receiver delivers buffered on gap fill", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(1, 0, {}, "b"));
  r.receive(new Packet(0, 0, {}, "a"));
  return r.getDeliveredData();
})(), "ab");
check("receiver handles multiple gaps", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(2, 0, {}, "c"));
  r.receive(new Packet(0, 0, {}, "a"));
  r.receive(new Packet(1, 0, {}, "b"));
  return r.getDeliveredData();
})(), "abc");
check("receiver dup returns false delivered", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(0, 0, {}, "a"));
  return r.receive(new Packet(0, 0, {}, "a")).delivered;
})(), false);
check("receiver dup still sends ack", (() => {
  const r = new SlidingWindowReceiver(0);
  r.receive(new Packet(0, 0, {}, "a"));
  return r.receive(new Packet(0, 0, {}, "a")).ack;
})(), 1);
check("receiver empty delivered initially", new SlidingWindowReceiver(0).getDeliveredData(), "");
check("receiver invalid start throws", raises(() => new SlidingWindowReceiver(-1)), true);
check("receiver non-packet throws", raises(() => new SlidingWindowReceiver(0).receive("bad")), true);

console.log("\n=== CONNECTION STATE MACHINE TESTS ===");
check("client initial state closed", new ConnectionStateMachine("client").getStateName(), "CLOSED");
check("server initial state closed", new ConnectionStateMachine("server").getStateName(), "CLOSED");
check("client connect transitions", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  return c.getStateName();
})(), "SYN_SENT");
check("client connect queues syn", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  return c.sendQueue[0].flags.syn;
})(), true);
check("server recv syn transitions", (() => {
  const s = new ConnectionStateMachine("server");
  s.transition("RECV_SYN");
  return s.getStateName();
})(), "ESTABLISHED");
check("server recv syn queues syn-ack", (() => {
  const s = new ConnectionStateMachine("server");
  s.transition("RECV_SYN");
  const pkt = s.sendQueue[0];
  return pkt.flags.syn && pkt.flags.ack;
})(), true);
check("client recv syn-ack establishes", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  c.transition("RECV_SYN_ACK");
  return c.getStateName();
})(), "ESTABLISHED");
check("client timeout from syn-sent closes", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  c.transition("TIMEOUT");
  return c.getStateName();
})(), "CLOSED");
check("established app close enters fin-wait", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  c.transition("RECV_SYN_ACK");
  c.transition("APP_CLOSE");
  return c.getStateName();
})(), "FIN_WAIT");
check("fin-wait recv fin-ack closes", (() => {
  const c = new ConnectionStateMachine("client");
  c.transition("APP_CONNECT");
  c.transition("RECV_SYN_ACK");
  c.transition("APP_CLOSE");
  c.transition("RECV_FIN_ACK");
  return c.getStateName();
})(), "CLOSED");
check("established recv fin closes server", (() => {
  const s = new ConnectionStateMachine("server");
  s.transition("RECV_SYN");
  s.transition("RECV_FIN");
  return s.getStateName();
})(), "CLOSED");
check("invalid role throws", raises(() => new ConnectionStateMachine("router")), true);
check("noop transition returns false", (() => {
  const c = new ConnectionStateMachine("client");
  return c.transition("RECV_SYN_ACK");
})(), false);
check("state change returns true", (() => {
  const c = new ConnectionStateMachine("client");
  return c.transition("APP_CONNECT");
})(), true);

console.log("\n=== NETWORK SIMULATOR TESTS ===");
check("simulator init time zero", new NetworkSimulator().currentTime, 0);
check("simulator schedule adds event", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(100, "TEST", { x: 1 });
  return sim.pendingEvents.length;
})(), 1);
check("simulator tick advances time", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(50, "A", null);
  sim.tick();
  return sim.currentTime;
})(), 50);
check("simulator tick returns event", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(10, "B", { val: 42 });
  return sim.tick()?.data.val;
})(), 42);
check("simulator tick empty returns null", new NetworkSimulator().tick(), null);
check("simulator events sorted by time", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(30, "C", null);
  sim.schedule(10, "A", null);
  sim.schedule(20, "B", null);
  const e1 = sim.tick();
  const e2 = sim.tick();
  return [e1.type, e2.type];
})(), ["A", "B"]);
check("simulator logs events", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(5, "LOG", null);
  sim.tick();
  return sim.eventLog.length;
})(), 1);
check("simulator loss rate zero never drops", (() => {
  const sim = new NetworkSimulator({ lossRate: 0 });
  let dropped = false;
  for (let i = 0; i < 100; i++) if (sim.shouldDrop()) dropped = true;
  return dropped;
})(), false);
check("simulator loss rate one always drops", (() => {
  const sim = new NetworkSimulator({ lossRate: 1 });
  let passed = false;
  for (let i = 0; i < 100; i++) if (!sim.shouldDrop()) passed = true;
  return passed;
})(), false);
check("simulator get stats", (() => {
  const sim = new NetworkSimulator();
  sim.schedule(10, "X", null);
  sim.tick();
  return sim.getStats().eventsProcessed;
})(), 1);
check("simulator transmit respects loss", (() => {
  const sim = new NetworkSimulator({ lossRate: 1 });
  const sender = new SlidingWindowSender(10);
  sender.cwnd = 10;
  sender.enqueue(new Packet(0, 0, {}, "lost"));
  return sim.transmit(sender, null, 0).length;
})(), 0);
check("simulator transmit delivers without loss", (() => {
  const sim = new NetworkSimulator({ lossRate: 0, delayMs: 5 });
  const sender = new SlidingWindowSender(10);
  sender.cwnd = 10;
  sender.enqueue(new Packet(0, 0, {}, "ok"));
  const pkts = sim.transmit(sender, null, 0);
  return pkts.length === 1 && sim.pendingEvents.length === 1;
})(), true);

console.log("\n=== INTEGRATION: FULL DATA TRANSFER ===");
check("full transfer no loss", (() => {
  const sender = new SlidingWindowSender(8);
  const receiver = new SlidingWindowReceiver(0);
  sender.cwnd = 8;
  
  const message = "The quick brown fox jumps over the lazy dog!";
  const frags = Fragmenter.fragment(message, 10);
  for (const f of frags) sender.enqueue(new Packet(0, 0, {}, f));
  
  let time = 0;
  for (let round = 0; round < 50; round++) {
    while (sender.canSend()) {
      const pkt = sender.sendNext(time);
      if (pkt) {
        const result = receiver.receive(pkt);
        sender.processAck(result.ack, time + 1);
      }
    }
    time += 10;
  }
  return receiver.getDeliveredData();
})(), "The quick brown fox jumps over the lazy dog!");

check("full transfer with reordering", (() => {
  const sender = new SlidingWindowSender(4);
  const receiver = new SlidingWindowReceiver(0);
  sender.cwnd = 4;
  
  for (let i = 0; i < 5; i++) sender.enqueue(new Packet(0, 0, {}, String(i)));
  
  // Send all, but deliver out of order
  const sent = [];
  while (sender.canSend()) sent.push(sender.sendNext(0));
  
  // Deliver: 0, 2, 1, 3, 4
  const order = [0, 2, 1, 3, 4];
  for (const idx of order) {
    if (sent[idx]) {
      const res = receiver.receive(sent[idx]);
      sender.processAck(res.ack, 10);
    }
  }
  return receiver.getDeliveredData();
})(), "01234");

check("state machine full handshake", (() => {
  const client = new ConnectionStateMachine("client");
  const server = new ConnectionStateMachine("server");
  
  client.transition("APP_CONNECT");
  const syn = client.sendQueue.shift();
  
  server.transition("RECV_SYN");
  const synAck = server.sendQueue.shift();
  
  client.transition("RECV_SYN_ACK");
  const ack = client.sendQueue.shift();
  
  return client.getStateName() === "ESTABLISHED" && 
         server.getStateName() === "ESTABLISHED" &&
         syn.flags.syn && synAck.flags.syn && synAck.flags.ack && ack.flags.ack;
})(), true);

console.log("\n=== STRESS / PROPERTY TESTS ===");
let seed = 2024;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}

// Property: Fragment + Reassemble is identity
let fragRoundtripOk = true;
for (let i = 0; i < 200; i++) {
  const len = nextRandom(100);
  const str = Array.from({ length: len }, () => String.fromCharCode(65 + nextRandom(26))).join("");
  const chunkSize = 1 + nextRandom(20);
  const reconstructed = Fragmenter.reassemble(Fragmenter.fragment(str, chunkSize));
  if (reconstructed !== str) { fragRoundtripOk = false; break; }
}
check("200 fragment roundtrips", fragRoundtripOk, true);

// Property: Receiver always delivers in order
let receiverOrderOk = true;
for (let i = 0; i < 200; i++) {
  const count = 1 + nextRandom(20);
  const r = new SlidingWindowReceiver(0);
  const indices = Array.from({ length: count }, (_, j) => j);
  // Shuffle
  for (let j = indices.length - 1; j > 0; j--) {
    const k = nextRandom(j + 1);
    [indices[j], indices[k]] = [indices[k], indices[j]];
  }
  for (const idx of indices) {
    r.receive(new Packet(idx, 0, {}, String(idx)));
  }
  const delivered = r.getDeliveredData();
  const expected = Array.from({ length: count }, (_, j) => String(j)).join("");
  if (delivered !== expected) { receiverOrderOk = false; break; }
}
check("200 shuffled receiver orders", receiverOrderOk, true);

// Property: Sender cwnd never exceeds reasonable bounds
let cwndBoundsOk = true;
for (let i = 0; i < 200; i++) {
  const winSize = 1 + nextRandom(32);
  const s = new SlidingWindowSender(winSize);
  s.cwnd = 1 + nextRandom(64);
  s.ssthresh = 1 + nextRandom(64);
  const eff = s.getEffectiveWindow();
  if (eff > winSize || eff < 1) { cwndBoundsOk = false; break; }
}
check("200 cwnd within bounds", cwndBoundsOk, true);

// Property: State machine never enters invalid state
let stateValidityOk = true;
const validStates = Object.values(NET_CONSTANTS.STATES);
const events = ["APP_CONNECT", "RECV_SYN", "RECV_SYN_ACK", "TIMEOUT", "APP_CLOSE", "RECV_FIN", "RECV_FIN_ACK"];
for (let i = 0; i < 300; i++) {
  const role = nextRandom(2) === 0 ? "client" : "server";
  const sm = new ConnectionStateMachine(role);
  const numTransitions = 1 + nextRandom(10);
  for (let t = 0; t < numTransitions; t++) {
    sm.transition(events[nextRandom(events.length)]);
    if (!validStates.includes(sm.state)) { stateValidityOk = false; break; }
  }
  if (!stateValidityOk) break;
}
check("300 state machine validity", stateValidityOk, true);

// Property: Simulator event ordering is monotonic
let simOrderOk = true;
for (let i = 0; i < 100; i++) {
  const sim = new NetworkSimulator();
  const numEvents = 1 + nextRandom(20);
  for (let e = 0; e < numEvents; e++) {
    sim.schedule(nextRandom(1000), "E" + e, null);
  }
  let lastTime = -1;
  let evt;
  while ((evt = sim.tick()) !== null) {
    if (evt.time < lastTime) { simOrderOk = false; break; }
    lastTime = evt.time;
  }
  if (!simOrderOk) break;
}
check("100 simulator time monotonic", simOrderOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
