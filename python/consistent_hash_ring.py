import hashlib
import bisect


class ConsistentHashRing:
    def __init__(self, nodes=None, replicas=100):
        self.replicas = replicas
        self.ring = []
        self.node_map = {}
        if nodes:
            for node in nodes:
                self.add_node(node)

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node):
        for i in range(self.replicas):
            key = f"{node}:{i}"
            hash_val = self._hash(key)
            self.ring.append(hash_val)
            self.node_map[hash_val] = node
        self.ring.sort()

    def remove_node(self, node):
        for i in range(self.replicas):
            key = f"{node}:{i}"
            hash_val = self._hash(key)
            idx = bisect.bisect_left(self.ring, hash_val)
            if idx < len(self.ring) and self.ring[idx] == hash_val:
                self.ring.pop(idx)
                del self.node_map[hash_val]

    def get_node(self, key):
        if not self.ring:
            return None
        hash_val = self._hash(key)
        idx = bisect.bisect_left(self.ring, hash_val)
        if idx == len(self.ring):
            idx = 0
        return self.node_map[self.ring[idx]]

    def distribution(self, keys):
        counts = {}
        for key in keys:
            node = self.get_node(key)
            counts[node] = counts.get(node, 0) + 1
        return counts


if __name__ == "__main__":
    nodes = ["server-1", "server-2", "server-3"]
    ring = ConsistentHashRing(nodes)
    
    print("Initial distribution for 10,000 keys:")
    keys = [f"user-{i}" for i in range(10000)]
    dist = ring.distribution(keys)
    for node, count in sorted(dist.items()):
        print(f"  {node}: {count} keys")
        
    print("\nAdding server-4...")
    ring.add_node("server-4")
    new_dist = ring.distribution(keys)
    
    moved = 0
    for node, count in sorted(new_dist.items()):
        old_count = dist.get(node, 0)
        print(f"  {node}: {count} keys (was {old_count})")
        moved += abs(count - old_count)
        
    print(f"\nTotal keys moved to new node: {moved / 2:.0f} (approx 1/4 of total)")
    
    print("\nRemoving server-2...")
    ring.remove_node("server-2")
    final_dist = ring.distribution(keys)
    print(f"  server-2 is gone: {'server-2' not in final_dist}")
