class RBNode:
    def __init__(self, key, value=None, color="R"):
        self.key = key
        self.value = value
        self.color = color  # "R" or "B"
        self.left = None
        self.right = None
        self.parent = None

class RedBlackTree:
    def __init__(self):
        self.NIL = RBNode(None, color="B")
        self.root = self.NIL
        self.size = 0

    def _left_rotate(self, x):
        y = x.right
        x.right = y.left
        if y.left != self.NIL:
            y.left.parent = x
        y.parent = x.parent
        if x.parent is None:
            self.root = y
        elif x == x.parent.left:
            x.parent.left = y
        else:
            x.parent.right = y
        y.left = x
        x.parent = y

    def _right_rotate(self, y):
        x = y.left
        y.left = x.right
        if x.right != self.NIL:
            x.right.parent = y
        x.parent = y.parent
        if y.parent is None:
            self.root = x
        elif y == y.parent.right:
            y.parent.right = x
        else:
            y.parent.left = x
        x.right = y
        y.parent = x

    def insert(self, key, value=None):
        if value is None:
            value = key
        node = RBNode(key, value)
        node.left = node.right = self.NIL
        parent = None
        current = self.root
        while current != self.NIL:
            parent = current
            if key < current.key:
                current = current.left
            elif key > current.key:
                current = current.right
            else:
                current.value = value
                return
        node.parent = parent
        if parent is None:
            self.root = node
        elif key < parent.key:
            parent.left = node
        else:
            parent.right = node
        node.color = "R"
        self.size += 1
        self._fix_insert(node)

    def _fix_insert(self, z):
        while z.parent and z.parent.color == "R":
            if z.parent == z.parent.parent.left:
                y = z.parent.parent.right
                if y.color == "R":
                    z.parent.color = "B"
                    y.color = "B"
                    z.parent.parent.color = "R"
                    z = z.parent.parent
                else:
                    if z == z.parent.right:
                        z = z.parent
                        self._left_rotate(z)
                    z.parent.color = "B"
                    z.parent.parent.color = "R"
                    self._right_rotate(z.parent.parent)
            else:
                y = z.parent.parent.left
                if y.color == "R":
                    z.parent.color = "B"
                    y.color = "B"
                    z.parent.parent.color = "R"
                    z = z.parent.parent
                else:
                    if z == z.parent.left:
                        z = z.parent
                        self._right_rotate(z)
                    z.parent.color = "B"
                    z.parent.parent.color = "R"
                    self._left_rotate(z.parent.parent)
        self.root.color = "B"

    def search(self, key):
        node = self.root
        while node != self.NIL:
            if key == node.key:
                return node.value
            node = node.left if key < node.key else node.right
        return None

    def _minimum(self, node):
        while node.left != self.NIL:
            node = node.left
        return node

    def _transplant(self, u, v):
        if u.parent is None:
            self.root = v
        elif u == u.parent.left:
            u.parent.left = v
        else:
            u.parent.right = v
        v.parent = u.parent

    def delete(self, key):
        z = self.root
        while z != self.NIL and z.key != key:
            z = z.left if key < z.key else z.right
        if z == self.NIL:
            return False
        y = z
        y_original_color = y.color
        if z.left == self.NIL:
            x = z.right
            self._transplant(z, z.right)
        elif z.right == self.NIL:
            x = z.left
            self._transplant(z, z.left)
        else:
            y = self._minimum(z.right)
            y_original_color = y.color
            x = y.right
            if y.parent == z:
                x.parent = y
            else:
                self._transplant(y, y.right)
                y.right = z.right
                y.right.parent = y
            self._transplant(z, y)
            y.left = z.left
            y.left.parent = y
            y.color = z.color
        self.size -= 1
        if y_original_color == "B":
            self._fix_delete(x)
        return True

    def _fix_delete(self, x):
        while x != self.root and x.color == "B":
            if x == x.parent.left:
                w = x.parent.right
                if w.color == "R":
                    w.color = "B"
                    x.parent.color = "R"
                    self._left_rotate(x.parent)
                    w = x.parent.right
                if w.left.color == "B" and w.right.color == "B":
                    w.color = "R"
                    x = x.parent
                else:
                    if w.right.color == "B":
                        w.left.color = "B"
                        w.color = "R"
                        self._right_rotate(w)
                        w = x.parent.right
                    w.color = x.parent.color
                    x.parent.color = "B"
                    w.right.color = "B"
                    self._left_rotate(x.parent)
                    x = self.root
            else:
                w = x.parent.left
                if w.color == "R":
                    w.color = "B"
                    x.parent.color = "R"
                    self._right_rotate(x.parent)
                    w = x.parent.left
                if w.right.color == "B" and w.left.color == "B":
                    w.color = "R"
                    x = x.parent
                else:
                    if w.left.color == "B":
                        w.right.color = "B"
                        w.color = "R"
                        self._left_rotate(w)
                        w = x.parent.left
                    w.color = x.parent.color
                    x.parent.color = "B"
                    w.left.color = "B"
                    self._right_rotate(x.parent)
                    x = self.root
        x.color = "B"

    def inorder(self):
        result = []
        def walk(node):
            if node != self.NIL:
                walk(node.left)
                result.append((node.key, node.value, node.color))
                walk(node.right)
        walk(self.root)
        return result

    def height(self):
        def h(node):
            if node == self.NIL:
                return 0
            return 1 + max(h(node.left), h(node.right))
        return h(self.root)

    def black_height(self):
        node = self.root
        bh = 0
        while node != self.NIL:
            if node.color == "B":
                bh += 1
            node = node.left
        return bh

    def is_valid_rb(self):
        if self.root.color != "B":
            return False
        def check(node):
            if node == self.NIL:
                return True, 1
            if node.color == "R" and (node.left.color == "R" or node.right.color == "R"):
                return False, 0
            left_ok, left_bh = check(node.left)
            right_ok, right_bh = check(node.right)
            if not left_ok or not right_ok or left_bh != right_bh:
                return False, 0
            bh = left_bh + (1 if node.color == "B" else 0)
            return True, bh
        ok, _ = check(self.root)
        return ok

if __name__ == "__main__":
    tree = RedBlackTree()
    keys = [20, 15, 25, 10, 18, 22, 30, 5, 12, 17, 19, 28, 35, 1, 8]
    for k in keys:
        tree.insert(k, k * 10)
    print("Size               :", tree.size)
    print("Height             :", tree.height())
    print("Black height       :", tree.black_height())
    print("Valid RB tree      :", tree.is_valid_rb())
    print("Inorder            :", [(k, c) for k, _, c in tree.inorder()])
    print("Search 18          :", tree.search(18))
    print("Search 99          :", tree.search(99))
    print()
    for k in [15, 25, 10, 30, 5]:
        tree.delete(k)
        print(f"After delete {k:2}  size={tree.size}  valid={tree.is_valid_rb()}  height={tree.height()}")
    print("Final inorder      :", [k for k, _, _ in tree.inorder()])
    print()
    big = RedBlackTree()
    for i in range(1, 501):
        big.insert(i)
    print("500 sequential inserts")
    print("  size        :", big.size)
    print("  height      :", big.height(), "(should be ~9)")
    print("  black height:", big.black_height())
    print("  valid       :", big.is_valid_rb())
    for i in range(1, 251):
        big.delete(i)
    print("After deleting 1..250")
    print("  size        :", big.size)
    print("  height      :", big.height())
    print("  valid       :", big.is_valid_rb())
    print("  remaining   :", [k for k, _, _ in big.inorder()] == list(range(251, 501)))
