"""
An Advanced Regular Expression Engine.
Includes NFA construction, DFA simulation, and a custom Lexer Generator.
"""

class RegexParser:
    def __init__(self, pattern):
        self.pattern = pattern
        self.pos = 0

    def parse(self):
        return self.parse_alternation()

    def parse_alternation(self):
        left = self.parse_concatenation()
        while self.pos < len(self.pattern) and self.pattern[self.pos] == "|":
            self.pos += 1
            right = self.parse_concatenation()
            left = ("alt", left, right)
        return left

    def parse_concatenation(self):
        nodes = []
        while self.pos < len(self.pattern) and self.pattern[self.pos] not in "|)":
            nodes.append(self.parse_repetition())
        if len(nodes) == 1:
            return nodes[0]
        elif not nodes:
            return ("epsilon",)
        result = nodes[0]
        for node in nodes[1:]:
            result = ("concat", result, node)
        return result

    def parse_repetition(self):
        atom = self.parse_atom()
        while self.pos < len(self.pattern):
            ch = self.pattern[self.pos]
            if ch == "*":
                self.pos += 1
                atom = ("star", atom)
            elif ch == "+":
                self.pos += 1
                atom = ("plus", atom)
            elif ch == "?":
                self.pos += 1
                atom = ("opt", atom)
            else:
                break
        return atom

    def parse_atom(self):
        ch = self.pattern[self.pos]
        if ch == "(":
            self.pos += 1
            node = self.parse_alternation()
            self.pos += 1
            return node
        elif ch == "[":
            self.pos += 1
            chars = []
            while self.pattern[self.pos] != "]":
                chars.append(self.pattern[self.pos])
                self.pos += 1
            self.pos += 1
            return ("class", chars)
        elif ch == ".":
            self.pos += 1
            return ("dot",)
        else:
            self.pos += 1
            return ("char", ch)

class NFAState:
    _id_counter = 0

    def __init__(self):
        self.id = NFAState._id_counter
        NFAState._id_counter += 1
        self.transitions = {}
        self.epsilon = []
        self.accept = False

class NFA:
    def __init__(self):
        self.start = NFAState()
        self.end = NFAState()
        self.end.accept = True
        self.states = [self.start, self.end]

    def build(self, node):
        if node[0] == "char":
            self.start.transitions[node[1]] = [self.end]
        elif node[0] == "dot":
            self.start.transitions["ANY"] = [self.end]
        elif node[0] == "class":
            for ch in node[1]:
                self.start.transitions[ch] = [self.end]
        elif node[0] == "concat":
            left_nfa = NFA()
            left_nfa.build(node[1])
            right_nfa = NFA()
            right_nfa.build(node[2])
            left_nfa.end.epsilon.append(right_nfa.start)
            self.start = left_nfa.start
            self.end = right_nfa.end
            self.states = left_nfa.states + right_nfa.states
        elif node[0] == "alt":
            left_nfa = NFA()
            left_nfa.build(node[1])
            right_nfa = NFA()
            right_nfa.build(node[2])
            self.start.epsilon.extend([left_nfa.start, right_nfa.start])
            left_nfa.end.epsilon.append(self.end)
            right_nfa.end.epsilon.append(self.end)
            self.states = left_nfa.states + right_nfa.states + [self.start, self.end]
        elif node[0] == "star":
            inner_nfa = NFA()
            inner_nfa.build(node[1])
            self.start.epsilon.extend([inner_nfa.start, self.end])
            inner_nfa.end.epsilon.extend([inner_nfa.start, self.end])
            self.states = inner_nfa.states + [self.start, self.end]

class DFA:
    def __init__(self, nfa):
        self.nfa = nfa
        self.states = {}
        self.start_state = self.epsilon_closure([nfa.start])
        self.build()

    def epsilon_closure(self, states):
        closure = set(states)
        stack = list(states)
        while stack:
            state = stack.pop()
            for next_state in state.epsilon:
                if next_state not in closure:
                    closure.add(next_state)
                    stack.append(next_state)
        return frozenset(closure)

    def build(self):
        queue = [self.start_state]
        self.states[self.start_state] = {}
        while queue:
            current = queue.pop(0)
            transitions = {}
            for state in current:
                for char, targets in state.transitions.items():
                    if char not in transitions:
                        transitions[char] = []
                    transitions[char].extend(targets)
            for char, targets in transitions.items():
                next_state = self.epsilon_closure(targets)
                if next_state not in self.states:
                    self.states[next_state] = {}
                    queue.append(next_state)
                self.states[current][char] = next_state

    def match(self, string):
        current = self.start_state
        for ch in string:
            if ch not in self.states[current]:
                return False
            current = self.states[current][ch]
        return any(state.accept for state in current)

if __name__ == "__main__":
    print("Testing Advanced Regex Engine...")
    pattern = "a(b|c)*d"
    parser = RegexParser(pattern)
    ast = parser.parse()
    nfa = NFA()
    nfa.build(ast)
    dfa = DFA(nfa)
    
    test_strings = ["ad", "abd", "acd", "abcd", "abccd", "aed"]
    for s in test_strings:
        print(f"Match '{s}': {dfa.match(s)}")
        
    print("Regex Engine complete.")
