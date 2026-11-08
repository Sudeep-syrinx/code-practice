from copy import deepcopy

def parse_dimacs(text):
    clauses = []
    nvars = 0
    for line in text.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("c"):
            continue
        if line.startswith("p"):
            parts = line.split()
            nvars = int(parts[2])
            continue
        nums = [int(x) for x in line.split() if x != "0"]
        if nums:
            clauses.append(nums)
    return nvars, clauses

class DPLL:
    def __init__(self, nvars, clauses):
        self.nvars = nvars
        self.clauses = clauses
        self.assignment = {}
        self.decisions = 0
        self.propagations = 0

    def solve(self):
        return self._dpll(self.clauses, {})

    def _dpll(self, clauses, assign):
        clauses, assign = self._unit_propagate(clauses, assign)
        if clauses is None:
            return False
        if not clauses:
            self.assignment = assign
            return True
        # pure literal elimination
        clauses, assign = self._pure_literals(clauses, assign)
        if not clauses:
            self.assignment = assign
            return True
        # choose variable
        var = self._pick_var(clauses, assign)
        self.decisions += 1
        for val in (True, False):
            new_assign = dict(assign)
            new_assign[var] = val
            new_clauses = self._simplify(clauses, var, val)
            if new_clauses is not None and self._dpll(new_clauses, new_assign):
                return True
        return False

    def _unit_propagate(self, clauses, assign):
        changed = True
        while changed:
            changed = False
            units = []
            for clause in clauses:
                unassigned = []
                satisfied = False
                for lit in clause:
                    var = abs(lit)
                    if var in assign:
                        if (lit > 0) == assign[var]:
                            satisfied = True
                            break
                    else:
                        unassigned.append(lit)
                if satisfied:
                    continue
                if not unassigned:
                    return None, assign  # conflict
                if len(unassigned) == 1:
                    units.append(unassigned[0])
            for lit in units:
                var = abs(lit)
                val = lit > 0
                if var in assign and assign[var] != val:
                    return None, assign
                if var not in assign:
                    assign[var] = val
                    self.propagations += 1
                    changed = True
            if changed:
                clauses = self._simplify_all(clauses, assign)
                if clauses is None:
                    return None, assign
        return clauses, assign

    def _simplify(self, clauses, var, val):
        result = []
        for clause in clauses:
            new_clause = []
            skip = False
            for lit in clause:
                if abs(lit) == var:
                    if (lit > 0) == val:
                        skip = True
                        break
                else:
                    new_clause.append(lit)
            if skip:
                continue
            if not new_clause:
                return None
            result.append(new_clause)
        return result

    def _simplify_all(self, clauses, assign):
        result = []
        for clause in clauses:
            new_clause = []
            skip = False
            for lit in clause:
                var = abs(lit)
                if var in assign:
                    if (lit > 0) == assign[var]:
                        skip = True
                        break
                else:
                    new_clause.append(lit)
            if skip:
                continue
            if not new_clause:
                return None
            result.append(new_clause)
        return result

    def _pure_literals(self, clauses, assign):
        counts = {}
        for clause in clauses:
            for lit in clause:
                var = abs(lit)
                if var in assign:
                    continue
                sign = 1 if lit > 0 else -1
                if var not in counts:
                    counts[var] = sign
                elif counts[var] != sign:
                    counts[var] = 0
        for var, sign in counts.items():
            if sign != 0:
                assign[var] = sign > 0
                self.propagations += 1
        return self._simplify_all(clauses, assign), assign

    def _pick_var(self, clauses, assign):
        for clause in clauses:
            for lit in clause:
                var = abs(lit)
                if var not in assign:
                    return var
        return 1

def solve_formula(nvars, clauses):
    solver = DPLL(nvars, clauses)
    sat = solver.solve()
    return sat, solver.assignment, solver.decisions, solver.propagations

if __name__ == "__main__":
    # (x1 OR x2) AND (NOT x1 OR x3) AND (NOT x2 OR NOT x3) ...
    formulas = [
        ("simple sat", 3, [[1, 2], [-1, 3], [-2, -3]]),
        ("unsat", 1, [[1], [-1]]),
        ("3sat example", 4, [[1, 2, 3], [-1, -2, 4], [1, -3, -4], [-2, 3, 4]]),
        ("empty", 0, []),
        ("single unit", 2, [[1], [2, -1]]),
    ]
    for name, nvars, clauses in formulas:
        sat, assign, dec, prop = solve_formula(nvars, clauses)
        print(f"{name:<16} SAT={sat}  decisions={dec}  props={prop}")
        if sat:
            print(f"  assignment: {dict(sorted(assign.items()))}")
    print()

    # pigeonhole unsat (2 pigeons 1 hole)
    # p1h1, p2h1, ~p1h1 \/ ~p2h1
    sat, _, _, _ = solve_formula(2, [[1], [2], [-1, -2]])
    print("Pigeonhole 2/1 unsat:", sat is False)

    # larger random-ish
    clauses = [
        [1, 2, 3], [1, -2, 4], [-1, 2, -4], [-1, -2, -3],
        [3, 4, 5], [-3, -4, 5], [2, -5, 6], [-2, 5, -6],
        [1, 5, -6], [-1, -5, 6],
    ]
    sat, assign, dec, prop = solve_formula(6, clauses)
    print(f"Larger formula    SAT={sat}  decisions={dec}  props={prop}")
    if sat:
        print("  assignment:", dict(sorted(assign.items())))
