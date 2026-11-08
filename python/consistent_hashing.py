import hashlib
import bisect
from collections import defaultdict

class ConsistentHash:
    def __init__(self, nodes=None, replicas=100):
        self.replicas = replicas
        self.ring = {}
        self.sorted_keys = []
        self.nodes = set()
        if nodes:
            for node in nodes:
                self.add_node(node)

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node):
        if node in self.nodes:
            return
        self.nodes.add(node)
        for i in range(self.replicas):
            key = self._hash(f"{node}:{i}")
            self.ring[key] = node
            bisect.insort(self.sorted_keys, key)

    def remove_node(self, node):
        if node not in self.nodes:
            return
        self.nodes.remove(node)
        for i in range(self.replicas):
            key = self._hash(f"{node}:{i}")
            del self.ring[key]
            idx = bisect.bisect_left(self.sorted_keys, key)
            if idx < len(self.sorted_keys) and self.sorted_keys[idx] == key:
                self.sorted_keys.pop(idx)

    def get_node(self, key):
        if not self.ring:
            return None
        h = self._hash(key)
        idx = bisect.bisect(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

    def get_nodes(self, key, count=3):
        if not self.ring or count <= 0:
            return []
        h = self._hash(key)
        idx = bisect.bisect(self.sorted_keys, h) % len(self.sorted_keys)
        result = []
        seen = set()
        for i in range(len(self.sorted_keys)):
            node = self.ring[self.sorted_keys[(idx + i) % len(self.sorted_keys)]]
            if node not in seen:
                seen.add(node)
                result.append(node)
                if len(result) == count:
                    break
        return result

    def distribution(self, keys):
        counts = defaultdict(int)
        for k in keys:
            counts[self.get_node(k)] += 1
        return dict(counts)

if __name__ == "__main__":
    ch = ConsistentHash(["nodeA", "nodeB", "nodeC", "nodeD"], replicas=150)
    keys = [f"user:{i}" for i in range(10000)]
    dist = ch.distribution(keys)
    print("Initial distribution (4 nodes):")
    for node in sorted(dist):
        print(f"  {node}: {dist[node]} ({dist[node]/100:.1f}%)")
    print()

    # Add a node
    ch.add_node("nodeE")
    dist2 = ch.distribution(keys)
    print("After adding nodeE:")
    for node in sorted(dist2):
        print(f"  {node}: {dist2[node]} ({dist2[node]/100:.1f}%)")
    print()

    # Measure movement
    moved = sum(1 for k in keys if ch.get_node(k) != ConsistentHash(["nodeA","nodeB","nodeC","nodeD"], 150).get_node(k))
    print("Keys that moved after adding nodeE:", moved, f"({moved/100:.1f}%)")
    print("Expected around 20% movement for 1/5 nodes")
    print()

    ch.remove_node("nodeB")
    dist3 = ch.distribution(keys)
    print("After removing nodeB:")
    for node in sorted(dist3):
        print(f"  {node}: {dist3[node]}")
    print()

    print("Lookup examples:")
    for key in ["user:42", "session:abc", "cache:home", "file:report.pdf"]:
        print(f"  {key} -> {ch.get_node(key)}  replicas={ch.get_nodes(key, 3)}")
    print()
    print("Total virtual nodes:", len(ch.sorted_keys))
    print("Physical nodes    :", sorted(ch.nodes))
