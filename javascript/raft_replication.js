const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class LogEntry {
  constructor(term, index, command) {
    this.term = term;
    this.index = index;
    this.command = command;
  }
}

class RaftLog {
  constructor() {
    this.entries = [];
    this.commitIndex = -1;
    this.lastApplied = -1;
  }
  append(term, command) {
    const index = this.entries.length;
    this.entries.push(new LogEntry(term, index, command));
    return index;
  }
  get(index) {
    if (index < 0 || index >= this.entries.length) return null;
    return this.entries[index];
  }
  lastTerm() {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1].term : 0;
  }
  lastIndex() { return this.entries.length - 1; }
  truncate(fromIndex) {
    this.entries.splice(fromIndex);
    if (this.commitIndex >= fromIndex) this.commitIndex = fromIndex - 1;
  }
  appendEntries(prevLogIndex, prevLogTerm, newEntries) {
    if (prevLogIndex >= 0) {
      const existing = this.entries[prevLogIndex];
      if (!existing || existing.term !== prevLogTerm) return false;
    }
    const insertAt = prevLogIndex + 1;
    for (let i = 0; i < newEntries.length; i++) {
      const idx = insertAt + i;
      if (idx < this.entries.length) {
        if (this.entries[idx].term !== newEntries[i].term) {
          this.truncate(idx);
          break;
        }
      }
    }
    for (let i = 0; i < newEntries.length; i++) {
      const idx = insertAt + i;
      if (idx >= this.entries.length) {
        this.entries.push(newEntries[i]);
      }
    }
    return true;
  }
  getCommittedEntries() {
    const committed = [];
    for (let i = this.lastApplied + 1; i <= this.commitIndex; i++) {
      committed.push(this.entries[i]);
    }
    this.lastApplied = this.commitIndex;
    return committed;
  }
  length() { return this.entries.length; }
}

class RaftReplica {
  constructor(id, clusterSize) {
    this.id = id;
    this.clusterSize = clusterSize;
    this.state = "follower";
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = new RaftLog();
    this.nextIndex = new Map();
    this.matchIndex = new Map();
    this.votesReceived = new Set();
    this.leaderId = null;
    this.appliedCommands = [];
  }
  startElection() {
    this.state = "candidate";
    this.currentTerm++;
    this.votedFor = this.id;
    this.votesReceived = new Set([this.id]);
    return { type: "RequestVote", term: this.currentTerm, candidateId: this.id, lastLogIndex: this.log.lastIndex(), lastLogTerm: this.log.lastTerm() };
  }
  handleRequestVote(msg) {
    if (msg.term < this.currentTerm) return { term: this.currentTerm, voteGranted: false };
    if (msg.term > this.currentTerm) {
      this.currentTerm = msg.term;
      this.state = "follower";
      this.votedFor = null;
      this.leaderId = null;
    }
    const myLastTerm = this.log.lastTerm();
    const myLastIndex = this.log.lastIndex();
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
      if (this.votesReceived.size > Math.floor(this.clusterSize / 2)) {
        this.becomeLeader();
        return true;
      }
    }
    return false;
  }
  becomeLeader() {
    this.state = "leader";
    this.leaderId = this.id;
    for (let i = 0; i < this.clusterSize; i++) {
      if (i !== this.id) {
        this.nextIndex.set(i, this.log.length());
        this.matchIndex.set(i, -1);
      }
    }
  }
  clientRequest(command) {
    if (this.state !== "leader") return false;
    this.log.append(this.currentTerm, command);
    return true;
  }
  buildAppendEntries(peerId) {
    const next = this.nextIndex.get(peerId) || 0;
    const prevLogIndex = next - 1;
    const prevLogTerm = prevLogIndex >= 0 ? this.log.get(prevLogIndex).term : 0;
    const entries = [];
    for (let i = next; i < this.log.length(); i++) entries.push(this.log.entries[i]);
    return { type: "AppendEntries", term: this.currentTerm, leaderId: this.id, prevLogIndex, prevLogTerm, entries, leaderCommit: this.log.commitIndex };
  }
  handleAppendEntries(msg) {
    if (msg.term < this.currentTerm) return { term: this.currentTerm, success: false, matchIndex: -1 };
    if (msg.term > this.currentTerm || this.state === "candidate") {
      this.currentTerm = msg.term;
      this.state = "follower";
      this.votedFor = null;
    }
    this.leaderId = msg.leaderId;
    const success = this.log.appendEntries(msg.prevLogIndex, msg.prevLogTerm, msg.entries);
    if (success && msg.leaderCommit > this.log.commitIndex) {
      this.log.commitIndex = Math.min(msg.leaderCommit, this.log.lastIndex());
      const applied = this.log.getCommittedEntries();
      for (const e of applied) this.appliedCommands.push(e.command);
    }
    return { term: this.currentTerm, success, matchIndex: this.log.lastIndex() };
  }
  handleAppendEntriesResponse(msg, peerId) {
    if (this.state !== "leader") return;
    if (msg.term > this.currentTerm) {
      this.currentTerm = msg.term;
      this.state = "follower";
      return;
    }
    if (msg.success) {
      this.matchIndex.set(peerId, msg.matchIndex);
      this.nextIndex.set(peerId, msg.matchIndex + 1);
      this._updateCommitIndex();
    } else {
      const currentNext = this.nextIndex.get(peerId) || 1;
      this.nextIndex.set(peerId, Math.max(0, currentNext - 1));
    }
  }
  _updateCommitIndex() {
    for (let n = this.log.lastIndex(); n > this.log.commitIndex; n--) {
      if (this.log.entries[n].term !== this.currentTerm) continue;
      let count = 1;
      for (const [, mi] of this.matchIndex) { if (mi >= n) count++; }
      if (count > Math.floor(this.clusterSize / 2)) {
        this.log.commitIndex = n;
        const applied = this.log.getCommittedEntries();
        for (const e of applied) this.appliedCommands.push(e.command);
        break;
      }
    }
  }
  getState() { return this.state; }
  getAppliedCommands() { return [...this.appliedCommands]; }
}

