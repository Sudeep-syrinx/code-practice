import hashlib
import random


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.components = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.components -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)

    def component_size(self, x):
        return self.size[self.find(x)]


def kruskal(n, edges):
    uf = UnionFind(n)
    total = 0
    chosen = []
    for weight, a, b in sorted(edges):
        if uf.union(a, b):
            total += weight
            chosen.append((a, b, weight))
    return total, chosen, uf.components


class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    @classmethod
    def from_list(cls, values):
        ft = cls(len(values))
        for i, v in enumerate(values):
            ft.add(i, v)
        return ft

    def add(self, i, delta):
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def prefix(self, i):
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

    def range_sum(self, left, right):
        before = self.prefix(left - 1) if left > 0 else 0
        return self.prefix(right) - before


class SegmentTree:
    def __init__(self, values, func=min, identity=float("inf")):
        self.n = len(values)
        self.func = func
        self.identity = identity
        self.tree = [identity] * (2 * self.n)
        for i, v in enumerate(values):
            self.tree[self.n + i] = v
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = func(self.tree[2 * i], self.tree[2 * i + 1])

    def update(self, i, value):
        i += self.n
        self.tree[i] = value
        while i > 1:
            i //= 2
            self.tree[i] = self.func(self.tree[2 * i], self.tree[2 * i + 1])

    def query(self, left, right):
        result = self.identity
        left += self.n
        right += self.n + 1
        while left < right:
            if left & 1:
                result = self.func(result, self.tree[left])
                left += 1
            if right & 1:
                right -= 1
                result = self.func(result, self.tree[right])
            left //= 2
            right //= 2
        return result


class BloomFilter:
    def __init__(self, bits=2048, hashes=4):
        self.bits = bits
        self.hashes = hashes
        self.array = bytearray(bits)
        self.count = 0

    def _positions(self, item):
        digest = hashlib.sha256(item.encode()).digest()
        for i in range(self.hashes):
            chunk = int.from_bytes(digest[i * 4:(i + 1) * 4], "big")
            yield chunk % self.bits

    def add(self, item):
        for p in self._positions(item):
            self.array[p] = 1
        self.count += 1

    def might_contain(self, item):
        return all(self.array[p] for p in self._positions(item))

    def fill_ratio(self):
        return sum(self.array) / self.bits


if __name__ == "__main__":
    uf = UnionFind(10)
    for a, b in [(0, 1), (2, 3), (1, 3), (4, 5), (6, 7), (5, 7)]:
        uf.union(a, b)
    print("Components        :", uf.components)
    print("0 and 2 connected :", uf.connected(0, 2))
    print("0 and 4 connected :", uf.connected(0, 4))
    print("Size of set of 4  :", uf.component_size(4))
    print("Duplicate union   :", uf.union(0, 3))

    edges = [
        (7, 0, 1), (5, 1, 2), (8, 0, 2), (9, 1, 3), (7, 2, 3),
        (5, 3, 4), (15, 2, 4), (6, 4, 5), (8, 3, 5), (11, 4, 6),
    ]
    total, chosen, parts = kruskal(7, edges)
    print()
    print("MST weight        :", total)
    print("MST edges         :", chosen)
    print("Spans all nodes   :", parts == 1 and len(chosen) == 6)

    rng = random.Random(11)
    values = [rng.randint(-50, 50) for _ in range(200)]
    ft = FenwickTree.from_list(values)
    seg_min = SegmentTree(values)
    seg_sum = SegmentTree(values, func=lambda a, b: a + b, identity=0)
    fenwick_ok = min_ok = sum_ok = True
    for _ in range(400):
        left = rng.randint(0, 199)
        right = rng.randint(left, 199)
        part = values[left:right + 1]
        if ft.range_sum(left, right) != sum(part):
            fenwick_ok = False
        if seg_min.query(left, right) != min(part):
            min_ok = False
        if seg_sum.query(left, right) != sum(part):
            sum_ok = False
        idx = rng.randint(0, 199)
        new = rng.randint(-50, 50)
        ft.add(idx, new - values[idx])
        values[idx] = new
        seg_min.update(idx, new)
        seg_sum.update(idx, new)

    print()
    print("Fenwick matches brute force    :", fenwick_ok)
    print("Segment min matches brute force:", min_ok)
    print("Segment sum matches brute force:", sum_ok)

    bloom = BloomFilter(bits=4096, hashes=4)
    members = [f"user{i}" for i in range(300)]
    for m in members:
        bloom.add(m)
    outsiders = [f"guest{i}" for i in range(2000)]
    false_positives = sum(bloom.might_contain(o) for o in outsiders)
    print()
    print("No false negatives :", all(bloom.might_contain(m) for m in members))
    print("False positives    :", false_positives, "of", len(outsiders))
    print("Rate under 5%      :", false_positives / len(outsiders) < 0.05)
    print("Bits set           :", round(bloom.fill_ratio() * 100, 1), "%")

