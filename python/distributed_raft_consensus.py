import time
import random
import threading
from collections import defaultdict
from typing import List, Dict, Any, Tuple

# --- Distributed Network Simulator ---
class Message:
    def __init__(self, sender, receiver, msg_type, term, data):
        self.sender = sender
        self.receiver = receiver
        self.type = msg_type
        self.term = term
        self.data = data
        self.timestamp = time.time()

class Network:
    def __init__(self):
        self.nodes = {}
        self.latency = (0.01, 0.05)
        self.drop_rate = 0.05
        self.lock = threading.Lock()

    def register(self, node):
        with self.lock:
            self.nodes[node.id] = node

    def send(self, msg: Message):
        if random.random() < self.drop_rate:
            return # Simulate packet loss
        
        delay = random.uniform(*self.latency)
        
        def deliver():
            time.sleep(delay)
            with self.lock:
                if msg.receiver in self.nodes:
                    self.nodes[msg.receiver].receive(msg)
                    
        threading.Thread(target=deliver, daemon=True).start()

# --- Raft Node Implementation ---
class RaftNode:
    FOLLOWER, CANDIDATE, LEADER = 0, 1, 2

    def __init__(self, node_id: int, peer_ids: List[int], network: Network):
        self.id = node_id
        self.peers = peer_ids
        self.network = network
        self.network.register(self)
        
        # Persistent state
        self.current_term = 0
        self.voted_for = None
        self.log = [] # List of dicts: {'term': int, 'command': Any}
        
        # Volatile state
        self.commit_index = 0
        self.last_applied = 0
        self.state = self.FOLLOWER
        
        # Leader volatile state
        self.next_index = {p: 1 for p in peers}
        self.match_index = {p: 0 for p in peers}
        
        # Timers and concurrency
        self.lock = threading.Lock()
        self.election_timeout = random.uniform(1.5, 3.0)
        self.last_heartbeat = time.time()
        self.votes_received = 0
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self):
        while self.running:
            with self.lock:
                current_state = self.state
                
            if current_state == self.FOLLOWER:
                self._run_follower()
            elif current_state == self.CANDIDATE:
                self._run_candidate()
            elif current_state == self.LEADER:
                self._run_leader()
            
            time.sleep(0.01)

    def _run_follower(self):
        with self.lock:
            time_since_heartbeat = time.time() - self.last_heartbeat
            if time_since_heartbeat > self.election_timeout:
                self.state = self.CANDIDATE
                self.current_term += 1
                self.voted_for = self.id
                self.votes_received = 1
                self.last_heartbeat = time.time()
                self.election_timeout = random.uniform(1.5, 3.0)
                print(f"Node {self.id} transitioning to CANDIDATE for term {self.current_term}")
                self._request_votes()

    def _run_candidate(self):
        with self.lock:
            if self.votes_received > (len(self.peers) + 1) // 2:
                print(f"Node {self.id} elected LEADER for term {self.current_term}")
                self.state = self.LEADER
                self.next_index = {p: len(self.log) + 1 for p in self.peers}
                self.match_index = {p: 0 for p in self.peers}
                self._send_heartbeats()
                return

            time_since_heartbeat = time.time() - self.last_heartbeat
            if time_since_heartbeat > self.election_timeout:
                # Election failed, restart
                self.current_term += 1
                self.voted_for = self.id
                self.votes_received = 1
                self.last_heartbeat = time.time()
                self.election_timeout = random.uniform(1.5, 3.0)
                self._request_votes()

    def _run_leader(self):
        self._send_heartbeats()
        time.sleep(0.5) # Heartbeat interval

    def _request_votes(self):
        last_log_index = len(self.log)
        last_log_term = self.log[-1]['term'] if self.log else 0
        
        data = {
            'last_log_index': last_log_index,
            'last_log_term': last_log_term
        }
        
        for peer in self.peers:
            msg = Message(self.id, peer, "RequestVote", self.current_term, data)
            self.network.send(msg)

    def _send_heartbeats(self):
        with self.lock:
            for peer in self.peers:
                prev_log_index = self.next_index[peer] - 1
                prev_log_term = self.log[prev_log_index - 1]['term'] if prev_log_index > 0 else 0
                entries = self.log[prev_log_index:]
                
                data = {
                    'prev_log_index': prev_log_index,
                    'prev_log_term': prev_log_term,
                    'entries': entries,
                    'leader_commit': self.commit_index
                }
                msg = Message(self.id, peer, "AppendEntries", self.current_term, data)
                self.network.send(msg)

    def receive(self, msg: Message):
        with self.lock:
            if msg.term > self.current_term:
                self.current_term = msg.term
                self.state = self.FOLLOWER
                self.voted_for = None
                
            if msg.type == "RequestVote":
                self._handle_request_vote(msg)
            elif msg.type == "RequestVoteReply":
                self._handle_request_vote_reply(msg)
            elif msg.type == "AppendEntries":
                self._handle_append_entries(msg)
            elif msg.type == "AppendEntriesReply":
                self._handle_append_entries_reply(msg)

    def _handle_request_vote(self, msg: Message):
        reply_data = {'vote_granted': False}
        
        if msg.term < self.current_term:
            reply_data['vote_granted'] = False
        else:
            last_log_index = len(self.log)
            last_log_term = self.log[-1]['term'] if self.log else 0
            
            log_ok = (msg.data['last_log_term'] > last_log_term) or \
                     (msg.data['last_log_term'] == last_log_term and msg.data['last_log_index'] >= last_log_index)
                     
            if (self.voted_for is None or self.voted_for == msg.sender) and log_ok:
                reply_data['vote_granted'] = True
                self.voted_for = msg.sender
                self.last_heartbeat = time.time()
                
        reply = Message(self.id, msg.sender, "RequestVoteReply", self.current_term, reply_data)
        self.network.send(reply)

    def _handle_request_vote_reply(self, msg: Message):
        if self.state == self.CANDIDATE and msg.term == self.current_term:
            if msg.data['vote_granted']:
                self.votes_received += 1

    def _handle_append_entries(self, msg: Message):
        reply_data = {'success': False, 'match_index': 0}
        
        if msg.term < self.current_term:
            reply_data['success'] = False
        else:
            self.state = self.FOLLOWER
            self.last_heartbeat = time.time()
            
            prev_log_index = msg.data['prev_log_index']
            
            if prev_log_index == 0 or (prev_log_index <= len(self.log) and self.log[prev_log_index - 1]['term'] == msg.data['prev_log_term']):
                reply_data['success'] = True
                
                # Delete conflicting entries
                new_entries = msg.data['entries']
                for i, entry in enumerate(new_entries):
                    idx = prev_log_index + i
                    if idx < len(self.log):
                        if self.log[idx]['term'] != entry['term']:
                            self.log = self.log[:idx]
                            self.log.append(entry)
                    else:
                        self.log.append(entry)
                        
                reply_data['match_index'] = len(self.log)
                
                if msg.data['leader_commit'] > self.commit_index:
                    self.commit_index = min(msg.data['leader_commit'], len(self.log))
                    
        reply = Message(self.id, msg.sender, "AppendEntriesReply", self.current_term, reply_data)
        self.network.send(reply)

    def _handle_append_entries_reply(self, msg: Message):
        if self.state == self.LEADER and msg.term == self.current_term:
            if msg.data['success']:
                self.match_index[msg.sender] = max(self.match_index[msg.sender], msg.data['match_index'])
                self.next_index[msg.sender] = self.match_index[msg.sender] + 1
                
                # Update commit index
                for i in range(len(self.log), self.commit_index, -1):
                    if self.log[i-1]['term'] == self.current_term:
                        matches = sum(1 for p in self.peers if self.match_index[p] >= i)
                        if matches + 1 > (len(self.peers) + 1) // 2:
                            self.commit_index = i
                            print(f"Leader {self.id} committed index {self.commit_index}")
                            break
            else:
                self.next_index[msg.sender] = max(1, self.next_index[msg.sender] - 1)

    def submit(self, command):
        with self.lock:
            if self.state == self.LEADER:
                self.log.append({'term': self.current_term, 'command': command})
                return True
            return False

if __name__ == "__main__":
    print("--- RAFT CONSENSUS SIMULATION ---")
    net = Network()
    nodes = []
    node_ids = [1, 2, 3, 4, 5]
    
    for i in node_ids:
        peers = [p for p in node_ids if p != i]
        nodes.append(RaftNode(i, peers, net))
        
    print("Nodes initialized. Waiting for leader election...")
    time.sleep(5)
    
    leader = next((n for n in nodes if n.state == RaftNode.LEADER), None)
    if leader:
        print(f"\nSubmitting command 'SET x=10' to Leader {leader.id}")
        leader.submit("SET x=10")
        time.sleep(2)
        
        print("\nVerifying logs across network:")
        for n in nodes:
            print(f"Node {n.id} State: {n.state}, Commit Index: {n.commit_index}, Log: {n.log}")
    
    for n in nodes:
        n.running = False
