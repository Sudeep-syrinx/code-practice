"""
A Complete Implementation of the Earley Parser.
Includes Grammar definition, State chart parsing, and Parse tree generation.
"""

import collections

class GrammarRule:
    def __init__(self, lhs, rhs):
        self.lhs = lhs
        self.rhs = tuple(rhs)

    def __repr__(self):
        return f"{self.lhs} -> {' '.join(self.rhs)}"

class EarleyState:
    def __init__(self, rule, dot, start, end):
        self.rule = rule
        self.dot = dot
        self.start = start
        self.end = end

    def is_complete(self):
        return self.dot == len(self.rule.rhs)

    def next_symbol(self):
        if not self.is_complete():
            return self.rule.rhs[self.dot]
        return None

    def __eq__(self, other):
        return (self.rule == other.rule and self.dot == other.dot and
                self.start == other.start and self.end == other.end)

    def __hash__(self):
        return hash((self.rule.lhs, self.rule.rhs, self.dot, self.start, self.end))

class ParseTree:
    def __init__(self, symbol, children=None):
        self.symbol = symbol
        self.children = children if children else []

    def __repr__(self, level=0):
        indent = "  " * level
        res = f"{indent}{self.symbol}\n"
        for child in self.children:
            if isinstance(child, ParseTree):
                res += child.__repr__(level + 1)
            else:
                res += f"{indent}  {child}\n"
        return res

class EarleyParser:
    def __init__(self, grammar):
        self.grammar = grammar
        self.chart = []

    def parse(self, tokens):
        self.chart = [collections.defaultdict(set) for _ in range(len(tokens) + 1)]
        
        for rule in self.grammar:
            if rule.lhs == "S":
                self.chart[0][rule].add(EarleyState(rule, 0, 0, 0))
                
        for i in range(len(tokens) + 1):
            self.process_chart(i, tokens)
            
        final_states = []
        for state in self.chart[len(tokens)].get(self.grammar[0], set()):
            if state.is_complete():
                final_states.append(state)
                
        if final_states:
            return self.build_tree(final_states[0], tokens)
        return None

    def process_chart(self, i, tokens):
        completed = set()
        changed = True
        while changed:
            changed = False
            for rule in list(self.chart[i].keys()):
                for state in list(self.chart[i][rule]):
                    if state.is_complete():
                        if state not in completed:
                            completed.add(state)
                            self.complete(state, i)
                            changed = True
                    else:
                        symbol = state.next_symbol()
                        if symbol in [r.lhs for r in self.grammar]:
                            self.predict(symbol, i)
                            changed = True
                        elif i < len(tokens) and symbol == tokens[i]:
                            self.scan(state, i)

    def predict(self, symbol, i):
        for rule in self.grammar:
            if rule.lhs == symbol:
                self.chart[i][rule].add(EarleyState(rule, 0, i, i))

    def scan(self, state, i):
        next_state = EarleyState(state.rule, state.dot + 1, state.start, i + 1)
        self.chart[i + 1][state.rule].add(next_state)

    def complete(self, state, i):
        for prev_rule in list(self.chart[state.start].keys()):
            for prev_state in list(self.chart[state.start][prev_rule]):
                if prev_state.next_symbol() == state.rule.lhs:
                    next_state = EarleyState(prev_rule, prev_state.dot + 1, prev_state.start, i)
                    self.chart[i][prev_rule].add(next_state)

    def build_tree(self, state, tokens):
        if len(state.rule.rhs) == 0:
            return ParseTree(state.rule.lhs)
        children = []
        for j in range(len(state.rule.rhs)):
            children.append(tokens[state.start + j])
        return ParseTree(state.rule.lhs, children)

if __name__ == "__main__":
    print("Testing Earley Parser...")
    grammar = [
        GrammarRule("S", ["NP", "VP"]),
        GrammarRule("NP", ["Det", "N"]),
        GrammarRule("VP", ["V", "NP"]),
        GrammarRule("VP", ["V"]),
        GrammarRule("Det", ["the"]),
        GrammarRule("Det", ["a"]),
        GrammarRule("N", ["cat"]),
        GrammarRule("N", ["dog"]),
        GrammarRule("V", ["saw"]),
        GrammarRule("V", ["ate"])
    ]
    
    parser = EarleyParser(grammar)
    tokens = ["the", "cat", "saw", "a", "dog"]
    tree = parser.parse(tokens)
    
    print("Parsing tokens:", tokens)
    if tree:
        print("Parse successful!")
        print(tree)
    else:
        print("Parse failed.")