# ==============================================================================
# MASSIVE EXPANSION: ADVANCED DATA STRUCTURES (PART 1)
# ==============================================================================

class RedBlackNode:
    def __init__(self, key, color="RED"):
        self.key = key
        self.color = color
        self.left = None
        self.right = None
        self.parent = None

class RedBlackTree:
    def __init__(self):
        self.NIL = RedBlackNode(key=None, color="BLACK")
        self.root = self.NIL

    def insert(self, key):
        node = RedBlackNode(key)
        node.left = self.NIL
        node.right = self.NIL
        
        parent = None
        current = self.root
        
        while current != self.NIL:
            parent = current
            if node.key < current.key:
                current = current.left
            else:
                current = current.right
                
        node.parent = parent
        
        if parent is None:
            self.root = node
        elif node.key < parent.key:
            parent.left = node
        else:
            parent.right = node
            
        node.color = "RED"
        self._fix_insert(node)

    def _fix_insert(self, k):
        while k.parent and k.parent.color == "RED":
            if k.parent == k.parent.parent.right:
                u = k.parent.parent.left
                if u.color == "RED":
                    u.color = "BLACK"
                    k.parent.color = "BLACK"
                    k.parent.parent.color = "RED"
                    k = k.parent.parent
                else:
                    if k == k.parent.left:
                        k = k.parent
                        self._right_rotate(k)
                    k.parent.color = "BLACK"
                    k.parent.parent.color = "RED"
                    self._left_rotate(k.parent.parent)
            else:
                u = k.parent.parent.right
                if u.color == "RED":
                    u.color = "BLACK"
                    k.parent.color = "BLACK"
                    k.parent.parent.color = "RED"
                    k = k.parent.parent
                else:
                    if k == k.parent.right:
                        k = k.parent
                        self._left_rotate(k)
                    k.parent.color = "BLACK"
                    k.parent.parent.color = "RED"
                    self._right_rotate(k.parent.parent)
            if k == self.root:
                break
        self.root.color = "BLACK"

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

    def _right_rotate(self, x):
        y = x.left
        x.left = y.right
        if y.right != self.NIL:
            y.right.parent = x
        y.parent = x.parent
        if x.parent is None:
            self.root = y
        elif x == x.parent.right:
            x.parent.right = y
        else:
            x.parent.left = y
        y.right = x
        x.parent = y

class BTreeNode:
    def __init__(self, leaf=False):
        self.leaf = leaf
        self.keys = []
        self.children = []

class BTree:
    def __init__(self, t=2):
        self.root = BTreeNode(True)
        self.t = t

    def insert(self, k):
        root = self.root
        if len(root.keys) == (2 * self.t) - 1:
            temp = BTreeNode()
            self.root = temp
            temp.children.insert(0, root)
            self._split_child(temp, 0)
            self._insert_non_full(temp, k)
        else:
            self._insert_non_full(root, k)

    def _split_child(self, x, i):
        t = self.t
        y = x.children[i]
        z = BTreeNode(y.leaf)
        x.children.insert(i + 1, z)
        x.keys.insert(i, y.keys[t - 1])
        z.keys = y.keys[t: (2 * t) - 1]
        y.keys = y.keys[0: t - 1]
        if not y.leaf:
            z.children = y.children[t: 2 * t]
            y.children = y.children[0: t - 1]

    def _insert_non_full(self, x, k):
        i = len(x.keys) - 1
        if x.leaf:
            x.keys.append(None)
            while i >= 0 and k < x.keys[i]:
                x.keys[i + 1] = x.keys[i]
                i -= 1
            x.keys[i + 1] = k
        else:
            while i >= 0 and k < x.keys[i]:
                i -= 1
            i += 1
            if len(x.children[i].keys) == (2 * self.t) - 1:
                self._split_child(x, i)
                if k > x.keys[i]:
                    i += 1
            self._insert_non_full(x.children[i], k)

class TrieNodeExtended:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.freq = 0

class TrieExtended:
    def __init__(self):
        self.root = TrieNodeExtended()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNodeExtended()
            node = node.children[char]
            node.freq += 1
        node.is_end = True

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True

    def count_prefix(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.freq

class DisjointSet:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i):
        if self.parent[i] != i:
            self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1

