import random

class TreapNode:
    def __init__(self, key):
        self.key = key
        self.priority = random.random()
        self.left = None
        self.right = None

def rotate_right(y):
    x = y.left
    y.left = x.right
    x.right = y
    return x

def rotate_left(x):
    y = x.right
    x.right = y.left
    y.left = x
    return y

def insert(root, key):
    if not root:
        return TreapNode(key)
    if key < root.key:
        root.left = insert(root.left, key)
        if root.left.priority > root.priority:
            root = rotate_right(root)
    else:
        root.right = insert(root.right, key)
        if root.right.priority > root.priority:
            root = rotate_left(root)
    return root

def inorder(root):
    if not root: return []
    return inorder(root.left) + [root.key] + inorder(root.right)

if __name__ == "__main__":
    root = None
    for key in [50, 30, 20, 40, 70, 60, 80]:
        root = insert(root, key)
    print("Inorder Traversal:", inorder(root))
    print("Heap property maintained in structure.")
