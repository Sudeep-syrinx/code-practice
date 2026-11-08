import random


class TreapNode:
    def __init__(self, key, priority=None):
        self.key = key
        self.priority = priority if priority is not None else random.random()
        self.left = None
        self.right = None
        self.size = 1


def size(node):
    return node.size if node else 0


def update(node):
    if node:
        node.size = 1 + size(node.left) + size(node.right)


def split(node, key):
    if not node:
        return None, None
    if node.key < key:
        left, right = split(node.right, key)
        node.right = left
        update(node)
        return node, right
    else:
        left, right = split(node.left, key)
        node.left = right
        update(node)
        return left, node


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


def insert(root, key):
    node = TreapNode(key)
    left, right = split(root, key)
    return merge(merge(left, node), right)


def erase(root, key):
    left, mid = split(root, key)
    _, right = split(mid, key + 1)
    return merge(left, right)


def contains(root, key):
    while root:
        if key == root.key:
            return True
        root = root.left if key < root.key else root.right
    return False


def kth(root, k):
    if not root or k < 1 or k > size(root):
        return None
    left_size = size(root.left)
    if k == left_size + 1:
        return root.key
    if k <= left_size:
        return kth(root.left, k)
    return kth(root.right, k - left_size - 1)


def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.key] + inorder(root.right)


if __name__ == "__main__":
    random.seed(42)
    root = None
    values = [5, 2, 8, 1, 3, 7, 9, 4, 6]
    for v in values:
        root = insert(root, v)

    print("Inorder              :", inorder(root))
    print("Contains 7           :", contains(root, 7))
    print("Contains 10          :", contains(root, 10))
    print("Size                 :", size(root))
    print("3rd smallest         :", kth(root, 3))
    print("7th smallest         :", kth(root, 7))

    root = erase(root, 5)
    root = erase(root, 1)
    print("After erase 5 and 1  :", inorder(root))
    print("Size after erase     :", size(root))

    # stress
    rng = random.Random(99)
    ok = True
    for trial in range(100):
        root = None
        s = set()
        for _ in range(rng.randint(10, 60)):
            x = rng.randint(0, 200)
            if x not in s:
                root = insert(root, x)
                s.add(x)
            else:
                root = erase(root, x)
                s.discard(x)
        if sorted(s) != inorder(root) or size(root) != len(s):
            ok = False
        for i, val in enumerate(sorted(s), 1):
            if kth(root, i) != val:
                ok = False
    print("100 random trials ok :", ok)