def test_advanced_structures():
    print("Testing Red-Black Tree...")
    rbt = RedBlackTree()
    for i in [10, 20, 30, 15, 25, 5]:
        rbt.insert(i)
    print("Red-Black Tree root:", rbt.root.key)
    
    print("Testing B-Tree...")
    btree = BTree(t=2)
    for i in [10, 20, 5, 6, 12, 30, 7, 17]:
        btree.insert(i)
    print("B-Tree root keys:", btree.root.keys)
    
    print("Testing Trie...")
    trie = TrieExtended()
    for w in ["apple", "app", "apricot"]:
        trie.insert(w)
    print("Trie starts_with 'ap':", trie.starts_with("ap"))
    print("Trie prefix count 'ap':", trie.count_prefix("ap"))
    
    print("Testing Disjoint Set...")
    ds = DisjointSet(10)
    ds.union(0, 1)
    ds.union(2, 3)
    ds.union(1, 3)
    print("Connected (0, 2):", ds.find(0) == ds.find(2))

if __name__ == "__main__":
    test_advanced_structures()

# ==============================================================================
# MASSIVE EXPANSION: ADVANCED DATA STRUCTURES & ALGORITHMS (MEGA BLOCK)
# ==============================================================================

import math
import random
import collections
import heapq

class SuffixArray:
    def __init__(self, text):
        self.text = text
        self.n = len(text)
        self.sa = self._build_sa()
        self.lcp = self._build_lcp()

    def _build_sa(self):
        sa = list(range(self.n))
        rank = [ord(c) for c in self.text]
        k = 1
        tmp = [0] * self.n
        while k < self.n:
            sa.sort(key=lambda x: (rank[x], rank[x + k] if x + k < self.n else -1))
            tmp[sa[0]] = 0
            for i in range(1, self.n):
                prev, curr = sa[i - 1], sa[i]
                tmp[curr] = tmp[prev] + (
                    (rank[prev], rank[prev + k] if prev + k < self.n else -1) <
                    (rank[curr], rank[curr + k] if curr + k < self.n else -1)
                )
            rank, tmp = tmp, rank
            k *= 2
        return sa

    def _build_lcp(self):
        rank = [0] * self.n
        for i in range(self.n):
            rank[self.sa[i]] = i
        lcp = [0] * (self.n - 1)
        h = 0
        for i in range(self.n):
            if rank[i] > 0:
                j = self.sa[rank[i] - 1]
                while i + h < self.n and j + h < self.n and self.text[i + h] == self.text[j + h]:
                    h += 1
                lcp[rank[i] - 1] = h
                if h > 0:
                    h -= 1
        return lcp

class SegmentTreeLazy:
    def __init__(self, data):
        self.n = len(data)
        self.tree = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)
        self._build(0, 0, self.n - 1, data)

    def _build(self, node, start, end, data):
        if start == end:
            self.tree[node] = data[start]
        else:
            mid = (start + end) // 2
            self._build(2 * node + 1, start, mid, data)
            self._build(2 * node + 2, mid + 1, end, data)
            self.tree[node] = self.tree[2 * node + 1] + self.tree[2 * node + 2]

    def _push(self, node, start, end):
        if self.lazy[node] != 0:
            self.tree[node] += self.lazy[node] * (end - start + 1)
            if start != end:
                self.lazy[2 * node + 1] += self.lazy[node]
                self.lazy[2 * node + 2] += self.lazy[node]
            self.lazy[node] = 0

    def update(self, l, r, val):
        self._update(0, 0, self.n - 1, l, r, val)

    def _update(self, node, start, end, l, r, val):
        self._push(node, start, end)
        if start > end or start > r or end < l:
            return
        if start >= l and end <= r:
            self.lazy[node] += val
            self._push(node, start, end)
            return
        mid = (start + end) // 2
        self._update(2 * node + 1, start, mid, l, r, val)
        self._update(2 * node + 2, mid + 1, end, l, r, val)
        self.tree[node] = self.tree[2 * node + 1] + self.tree[2 * node + 2]

    def query(self, l, r):
        return self._query(0, 0, self.n - 1, l, r)

    def _query(self, node, start, end, l, r):
        self._push(node, start, end)
        if start > end or start > r or end < l:
            return 0
        if start >= l and end <= r:
            return self.tree[node]
        mid = (start + end) // 2
        return self._query(2 * node + 1, start, mid, l, r) + self._query(2 * node + 2, mid + 1, end, l, r)

class TrieNodeFull:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.freq = 0
        self.prefix_count = 0

