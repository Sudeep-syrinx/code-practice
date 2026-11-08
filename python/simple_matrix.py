class Matrix:
    def __init__(self, rows):
        if not rows or not rows[0]:
            raise ValueError("matrix cannot be empty")
        width = len(rows[0])
        for row in rows:
            if len(row) != width:
                raise ValueError("rows must have equal length")
        self.rows = [list(row) for row in rows]
        self.n_rows = len(rows)
        self.n_cols = width

    @staticmethod
    def zeros(n_rows, n_cols):
        return Matrix([[0] * n_cols for _ in range(n_rows)])

    @staticmethod
    def identity(n):
        return Matrix([[1 if i == j else 0 for j in range(n)] for i in range(n)])

    def shape(self):
        return (self.n_rows, self.n_cols)

    def get(self, r, c):
        return self.rows[r][c]

    def __eq__(self, other):
        return isinstance(other, Matrix) and self.rows == other.rows

    def __add__(self, other):
        if self.shape() != other.shape():
            raise ValueError("shapes differ")
        return Matrix([[a + b for a, b in zip(r1, r2)] for r1, r2 in zip(self.rows, other.rows)])

    def __sub__(self, other):
        if self.shape() != other.shape():
            raise ValueError("shapes differ")
        return Matrix([[a - b for a, b in zip(r1, r2)] for r1, r2 in zip(self.rows, other.rows)])

    def scale(self, k):
        return Matrix([[k * v for v in row] for row in self.rows])

    def __mul__(self, other):
        if self.n_cols != other.n_rows:
            raise ValueError("cannot multiply these shapes")
        out = []
        for i in range(self.n_rows):
            row = []
            for j in range(other.n_cols):
                total = 0
                for k in range(self.n_cols):
                    total += self.rows[i][k] * other.rows[k][j]
                row.append(total)
            out.append(row)
        return Matrix(out)

    def transpose(self):
        return Matrix([[self.rows[r][c] for r in range(self.n_rows)] for c in range(self.n_cols)])

    def is_square(self):
        return self.n_rows == self.n_cols

    def trace(self):
        if not self.is_square():
            raise ValueError("trace needs a square matrix")
        return sum(self.rows[i][i] for i in range(self.n_rows))

    def is_symmetric(self):
        return self.is_square() and self == self.transpose()

    def minor(self, r, c):
        rows = []
        for i in range(self.n_rows):
            if i == r:
                continue
            rows.append([self.rows[i][j] for j in range(self.n_cols) if j != c])
        return Matrix(rows)

    def determinant(self):
        if not self.is_square():
            raise ValueError("determinant needs a square matrix")
        if self.n_rows == 1:
            return self.rows[0][0]
        if self.n_rows == 2:
            return self.rows[0][0] * self.rows[1][1] - self.rows[0][1] * self.rows[1][0]
        total = 0
        for c in range(self.n_cols):
            sign = 1 if c % 2 == 0 else -1
            total += sign * self.rows[0][c] * self.minor(0, c).determinant()
        return total

    def power(self, n):
        if not self.is_square():
            raise ValueError("power needs a square matrix")
        if n < 0:
            raise ValueError("power cannot be negative")
        result = Matrix.identity(self.n_rows)
        for _ in range(n):
            result = result * self
        return result

    def row_sums(self):
        return [sum(row) for row in self.rows]

    def col_sums(self):
        return [sum(self.rows[r][c] for r in range(self.n_rows)) for c in range(self.n_cols)]

    def to_text(self):
        return "\n".join(" ".join(f"{v:>4}" for v in row) for row in self.rows)


def raises(fn):
    try:
        fn()
    except ValueError:
        return True
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    a = Matrix([[1, 2], [3, 4]])
    b = Matrix([[5, 6], [7, 8]])
    check("shape", a.shape(), (2, 2))
    check("get", a.get(1, 0), 3)
    check("add", (a + b).rows, [[6, 8], [10, 12]])
    check("subtract", (b - a).rows, [[4, 4], [4, 4]])
    check("scale", a.scale(3).rows, [[3, 6], [9, 12]])
    check("multiply", (a * b).rows, [[19, 22], [43, 50]])
    check("equal", a == Matrix([[1, 2], [3, 4]]), True)
    check("not equal", a == b, False)

    print()
    check("zeros", Matrix.zeros(2, 3).rows, [[0, 0, 0], [0, 0, 0]])
    check("identity", Matrix.identity(3).rows, [[1, 0, 0], [0, 1, 0], [0, 0, 1]])
    check("times identity", a * Matrix.identity(2), a)
    check("transpose", Matrix([[1, 2, 3], [4, 5, 6]]).transpose().rows, [[1, 4], [2, 5], [3, 6]])
    check("double transpose", a.transpose().transpose(), a)
    check("rectangular product", (Matrix([[1, 2, 3]]) * Matrix([[1], [2], [3]])).rows, [[14]])
    check("trace", a.trace(), 5)
    check("symmetric yes", Matrix([[1, 2], [2, 1]]).is_symmetric(), True)
    check("symmetric no", a.is_symmetric(), False)

    print()
    check("det 1x1", Matrix([[7]]).determinant(), 7)
    check("det 2x2", a.determinant(), -2)
    check("det 3x3", Matrix([[2, 0, 1], [1, 3, 2], [1, 1, 1]]).determinant(), 0)
    check("det 3x3 b", Matrix([[6, 1, 1], [4, -2, 5], [2, 8, 7]]).determinant(), -306)
    check("det identity", Matrix.identity(4).determinant(), 1)
    check("det product", (a * b).determinant(), a.determinant() * b.determinant())
    check("minor", Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).minor(0, 0).rows, [[5, 6], [8, 9]])

    print()
    check("power 0", a.power(0), Matrix.identity(2))
    check("power 1", a.power(1), a)
    check("power 3", a.power(3).rows, [[37, 54], [81, 118]])
    fib = Matrix([[1, 1], [1, 0]]).power(10)
    check("fibonacci matrix", fib.get(0, 1), 55)
    check("row sums", a.row_sums(), [3, 7])
    check("col sums", a.col_sums(), [4, 6])
    print(a.to_text())

    print()
    check("empty matrix", raises(lambda: Matrix([])), True)
    check("ragged rows", raises(lambda: Matrix([[1, 2], [3]])), True)
    check("add shapes", raises(lambda: a + Matrix([[1, 2, 3]])), True)
    check("multiply shapes", raises(lambda: a * Matrix([[1, 2, 3]])), True)
    check("trace nonsquare", raises(lambda: Matrix([[1, 2, 3]]).trace()), True)
    check("det nonsquare", raises(lambda: Matrix([[1, 2, 3]]).determinant()), True)
    check("negative power", raises(lambda: a.power(-1)), True)

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
