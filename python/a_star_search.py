import heapq
import math

class Graph:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, weight=1.0):
        if u not in self.adj: self.adj[u] = []
        if v not in self.adj: self.adj[v] = []
        self.adj[u].append((v, weight))
        self.adj[v].append((u, weight))

    def a_star(self, start, goal, heuristic):
        open_set = []
        heapq.heappush(open_set, (0, start))
        came_from = {}
        g_score = {node: float('inf') for node in self.adj}
        g_score[start] = 0
        f_score = {node: float('inf') for node in self.adj}
        f_score[start] = heuristic(start, goal)
        
        while open_set:
            _, current = heapq.heappop(open_set)
            if current == goal:
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.append(start)
                return path[::-1], g_score[goal]
                
            for neighbor, weight in self.adj[current]:
                tentative_g = g_score[current] + weight
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
        return None, float('inf')

def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

if __name__ == "__main__":
    grid_graph = Graph()
    for r in range(5):
        for c in range(5):
            if r < 4: grid_graph.add_edge((r, c), (r+1, c), 1)
            if c < 4: grid_graph.add_edge((r, c), (r, c+1), 1)
            
    path, cost = grid_graph.a_star((0, 0), (4, 4), manhattan)
    print(f"A* Path: {path}")
    print(f"Cost: {cost}")
    print(f"Optimal Path Found: {cost == 8}")
