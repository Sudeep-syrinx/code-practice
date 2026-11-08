"""
Advanced Network Flow and Graph Cut Algorithms.
Includes Dinic's Algorithm for Max Flow and Stoer-Wagner for Min Cut.
"""

import collections

class DinicEdge:
    def __init__(self, to, rev, cap):
        self.to = to
        self.rev = rev
        self.cap = cap

class Dinic:
    def __init__(self, n):
        self.n = n
        self.graph = [[] for _ in range(n)]

    def add_edge(self, fr, to, cap):
        forward = DinicEdge(to, len(self.graph[to]), cap)
        backward = DinicEdge(fr, len(self.graph[fr]), 0)
        self.graph[fr].append(forward)
        self.graph[to].append(backward)

    def bfs(self, s, t):
        self.level = [-1] * self.n
        self.level[s] = 0
        queue = collections.deque([s])
        while queue:
            v = queue.popleft()
            for edge in self.graph[v]:
                if edge.cap > 0 and self.level[edge.to] < 0:
                    self.level[edge.to] = self.level[v] + 1
                    queue.append(edge.to)
        return self.level[t] >= 0

    def dfs(self, v, t, f):
        if v == t:
            return f
        for i in range(self.it[v], len(self.graph[v])):
            self.it[v] = i
            edge = self.graph[v][i]
            if edge.cap > 0 and self.level[v] < self.level[edge.to]:
                d = self.dfs(edge.to, t, min(f, edge.cap))
                if d > 0:
                    edge.cap -= d
                    self.graph[edge.to][edge.rev].cap += d
                    return d
        return 0

    def max_flow(self, s, t):
        flow = 0
        while self.bfs(s, t):
            self.it = [0] * self.n
            while True:
                f = self.dfs(s, t, float('inf'))
                if f == 0:
                    break
                flow += f
        return flow

class StoerWagner:
    def __init__(self, n):
        self.n = n
        self.graph = [[0] * n for _ in range(n)]

    def add_edge(self, u, v, w):
        self.graph[u][v] += w
        self.graph[v][u] += w

    def min_cut(self):
        vertices = list(range(self.n))
        best_cut = float('inf')
        
        while len(vertices) > 1:
            n = len(vertices)
            weights = [0] * self.n
            exists = [True] * self.n
            
            for i in range(n):
                if i == 0:
                    sel = vertices[0]
                else:
                    max_weight = -1
                    sel = -1
                    for v in vertices:
                        if exists[v] and weights[v] > max_weight:
                            max_weight = weights[v]
                            sel = v
                            
                cut_of_phase = max_weight if i != 0 else 0
                best_cut = min(best_cut, cut_of_phase)
                
                exists[sel] = False
                for v in vertices:
                    if exists[v]:
                        weights[v] += self.graph[sel][v]
                        
                if i == n - 1:
                    for v in vertices:
                        if exists[v]:
                            self.graph[vertices[0]][v] += self.graph[sel][v]
                            self.graph[v][vertices[0]] += self.graph[v][sel]
                    vertices.remove(sel)
                    
        return best_cut

if __name__ == "__main__":
    print("Testing Dinic's Max Flow...")
    dinic = Dinic(6)
    dinic.add_edge(0, 1, 16)
    dinic.add_edge(0, 2, 13)
    dinic.add_edge(1, 2, 10)
    dinic.add_edge(1, 3, 12)
    dinic.add_edge(2, 1, 4)
    dinic.add_edge(2, 4, 14)
    dinic.add_edge(3, 2, 9)
    dinic.add_edge(3, 5, 20)
    dinic.add_edge(4, 3, 7)
    dinic.add_edge(4, 5, 4)
    print("Max Flow from 0 to 5:", dinic.max_flow(0, 5))
    
    print("Testing Stoer-Wagner Min Cut...")
    sw = StoerWagner(4)
    sw.add_edge(0, 1, 1)
    sw.add_edge(0, 2, 1)
    sw.add_edge(1, 2, 1)
    sw.add_edge(2, 3, 1)
    print("Min Cut:", sw.min_cut())
    print("Network Flow Algorithms complete.")