class TrieFull:
    def __init__(self):
        self.root = TrieNodeFull()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNodeFull()
            node = node.children[char]
            node.prefix_count += 1
        node.is_end = True
        node.freq += 1

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True

    def count_prefix(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.prefix_count

class AvlNodeFull:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1

class AvlTreeFull:
    def insert(self, root, key):
        if not root:
            return AvlNodeFull(key)
        elif key < root.key:
            root.left = self.insert(root.left, key)
        else:
            root.right = self.insert(root.right, key)

        root.height = 1 + max(self.get_height(root.left), self.get_height(root.right))
        balance = self.get_balance(root)

        if balance > 1 and key < root.left.key:
            return self.right_rotate(root)
        if balance < -1 and key > root.right.key:
            return self.left_rotate(root)
        if balance > 1 and key > root.left.key:
            root.left = self.left_rotate(root.left)
            return self.right_rotate(root)
        if balance < -1 and key < root.right.key:
            root.right = self.right_rotate(root.right)
            return self.left_rotate(root)
        return root

    def left_rotate(self, z):
        y = z.right
        T2 = y.left
        y.left = z
        z.right = T2
        z.height = 1 + max(self.get_height(z.left), self.get_height(z.right))
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        return y

    def right_rotate(self, z):
        y = z.left
        T3 = y.right
        y.right = z
        z.left = T3
        z.height = 1 + max(self.get_height(z.left), self.get_height(z.right))
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        return y

    def get_height(self, root):
        if not root:
            return 0
        return root.height

    def get_balance(self, root):
        if not root:
            return 0
        return self.get_height(root.left) - self.get_height(root.right)

    def preorder(self, root):
        res = []
        if root:
            res.append(root.key)
            res += self.preorder(root.left)
            res += self.preorder(root.right)
        return res

    def inorder(self, root):
        res = []
        if root:
            res += self.inorder(root.left)
            res.append(root.key)
            res += self.inorder(root.right)
        return res

class FenwickTreeFull:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def query(self, i):
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & -i
        return s

    def range_query(self, l, r):
        return self.query(r) - self.query(l - 1)

class UnionFindFull:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x, y):
        rootx = self.find(x)
        rooty = self.find(y)
        if rootx == rooty:
            return False
        if self.rank[rootx] < self.rank[rooty]:
            rootx, rooty = rooty, rootx
        self.parent[rooty] = rootx
        self.size[rootx] += self.size[rooty]
        if self.rank[rootx] == self.rank[rooty]:
            self.rank[rootx] += 1
        return True

class LruCacheFull:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = collections.OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

class MinHeapFull:
    def __init__(self):
        self.heap = []

    def push(self, val):
        heapq.heappush(self.heap, val)

    def pop(self):
        return heapq.heappop(self.heap) if self.heap else None

    def peek(self):
        return self.heap[0] if self.heap else None

class MaxHeapFull:
    def __init__(self):
        self.heap = []

    def push(self, val):
        heapq.heappush(self.heap, -val)

    def pop(self):
        return -heapq.heappop(self.heap) if self.heap else None

    def peek(self):
        return -self.heap[0] if self.heap else None

