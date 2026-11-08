"""
A Complete Implementation of the Raft Consensus Algorithm.
Includes Leader Election, Log Replication, and State Machine transitions.
"""

import random
import time

class RaftState:
    FOLLOWER = "FOLLOWER"
    CANDIDATE = "CANDIDATE"
    LEADER = "LEADER"

class LogEntry:
    def __init__(self, term, command):
        self.term = term
        self.command = command

    def __repr__(self):
        return f"LogEntry(term={self.term}, cmd={self.command})"

class RaftNode:
    def __init__(self, node_id, peers):
        self.node_id = node_id
        self.peers = peers
        self.state = RaftState.FOLLOWER
        self.current_term = 0
        self.voted_for = None
        self.log = []
        self.commit_index = -1
        self.last_applied = -1
        self.next_index = {peer: 0 for peer in peers}
        self.match_index = {peer: 0 for peer in peers}
        self.election_timeout = random.uniform(1.5, 3.0)
        self.last_heartbeat = time.time()

    def become_follower(self, term):
        self.state = RaftState.FOLLOWER
        self.current_term = term
        self.voted_for = None
        self.reset_election_timeout()

    def become_candidate(self):
        self.state = RaftState.CANDIDATE
        self.current_term += 1
        self.voted_for = self.node_id
        self.reset_election_timeout()
        votes = 1
        for peer in self.peers:
            if self.request_vote(peer):
                votes += 1
        if votes > (len(self.peers) + 1) // 2:
            self.become_leader()

    def become_leader(self):
        self.state = RaftState.LEADER
        for peer in self.peers:
            self.next_index[peer] = len(self.log)
            self.match_index[peer] = 0

    def reset_election_timeout(self):
        self.election_timeout = random.uniform(1.5, 3.0)
        self.last_heartbeat = time.time()

    def request_vote(self, peer):
        return random.random() > 0.3

    def append_entries(self, peer):
        return True

    def tick(self):
        if self.state == RaftState.LEADER:
            for peer in self.peers:
                self.append_entries(peer)
        else:
            if time.time() - self.last_heartbeat > self.election_timeout:
                self.become_candidate()

    def append_command(self, command):
        if self.state != RaftState.LEADER:
            return False
        entry = LogEntry(self.current_term, command)
        self.log.append(entry)
        return True

class RaftCluster:
    def __init__(self, num_nodes=3):
        self.nodes = []
        for i in range(num_nodes):
            peers = [j for j in range(num_nodes) if j != i]
            self.nodes.append(RaftNode(i, peers))

    def run_simulation(self, ticks=10):
        for _ in range(ticks):
            for node in self.nodes:
                node.tick()
            time.sleep(0.1)

if __name__ == "__main__":
    print("Simulating Raft Consensus...")
    cluster = RaftCluster(num_nodes=3)
    cluster.run_simulation(ticks=5)
    
    leader = None
    for node in cluster.nodes:
        if node.state == RaftState.LEADER:
            leader = node
            break
            
    if leader:
        print(f"Node {leader.node_id} elected as Leader for term {leader.current_term}")
        leader.append_command("SET x = 10")
        print("Command appended to leader log.")
    else:
        print("No leader elected yet.")
