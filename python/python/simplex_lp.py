import copy


class SimplexSolver:
    def __init__(self, c, A, b):
        """
        Maximize c·x
        subject to A x <= b, x >= 0
        """
        self.m = len(b)          # constraints
        self.n = len(c)          # variables
        # tableau: (m+1) x (n+m+1)
        self.T = [[0.0] * (self.n + self.m + 1) for _ in range(self.m + 1)]
        for i in range(self.m):
            for j in range(self.n):
                self.T[i][j] = A[i][j]
            self.T[i][self.n + i] = 1.0          # slack
            self.T[i][-1] = b[i]
        for j in range(self.n):
            self.T[self.m][j] = -c[j]

    def _pivot(self, row, col):
        piv = self.T[row][col]
        self.T[row] = [v / piv for v in self.T[row]]
        for i in range(self.m + 1):
            if i == row:
                continue
            factor = self.T[i][col]
            self.T[i] = [self.T[i][j] - factor * self.T[row][j] for j in range(self.n + self.m + 1)]

    def solve(self, max_iters=1000):
        for _ in range(max_iters):
            # entering variable: most negative in objective
            obj = self.T[self.m]
            col = min(range(self.n + self.m), key=lambda j: obj[j])
            if obj[col] >= -1e-10:
                break
            # leaving variable: min ratio
            row = None
            best_ratio = float("inf")
            for i in range(self.m):
                if self.T[i][col] > 1e-10:
                    ratio = self.T[i][-1] / self.T[i][col]
                    if ratio < best_ratio:
                        best_ratio = ratio
                        row = i
            if row is None:
                return None, None          # unbounded
            self._pivot(row, col)
        else:
            return None, None

        # extract solution
        x = [0.0] * self.n
        for j in range(self.n):
            col_data = [self.T[i][j] for i in range(self.m)]
            if col_data.count(1) == 1 and col_data.count(0) == self.m - 1:
                row = col_data.index(1)
                x[j] = self.T[row][-1]
        value = self.T[self.m][-1]
        return x, value


if __name__ == "__main__":
    # max 3x + 5y
    # x +  y <= 4
    # x + 3y <= 6
    # x,y >= 0
    c = [3, 5]
    A = [[1, 1], [1, 3]]
    b = [4, 6]
    solver = SimplexSolver(c, A, b)
    x, val = solver.solve()
    print("Solution             :", [round(v, 4) for v in x])
    print("Optimal value        :", round(val, 4))
    print("Expected ~ (3,1) = 14:", abs(val - 14) < 1e-6)

    # max 2x + y
    # x + y <= 5
    # x     <= 3
    #     y <= 4
    c2 = [2, 1]
    A2 = [[1, 1], [1, 0], [0, 1]]
    b2 = [5, 3, 4]
    x2, val2 = SimplexSolver(c2, A2, b2).solve()
    print()
    print("Second problem x     :", [round(v, 4) for v in x2])
    print("Second value         :", round(val2, 4))
    print("Expected 8           :", abs(val2 - 8) < 1e-6)

    # unbounded detection
    c3 = [1, 1]
    A3 = [[-1, -1]]
    b3 = [-1]
    x3, val3 = SimplexSolver(c3, A3, b3).solve()
    print()
    print("Unbounded returns None:", x3 is None)

    # trivial
    c4 = [5]
    A4 = [[1]]
    b4 = [10]
    x4, val4 = SimplexSolver(c4, A4, b4).solve()
    print("Trivial opt          :", round(val4, 4), "x=", [round(v, 4) for v in x4])
