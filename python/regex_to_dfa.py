from collections import defaultdict, deque

class State:
    _id = 0
    def __init__(self):
        self.id = State._id
        State._id += 1
        self.transitions = defaultdict(set)  # char -> set of states
        self.epsilon = set()

    def add_transition(self, char, state):
        self.transitions[char].add(state)

    def add_epsilon(self, state):
        self.epsilon.add(state)

class NFA:
    def __init__(self, start, accept):
        self.start = start
        self.accept = accept

def char_nfa(c):
    s = State()
    a = State()
    s.add_transition(c, a)
    return NFA(s, a)

def concat(n1, n2):
    n1.accept.add_epsilon(n2.start)
    return NFA(n1.start, n2.accept)

def alt(n1, n2):
    s = State()
    a = State()
    s.add_epsilon(n1.start)
    s.add_epsilon(n2.start)
    n1.accept.add_epsilon(a)
    n2.accept.add_epsilon(a)
    return NFA(s, a)

def star(n):
    s = State()
    a = State()
    s.add_epsilon(n.start)
    s.add_epsilon(a)
    n.accept.add_epsilon(n.start)
    n.accept.add_epsilon(a)
    return NFA(s, a)

def plus(n):
    return concat(n, star(n))

def optional(n):
    s = State()
    a = State()
    s.add_epsilon(n.start)
    s.add_epsilon(a)
    n.accept.add_epsilon(a)
    return NFA(s, a)

def parse_regex(pattern):
    def atom(i):
        if i >= len(pattern):
            raise ValueError("Unexpected end")
        c = pattern[i]
        if c == "(":
            nfa, i = expr(i + 1)
            if i >= len(pattern) or pattern[i] != ")":
                raise ValueError("Missing )")
            return nfa, i + 1
        if c in ")*|+?":
            raise ValueError(f"Unexpected {c}")
        if c == ".":
            # any char except newline - simplified as single special
            s = State()
            a = State()
            for ch in map(chr, range(32, 127)):
                s.add_transition(ch, a)
            return NFA(s, a), i + 1
        return char_nfa(c), i + 1

    def factor(i):
        nfa, i = atom(i)
        while i < len(pattern) and pattern[i] in "*+?":
            op = pattern[i]
            if op == "*":
                nfa = star(nfa)
            elif op == "+":
                nfa = plus(nfa)
            else:
                nfa = optional(nfa)
            i += 1
        return nfa, i

    def term(i):
        nfa, i = factor(i)
        while i < len(pattern) and pattern[i] not in ")|":
            n2, i = factor(i)
            nfa = concat(nfa, n2)
        return nfa, i

    def expr(i):
        nfa, i = term(i)
        while i < len(pattern) and pattern[i] == "|":
            n2, i = term(i + 1)
            nfa = alt(nfa, n2)
        return nfa, i

    nfa, i = expr(0)
    if i != len(pattern):
        raise ValueError("Extra input")
    return nfa

def epsilon_closure(states):
    stack = list(states)
    closure = set(states)
    while stack:
        s = stack.pop()
        for t in s.epsilon:
            if t not in closure:
                closure.add(t)
                stack.append(t)
    return closure

def move(states, char):
    result = set()
    for s in states:
        result |= s.transitions.get(char, set())
    return result

def nfa_matches(nfa, text):
    current = epsilon_closure({nfa.start})
    for ch in text:
        current = epsilon_closure(move(current, ch))
        if not current:
            return False
    return nfa.accept in current

def nfa_to_dfa(nfa):
    start_set = frozenset(epsilon_closure({nfa.start}))
    dfa_states = {start_set: 0}
    accept_states = set()
    if nfa.accept in start_set:
        accept_states.add(0)
    transitions = {}
    queue = deque([start_set])
    state_id = 1
    alphabet = set()
    # collect alphabet
    def collect(s, seen):
        if s in seen:
            return
        seen.add(s)
        for c, targets in s.transitions.items():
            alphabet.add(c)
            for t in targets:
                collect(t, seen)
        for t in s.epsilon:
            collect(t, seen)
    collect(nfa.start, set())

    while queue:
        current = queue.popleft()
        cid = dfa_states[current]
        for ch in alphabet:
            nxt = frozenset(epsilon_closure(move(current, ch)))
            if not nxt:
                continue
            if nxt not in dfa_states:
                dfa_states[nxt] = state_id
                if nfa.accept in nxt:
                    accept_states.add(state_id)
                state_id += 1
                queue.append(nxt)
            transitions[(cid, ch)] = dfa_states[nxt]
    return {
        "start": 0,
        "accepts": accept_states,
        "transitions": transitions,
        "num_states": state_id,
    }

def dfa_matches(dfa, text):
    state = dfa["start"]
    for ch in text:
        key = (state, ch)
        if key not in dfa["transitions"]:
            return False
        state = dfa["transitions"][key]
    return state in dfa["accepts"]

if __name__ == "__main__":
    tests = [
        ("a*", ["", "a", "aa", "b"]),
        ("a|b", ["a", "b", "c", "ab"]),
        ("ab*", ["a", "ab", "abb", "b"]),
        ("(a|b)*abb", ["abb", "aabb", "babb", "ab", "bb"]),
        ("a+b?", ["a", "ab", "aa", "aab", "b"]),
        ("colou?r", ["color", "colour", "colouur"]),
    ]
    for pattern, strings in tests:
        print(f"Pattern: {pattern}")
        nfa = parse_regex(pattern)
        dfa = nfa_to_dfa(nfa)
        print(f"  DFA states: {dfa['num_states']}")
        for s in strings:
            nfa_ok = nfa_matches(nfa, s)
            dfa_ok = dfa_matches(dfa, s)
            print(f"  {s!r:12} NFA={nfa_ok} DFA={dfa_ok} {'OK' if nfa_ok == dfa_ok else 'MISMATCH'}")
        print()
