class State:
    def __init__(self):
        self.next = {}
        self.link = -1
        self.len = 0
        self.first_pos = -1


class SuffixAutomaton:
    def __init__(self):
        self.states = [State()]
        self.last = 0

    def extend(self, ch):
        cur = len(self.states)
        self.states.append(State())
        self.states[cur].len = self.states[self.last].len + 1
        self.states[cur].first_pos = self.states[cur].len - 1
        p = self.last
        while p >= 0 and ch not in self.states[p].next:
            self.states[p].next[ch] = cur
            p = self.states[p].link
        if p == -1:
            self.states[cur].link = 0
        else:
            q = self.states[p].next[ch]
            if self.states[p].len + 1 == self.states[q].len:
                self.states[cur].link = q
            else:
                clone = len(self.states)
                self.states.append(State())
                self.states[clone].len = self.states[p].len + 1
                self.states[clone].next = self.states[q].next.copy()
                self.states[clone].link = self.states[q].link
                self.states[clone].first_pos = self.states[q].first_pos
                while p >= 0 and self.states[p].next.get(ch) == q:
                    self.states[p].next[ch] = clone
                    p = self.states[p].link
                self.states[q].link = self.states[cur].link = clone
        self.last = cur

    def build(self, text):
        for ch in text:
            self.extend(ch)

    def contains(self, pattern):
        v = 0
        for ch in pattern:
            if ch not in self.states[v].next:
                return False
            v = self.states[v].next[ch]
        return True

    def longest_common_substring(self, other):
        v = 0
        length = 0
        best = 0
        best_pos = 0
        for i, ch in enumerate(other):
            while v and ch not in self.states[v].next:
                v = self.states[v].link
                length = self.states[v].len
            if ch in self.states[v].next:
                v = self.states[v].next[ch]
                length += 1
            if length > best:
                best = length
                best_pos = i
        return best, best_pos - best + 1


if __name__ == "__main__":
    sa = SuffixAutomaton()
    sa.build("abacaba")
    print("Contains 'aba'       :", sa.contains("aba"))
    print("Contains 'cab'       :", sa.contains("cab"))
    print("Contains 'abc'       :", sa.contains("abc"))
    print("Contains 'abacaba'   :", sa.contains("abacaba"))
    print("States               :", len(sa.states))

    sa2 = SuffixAutomaton()
    sa2.build("xxabcyy")
    length, pos = sa2.longest_common_substring("zzabcww")
    print()
    print("LCS length           :", length)
    print("LCS pos in 2nd       :", pos)
    print("Expected 3           :", length == 3)

    # empty
    empty = SuffixAutomaton()
    print("Empty contains       :", empty.contains("") == True)
    print("Empty no 'a'         :", empty.contains("a") == False)