function createCluster(size) {
  const nodes = [];
  for (let i = 0; i < size; i++) nodes.push(new RaftReplica(i, size));
  return nodes;
}

function electLeader(nodes) {
  const candidate = nodes[0];
  const req = candidate.startElection();
  for (let i = 1; i < nodes.length; i++) {
    const resp = nodes[i].handleRequestVote({ ...req, from: candidate.id });
    candidate.handleVoteResponse({ ...resp, from: i });
  }
  return candidate.getState() === "leader";
}

function replicateToAll(nodes, command) {
  const leader = nodes.find(n => n.getState() === "leader");
  if (!leader) return false;
  leader.clientRequest(command);
  for (let i = 0; i < nodes.length; i++) {
    if (i === leader.id) continue;
    const ae = leader.buildAppendEntries(i);
    const resp = nodes[i].handleAppendEntries(ae);
    leader.handleAppendEntriesResponse({ ...resp, from: i }, i);
  }
  for (let i = 0; i < nodes.length; i++) {
    if (i === leader.id) continue;
    const ae = leader.buildAppendEntries(i);
    nodes[i].handleAppendEntries(ae);
  }
  return true;
}

check("raft log append and get", (() => {
  const log = new RaftLog();
  log.append(1, "set x=1");
  return log.get(0).command;
})(), "set x=1");
check("raft log last term", (() => {
  const log = new RaftLog();
  log.append(1, "a"); log.append(2, "b");
  return log.lastTerm();
})(), 2);
check("raft log truncate", (() => {
  const log = new RaftLog();
  log.append(1, "a"); log.append(1, "b"); log.append(1, "c");
  log.truncate(1);
  return log.length();
})(), 1);
check("raft log append entries success", (() => {
  const log = new RaftLog();
  log.append(1, "a");
  const ok = log.appendEntries(0, 1, [new LogEntry(1, 1, "b")]);
  return ok && log.length() === 2;
})(), true);
check("raft log append entries conflict", (() => {
  const log = new RaftLog();
  log.append(1, "a");
  const ok = log.appendEntries(0, 2, [new LogEntry(2, 1, "b")]);
  return ok;
})(), false);
check("raft election wins majority", (() => {
  const nodes = createCluster(3);
  return electLeader(nodes);
})(), true);
check("raft replication commits", (() => {
  const nodes = createCluster(3);
  electLeader(nodes);
  replicateToAll(nodes, "set x=42");
  const leader = nodes.find(n => n.getState() === "leader");
  return leader.getAppliedCommands().includes("set x=42");
})(), true);
check("raft follower applies committed", (() => {
  const nodes = createCluster(3);
  electLeader(nodes);
  replicateToAll(nodes, "cmd1");
  const follower = nodes.find(n => n.getState() === "follower");
  return follower.getAppliedCommands().includes("cmd1");
})(), true);
check("raft rejects old term ae", (() => {
  const node = new RaftReplica(0, 3);
  node.currentTerm = 5;
  const resp = node.handleAppendEntries({ term: 3, leaderId: 1, prevLogIndex: -1, prevLogTerm: 0, entries: [], leaderCommit: 0 });
  return resp.success;
})(), false);
check("raft multiple commands replicated", (() => {
  const nodes = createCluster(5);
  electLeader(nodes);
  replicateToAll(nodes, "c1");
  replicateToAll(nodes, "c2");
  replicateToAll(nodes, "c3");
  const leader = nodes.find(n => n.getState() === "leader");
  return leader.getAppliedCommands().length;
})(), 3);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
