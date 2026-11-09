const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class RaftNode {
  constructor(id, peers) {
    this.id = id;
    this.peers = peers || [];
    this.state = "follower";
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.commitIndex = -1;
    this.lastApplied = -1;
    this.votesReceived = new Set();
    this.electionTimeout = 150 + Math.floor(Math.random() * 150);
    this.heartbeatTimer = 0;
  }
  startElection() {
    this.state = "candidate";
    this.currentTerm++;
    this.votedFor = this.id;
    this.votesReceived = new Set([this.id]);
    return { type: "RequestVote", term: this.currentTerm, candidateId: this.id, lastLogIndex: this.log.length - 1, lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0 };
  }
  handleRequestVote(msg) {
    if (msg.term < this.currentTerm) return { term: this.currentTerm, voteGranted: false };
    if (msg.term > this.currentTerm) {
      this.currentTerm = msg.term;
      this.state = "follower";
      this.votedFor = null;
    }
    const myLastTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : 0;
    const myLastIndex = this.log.length - 1;
    const logOk = msg.lastLogTerm > myLastTerm || (msg.lastLogTerm === myLastTerm && msg.lastLogIndex >= myLastIndex);
    if ((this.votedFor === null || this.votedFor === msg.candidateId) && logOk) {
      this.votedFor = msg.candidateId;
      return { term: this.currentTerm, voteGranted: true };
    }
    return { term: this.currentTerm, voteGranted: false };
  }
  handleVoteResponse(msg) {
    if (this.state !== "candidate") return false;
    if (msg.term > this.currentTerm) {
      this.currentTerm = msg.term;
      this.state = "follower";
      return false;
    }
    if (msg.voteGranted && msg.term === this.currentTerm) {
      this.votesReceived.add(msg.from);
      if (this.votesReceived.size > (this.peers.length + 1) / 2) {
        this.state = "leader";
        return true;
      }
    }
    return false;
  }
  appendEntry(command, term) {
    this.log.push({ command, term: term || this.currentTerm });
    return this.log.length - 1;
  }
  handleAppendEntries(msg) {
    if (msg.term < this.currentTerm) return { term: this.currentTerm, success: false };
    this.currentTerm = msg.term;
    this.state = "follower";
    if (msg.prevLogIndex >= 0) {
      if (msg.prevLogIndex >= this.log.length) return { term: this.currentTerm, success: false };
      if (this.log[msg.prevLogIndex].term !== msg.prevLogTerm) {
        this.log.splice(msg.prevLogIndex);
        return { term: this.currentTerm, success: false };
      }
    }
    for (let i = 0; i < msg.entries.length; i++) {
      const idx = msg.prevLogIndex + 1 + i;
      if (idx < this.log.length && this.log[idx].term !== msg.entries[i].term) {
        this.log.splice(idx);
      }
      if (idx >= this.log.length) this.log.push(msg.entries[i]);
    }
    if (msg.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(msg.leaderCommit, this.log.length - 1);
    }
    return { term: this.currentTerm, success: true };
  }
  getState() { return this.state; }
  getLogLength() { return this.log.length; }
}

check("raft initial state follower", new RaftNode("n1").getState(), "follower");
check("raft election starts candidate", (() => {
  const n = new RaftNode("n1", ["n2", "n3"]);
  n.startElection();
  return n.getState();
})(), "candidate");
check("raft wins election with majority", (() => {
  const n = new RaftNode("n1", ["n2", "n3"]);
  n.startElection();
  n.handleVoteResponse({ from: "n2", term: n.currentTerm, voteGranted: true });
  return n.getState();
})(), "leader");
check("raft vote granted logic", (() => {
  const n = new RaftNode("n1");
  const resp = n.handleRequestVote({ term: 1, candidateId: "n2", lastLogIndex: -1, lastLogTerm: 0 });
  return resp.voteGranted;
})(), true);
check("raft rejects old term vote", (() => {
  const n = new RaftNode("n1");
  n.currentTerm = 5;
  const resp = n.handleRequestVote({ term: 3, candidateId: "n2", lastLogIndex: -1, lastLogTerm: 0 });
  return resp.voteGranted;
})(), false);
check("raft append entries success", (() => {
  const n = new RaftNode("n1");
  const resp = n.handleAppendEntries({ term: 1, prevLogIndex: -1, prevLogTerm: 0, entries: [{ command: "set x=1", term: 1 }], leaderCommit: 0 });
  return resp.success && n.getLogLength() === 1;
})(), true);
check("raft append entries rejects old term", (() => {
  const n = new RaftNode("n1");
  n.currentTerm = 5;
  const resp = n.handleAppendEntries({ term: 3, prevLogIndex: -1, prevLogTerm: 0, entries: [], leaderCommit: 0 });
  return resp.success;
})(), false);
check("raft steps down on higher term", (() => {
  const n = new RaftNode("n1", ["n2", "n3"]);
  n.startElection();
  n.handleVoteResponse({ from: "n2", term: n.currentTerm + 1, voteGranted: false });
  return n.getState();
})(), "follower");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
