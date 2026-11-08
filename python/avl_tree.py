class AVLNode:
    def __init__(self, key, value=None):
        self.key = key
        self.value = value
        self.left = None
        self.right = None
        self.height = 1

class AVLTree:
    def __init__(self):
        self.root = None
        self.size = 0

    def _height(self, node):
        return node.height if node else 0

    def _balance_factor(self, node):
        return self._height(node.left) - self._height(node.right) if node else 0

    def _update_height(self, node):
        node.height = 1 + max(self._height(node.left), self._height(node.right))

    def _rotate_right(self, y):
        x = y.left
        t2 = x.right
        x.right = y
        y.left = t2
        self._update_height(y)
        self._update_height(x)
        return x

    def _rotate_left(self, x):
        y = x.right
        t2 = y.left
        y.left = x
        x.right = t2
        self._update_height(x)
        self._update_height(y)
        return y

    def _rebalance(self, node):
        self._update_height(node)
        bf = self._balance_factor(node)
        if bf > 1:
            if self._balance_factor(node.left) < 0:
                node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        if bf < -1:
            if self._balance_factor(node.right) > 0:
                node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        return node

    def insert(self, key, value=None):
        def _insert(node, key, value):
            if not node:
                self.size += 1
                return AVLNode(key, value)
            if key < node.key:
                node.left = _insert(node.left, key, value)
            elif key > node.key:
                node.right = _insert(node.right, key, value)
            else:
                node.value = value
                return node
            return self._rebalance(node)
        self.root = _insert(self.root, key, value)

    def delete(self, key):
        def _min_node(node):
            while node.left:
                node = node.left
            return node

        def _delete(node, key):
            if not node:
                return None
            if key < node.key:
                node.left = _delete(node.left, key)
            elif key > node.key:
                node.right = _delete(node.right, key)
            else:
                self.size -= 1
                if not node.left:
                    return node.right
                if not node.right:
                    return node.left
                successor = _min_node(node.right)
                node.key = successor.key
                node.value = successor.value
                node.right = _delete(node.right, successor.key)
                self.size += 1  # compensates the extra decrement
            return self._rebalance(node)
        self.root = _delete(self.root, key)

    def search(self, key):
        node = self.root
        while node:
            if key == node.key:
                return node.value
            node = node.left if key < node.key else node.right
        return None

    def contains(self, key):
        return self.search(key) is not None or (self.root and self._find_node(key) is not None)

    def _find_node(self, key):
        node = self.root
        while node:
            if key == node.key:
                return node
            node = node.left if key < node.key else node.right
        return None

    def inorder(self):
        result = []
        def walk(node):
            if node:
                walk(node.left)
                result.append((node.key, node.value))
                walk(node.right)
        walk(self.root)
        return result

    def height(self):
        return self._height(self.root)

    def is_balanced(self):
        def check(node):
            if not node:
                return True, 0
            left_ok, lh = check(node.left)
            right_ok, rh = check(node.right)
            balanced = left_ok and right_ok and abs(lh - rh) <= 1
            return balanced, 1 + max(lh, rh)
        ok, _ = check(self.root)
        return ok

if __name__ == "__main__":
    tree = AVLTree()
    keys = [10, 20, 30, 40, 50, 25, 5, 15, 35, 45, 12, 18]
    for k in keys:
        tree.insert(k, k * 10)
    print("Size after inserts :", tree.size)
    print("Height             :", tree.height())
    print("Balanced           :", tree.is_balanced())
    print("Inorder            :", [k for k, _ in tree.inorder()])
    print("Search 25          :", tree.search(25))
    print("Search 99          :", tree.search(99))
    print()
    for k in [30, 10, 50, 25]:
        tree.delete(k)
        print(f"After delete {k:2}  size={tree.size}  height={tree.height()}  balanced={tree.is_balanced()}")
    print("Final inorder      :", [k for k, _ in tree.inorder()])
    print()
    big = AVLTree()
    for i in range(1, 201):
        big.insert(i)
    print("200 sequential inserts:")
    print("  size     :", big.size)
    print("  height   :", big.height(), "(log2(200) ≈ 7.6)")
    print("  balanced :", big.is_balanced())
    for i in range(1, 101):
        big.delete(i)
    print("After deleting 1..100:")
    print("  size     :", big.size)
    print("  height   :", big.height())
    print("  balanced :", big.is_balanced())
