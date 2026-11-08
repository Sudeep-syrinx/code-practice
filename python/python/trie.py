class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.count = 0


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            node.count += 1
        node.is_end = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True

    def count_prefix(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return 0
            node = node.children[ch]
        return node.count

    def autocomplete(self, prefix, limit=10):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        results = []
        self._dfs(node, prefix, results, limit)
        return results

    def _dfs(self, node, path, results, limit):
        if len(results) >= limit:
            return
        if node.is_end:
            results.append(path)
        for ch in sorted(node.children):
            self._dfs(node.children[ch], path + ch, results, limit)


if __name__ == "__main__":
    words = ["apple", "app", "apricot", "banana", "band", "bandana", "cat", "car", "card"]
    t = Trie()
    for w in words:
        t.insert(w)

    print("Search apple           :", t.search("apple"))
    print("Search appl            :", t.search("appl"))
    print("Starts with app        :", t.starts_with("app"))
    print("Starts with xyz        :", t.starts_with("xyz"))
    print("Count prefix 'ba'      :", t.count_prefix("ba"))
    print("Autocomplete 'ba'      :", t.autocomplete("ba"))
    print("Autocomplete 'car'     :", t.autocomplete("car"))
    print("Autocomplete 'z'       :", t.autocomplete("z"))

    import random
    rng = random.Random(99)
    ok = True
    for _ in range(200):
        trie = Trie()
        inserted = set()
        for _ in range(rng.randint(5, 40)):
            w = "".join(rng.choice("abcde") for _ in range(rng.randint(1, 6)))
            trie.insert(w)
            inserted.add(w)
        for w in inserted:
            if not trie.search(w):
                ok = False
        for _ in range(20):
            fake = "".join(rng.choice("abcde") for _ in range(rng.randint(1, 6)))
            if fake not in inserted and trie.search(fake):
                ok = False
    print("200 random trials ok   :", ok)
