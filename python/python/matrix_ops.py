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
