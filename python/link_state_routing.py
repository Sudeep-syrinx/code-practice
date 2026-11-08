import math
import random
from collections import defaultdict, deque

class Router:
    def __init__(self, name):
        self.name = name
        self.links = {}  # neighbor -> cost
        self.lsdb = {}   # router -> {neighbor: cost}
        self.routing_table = {}  # dest -> (next_hop, cost)
        self.sequence = 0

    def add_link(self, neighbor, cost):
        self.links[neighbor] = cost

    def remove_link(self, neighbor):
        self.links.pop(neighbor, None)

    def create_lsa(self):
        self.sequence += 1
        return {
            "origin": self.name,
            "seq": self.sequence,
            "links": dict(self.links),
        }

    def receive_lsa(self, lsa):
        origin = lsa["origin"]
        if origin not in self.lsdb or lsa["seq"] > self.lsdb[origin].get("seq", -1):
            self.lsdb[origin] = lsa
            return True
        return False

    def compute_spf(self):
        # Dijkstra on LSDB
        graph = defaultdict(dict)
        for origin, lsa in self.lsdb.items():
            for nbr, cost in lsa["links"].items():
                graph[origin][nbr] = cost
                graph[nbr][origin] = cost  # undirected
        if self.name not in graph:
            self.routing_table = {}
            return
        dist = {self.name: 0}
        prev = {}
        pq = [(0, self.name)]
        visited = set()
        while pq:
            pq.sort()
            d, u = pq.pop(0)
            if u in visited:
                continue
            visited.add(u)
            for v, w in graph[u].items():
                nd = d + w
                if nd < dist.get(v, float("inf")):
                    dist[v] = nd
                    prev[v] = u
                    pq.append((nd, v))
        table = {}
        for dest in dist:
            if dest == self.name:
                continue
            # find next hop
            cur = dest
            while prev.get(cur) != self.name and cur in prev:
                cur = prev[cur]
            next_hop = cur if prev.get(cur) == self.name else None
            if next_hop:
                table[dest] = (next_hop, dist[dest])
        self.routing_table = table

class Network:
    def __init__(self):
        self.routers = {}
        self.packets_sent = 0
        self.packets_delivered = 0

    def add_router(self, name):
        self.routers[name] = Router(name)

    def connect(self, a, b, cost):
        self.routers[a].add_link(b, cost)
        self.routers[b].add_link(a, cost)

    def disconnect(self, a, b):
        self.routers[a].remove_link(b)
        self.routers[b].remove_link(a)

    def flood_lsa(self, origin):
        lsa = self.routers[origin].create_lsa()
        changed = set()
        queue = deque([origin])
        seen = {origin}
        self.routers[origin].receive_lsa(lsa)
        while queue:
            current = queue.popleft()
            for nbr in self.routers[current].links:
                if nbr not in seen:
                    seen.add(nbr)
                    if self.routers[nbr].receive_lsa(lsa):
                        changed.add(nbr)
                        queue.append(nbr)
        return changed

    def converge(self):
        for name in self.routers:
            self.flood_lsa(name)
        for r in self.routers.values():
            r.compute_spf()

    def send(self, src, dst, payload="ping"):
        self.packets_sent += 1
        path = [src]
        current = src
        visited = {src}
        while current != dst:
            table = self.routers[current].routing_table
            if dst not in table:
                return None, "UNREACHABLE"
            next_hop = table[dst][0]
            if next_hop in visited:
                return path, "LOOP"
            path.append(next_hop)
            visited.add(next_hop)
            current = next_hop
            if len(path) > len(self.routers) + 2:
                return path, "LOOP"
        self.packets_delivered += 1
        return path, "DELIVERED"

    def print_tables(self):
        for name in sorted(self.routers):
            r = self.routers[name]
            print(f"Router {name}:")
            for dest, (nh, cost) in sorted(r.routing_table.items()):
                print(f"  {dest:8} via {nh:8} cost {cost}")
            print()

if __name__ == "__main__":
    net = Network()
    for r in ["R1", "R2", "R3", "R4", "R5", "R6"]:
        net.add_router(r)
    links = [
        ("R1", "R2", 1), ("R1", "R3", 4),
        ("R2", "R3", 2), ("R2", "R4", 7),
        ("R3", "R4", 3), ("R3", "R5", 5),
        ("R4", "R5", 1), ("R4", "R6", 6),
        ("R5", "R6", 2),
    ]
    for a, b, c in links:
        net.connect(a, b, c)

    print("=== Initial convergence ===")
    net.converge()
    net.print_tables()

    print("Path R1 -> R6:", net.send("R1", "R6"))
    print("Path R6 -> R1:", net.send("R6", "R1"))
    print("Path R2 -> R5:", net.send("R2", "R5"))
    print()

    print("=== Link R4-R5 fails ===")
    net.disconnect("R4", "R5")
    net.converge()
    print("Path R1 -> R6 after failure:", net.send("R1", "R6"))
    print("Path R3 -> R6:", net.send("R3", "R6"))
    print()

    print("=== New link R2-R6 cost 3 ===")
    net.connect("R2", "R6", 3)
    net.converge()
    print("Path R1 -> R6 after new link:", net.send("R1", "R6"))
    print()
    print("Packets sent / delivered:", net.packets_sent, net.packets_delivered)
    print()
    net.print_tables()
