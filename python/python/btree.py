class BTreeNode:
    def __init__(self, t, leaf=True):
        self.t = t
        self.leaf = leaf
        self.keys = []
        self.values = []
        self.children = []

    def is_full(self):
        return len(self.keys) == 2 * self.t - 1

class BTree:
    def __init__(self, t=3):
        self.root = BTreeNode(t)
        self.t = t
        self.size = 0

    def search(self, key, node=None):
        if node is None:
            node = self.root
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if i < len(node.keys) and key == node.keys[i]:
            return node.values[i]
        if node.leaf:
            return None
        return self.search(key, node.children[i])

    def insert(self, key, value=None):
        if value is None:
            value = key
        root = self.root
        if root.is_full():
            new_root = BTreeNode(self.t, leaf=False)
            new_root.children.append(self.root)
            self._split_child(new_root, 0)
            self.root = new_root
        self._insert_non_full(self.root, key, value)
        self.size += 1

    def _insert_non_full(self, node, key, value):
        i = len(node.keys) - 1
        if node.leaf:
            node.keys.append(None)
            node.values.append(None)
            while i >= 0 and key < node.keys[i]:
                node.keys[i + 1] = node.keys[i]
                node.values[i + 1] = node.values[i]
                i -= 1
            node.keys[i + 1] = key
            node.values[i + 1] = value
        else:
            while i >= 0 and key < node.keys[i]:
                i -= 1
            i += 1
            if node.children[i].is_full():
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key, value)

    def _split_child(self, parent, index):
        t = self.t
        full = parent.children[index]
        new_node = BTreeNode(t, leaf=full.leaf)
        mid = t - 1
        parent.keys.insert(index, full.keys[mid])
        parent.values.insert(index, full.values[mid])
        parent.children.insert(index + 1, new_node)
        new_node.keys = full.keys[mid + 1:]
        new_node.values = full.values[mid + 1:]
        full.keys = full.keys[:mid]
        full.values = full.values[:mid]
        if not full.leaf:
            new_node.children = full.children[mid + 1:]
            full.children = full.children[:mid + 1]

    def delete(self, key):
        self._delete(self.root, key)
        if not self.root.keys and self.root.children:
            self.root = self.root.children[0]
        self.size = max(0, self.size - 1)

    def _delete(self, node, key):
        t = self.t
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if node.leaf:
            if i < len(node.keys) and node.keys[i] == key:
                node.keys.pop(i)
                node.values.pop(i)
            return
        if i < len(node.keys) and node.keys[i] == key:
            if len(node.children[i].keys) >= t:
                pred_key, pred_val = self._max(node.children[i])
                node.keys[i], node.values[i] = pred_key, pred_val
                self._delete(node.children[i], pred_key)
            elif len(node.children[i + 1].keys) >= t:
                succ_key, succ_val = self._min(node.children[i + 1])
                node.keys[i], node.values[i] = succ_key, succ_val
                self._delete(node.children[i + 1], succ_key)
            else:
                self._merge(node, i)
                self._delete(node.children[i], key)
        else:
            if len(node.children[i].keys) < t:
                self._fill(node, i)
                if i > len(node.keys):
                    i -= 1
            self._delete(node.children[i], key)

    def _min(self, node):
        while not node.leaf:
            node = node.children[0]
        return node.keys[0], node.values[0]

    def _max(self, node):
        while not node.leaf:
            node = node.children[-1]
        return node.keys[-1], node.values[-1]

    def _merge(self, node, i):
        left = node.children[i]
        right = node.children[i + 1]
        left.keys.append(node.keys[i])
        left.values.append(node.values[i])
        left.keys.extend(right.keys)
        left.values.extend(right.values)
        if not left.leaf:
            left.children.extend(right.children)
        node.keys.pop(i)
        node.values.pop(i)
        node.children.pop(i + 1)

    def _fill(self, node, i):
        if i > 0 and len(node.children[i - 1].keys) >= self.t:
            self._borrow_from_prev(node, i)
        elif i < len(node.children) - 1 and len(node.children[i + 1].keys) >= self.t:
            self._borrow_from_next(node, i)
        else:
            if i < len(node.children) - 1:
                self._merge(node, i)
            else:
                self._merge(node, i - 1)

    def _borrow_from_prev(self, node, i):
        child = node.children[i]
        sibling = node.children[i - 1]
        child.keys.insert(0, node.keys[i - 1])
        child.values.insert(0, node.values[i - 1])
        if not child.leaf:
            child.children.insert(0, sibling.children.pop())
        node.keys[i - 1] = sibling.keys.pop()
        node.values[i - 1] = sibling.values.pop()

    def _borrow_from_next(self, node, i):
        child = node.children[i]
        sibling = node.children[i + 1]
        child.keys.append(node.keys[i])
        child.values.append(node.values[i])
        if not child.leaf:
            child.children.append(sibling.children.pop(0))
        node.keys[i] = sibling.keys.pop(0)
        node.values[i] = sibling.values.pop(0)

    def inorder(self, node=None):
        if node is None:
            node = self.root
        result = []
        def walk(n):
            for i, key in enumerate(n.keys):
                if not n.leaf:
                    walk(n.children[i])
                result.append((key, n.values[i]))
            if not n.leaf:
                walk(n.children[-1])
        walk(node)
        return result

    def height(self):
        h = 0
        node = self.root
        while not node.leaf:
            node = node.children[0]
            h += 1
        return h

if __name__ == "__main__":
    tree = BTree(t=3)
    for k in [10, 20, 5, 6, 12, 30, 7, 17, 50, 40, 35, 25, 15, 8, 9, 11, 13]:
        tree.insert(k, k * 10)
    print("Size after inserts :", tree.size)
    print("Height             :", tree.height())
    print("Inorder keys       :", [k for k, _ in tree.inorder()])
    print("Search 17          :", tree.search(17))
    print("Search 99          :", tree.search(99))
    print()
    for k in [6, 13, 7, 4, 50, 20]:
        tree.delete(k)
        print(f"After delete {k:2}  size={tree.size}  height={tree.height()}")
    print("Final inorder      :", [k for k, _ in tree.inorder()])
    print()
    big = BTree(t=4)
    for i in range(1, 301):
        big.insert(i)
    print("300 sequential inserts (t=4)")
    print("  size   :", big.size)
    print("  height :", big.height())
    print("  sorted :", [k for k, _ in big.inorder()] == list(range(1, 301)))
    for i in range(1, 151):
        big.delete(i)
    print("After deleting 1..150")
    print("  size   :", big.size)
    print("  height :", big.height())
    print("  remaining sorted:", [k for k, _ in big.inorder()] == list(range(151, 301)))
