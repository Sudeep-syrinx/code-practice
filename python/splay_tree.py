class SplayNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.parent = None


class SplayTree:
    def __init__(self):
        self.root = None

    def _rotate(self, x):
        p = x.parent
        if not p:
            return
        g = p.parent
        if x == p.left:
            p.left = x.right
            if x.right:
                x.right.parent = p
            x.right = p
        else:
            p.right = x.left
            if x.left:
                x.left.parent = p
            x.left = p
        p.parent = x
        x.parent = g
        if g:
            if p == g.left:
                g.left = x
            else:
                g.right = x
        else:
            self.root = x

    def _splay(self, x):
        while x.parent:
            p = x.parent
            g = p.parent
            if not g:
                self._rotate(x)
            elif (x == p.left) == (p == g.left):
                self._rotate(p)
                self._rotate(x)
            else:
                self._rotate(x)
                self._rotate(x)

    def insert(self, key):
        if not self.root:
            self.root = SplayNode(key)
            return
        node = self.root
        while True:
            if key == node.key:
                self._splay(node)
                return
            if key < node.key:
                if node.left:
                    node = node.left
                else:
                    node.left = SplayNode(key)
                    node.left.parent = node
                    self._splay(node.left)
                    return
            else:
                if node.right:
                    node = node.right
                else:
                    node.right = SplayNode(key)
                    node.right.parent = node
                    self._splay(node.right)
                    return

    def find(self, key):
        node = self.root
        last = None
        while node:
            last = node
            if key == node.key:
                self._splay(node)
                return True
            node = node.left if key < node.key else node.right
        if last:
            self._splay(last)
        return False

    def erase(self, key):
        if not self.find(key):
            return False
        # now root is the node to delete
        left = self.root.left
        right = self.root.right
        if left:
            left.parent = None
        if right:
            right.parent = None
        if not left:
            self.root = right
            return True
        # splay max of left
        self.root = left
        node = left
        while node.right:
            node = node.right
        self._splay(node)
        self.root.right = right
        if right:
            right.parent = self.root
        return True

    def inorder(self):
        result = []
        def dfs(n):
            if n:
                dfs(n.left)
                result.append(n.key)
                dfs(n.right)
        dfs(self.root)
        return result


if __name__ == "__main__":
    st = SplayTree()
    for v in [5, 3, 8, 1, 4, 7, 9, 2, 6]:
        st.insert(v)
    print("Inorder              :", st.inorder())
    print("Find 7               :", st.find(7))
    print("Find 10              :", st.find(10))
    print("Root after find 7    :", st.root.key if st.root else None)

    st.erase(5)
    st.erase(1)
    print("After erase 5 & 1    :", st.inorder())
    print("Size                 :", len(st.inorder()))

    import random
    rng = random.Random(21)
    ok = True
    for _ in range(100):
        tree = SplayTree()
        s = set()
        for _ in range(rng.randint(5, 40)):
            x = rng.randint(0, 100)
            if rng.random() < 0.7:
                tree.insert(x)
                s.add(x)
            else:
                tree.erase(x)
                s.discard(x)
        if sorted(s) != tree.inorder():
            ok = False
        for v in list(s)[:5]:
            if not tree.find(v):
                ok = False
    print("100 random trials ok :", ok)
