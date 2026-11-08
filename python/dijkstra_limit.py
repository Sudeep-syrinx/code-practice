import heapq

def dijkstra_limit(graph, start, max_cost):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    pq = [(0, start)]
    
    while pq:
        current_dist, current = heapq.heappop(pq)
        if current_dist > max_cost:
            continue
        if current_dist > distances[current]:
            continue
            
        for neighbor, weight in graph[current].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))
                
    return {node: dist for node, dist in distances.items() if dist <= max_cost}

if __name__ == "__main__":
    graph = {
        'A': {'B': 1, 'C': 4},
        'B': {'C': 2, 'D': 5},
        'C': {'D': 1},
        'D': {}
    }
    reachable = dijkstra_limit(graph, 'A', 4)
    print("Reachable within cost 4:", reachable)
    print("Test passed:", reachable == {'A': 0, 'B': 1, 'C': 3, 'D': 4})
