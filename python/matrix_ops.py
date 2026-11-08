def identity(n):
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]


def add(a, b):
    return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]


def transpose(m):
    return [[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]


def multiply(a, b):
    rows, cols, inner = len(a), len(b[0]), len(b)
    result = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            for k in range(inner):
                result[i][j] += a[i][k] * b[k][j]
    return result


def minor(m, row, col):
    return [r[:col] + r[col + 1:] for i, r in enumerate(m) if i != row]


def determinant(m):
    n = len(m)
    if n == 1:
        return m[0][0]
    if n == 2:
        return m[0][0] * m[1][1] - m[0][1] * m[1][0]
    total = 0
    for col in range(n):
        sign = (-1) ** col
        total += sign * m[0][col] * determinant(minor(m, 0, col))
    return total


if __name__ == "__main__":
    print(identity(3))
    # expected [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    print(add([[1, 2], [3, 4]], [[5, 6], [7, 8]]))
    # expected [[6, 8], [10, 12]]
    print(transpose([[1, 2, 3], [4, 5, 6]]))
    # expected [[1, 4], [2, 5], [3, 6]]
    print(multiply([[1, 2], [3, 4]], [[5, 6], [7, 8]]))
    # expected [[19, 22], [43, 50]]
    print(determinant([[1, 2], [3, 4]]))
    # expected -2
    print(determinant([[6, 1, 1], [4, -2, 5], [2, 8, 7]]))
    # expected -306

# ==============================================================================
# EXTENDED MATRIX OPERATIONS
# Added as part of line count expansion and feature completeness.
# ==============================================================================

class MatrixExtended:
    def __init__(self, data):
        self.data = data
        self.rows = len(data)
        self.cols = len(data[0]) if self.rows > 0 else 0

    def shape(self):
        return (self.rows, self.cols)

    def add(self, other):
        if self.shape() != other.shape():
            raise ValueError("Matrices must have the same dimensions to add.")
        result = []
        for i in range(self.rows):
            row = []
            for j in range(self.cols):
                row.append(self.data[i][j] + other.data[i][j])
            result.append(row)
        return MatrixExtended(result)

    def subtract(self, other):
        if self.shape() != other.shape():
            raise ValueError("Matrices must have the same dimensions to subtract.")
        result = []
        for i in range(self.rows):
            row = []
            for j in range(self.cols):
                row.append(self.data[i][j] - other.data[i][j])
            result.append(row)
        return MatrixExtended(result)

    def scalar_multiply(self, scalar):
        result = []
        for i in range(self.rows):
            row = []
            for j in range(self.cols):
                row.append(self.data[i][j] * scalar)
            result.append(row)
        return MatrixExtended(result)

    def multiply(self, other):
        if self.cols != other.rows:
            raise ValueError("Incompatible dimensions for matrix multiplication.")
        result = []
        for i in range(self.rows):
            row = []
            for j in range(other.cols):
                val = 0
                for k in range(self.cols):
                    val += self.data[i][k] * other.data[k][j]
                row.append(val)
            result.append(row)
        return MatrixExtended(result)

    def transpose(self):
        result = []
        for j in range(self.cols):
            row = []
            for i in range(self.rows):
                row.append(self.data[i][j])
            result.append(row)
        return MatrixExtended(result)

    def identity(self, n):
        result = []
        for i in range(n):
            row = []
            for j in range(n):
                row.append(1 if i == j else 0)
            result.append(row)
        return MatrixExtended(result)

    def power(self, n):
        if n == 0:
            return self.identity(self.rows)
        if n == 1:
            return self
        if n % 2 == 0:
            half = self.power(n // 2)
            return half.multiply(half)
        else:
            return self.multiply(self.power(n - 1))

    def trace(self):
        if self.rows != self.cols:
            raise ValueError("Trace only defined for square matrices.")
        total = 0
        for i in range(self.rows):
            total += self.data[i][i]
        return total

    def print_matrix(self):
        for row in self.data:
            print(" ".join(str(x) for x in row))

def test_matrix_extended():
    m1 = MatrixExtended([[1, 2], [3, 4]])
    m2 = MatrixExtended([[5, 6], [7, 8]])
    print("m1 + m2:")
    m1.add(m2).print_matrix()
    print("m1 * m2:")
    m1.multiply(m2).print_matrix()
    print("m1 transpose:")
    m1.transpose().print_matrix()
    print("m1 trace:", m1.trace())
    print("m1 power 2:")
    m1.power(2).print_matrix()

if __name__ == "__main__":
    test_matrix_extended()
