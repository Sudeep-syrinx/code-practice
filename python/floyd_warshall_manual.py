def floyd_warshall(graph):
    n = len(graph)
    dist = [[float('inf')] * n for _ in range(n)]
    
    for i in range(n):
        dist[i][i] = 0
        for j, weight in enumerate(graph[i]):
            if weight != 0 and weight != float('inf'):
                dist[i][j] = weight
                
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    
    return dist

if __name__ == "__main__":
    INF = float('inf')
    graph = [
        [0, 5, INF, 10],
        [INF, 0, 3, INF],
        [INF, INF, 0, 1],
        [INF, INF, INF, 0]
    ]
    shortest = floyd_warshall(graph)
    print("Shortest distance 0 -> 2:", shortest[0][2])
    print("Expected: 8")
    print("Test passed:", shortest[0][2] == 8)
