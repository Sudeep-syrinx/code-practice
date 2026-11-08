class RopeNode:
    def __init__(self, text=None, left=None, right=None):
        self.text = text
        self.left = left
        self.right = right
        if text is not None:
            self.weight = len(text)
            self.height = 1
        else:
            self.weight = left.weight if left else 0
            self.height = 1 + max(left.height if left else 0, right.height if right else 0)

    def is_leaf(self):
        return self.text is not None

def make_leaf(s):
    return RopeNode(text=s)

def make_concat(left, right):
    if left is None:
        return right
    if right is None:
        return left
    return RopeNode(left=left, right=right)

def length(node):
    if node is None:
        return 0
    if node.is_leaf():
        return len(node.text)
    return node.weight + length(node.right)

def to_string(node):
    if node is None:
        return ""
    if node.is_leaf():
        return node.text
    return to_string(node.left) + to_string(node.right)

def index(node, i):
    if node.is_leaf():
        return node.text[i]
    if i < node.weight:
        return index(node.left, i)
    return index(node.right, i - node.weight)

def split(node, i):
    if node is None:
        return None, None
    if node.is_leaf():
        return make_leaf(node.text[:i]), make_leaf(node.text[i:])
    if i < node.weight:
        left, right = split(node.left, i)
        return left, make_concat(right, node.right)
    left, right = split(node.right, i - node.weight)
    return make_concat(node.left, left), right

def insert(node, i, s):
    left, right = split(node, i)
    return make_concat(make_concat(left, make_leaf(s)), right)

def delete(node, i, j):
    left, mid = split(node, i)
    _, right = split(mid, j - i)
    return make_concat(left, right)

def report(node, i, j):
    left, mid = split(node, i)
    mid, _ = split(mid, j - i)
    return to_string(mid)

def rebalance(node):
    # simple rebuild for demo
    s = to_string(node)
    return build_from_string(s)

def build_from_string(s, leaf_size=32):
    if not s:
        return None
    leaves = [make_leaf(s[i:i+leaf_size]) for i in range(0, len(s), leaf_size)]
    while len(leaves) > 1:
        next_level = []
        for i in range(0, len(leaves), 2):
            if i + 1 < len(leaves):
                next_level.append(make_concat(leaves[i], leaves[i+1]))
            else:
                next_level.append(leaves[i])
        leaves = next_level
    return leaves[0]

class Rope:
    def __init__(self, text=""):
        self.root = build_from_string(text) if text else None

    def __len__(self):
        return length(self.root)

    def __str__(self):
        return to_string(self.root)

    def __getitem__(self, i):
        if isinstance(i, slice):
            start, stop, _ = i.indices(len(self))
            return report(self.root, start, stop)
        return index(self.root, i)

    def insert(self, i, s):
        self.root = insert(self.root, i, s)

    def delete(self, i, j):
        self.root = delete(self.root, i, j)

    def append(self, s):
        self.insert(len(self), s)

    def prepend(self, s):
        self.insert(0, s)

if __name__ == "__main__":
    r = Rope("Hello World")
    print("Initial       :", r)
    print("Length        :", len(r))
    print("Char 1        :", r[1])
    print("Slice 0:5     :", r[0:5])
    print()

    r.insert(5, ",")
    print("After insert  :", r)
    r.insert(6, " beautiful")
    print("After insert2 :", r)
    print()

    r.delete(5, 16)
    print("After delete  :", r)
    print()

    big = Rope("A" * 1000)
    big.insert(500, "XYZ")
    print("Big length    :", len(big))
    print("Contains XYZ  :", "XYZ" in str(big))
    print("Slice 498:505 :", big[498:505])
    print()

    r2 = Rope("The quick brown fox jumps over the lazy dog")
    print("Original      :", r2)
    r2.delete(4, 10)
    r2.insert(4, "slow")
    print("Edited        :", r2)
    r2.prepend(">>> ")
    r2.append(" <<<")
    print("Final         :", r2)
    print("Length        :", len(r2))
