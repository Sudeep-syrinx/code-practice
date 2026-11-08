import sys

class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i):
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1

def tarjan_bridges(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
        
    disc = [-1] * n
    low = [-1] * n
    visited = [False] * n
    bridges = []
    time = 0
    
    def dfs(u, parent):
        nonlocal time
        visited[u] = True
        disc[u] = low[u] = time
        time += 1
        
        for v in graph[u]:
            if not visited[v]:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    bridges.append((u, v))
            elif v != parent:
                low[u] = min(low[u], disc[v])
                
    for i in range(n):
        if not visited[i]:
            dfs(i, -1)
            
    return bridges

if __name__ == "__main__":
    edges = [(0, 1), (1, 2), (2, 0), (1, 3), (3, 4), (4, 5), (5, 3)]
    bridges = tarjan_bridges(6, edges)
    print("Bridges in the graph:", bridges)
    print("Test passed:", len(bridges) == 1 and bridges[0] == (1, 3))
