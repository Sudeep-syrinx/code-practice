import random
from collections import defaultdict

class TreapNode:
    def __init__(self, key, priority=None, value=None):
        self.key = key
        self.value = value if value is not None else key
        self.priority = priority if priority is not None else random.random()
        self.left = None
        self.right = None
        self.size = 1

def node_size(node):
    return node.size if node else 0

def update(node):
    if node:
        node.size = 1 + node_size(node.left) + node_size(node.right)

def split(node, key):
    if not node:
        return None, None
    if key < node.key:
        left, node.left = split(node.left, key)
        update(node)
        return left, node
    else:
        node.right, right = split(node.right, key)
        update(node)
        return node, right

def merge(left, right):
    if not left or not right:
        return left or right
    if left.priority > right.priority:
        left.right = merge(left.right, right)
        update(left)
        return left
    else:
        right.left = merge(left, right.left)
        update(right)
        return right

def insert(root, key, value=None):
    node = TreapNode(key, value=value)
    left, right = split(root, key)
    # remove existing if any
    _, right = split(right, key + (0.0000001 if isinstance(key, (int, float)) else ""))
    # simpler: just merge
    return merge(merge(left, node), right)

def insert_unique(root, key, value=None):
    left, mid = split(root, key - 1 if isinstance(key, int) else key)
    # better approach for unique keys
    def _insert(node, key, value):
        if not node:
            return TreapNode(key, value=value)
        if key == node.key:
            node.value = value
            return node
        if key < node.key:
            node.left = _insert(node.left, key, value)
            if node.left and node.left.priority > node.priority:
                node = rotate_right(node)
        else:
            node.right = _insert(node.right, key, value)
            if node.right and node.right.priority > node.priority:
                node = rotate_left(node)
        update(node)
        return node
    return _insert(root, key, value)

def rotate_right(node):
    left = node.left
    node.left = left.right
    left.right = node
    update(node)
    update(left)
    return left

def rotate_left(node):
    right = node.right
    node.right = right.left
    right.left = node
    update(node)
    update(right)
    return right

def delete(root, key):
    def _delete(node, key):
        if not node:
            return None
        if key < node.key:
            node.left = _delete(node.left, key)
        elif key > node.key:
            node.right = _delete(node.right, key)
        else:
            return merge(node.left, node.right)
        update(node)
        return node
    return _delete(root, key)

def search(root, key):
    while root:
        if key == root.key:
            return root.value
        root = root.left if key < root.key else root.right
    return None

def kth(root, k):
    # 0-based
    while root:
        left = node_size(root.left)
        if k < left:
            root = root.left
        elif k == left:
            return root.key
        else:
            k -= left + 1
            root = root.right
    return None

def inorder(root):
    result = []
    def walk(node):
        if node:
            walk(node.left)
            result.append(node.key)
            walk(node.right)
    walk(root)
    return result

class Treap:
    def __init__(self):
        self.root = None
        self.size = 0

    def insert(self, key, value=None):
        if search(self.root, key) is None:
            self.size += 1
        self.root = insert_unique(self.root, key, value)

    def delete(self, key):
        if search(self.root, key) is not None:
            self.size -= 1
            self.root = delete(self.root, key)

    def search(self, key):
        return search(self.root, key)

    def kth(self, k):
        return kth(self.root, k)

    def inorder(self):
        return inorder(self.root)

    def __len__(self):
        return self.size

if __name__ == "__main__":
    random.seed(42)
    t = Treap()
    for x in [5, 3, 7, 2, 4, 6, 8, 1, 9]:
        t.insert(x)
    print("Inorder           :", t.inorder())
    print("Size              :", len(t))
    print("Search 4          :", t.search(4))
    print("Search 10         :", t.search(10))
    print("kth(0)            :", t.kth(0))
    print("kth(4)            :", t.kth(4))
    print("kth(8)            :", t.kth(8))
    print()
    for x in [3, 7, 1]:
        t.delete(x)
        print(f"After delete {x}  :", t.inorder())
    print()
    big = Treap()
    vals = list(range(100))
    random.shuffle(vals)
    for v in vals:
        big.insert(v)
    print("100 inserts sorted:", big.inorder() == list(range(100)))
    print("Size              :", len(big))
    print("kth(50)           :", big.kth(50))
    for v in range(0, 100, 2):
        big.delete(v)
    print("After delete evens:", big.inorder() == list(range(1, 100, 2)))
    print("Size now          :", len(big))
