const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

const TCP_STATES = { CLOSED: 0, LISTEN: 1, SYN_SENT: 2, SYN_RECEIVED: 3, ESTABLISHED: 4, FIN_WAIT_1: 5, FIN_WAIT_2: 6, CLOSE_WAIT: 7, CLOSING: 8, LAST_ACK: 9, TIME_WAIT: 10 };
const STATE_NAMES = Object.keys(TCP_STATES);

class TCPSegment {
  constructor(seq, ack, flags, data) {
    this.seq = seq;
    this.ack = ack;
    this.flags = flags || {};
    this.data = data || "";
  }
}

class TCPConnection {
  constructor(role) {
    this.role = role;
    this.state = TCP_STATES.CLOSED;
    this.sendSeq = 0;
    this.recvSeq = 0;
    this.sendBuffer = "";
    this.recvBuffer = "";
    this.delivered = "";
    this.outQueue = [];
    this.timers = { retransmit: 0, timeWait: 0 };
    this.stats = { segmentsSent: 0, segmentsRecv: 0, retransmits: 0, resets: 0 };
  }
  open() {
    if (this.state !== TCP_STATES.CLOSED) throw new Error("already open");
    if (this.role === "active") {
      this.state = TCP_STATES.SYN_SENT;
      this.outQueue.push(new TCPSegment(this.sendSeq, 0, { syn: true }));
      this.sendSeq++;
    } else {
      this.state = TCP_STATES.LISTEN;
    }
  }
  receiveSegment(seg) {
    this.stats.segmentsRecv++;
    if (seg.flags.rst) {
      this.state = TCP_STATES.CLOSED;
      this.stats.resets++;
      return;
    }
    switch (this.state) {
      case TCP_STATES.LISTEN:
        if (seg.flags.syn) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.SYN_RECEIVED;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { syn: true, ack: true }));
          this.sendSeq++;
        }
        break;
      case TCP_STATES.SYN_SENT:
        if (seg.flags.syn && seg.flags.ack) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.ESTABLISHED;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
        }
        break;
      case TCP_STATES.SYN_RECEIVED:
        if (seg.flags.ack) {
          this.state = TCP_STATES.ESTABLISHED;
        }
        break;
      case TCP_STATES.ESTABLISHED:
        if (seg.flags.fin) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.CLOSE_WAIT;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
        } else if (seg.data.length > 0) {
          if (seg.seq === this.recvSeq) {
            this.delivered += seg.data;
            this.recvSeq += seg.data.length;
            this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
          }
        }
        break;
      case TCP_STATES.FIN_WAIT_1:
        if (seg.flags.fin && seg.flags.ack) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.TIME_WAIT;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
          this.timers.timeWait = 2;
        } else if (seg.flags.ack) {
          this.state = TCP_STATES.FIN_WAIT_2;
        } else if (seg.flags.fin) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.CLOSING;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
        }
        break;
      case TCP_STATES.FIN_WAIT_2:
        if (seg.flags.fin) {
          this.recvSeq = seg.seq + 1;
          this.state = TCP_STATES.TIME_WAIT;
          this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }));
          this.timers.timeWait = 2;
        }
        break;
      case TCP_STATES.CLOSE_WAIT:
        break;
      case TCP_STATES.CLOSING:
        if (seg.flags.ack) {
          this.state = TCP_STATES.TIME_WAIT;
          this.timers.timeWait = 2;
        }
        break;
      case TCP_STATES.LAST_ACK:
        if (seg.flags.ack) {
          this.state = TCP_STATES.CLOSED;
        }
        break;
      case TCP_STATES.TIME_WAIT:
        break;
    }
  }
  send(data) {
    if (this.state !== TCP_STATES.ESTABLISHED && this.state !== TCP_STATES.CLOSE_WAIT) throw new Error("cannot send in state " + STATE_NAMES[this.state]);
    this.sendBuffer += data;
    this._flushSendBuffer();
  }
  _flushSendBuffer() {
    while (this.sendBuffer.length > 0) {
      const chunk = this.sendBuffer.slice(0, 536);
      this.sendBuffer = this.sendBuffer.slice(536);
      this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { ack: true }, chunk));
      this.sendSeq += chunk.length;
      this.stats.segmentsSent++;
    }
  }
  close() {
    if (this.state === TCP_STATES.ESTABLISHED) {
      this.state = TCP_STATES.FIN_WAIT_1;
      this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { fin: true, ack: true }));
      this.sendSeq++;
    } else if (this.state === TCP_STATES.CLOSE_WAIT) {
      this.state = TCP_STATES.LAST_ACK;
      this.outQueue.push(new TCPSegment(this.sendSeq, this.recvSeq, { fin: true, ack: true }));
      this.sendSeq++;
    }
  }
  tick() {
    if (this.state === TCP_STATES.TIME_WAIT) {
      this.timers.timeWait--;
      if (this.timers.timeWait <= 0) this.state = TCP_STATES.CLOSED;
    }
  }
  drainOutgoing() {
    const out = [...this.outQueue];
    this.outQueue = [];
    return out;
  }
  getStateName() { return STATE_NAMES[this.state]; }
  getDelivered() { return this.delivered; }
}

