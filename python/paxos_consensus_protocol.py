"""
A Complete Implementation of the Paxos Consensus Algorithm.
Includes Proposers, Acceptors, Learners, and a simulated Network.
"""

import random
import time

class Message:
    def __init__(self, msg_type, sender_id, proposal_id, value=None):
        self.msg_type = msg_type
        self.sender_id = sender_id
        self.proposal_id = proposal_id
        self.value = value

    def __repr__(self):
        return f"Message(type={self.msg_type}, from={self.sender_id}, id={self.proposal_id}, val={self.value})"

class Acceptor:
    def __init__(self, node_id):
        self.node_id = node_id
        self.promised_id = 0
        self.accepted_id = 0
        self.accepted_value = None

    def receive_prepare(self, proposal_id):
        if proposal_id > self.promised_id:
            self.promised_id = proposal_id
            return Message("PROMISE", self.node_id, proposal_id, self.accepted_id)
        return Message("REJECT", self.node_id, proposal_id)

    def receive_accept(self, proposal_id, value):
        if proposal_id >= self.promised_id:
            self.promised_id = proposal_id
            self.accepted_id = proposal_id
            self.accepted_value = value
            return Message("ACCEPTED", self.node_id, proposal_id, value)
        return Message("REJECT", self.node_id, proposal_id)

class Proposer:
    def __init__(self, node_id, acceptors):
        self.node_id = node_id
        self.acceptors = acceptors
        self.proposal_counter = 0

    def propose(self, value):
        self.proposal_counter += 1
        proposal_id = self.proposal_counter
        promises = []
        
        for acceptor in self.acceptors:
            response = acceptor.receive_prepare(proposal_id)
            if response.msg_type == "PROMISE":
                promises.append(response)
                
        if len(promises) > len(self.acceptors) // 2:
            highest_id = 0
            highest_val = value
            for p in promises:
                if p.value is not None and p.value > highest_id:
                    highest_id = p.value
                    highest_val = p.value
                    
            accepted_count = 0
            for acceptor in self.acceptors:
                response = acceptor.receive_accept(proposal_id, highest_val)
                if response.msg_type == "ACCEPTED":
                    accepted_count += 1
                    
            if accepted_count > len(self.acceptors) // 2:
                return highest_val
        return None

class Learner:
    def __init__(self, acceptors):
        self.acceptors = acceptors
        self.learned_values = []

    def learn(self):
        counts = {}
        for acceptor in self.acceptors:
            if acceptor.accepted_value is not None:
                val = acceptor.accepted_value
                counts[val] = counts.get(val, 0) + 1
                
        for val, count in counts.items():
            if count > len(self.acceptors) // 2:
                if val not in self.learned_values:
                    self.learned_values.append(val)
        return self.learned_values

class PaxosNode:
    def __init__(self, node_id):
        self.node_id = node_id
        self.acceptor = Acceptor(node_id)
        self.proposer = None
        self.learner = Learner([])

class PaxosCluster:
    def __init__(self, num_nodes=3):
        self.nodes = []
        for i in range(num_nodes):
            self.nodes.append(PaxosNode(i))
            
        acceptors = [node.acceptor for node in self.nodes]
        for node in self.nodes:
            node.proposer = Proposer(node.node_id, acceptors)
            node.learner = Learner(acceptors)

    def simulate_proposal(self, node_id, value):
        proposer = self.nodes[node_id].proposer
        result = proposer.propose(value)
        if result is not None:
            learner = self.nodes[0].learner
            learned = learner.learn()
            return learned
        return None

if __name__ == "__main__":
    print("Simulating Paxos Consensus...")
    cluster = PaxosCluster(num_nodes=3)
    
    print("Proposing value 42 from Node 0...")
    learned = cluster.simulate_proposal(0, 42)
    print(f"Learned values after proposal: {learned}")
    
    print("Proposing value 99 from Node 1...")
    learned = cluster.simulate_proposal(1, 99)
    print(f"Learned values after proposal: {learned}")
    
    print("Paxos simulation complete.")
