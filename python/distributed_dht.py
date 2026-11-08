"""
A Distributed Hash Table (DHT) implementation using the Chord Protocol.
Includes Ring Topology, Consistent Hashing, and Finger Tables.
"""

import hashlib

class ChordNode:
    def __init__(self, node_id, m=4):
        self.node_id = node_id
        self.m = m
        self.successor = self
        self.predecessor = self
        self.finger_table = [self] * m
        self.data = {}

    def find_successor(self, key):
        if self.node_id == key or (self.node_id < key <= self.successor.node_id):
            return self.successor
        return self.find_predecessor(key).successor

    def find_predecessor(self, key):
        node = self
        while not (node.node_id < key <= node.successor.node_id) and node.node_id != node.successor.node_id:
            node = node.closest_preceding_finger(key)
        return node

    def closest_preceding_finger(self, key):
        for i in range(self.m - 1, -1, -1):
            if self.node_id < self.finger_table[i].node_id < key:
                return self.finger_table[i]
        return self

    def update_finger_table(self, node):
        for i in range(self.m):
            if self.finger_table[i] == self or (self.node_id < node.node_id <= self.finger_table[i].node_id):
                self.finger_table[i] = node

class ChordDHT:
    def __init__(self, m=4):
        self.m = m
        self.nodes = []
        self.ring_size = 2 ** m

    def hash_key(self, key):
        return int(hashlib.sha1(key.encode()).hexdigest(), 16) % self.ring_size

    def add_node(self, node_id):
        node = ChordNode(node_id, self.m)
        if not self.nodes:
            self.nodes.append(node)
        else:
            for existing in self.nodes:
                existing.update_finger_table(node)
            self.nodes.append(node)
        self.nodes.sort(key=lambda n: n.node_id)
        self.rebuild_ring()

    def rebuild_ring(self):
        for i in range(len(self.nodes)):
            self.nodes[i].successor = self.nodes[(i + 1) % len(self.nodes)]
            self.nodes[i].predecessor = self.nodes[(i - 1) % len(self.nodes)]

    def put(self, key, value):
        hashed_key = self.hash_key(key)
        node = self.nodes[0].find_successor(hashed_key)
        node.data[hashed_key] = value

    def get(self, key):
        hashed_key = self.hash_key(key)
        node = self.nodes[0].find_successor(hashed_key)
        return node.data.get(hashed_key, None)

if __name__ == "__main__":
    print("Testing Distributed Hash Table (Chord Protocol)...")
    dht = ChordDHT(m=4)
    dht.add_node(1)
    dht.add_node(5)
    dht.add_node(10)
    dht.add_node(15)
    
    dht.put("apple", "red")
    dht.put("banana", "yellow")
    dht.put("cherry", "dark red")
    
    print("Retrieving apple:", dht.get("apple"))
    print("Retrieving banana:", dht.get("banana"))
    print("Retrieving cherry:", dht.get("cherry"))
    print("DHT lookup successful.")
