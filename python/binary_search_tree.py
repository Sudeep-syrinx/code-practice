class Node:
    def __init__(self, key):
        self.left = None
        self.right = None
        self.val = key

def insert(root, key):
    if root is None:
        return Node(key)
    else:
        if root.val < key:
            root.right = insert(root.right, key)
        else:
            root.left = insert(root.left, key)
    return root

def inorder(root, res=None):
    if res is None: res = []
    if root:
        inorder(root.left, res)
        res.append(root.val)
        inorder(root.right, res)
    return res

def search(root, key):
    if root is None or root.val == key:
        return root
    if root.val < key:
        return search(root.right, key)
    return search(root.left, key)

if __name__ == "__main__":
    r = Node(50)
    r = insert(r, 30)
    r = insert(r, 20)
    r = insert(r, 40)
    r = insert(r, 70)
    r = insert(r, 60)
    r = insert(r, 80)
    print("Inorder traversal:", inorder(r))
    print("Search 40:", search(r, 40) is not None)
    print("Test passed:", inorder(r) == [20, 30, 40, 50, 60, 70, 80])
