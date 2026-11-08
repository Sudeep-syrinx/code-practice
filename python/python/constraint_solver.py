from collections import defaultdict
from itertools import product

class CSP:
    def __init__(self, variables, domains, constraints):
        self.variables = variables
        self.domains = {v: list(domains[v]) for v in variables}
        self.constraints = constraints  # list of (vars, predicate)

    def is_consistent(self, var, value, assignment):
        test = dict(assignment)
        test[var] = value
        for vars_, pred in self.constraints:
            if var in vars_ and all(v in test for v in vars_):
                if not pred(*[test[v] for v in vars_]):
                    return False
        return True

    def select_unassigned(self, assignment):
        # MRV heuristic
        unassigned = [v for v in self.variables if v not in assignment]
        return min(unassigned, key=lambda v: len(self.domains[v]))

    def order_values(self, var, assignment):
        return self.domains[var]

    def backtrack(self, assignment=None):
        if assignment is None:
            assignment = {}
        if len(assignment) == len(self.variables):
            return assignment
        var = self.select_unassigned(assignment)
        for value in self.order_values(var, assignment):
            if self.is_consistent(var, value, assignment):
                assignment[var] = value
                result = self.backtrack(assignment)
                if result is not None:
                    return result
                del assignment[var]
        return None

def map_coloring():
    variables = ["WA", "NT", "SA", "Q", "NSW", "V", "T"]
    colors = ["R", "G", "B"]
    domains = {v: colors for v in variables}
    neighbors = [
        ("WA", "NT"), ("WA", "SA"), ("NT", "SA"), ("NT", "Q"),
        ("SA", "Q"), ("SA", "NSW"), ("SA", "V"), ("Q", "NSW"),
        ("NSW", "V"),
    ]
    constraints = []
    for a, b in neighbors:
        constraints.append(([a, b], lambda x, y: x != y))
    return CSP(variables, domains, constraints)

def nqueens_csp(n):
    variables = list(range(n))
    domains = {v: list(range(n)) for v in variables}
    constraints = []
    for i, j in product(range(n), repeat=2):
        if i < j:
            constraints.append(([i, j], lambda c1, c2, i=i, j=j: c1 != c2 and abs(c1 - c2) != abs(i - j)))
    return CSP(variables, domains, constraints)

def sudoku_csp(grid):
    # 4x4 for speed
    variables = [(r, c) for r in range(4) for c in range(4)]
    domains = {}
    for r, c in variables:
        if grid[r][c] != 0:
            domains[(r, c)] = [grid[r][c]]
        else:
            domains[(r, c)] = [1, 2, 3, 4]
    constraints = []
    # rows
    for r in range(4):
        for c1, c2 in product(range(4), repeat=2):
            if c1 < c2:
                constraints.append(([(r, c1), (r, c2)], lambda a, b: a != b))
    # cols
    for c in range(4):
        for r1, r2 in product(range(4), repeat=2):
            if r1 < r2:
                constraints.append(([(r1, c), (r2, c)], lambda a, b: a != b))
    # boxes
    for br in range(0, 4, 2):
        for bc in range(0, 4, 2):
            cells = [(br + i, bc + j) for i in range(2) for j in range(2)]
            for a, b in product(cells, repeat=2):
                if a < b:
                    constraints.append(([a, b], lambda x, y: x != y))
    return CSP(variables, domains, constraints)

if __name__ == "__main__":
    print("=== Map Coloring (Australia) ===")
    csp = map_coloring()
    solution = csp.backtrack()
    print("Solution:", solution)
    print("All different neighbors:", all(
        solution[a] != solution[b] for a, b in [
            ("WA", "NT"), ("WA", "SA"), ("NT", "SA"), ("NT", "Q"),
            ("SA", "Q"), ("SA", "NSW"), ("SA", "V"), ("Q", "NSW"), ("NSW", "V")
        ]
    ))
    print()

    print("=== N-Queens via CSP (N=8) ===")
    csp8 = nqueens_csp(8)
    sol8 = csp8.backtrack()
    print("One solution (row -> col):", sol8)
    # verify
    cols = [sol8[r] for r in range(8)]
    print("No column attack:", len(set(cols)) == 8)
    diag_ok = all(abs(cols[i] - cols[j]) != abs(i - j) for i in range(8) for j in range(i+1, 8))
    print("No diagonal attack:", diag_ok)
    print()

    print("=== 4x4 Sudoku via CSP ===")
    grid = [
        [0, 0, 3, 0],
        [0, 0, 0, 2],
        [0, 4, 0, 0],
        [1, 0, 0, 0],
    ]
    csp_s = sudoku_csp(grid)
    sol = csp_s.backtrack()
    board = [[0]*4 for _ in range(4)]
    for (r, c), v in sol.items():
        board[r][c] = v
    for row in board:
        print(" ", row)
    print("Valid rows:", all(len(set(row)) == 4 for row in board))
