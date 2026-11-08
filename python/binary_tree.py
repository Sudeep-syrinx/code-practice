class TreeNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


class BinarySearchTree:
    def __init__(self):
        self.root = None
        self.count = 0

    def insert(self, key):
        if self.root is None:
            self.root = TreeNode(key)
            self.count += 1
            return
        cur = self.root
        while True:
            if key == cur.key:
                return
            if key < cur.key:
                if cur.left is None:
                    cur.left = TreeNode(key)
                    self.count += 1
                    return
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = TreeNode(key)
                    self.count += 1
                    return
                cur = cur.right

    def contains(self, key):
        cur = self.root
        while cur:
            if key == cur.key:
                return True
            cur = cur.left if key < cur.key else cur.right
        return False

    def inorder(self):
        result = []

        def walk(node):
            if node:
                walk(node.left)
                result.append(node.key)
                walk(node.right)

        walk(self.root)
        return result

    def preorder(self):
        result = []

        def walk(node):
            if node:
                result.append(node.key)
                walk(node.left)
                walk(node.right)

        walk(self.root)
        return result

    def postorder(self):
        result = []

        def walk(node):
            if node:
                walk(node.left)
                walk(node.right)
                result.append(node.key)

        walk(self.root)
        return result

    def level_order(self):
        if self.root is None:
            return []
        result = []
        queue = [self.root]
        while queue:
            level = []
            next_queue = []
            for node in queue:
                level.append(node.key)
                if node.left:
                    next_queue.append(node.left)
                if node.right:
                    next_queue.append(node.right)
            result.append(level)
            queue = next_queue
        return result

    def height(self):
        def h(node):
            if node is None:
                return 0
            return 1 + max(h(node.left), h(node.right))

        return h(self.root)

    def minimum(self):
        cur = self.root
        while cur and cur.left:
            cur = cur.left
        return cur.key if cur else None

    def maximum(self):
        cur = self.root
        while cur and cur.right:
            cur = cur.right
        return cur.key if cur else None

    def delete(self, key):
        def remove(node, key):
            if node is None:
                return None, False
            if key < node.key:
                node.left, done = remove(node.left, key)
                return node, done
            if key > node.key:
                node.right, done = remove(node.right, key)
                return node, done
            if node.left is None:
                return node.right, True
            if node.right is None:
                return node.left, True
            successor = node.right
            while successor.left:
                successor = successor.left
            node.key = successor.key
            node.right, _ = remove(node.right, successor.key)
            return node, True

        self.root, deleted = remove(self.root, key)
        if deleted:
            self.count -= 1
        return deleted

    def __len__(self):
        return self.count


if __name__ == "__main__":
    tree = BinarySearchTree()
    for k in [50, 30, 70, 20, 40, 60, 80, 35, 45, 65]:
        tree.insert(k)

    print("Inorder    :", tree.inorder())
    print("Preorder   :", tree.preorder())
    print("Postorder  :", tree.postorder())
    print("Level order:", tree.level_order())
    print("Height     :", tree.height())
    print("Min / Max  :", tree.minimum(), tree.maximum())
    print("Contains 60:", tree.contains(60))
    print("Contains 99:", tree.contains(99))
    print("Size       :", len(tree))

    print("Delete 20  :", tree.delete(20))
    print("Delete 30  :", tree.delete(30))
    print("Delete 50  :", tree.delete(50))
    print("Delete 999 :", tree.delete(999))
    print("Inorder    :", tree.inorder())
    print("Level order:", tree.level_order())
    print("Size       :", len(tree))
