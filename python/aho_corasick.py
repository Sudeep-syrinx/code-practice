from collections import deque, defaultdict


class AhoCorasick:
    def __init__(self):
        self.goto = [defaultdict(int)]
        self.fail = [0]
        self.out = [set()]
        self.built = False

    def add(self, pattern, pattern_id=None):
        if self.built:
            raise RuntimeError("Cannot add patterns after build")
        if pattern_id is None:
            pattern_id = pattern
        node = 0
        for ch in pattern:
            if ch not in self.goto[node]:
                self.goto[node][ch] = len(self.goto)
                self.goto.append(defaultdict(int))
                self.fail.append(0)
                self.out.append(set())
            node = self.goto[node][ch]
        self.out[node].add(pattern_id)

    def build(self):
        q = deque()
        for ch, nxt in self.goto[0].items():
            q.append(nxt)
            self.fail[nxt] = 0
        while q:
            r = q.popleft()
            for ch, s in self.goto[r].items():
                q.append(s)
                state = self.fail[r]
                while state and ch not in self.goto[state]:
                    state = self.fail[state]
                self.fail[s] = self.goto[state].get(ch, 0)
                self.out[s] |= self.out[self.fail[s]]
        self.built = True

    def find(self, text):
        if not self.built:
            self.build()
        state = 0
        results = []
        for i, ch in enumerate(text):
            while state and ch not in self.goto[state]:
                state = self.fail[state]
            state = self.goto[state].get(ch, 0)
            for pat in self.out[state]:
                results.append((i, pat))
        return results

    def contains(self, text):
        return bool(self.find(text))


if __name__ == "__main__":
    ac = AhoCorasick()
    patterns = ["he", "she", "his", "hers"]
    for p in patterns:
        ac.add(p)
    ac.build()

    text = "ushers"
    hits = ac.find(text)
    print("Text                 :", text)
    print("Matches              :", hits)
    print("Expected positions   :", sorted(hits) == [(1, "she"), (2, "he"), (3, "hers")])

    ac2 = AhoCorasick()
    for p in ["abc", "bcdc", "bc", "a"]:
        ac2.add(p)
    print()
    print("Multi match          :", ac2.find("abcdc"))
    print("Contains 'xyz'       :", ac2.contains("xyzabc"))
    print("Empty patterns ok    :", AhoCorasick().find("hello") == [])

    # stress
    import random
    rng = random.Random(7)
    ok = True
    for _ in range(80):
        ac = AhoCorasick()
        pats = ["".join(rng.choice("abc") for _ in range(rng.randint(1, 4))) for _ in range(8)]
        for p in pats:
            ac.add(p)
        text = "".join(rng.choice("abc") for _ in range(40))
        hits = ac.find(text)
        for pos, pat in hits:
            end = pos + 1
            start = end - len(pat)
            if text[start:end] != pat:
                ok = False
    print("80 random trials ok  :", ok)
