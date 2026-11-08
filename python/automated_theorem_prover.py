"""
An Automated Theorem Prover for First-Order Logic.
Includes Unification, Resolution, and a Prover Loop.
"""

import copy

class Term:
    def __init__(self, name, args=None):
        self.name = name
        self.args = args if args else []

    def __eq__(self, other):
        return self.name == other.name and self.args == other.args

    def __hash__(self):
        return hash((self.name, tuple(self.args)))

    def __repr__(self):
        if not self.args:
            return self.name
        return f"{self.name}({', '.join(str(a) for a in self.args)})"

class Predicate:
    def __init__(self, name, args=None, negated=False):
        self.name = name
        self.args = args if args else []
        self.negated = negated

    def __eq__(self, other):
        return self.name == other.name and self.args == other.args and self.negated == other.negated

    def __hash__(self):
        return hash((self.name, tuple(self.args), self.negated))

    def __repr__(self):
        prefix = "NOT " if self.negated else ""
        if not self.args:
            return f"{prefix}{self.name}"
        return f"{prefix}{self.name}({', '.join(str(a) for a in self.args)})"

class Clause:
    def __init__(self, predicates):
        self.predicates = predicates

    def __repr__(self):
        return " OR ".join(str(p) for p in self.predicates)

def is_variable(term):
    return term.name.startswith("?") and not term.args

def unify(term1, term2, substitution=None):
    if substitution is None:
        substitution = {}
    if term1 == term2:
        return substitution
    if is_variable(term1):
        return unify_variable(term1, term2, substitution)
    if is_variable(term2):
        return unify_variable(term2, term1, substitution)
    if term1.name != term2.name or len(term1.args) != len(term2.args):
        return None
    for a1, a2 in zip(term1.args, term2.args):
        substitution = unify(a1, a2, substitution)
        if substitution is None:
            return None
    return substitution

def unify_variable(var, term, substitution):
    if var in substitution:
        return unify(substitution[var], term, substitution)
    if term in substitution:
        return unify(var, substitution[term], substitution)
    substitution[var] = term
    return substitution

def apply_substitution(predicate, substitution):
    new_args = []
    for arg in predicate.args:
        if is_variable(arg) and arg in substitution:
            new_args.append(substitution[arg])
        else:
            new_args.append(arg)
    return Predicate(predicate.name, new_args, predicate.negated)

def resolve(clause1, clause2):
    resolvents = []
    for p1 in clause1.predicates:
        for p2 in clause2.predicates:
            if p1.name == p2.name and p1.negated != p2.negated:
                sub = {}
                success = True
                for a1, a2 in zip(p1.args, p2.args):
                    sub = unify(a1, a2, sub)
                    if sub is None:
                        success = False
                        break
                if success:
                    new_predicates = []
                    for p in clause1.predicates:
                        if p != p1:
                            new_predicates.append(apply_substitution(p, sub))
                    for p in clause2.predicates:
                        if p != p2:
                            new_predicates.append(apply_substitution(p, sub))
                    if not new_predicates:
                        return []
                    resolvents.append(Clause(new_predicates))
    return resolvents

class TheoremProver:
    def __init__(self, axioms, goal):
        self.axioms = axioms
        negated_goal = Clause([Predicate(goal.name, goal.args, not goal.negated)])
        self.clauses = [Clause([a]) for a in axioms] + [negated_goal]

    def prove(self, max_steps=100):
        steps = 0
        while steps < max_steps:
            new_clauses = []
            for i in range(len(self.clauses)):
                for j in range(i + 1, len(self.clauses)):
                    resolvents = resolve(self.clauses[i], self.clauses[j])
                    for r in resolvents:
                        if len(r.predicates) == 0:
                            return True
                        if r not in self.clauses:
                            new_clauses.append(r)
            if not new_clauses:
                return False
            self.clauses.extend(new_clauses)
            steps += 1
        return False

if __name__ == "__main__":
    print("Testing Automated Theorem Prover...")
    P = Predicate("P", [])
    Q = Predicate("Q", [])
    
    axioms = [
        Predicate("Implies", [P, Q]),
        P
    ]
    
    goal = Q
    
    prover = TheoremProver([Predicate("P", []), Predicate("Q", [])], Q)
    print("Axioms and Goal set.")
    
    x = Term("?x")
    y = Term("?y")
    fact1 = Predicate("Human", [Term("Socrates")])
    rule1 = Predicate("Mortal", [x], negated=True)
    rule2 = Predicate("Human", [x], negated=False)
    
    axioms = [fact1, Predicate("Implies", [rule2, Predicate("Mortal", [x])])]
    goal = Predicate("Mortal", [Term("Socrates")])
    
    prover = TheoremProver(axioms, goal)
    result = prover.prove()
    print(f"Theorem proved: {result}")
    print("Theorem Prover complete.")
