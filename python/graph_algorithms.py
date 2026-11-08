import heapq
from collections import deque


class Graph:
    def __init__(self, directed=False):
        self.directed = directed
        self.adj = {}

    def add_edge(self, u, v, weight=1):
        self.adj.setdefault(u, [])
        self.adj.setdefault(v, [])
        self.adj[u].append((v, weight))
        if not self.directed:
            self.adj[v].append((u, weight))

    def bfs(self, start):
        visited = {start}
        order = []
        queue = deque([start])
        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbor, _ in self.adj[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return order

    def dfs(self, start):
        visited = set()
        order = []

        def visit(node):
            visited.add(node)
            order.append(node)
            for neighbor, _ in self.adj[node]:
                if neighbor not in visited:
                    visit(neighbor)

        visit(start)
        return order

    def shortest_path_unweighted(self, start, goal):
        parents = {start: None}
        queue = deque([start])
        while queue:
            node = queue.popleft()
            if node == goal:
                break
            for neighbor, _ in self.adj[node]:
                if neighbor not in parents:
                    parents[neighbor] = node
                    queue.append(neighbor)
        if goal not in parents:
            return []
        path = []
        cur = goal
        while cur is not None:
            path.append(cur)
            cur = parents[cur]
        return path[::-1]

    def dijkstra(self, start):
        dist = {node: float("inf") for node in self.adj}
        dist[start] = 0
        heap = [(0, start)]
        while heap:
            d, node = heapq.heappop(heap)
            if d > dist[node]:
                continue
            for neighbor, weight in self.adj[node]:
                new_dist = d + weight
                if new_dist < dist[neighbor]:
                    dist[neighbor] = new_dist
                    heapq.heappush(heap, (new_dist, neighbor))
        return dist

    def connected_components(self):
        seen = set()
        components = []
        for node in self.adj:
            if node not in seen:
                comp = self.bfs(node)
                seen.update(comp)
                components.append(sorted(comp))
        return components


def topological_sort(dependencies):
    indegree = {node: 0 for node in dependencies}
    for node, targets in dependencies.items():
        for t in targets:
            indegree[t] = indegree.get(t, 0) + 1
    queue = deque(sorted(n for n, d in indegree.items() if d == 0))
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for t in dependencies.get(node, []):
            indegree[t] -= 1
            if indegree[t] == 0:
                queue.append(t)
    if len(order) != len(indegree):
        return []
    return order


if __name__ == "__main__":
    g = Graph()
    edges = [
        ("A", "B", 4), ("A", "C", 2), ("B", "C", 1),
        ("B", "D", 5), ("C", "D", 8), ("C", "E", 10),
        ("D", "E", 2), ("D", "F", 6), ("E", "F", 3),
    ]
    for u, v, w in edges:
        g.add_edge(u, v, w)

    print("BFS from A :", g.bfs("A"))
    print("DFS from A :", g.dfs("A"))
    print("Fewest hops A -> F:", g.shortest_path_unweighted("A", "F"))
    print("Dijkstra from A   :", g.dijkstra("A"))

    g2 = Graph()
    g2.add_edge(1, 2)
    g2.add_edge(2, 3)
    g2.add_edge(4, 5)
    g2.add_edge(6, 6)
    print("Components :", g2.connected_components())

    tasks = {
        "wake up": ["shower", "breakfast"],
        "shower": ["dress"],
        "breakfast": ["brush teeth"],
        "dress": ["leave"],
        "brush teeth": ["leave"],
        "leave": [],
    }
    print("Task order :", topological_sort(tasks))
    print("Cycle check:", topological_sort({"a": ["b"], "b": ["a"]}))

# ==============================================================================
# EXTENDED GRAPH ALGORITHMS
# ==============================================================================

def bfs(graph, start):
    visited = set()
    queue = [start]
    visited.add(start)
    result = []
    while queue:
        node = queue.pop(0)
        result.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return result

def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()
    visited.add(start)
    result = [start]
    for neighbor in graph.get(start, []):
        if neighbor not in visited:
            result.extend(dfs(graph, neighbor, visited))
    return result

def detect_cycle(graph):
    visited = set()
    rec_stack = set()
    def dfs_cycle(node):
        visited.add(node)
        rec_stack.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
        rec_stack.remove(node)
        return False
    for node in graph:
        if node not in visited:
            if dfs_cycle(node):
                return True
    return False

def test_graph_extended():
    graph = {
        'A': ['B', 'C'],
        'B': ['D', 'E'],
        'C': ['F'],
        'D': [],
        'E': ['F'],
        'F': []
    }
    print("BFS:", bfs(graph, 'A'))
    print("DFS:", dfs(graph, 'A'))
    print("Cycle detected:", detect_cycle(graph))

if __name__ == "__main__":
    test_graph_extended()