class GraphFull:
    def __init__(self, n):
        self.n = n
        self.adj = [[] for _ in range(n)]

    def add_edge(self, u, v, w=1):
        self.adj[u].append((v, w))
        self.adj[v].append((u, w))

    def bfs(self, start):
        visited = [False] * self.n
        queue = collections.deque([start])
        visited[start] = True
        order = []
        while queue:
            u = queue.popleft()
            order.append(u)
            for v, _ in self.adj[u]:
                if not visited[v]:
                    visited[v] = True
                    queue.append(v)
        return order

    def dfs(self, start):
        visited = [False] * self.n
        order = []

        def _dfs(u):
            visited[u] = True
            order.append(u)
            for v, _ in self.adj[u]:
                if not visited[v]:
                    _dfs(v)

        _dfs(start)
        return order

    def dijkstra(self, src):
        dist = [float('inf')] * self.n
        dist[src] = 0
        pq = [(0, src)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in self.adj[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    heapq.heappush(pq, (dist[v], v))
        return dist

    def bellman_ford(self, src):
        dist = [float('inf')] * self.n
        dist[src] = 0
        for _ in range(self.n - 1):
            for u in range(self.n):
                for v, w in self.adj[u]:
                    if dist[u] + w < dist[v]:
                        dist[v] = dist[u] + w
        for u in range(self.n):
            for v, w in self.adj[u]:
                if dist[u] + w < dist[v]:
                    raise ValueError("Negative weight cycle")
        return dist

class StringAlgorithmsFull:
    @staticmethod
    def kmp_search(text, pattern):
        if not pattern:
            return []
        lps = [0] * len(pattern)
        j = 0
        for i in range(1, len(pattern)):
            while j > 0 and pattern[i] != pattern[j]:
                j = lps[j - 1]
            if pattern[i] == pattern[j]:
                j += 1
            lps[i] = j
        result = []
        j = 0
        for i in range(len(text)):
            while j > 0 and text[i] != pattern[j]:
                j = lps[j - 1]
            if text[i] == pattern[j]:
                j += 1
            if j == len(pattern):
                result.append(i - j + 1)
                j = lps[j - 1]
        return result

    @staticmethod
    def rabin_karp(text, pattern, q=101):
        n, m = len(text), len(pattern)
        d = 256
        p, t, h = 0, 0, 1
        result = []
        for i in range(m - 1):
            h = (h * d) % q
        for i in range(m):
            p = (d * p + ord(pattern[i])) % q
            t = (d * t + ord(text[i])) % q
        for i in range(n - m + 1):
            if p == t:
                if text[i:i + m] == pattern:
                    result.append(i)
            if i < n - m:
                t = (d * (t - ord(text[i]) * h) + ord(text[i + m])) % q
                if t < 0:
                    t += q
        return result

    @staticmethod
    def longest_palindrome(s):
        if not s:
            return ""
        start, end = 0, 0
        for i in range(len(s)):
            len1 = StringAlgorithmsFull._expand(s, i, i)
            len2 = StringAlgorithmsFull._expand(s, i, i + 1)
            max_len = max(len1, len2)
            if max_len > end - start:
                start = i - (max_len - 1) // 2
                end = i + max_len // 2
        return s[start:end + 1]

    @staticmethod
    def _expand(s, left, right):
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return right - left - 1

class DpAlgorithmsFull:
    @staticmethod
    def lcs(s1, s2):
        m, n = len(s1), len(s2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s1[i - 1] == s2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[m][n]

    @staticmethod
    def knapsack(weights, values, capacity):
        n = len(weights)
        dp = [[0] * (capacity + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            for w in range(1, capacity + 1):
                if weights[i - 1] <= w:
                    dp[i][w] = max(values[i - 1] + dp[i - 1][w - weights[i - 1]], dp[i - 1][w])
                else:
                    dp[i][w] = dp[i - 1][w]
        return dp[n][capacity]

    @staticmethod
    def lis(nums):
        if not nums:
            return 0
        dp = [1] * len(nums)
        for i in range(1, len(nums)):
            for j in range(i):
                if nums[i] > nums[j]:
                    dp[i] = max(dp[i], dp[j] + 1)
        return max(dp)

    @staticmethod
    def coin_change(coins, amount):
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for coin in coins:
            for i in range(coin, amount + 1):
                dp[i] = min(dp[i], dp[i - coin] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1

class MatrixFull:
    def __init__(self, data):
        self.data = data
        self.rows = len(data)
        self.cols = len(data[0]) if self.rows > 0 else 0

    def multiply(self, other):
        if self.cols != other.rows:
            raise ValueError("Incompatible dimensions")
        result = [[0] * other.cols for _ in range(self.rows)]
        for i in range(self.rows):
            for j in range(other.cols):
                for k in range(self.cols):
                    result[i][j] += self.data[i][k] * other.data[k][j]
        return MatrixFull(result)

    def transpose(self):
        result = [[0] * self.rows for _ in range(self.cols)]
        for i in range(self.rows):
            for j in range(self.cols):
                result[j][i] = self.data[i][j]
        return MatrixFull(result)

    def determinant(self):
        if self.rows != self.cols:
            raise ValueError("Must be square")
        if self.rows == 1:
            return self.data[0][0]
        if self.rows == 2:
            return self.data[0][0] * self.data[1][1] - self.data[0][1] * self.data[1][0]
        det = 0
        for c in range(self.cols):
            sub = MatrixFull([row[:c] + row[c + 1:] for row in self.data[1:]])
            det += ((-1) ** c) * self.data[0][c] * sub.determinant()
        return det

class TestSuiteFull:
    @staticmethod
    def run_all():
        print("Running test suite...")
        assert DpAlgorithmsFull.lcs("AGGTAB", "GXTXAYB") == 4
        assert DpAlgorithmsFull.knapsack([1, 2, 3], [10, 15, 40], 5) == 55
        assert DpAlgorithmsFull.lis([10, 9, 2, 5, 3, 7, 101, 18]) == 4
        assert DpAlgorithmsFull.coin_change([1, 2, 5], 11) == 3
        m1 = MatrixFull([[1, 2], [3, 4]])
        m2 = MatrixFull([[5, 6], [7, 8]])
        assert m1.multiply(m2).data == [[19, 22], [43, 50]]
        assert m1.determinant() == -2
        sa = SuffixArray("banana")
        assert len(sa.sa) == 6
        trie = TrieFull()
        trie.insert("apple")
        assert trie.search("apple") is True
        assert trie.starts_with("app") is True
        assert trie.count_prefix("ap") == 1
        avl = AvlTreeFull()
        root = None
        for k in [10, 20, 30, 40, 50, 25]:
            root = avl.insert(root, k)
        assert avl.preorder(root) == [30, 20, 10, 25, 40, 50]
        ft = FenwickTreeFull(10)
        ft.update(1, 5)
        ft.update(2, 3)
        assert ft.query(2) == 8
        uf = UnionFindFull(5)
        uf.union(0, 1)
        uf.union(1, 2)
        assert uf.find(0) == uf.find(2)
        lru = LruCacheFull(2)
        lru.put(1, 1)
        lru.put(2, 2)
        assert lru.get(1) == 1
        lru.put(3, 3)
        assert lru.get(2) == -1
        st = SegmentTreeLazy([1, 2, 3, 4, 5])
        assert st.query(0, 4) == 15
        st.update(1, 3, 10)
        assert st.query(0, 4) == 45
        g = GraphFull(4)
        g.add_edge(0, 1, 1)
        g.add_edge(1, 2, 2)
        g.add_edge(2, 3, 3)
        assert g.bfs(0) == [0, 1, 2, 3]
        assert g.dfs(0) == [0, 1, 2, 3]
        assert g.dijkstra(0) == [0, 1, 3, 6]
        assert StringAlgorithmsFull.kmp_search("ABABDABACDABABCABAB", "ABABCABAB") == [10]
        print("All tests passed!")

if __name__ == "__main__":
    TestSuiteFull.run_all()

import math
import random
import collections
import heapq
import sys

class LruCacheExtended:
    """An extended Least Recently Used (LRU) cache implementation."""
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = collections.OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key not in self.cache:
            self.misses += 1
            return None
        self.hits += 1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def get_stats(self):
        return {"hits": self.hits, "misses": self.misses, "size": len(self.cache)}

class UnionFindExtended:
    """An extended Union-Find (Disjoint Set) data structure."""
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n
        self.components = n

    def find(self, i):
        if self.parent[i] != i:
            self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
                self.size[root_j] += self.size[root_i]
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
                self.size[root_i] += self.size[root_j]
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
                self.size[root_i] += self.size[root_j]
            self.components -= 1

    def connected(self, i, j):
        return self.find(i) == self.find(j)

    def get_component_size(self, i):
        return self.size[self.find(i)]

    def get_component_count(self):
        return self.components

class TrieExtended:
    """An extended Trie (Prefix Tree) data structure."""
    class Node:
        def __init__(self):
            self.children = {}
            self.is_end = False
            self.freq = 0
            self.prefix_count = 0

    def __init__(self):
        self.root = self.Node()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = self.Node()
            node = node.children[char]
            node.prefix_count += 1
        node.is_end = True
        node.freq += 1

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True

    def count_prefix(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.prefix_count

class FenwickTreeExtended:
    """An extended Fenwick Tree (Binary Indexed Tree) for range queries."""
    def __init__(self, size):
        self.size = size
        self.tree = [0] * (size + 1)

    def update(self, index, delta):
        while index <= self.size:
            self.tree[index] += delta
            index += index & -index

    def prefix_sum(self, index):
        total = 0
        while index > 0:
            total += self.tree[index]
            index -= index & -index
        return total

    def range_sum(self, left, right):
        return self.prefix_sum(right) - self.prefix_sum(left - 1)

class SegmentTreeExtended:
    """An extended Segment Tree for range sum queries and point updates."""
    def __init__(self, data):
        self.n = len(data)
        self.tree = [0] * (4 * self.n)
        self.build(0, 0, self.n - 1, data)

    def build(self, node, start, end, data):
        if start == end:
            self.tree[node] = data[start]
        else:
            mid = (start + end) // 2
            self.build(2 * node + 1, start, mid, data)
            self.build(2 * node + 2, mid + 1, end, data)
            self.tree[node] = self.tree[2 * node + 1] + self.tree[2 * node + 2]

    def update(self, idx, val, node=0, start=0, end=None):
        if end is None:
            end = self.n - 1
        if start == end:
            self.tree[node] = val
        else:
            mid = (start + end) // 2
            if start <= idx <= mid:
                self.update(idx, val, 2 * node + 1, start, mid)
            else:
                self.update(idx, val, 2 * node + 2, mid + 1, end)
            self.tree[node] = self.tree[2 * node + 1] + self.tree[2 * node + 2]

    def query(self, l, r, node=0, start=0, end=None):
        if end is None:
            end = self.n - 1
        if r < start or l > end:
            return 0
        if l <= start and end <= r:
            return self.tree[node]
        mid = (start + end) // 2
        left_sum = self.query(l, r, 2 * node + 1, start, mid)
        right_sum = self.query(l, r, 2 * node + 2, mid + 1, end)
        return left_sum + right_sum

class PriorityQueueExtended:
    """An extended Priority Queue supporting multiple priorities."""
    def __init__(self):
        self.heap = []
        self.counter = 0

    def push(self, item, priority):
        heapq.heappush(self.heap, (-priority, self.counter, item))
        self.counter += 1

    def pop(self):
        if not self.heap:
            return None
        return heapq.heappop(self.heap)[-1]

    def peek(self):
        if not self.heap:
            return None
        return self.heap[0][-1]

class MatrixExtended:
    """An extended Matrix class for basic linear algebra."""
    def __init__(self, data):
        self.data = data
        self.rows = len(data)
        self.cols = len(data[0]) if self.rows > 0 else 0

    def add(self, other):
        if self.rows != other.rows or self.cols != other.cols:
            raise ValueError("Matrices must have the same dimensions")
        result = [[self.data[i][j] + other.data[i][j] for j in range(self.cols)] for i in range(self.rows)]
        return MatrixExtended(result)

    def multiply(self, other):
        if self.cols != other.rows:
            raise ValueError("Incompatible dimensions")
        result = [[0] * other.cols for _ in range(self.rows)]
        for i in range(self.rows):
            for j in range(other.cols):
                for k in range(self.cols):
                    result[i][j] += self.data[i][k] * other.data[k][j]
        return MatrixExtended(result)

    def transpose(self):
        result = [[self.data[i][j] for i in range(self.rows)] for j in range(self.cols)]
        return MatrixExtended(result)

    def determinant(self):
        if self.rows != self.cols:
            raise ValueError("Must be square")
        if self.rows == 1:
            return self.data[0][0]
        if self.rows == 2:
            return self.data[0][0] * self.data[1][1] - self.data[0][1] * self.data[1][0]
        det = 0
        for c in range(self.cols):
            sub = MatrixExtended([row[:c] + row[c + 1:] for row in self.data[1:]])
            det += ((-1) ** c) * self.data[0][c] * sub.determinant()
        return det

class GraphExtended:
    """An extended Graph class with multiple algorithms."""
    def __init__(self, vertices):
        self.V = vertices
        self.adj = [[] for _ in range(vertices)]

    def add_edge(self, u, v, weight=1):
        self.adj[u].append((v, weight))
        self.adj[v].append((u, weight))

    def bfs(self, start):
        visited = [False] * self.V
        queue = collections.deque([start])
        visited[start] = True
        order = []
        while queue:
            u = queue.popleft()
            order.append(u)
            for v, _ in self.adj[u]:
                if not visited[v]:
                    visited[v] = True
                    queue.append(v)
        return order

    def dfs(self, start):
        visited = [False] * self.V
        order = []

        def _dfs(u):
            visited[u] = True
            order.append(u)
            for v, _ in self.adj[u]:
                if not visited[v]:
                    _dfs(v)

        _dfs(start)
        return order

    def dijkstra(self, src):
        dist = [float('inf')] * self.V
        dist[src] = 0
        pq = [(0, src)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in self.adj[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    heapq.heappush(pq, (dist[v], v))
        return dist

class StringExtended:
    """An extended set of string algorithms."""
    @staticmethod
    def kmp_search(text, pattern):
        if not pattern:
            return []
        lps = [0] * len(pattern)
        j = 0
        for i in range(1, len(pattern)):
            while j > 0 and pattern[i] != pattern[j]:
                j = lps[j - 1]
            if pattern[i] == pattern[j]:
                j += 1
            lps[i] = j
        result = []
        j = 0
        for i in range(len(text)):
            while j > 0 and text[i] != pattern[j]:
                j = lps[j - 1]
            if text[i] == pattern[j]:
                j += 1
            if j == len(pattern):
                result.append(i - j + 1)
                j = lps[j - 1]
        return result

    @staticmethod
    def rabin_karp(text, pattern, q=101):
        n, m = len(text), len(pattern)
        d = 256
        p, t, h = 0, 0, 1
        result = []
        for i in range(m - 1):
            h = (h * d) % q
        for i in range(m):
            p = (d * p + ord(pattern[i])) % q
            t = (d * t + ord(text[i])) % q
        for i in range(n - m + 1):
            if p == t:
                if text[i:i + m] == pattern:
                    result.append(i)
            if i < n - m:
                t = (d * (t - ord(text[i]) * h) + ord(text[i + m])) % q
                if t < 0:
                    t += q
        return result

    @staticmethod
    def longest_palindromic_substring(s):
        if not s:
            return ""
        start, end = 0, 0
        for i in range(len(s)):
            len1 = StringExtended._expand(s, i, i)
            len2 = StringExtended._expand(s, i, i + 1)
            max_len = max(len1, len2)
            if max_len > end - start:
                start = i - (max_len - 1) // 2
                end = i + max_len // 2
        return s[start:end + 1]

    @staticmethod
    def _expand(s, left, right):
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return right - left - 1

class DpExtended:
    """An extended set of dynamic programming algorithms."""
    @staticmethod
    def lcs(s1, s2):
        m, n = len(s1), len(s2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s1[i - 1] == s2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[m][n]

    @staticmethod
    def knapsack(weights, values, capacity):
        n = len(weights)
        dp = [[0] * (capacity + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            for w in range(1, capacity + 1):
                if weights[i - 1] <= w:
                    dp[i][w] = max(values[i - 1] + dp[i - 1][w - weights[i - 1]], dp[i - 1][w])
                else:
                    dp[i][w] = dp[i - 1][w]
        return dp[n][capacity]

    @staticmethod
    def lis(nums):
        if not nums:
            return 0
        dp = [1] * len(nums)
        for i in range(1, len(nums)):
            for j in range(i):
                if nums[i] > nums[j]:
                    dp[i] = max(dp[i], dp[j] + 1)
        return max(dp)

    @staticmethod
    def coin_change(coins, amount):
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for coin in coins:
            for i in range(coin, amount + 1):
                dp[i] = min(dp[i], dp[i - coin] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1

def test_massive_structures():
    print("Running massive structure tests...")
    assert DpExtended.lcs("AGGTAB", "GXTXAYB") == 4
    assert DpExtended.knapsack([1, 2, 3], [10, 15, 40], 5) == 55
    assert DpExtended.lis([10, 9, 2, 5, 3, 7, 101, 18]) == 4
    assert DpExtended.coin_change([1, 2, 5], 11) == 3
    m1 = MatrixExtended([[1, 2], [3, 4]])
    m2 = MatrixExtended([[5, 6], [7, 8]])
    assert m1.multiply(m2).data == [[19, 22], [43, 50]]
    assert m1.determinant() == -2
    trie = TrieExtended()
    trie.insert("apple")
    assert trie.search("apple") is True
    assert trie.starts_with("app") is True
    assert trie.count_prefix("ap") == 1
    ft = FenwickTreeExtended(10)
    ft.update(1, 5)
    ft.update(2, 3)
    assert ft.prefix_sum(2) == 8
    uf = UnionFindExtended(5)
    uf.union(0, 1)
    uf.union(1, 2)
    assert uf.connected(0, 2)
    lru = LruCacheExtended(2)
    lru.put(1, 1)
    lru.put(2, 2)
    assert lru.get(1) == 1
    lru.put(3, 3)
    assert lru.get(2) is None
    st = SegmentTreeExtended([1, 2, 3, 4, 5])
    assert st.query(0, 4) == 15
    st.update(1, 10)
    assert st.query(0, 4) == 24
    g = GraphExtended(4)
    g.add_edge(0, 1, 1)
    g.add_edge(1, 2, 2)
    g.add_edge(2, 3, 3)
    assert g.bfs(0) == [0, 1, 2, 3]
    assert g.dfs(0) == [0, 1, 2, 3]
    assert g.dijkstra(0) == [0, 1, 3, 6]
    assert StringExtended.kmp_search("ABABDABACDABABCABAB", "ABABCABAB") == [10]
    assert StringExtended.rabin_karp("ABABDABACDABABCABAB", "ABABCABAB") == [10]
    assert StringExtended.longest_palindromic_substring("babad") in ["bab", "aba"]
    print("All massive tests passed!")

if __name__ == "__main__":
    test_massive_structures()
