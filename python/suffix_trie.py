from collections import defaultdict

class SuffixTrieNode:
    def __init__(self):
        self.children = defaultdict(SuffixTrieNode)

class SuffixTrie:
    def __init__(self, text):
        self.root = SuffixTrieNode()
        for i in range(len(text)):
            self._insert_suffix(text[i:])

    def _insert_suffix(self, suffix):
        node = self.root
        for char in suffix:
            node = node.children[char]

    def contains(self, pattern):
        node = self.root
        for char in pattern:
            if char not in node.children:
                return False
            node = node.children[char]
        return True

if __name__ == "__main__":
    text = "banana"
    trie = SuffixTrie(text)
    print(f"Suffix Trie built for '{text}'")
    print("Contains 'ana':", trie.contains("ana"))
    print("Contains 'nan':", trie.contains("nan"))
    print("Contains 'xyz':", trie.contains("xyz"))
    print("Test passed:", trie.contains("ana") and not trie.contains("xyz"))