function simulateHandshake(client, server) {
  client.open();
  let segs = client.drainOutgoing();
  for (const s of segs) server.receiveSegment(s);
  segs = server.drainOutgoing();
  for (const s of segs) client.receiveSegment(s);
  segs = client.drainOutgoing();
  for (const s of segs) server.receiveSegment(s);
}

function simulateTeardown(initiator, responder) {
  initiator.close();
  let segs = initiator.drainOutgoing();
  for (const s of segs) responder.receiveSegment(s);
  segs = responder.drainOutgoing();
  for (const s of segs) initiator.receiveSegment(s);
  if (initiator.getStateName() === "CLOSING") {
    segs = initiator.drainOutgoing();
    for (const s of segs) responder.receiveSegment(s);
    segs = responder.drainOutgoing();
    for (const s of segs) initiator.receiveSegment(s);
  }
  responder.close();
  segs = responder.drainOutgoing();
  for (const s of segs) initiator.receiveSegment(s);
  segs = initiator.drainOutgoing();
  for (const s of segs) responder.receiveSegment(s);
}

check("tcp three way handshake", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  return c.getStateName() === "ESTABLISHED" && s.getStateName() === "ESTABLISHED";
})(), true);
check("tcp data transfer", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  c.send("hello");
  const segs = c.drainOutgoing();
  for (const seg of segs) s.receiveSegment(seg);
  return s.getDelivered();
})(), "hello");
check("tcp bidirectional data", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  c.send("ping");
  let segs = c.drainOutgoing();
  for (const seg of segs) s.receiveSegment(seg);
  s.send("pong");
  segs = s.drainOutgoing();
  for (const seg of segs) c.receiveSegment(seg);
  return c.getDelivered() === "pong" && s.getDelivered() === "ping";
})(), true);
check("tcp graceful teardown active first", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  simulateTeardown(c, s);
  return c.getStateName() === "TIME_WAIT" || c.getStateName() === "CLOSED";
})(), true);
check("tcp rst closes immediately", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  c.receiveSegment(new TCPSegment(0, 0, { rst: true }));
  return c.getStateName();
})(), "CLOSED");
check("tcp cannot send when closed", (() => {
  const c = new TCPConnection("active");
  return raises(() => c.send("data"));
})(), true);
check("tcp time wait expires", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  simulateTeardown(c, s);
  c.tick(); c.tick(); c.tick();
  return c.getStateName();
})(), "CLOSED");
check("tcp stats tracked", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  c.send("test");
  const segs = c.drainOutgoing();
  for (const seg of segs) s.receiveSegment(seg);
  return s.stats.segmentsRecv > 0;
})(), true);
check("tcp large data chunks", (() => {
  const c = new TCPConnection("active");
  const s = new TCPConnection("passive");
  s.open();
  simulateHandshake(c, s);
  const bigData = "A".repeat(1500);
  c.send(bigData);
  const segs = c.drainOutgoing();
  for (const seg of segs) s.receiveSegment(seg);
  return s.getDelivered().length;
})(), 1500);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
