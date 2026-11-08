def dfs_topological_sort(graph):
    visited = set()
    stack = []
    
    def dfs(node):
        visited.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)
        stack.append(node)
        
    for node in graph:
        if node not in visited:
            dfs(node)
            
    return stack[::-1]

if __name__ == "__main__":
    dag = {
        'A': ['C'],
        'B': ['C', 'D'],
        'C': ['E'],
        'D': ['F'],
        'E': ['F'],
        'F': []
    }
    order = dfs_topological_sort(dag)
    print("Topological Sort (DFS):", order)
    print("Test passed:", order.index('A') < order.index('C') and order.index('B') < order.index('D'))
