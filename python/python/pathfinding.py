from heapq import heappush, heappop
from collections import defaultdict, deque
import math

class Graph:
    def __init__(self):
        self.adj = defaultdict(list)

    def add_edge(self, u, v, weight=1, directed=False):
        self.adj[u].append((v, weight))
        if not directed:
            self.adj[v].append((u, weight))

def dijkstra(graph, start):
    dist = {start: 0}
    prev = {}
    pq = [(0, start)]
    while pq:
        d, u = heappop(pq)
        if d > dist.get(u, float("inf")):
            continue
        for v, w in graph.adj[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                prev[v] = u
                heappush(pq, (nd, v))
    return dist, prev

def reconstruct_path(prev, start, end):
    if end not in prev and end != start:
        return None
    path = []
    cur = end
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    path.reverse()
    return path if path and path[0] == start else None

def a_star(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    open_set = [(0 + heuristic(start, goal), 0, start)]
    g_score = {start: 0}
    came_from = {}
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    while open_set:
        _, g, current = heappop(open_set)
        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            return path, g

        for dr, dc in directions:
            nr, nc = current[0] + dr, current[1] + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                tentative = g + 1
                neighbor = (nr, nc)
                if tentative < g_score.get(neighbor, float("inf")):
                    g_score[neighbor] = tentative
                    f = tentative + heuristic(neighbor, goal)
                    heappush(open_set, (f, tentative, neighbor))
                    came_from[neighbor] = current
    return None, float("inf")

def bfs_shortest(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    queue = deque([(start, 0)])
    visited = {start}
    parent = {start: None}
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    while queue:
        (r, c), dist = queue.popleft()
        if (r, c) == goal:
            path = []
            cur = goal
            while cur is not None:
                path.append(cur)
                cur = parent[cur]
            path.reverse()
            return path, dist
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in visited:
                visited.add((nr, nc))
                parent[(nr, nc)] = (r, c)
                queue.append(((nr, nc), dist + 1))
    return None, float("inf")

def print_grid_path(grid, path):
    display = [row[:] for row in grid]
    if path:
        for r, c in path:
            if display[r][c] == 0:
                display[r][c] = 2
        sr, sc = path[0]
        er, ec = path[-1]
        display[sr][sc] = 3
        display[er][ec] = 4
    symbols = {0: ".", 1: "#", 2: "*", 3: "S", 4: "G"}
    for row in display:
        print("  " + " ".join(symbols[cell] for cell in row))

if __name__ == "__main__":
    g = Graph()
    edges = [
        ("A", "B", 4), ("A", "C", 2), ("B", "C", 1), ("B", "D", 5),
        ("C", "D", 8), ("C", "E", 10), ("D", "E", 2), ("D", "F", 6),
        ("E", "F", 3),
    ]
    for u, v, w in edges:
        g.add_edge(u, v, w)

    dist, prev = dijkstra(g, "A")
    print("Dijkstra distances from A:")
    for node in sorted(dist):
        print(f"  {node}: {dist[node]}")
    path = reconstruct_path(prev, "A", "F")
    print("Path A -> F:", " -> ".join(path) if path else "None")
    print()

    grid = [
        [0, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0],
    ]
    start, goal = (0, 0), (6, 6)
    print("Grid pathfinding (A*):")
    path, cost = a_star(grid, start, goal)
    print_grid_path(grid, path)
    print(f"A* cost: {cost}, length: {len(path) if path else 0}")
    print()
    bfs_path, bfs_cost = bfs_shortest(grid, start, goal)
    print(f"BFS cost: {bfs_cost}, length: {len(bfs_path) if bfs_path else 0}")
    print("A* and BFS agree on length:", len(path) == len(bfs_path) if path and bfs_path else False)
