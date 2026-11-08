class Graph:
    def __init__(self, vertices):
        self.V = vertices
        self.graph = defaultdict(list)

    def add_edge(self, u, v):
        self.graph[u].append(v)
        self.graph[v].append(u)

    def is_bipartite(self):
        color = [-1] * self.V
        for i in range(self.V):
            if color[i] == -1:
                queue = [i]
                color[i] = 1
                while queue:
                    u = queue.pop(0)
                    for v in self.graph[u]:
                        if color[v] == -1:
                            color[v] = 1 - color[u]
                            queue.append(v)
                        elif color[v] == color[u]:
                            return False
        return True

from collections import defaultdict

if __name__ == "__main__":
    g1 = Graph(4)
    g1.add_edge(0, 1)
    g1.add_edge(1, 2)
    g1.add_edge(2, 3)
    g1.add_edge(3, 0)
    print("Graph 1 is bipartite:", g1.is_bipartite())

    g2 = Graph(3)
    g2.add_edge(0, 1)
    g2.add_edge(1, 2)
    g2.add_edge(2, 0)
    print("Graph 2 is bipartite:", g2.is_bipartite())
    print("Test passed:", not g1.is_bipartite() and not g2.is_bipartite())
