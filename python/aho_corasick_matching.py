import collections

class TrieNode:
    def __init__(self):
        self.children = {}
        self.fail = None
        self.output = []

class AhoCorasick:
    def __init__(self):
        self.root = TrieNode()

    def add_word(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.output.append(word)

    def build(self):
        queue = collections.deque()
        for child in self.root.children.values():
            child.fail = self.root
            queue.append(child)
            
        while queue:
            current = queue.popleft()
            for char, child in current.children.items():
                queue.append(child)
                fail = current.fail
                while fail and char not in fail.children:
                    fail = fail.fail
                child.fail = fail.children[char] if fail and char in fail.children else self.root
                child.output.extend(child.fail.output)

    def search(self, text):
        results = []
        node = self.root
        for i, char in enumerate(text):
            while node and char not in node.children:
                node = node.fail
            if not node:
                node = self.root
                continue
            node = node.children[char]
            for pattern in node.output:
                results.append((i - len(pattern) + 1, pattern))
        return results

if __name__ == "__main__":
    ac = AhoCorasick()
    words = ["he", "she", "his", "hers"]
    for w in words:
        ac.add_word(w)
    ac.build()
    
    text = "ushers"
    matches = ac.search(text)
    print("Text:", text)
    print("Matches:", matches)
    print("Expected:", [(1, 'she'), (2, 'he'), (2, 'hers')])
    print("Success:", sorted(matches) == sorted([(1, 'she'), (2, 'he'), (2, 'hers')]))
