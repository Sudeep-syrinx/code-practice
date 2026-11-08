class BPlusNode:
    def __init__(self, leaf=True):
        self.leaf = leaf
        self.keys = []
        self.values = []      # only for leaf
        self.children = []    # only for internal
        self.next = None      # leaf sibling link

class BPlusTree:
    def __init__(self, order=4):
        self.root = BPlusNode(leaf=True)
        self.order = order
        self.size = 0

    def search(self, key):
        node = self.root
        while not node.leaf:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            node = node.children[i]
        for i, k in enumerate(node.keys):
            if k == key:
                return node.values[i]
        return None

    def insert(self, key, value=None):
        if value is None:
            value = key
        root = self.root
        if len(root.keys) == self.order - 1:
            new_root = BPlusNode(leaf=False)
            new_root.children.append(self.root)
            self._split_child(new_root, 0)
            self.root = new_root
        self._insert_non_full(self.root, key, value)
        self.size += 1

    def _insert_non_full(self, node, key, value):
        if node.leaf:
            i = 0
            while i < len(node.keys) and node.keys[i] < key:
                i += 1
            if i < len(node.keys) and node.keys[i] == key:
                node.values[i] = value
                self.size -= 1
                return
            node.keys.insert(i, key)
            node.values.insert(i, value)
        else:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            if len(node.children[i].keys) == self.order - 1:
                self._split_child(node, i)
                if key >= node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key, value)

    def _split_child(self, parent, index):
        order = self.order
        node = parent.children[index]
        mid = order // 2
        new_node = BPlusNode(leaf=node.leaf)
        if node.leaf:
            new_node.keys = node.keys[mid:]
            new_node.values = node.values[mid:]
            node.keys = node.keys[:mid]
            node.values = node.values[:mid]
            new_node.next = node.next
            node.next = new_node
            parent.keys.insert(index, new_node.keys[0])
        else:
            parent.keys.insert(index, node.keys[mid])
            new_node.keys = node.keys[mid+1:]
            new_node.children = node.children[mid+1:]
            node.keys = node.keys[:mid]
            node.children = node.children[:mid+1]
        parent.children.insert(index + 1, new_node)

    def range_query(self, low, high):
        node = self.root
        while not node.leaf:
            i = 0
            while i < len(node.keys) and low >= node.keys[i]:
                i += 1
            node = node.children[i]
        result = []
        while node:
            for k, v in zip(node.keys, node.values):
                if low <= k <= high:
                    result.append((k, v))
                if k > high:
                    return result
            node = node.next
        return result

    def inorder_leaves(self):
        node = self.root
        while not node.leaf:
            node = node.children[0]
        keys = []
        while node:
            keys.extend(node.keys)
            node = node.next
        return keys

if __name__ == "__main__":
    tree = BPlusTree(order=5)
    for k in [10, 20, 5, 6, 12, 30, 7, 17, 50, 40, 35, 25, 15, 8, 9, 11, 13, 1, 3, 22]:
        tree.insert(k, k * 10)
    print("Size            :", tree.size)
    print("Search 17       :", tree.search(17))
    print("Search 99       :", tree.search(99))
    print("All keys        :", tree.inorder_leaves())
    print("Range 10..25    :", tree.range_query(10, 25))
    print()
    big = BPlusTree(order=6)
    for i in range(1, 201):
        big.insert(i)
    print("200 inserts")
    print("  size          :", big.size)
    print("  sorted        :", big.inorder_leaves() == list(range(1, 201)))
    print("  range 50..60  :", big.range_query(50, 60))
    print("  search 150    :", big.search(150))
