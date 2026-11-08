class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

def find_lca(root, n1, n2):
    if root is None:
        return None
    if root.key == n1 or root.key == n2:
        return root
    left_lca = find_lca(root.left, n1, n2)
    right_lca = find_lca(root.right, n1, n2)
    
    if left_lca and right_lca:
        return root
    return left_lca if left_lca else right_lca

if __name__ == "__main__":
    root = Node(1)
    root.left = Node(2)
    root.right = Node(3)
    root.left.left = Node(4)
    root.left.right = Node(5)
    root.right.left = Node(6)
    root.right.right = Node(7)
    
    lca = find_lca(root, 4, 5)
    print(f"LCA of 4 and 5: {lca.key}")
    print("Test passed:", lca.key == 2)
