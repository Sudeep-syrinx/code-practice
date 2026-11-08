from fractions import Fraction


def to_fractions(m):
    return [[Fraction(x) for x in row] for row in m]


def identity(n):
    return [[Fraction(1 if i == j else 0) for j in range(n)] for i in range(n)]


def multiply(a, b):
    rows, cols, inner = len(a), len(b[0]), len(b)
    return [
        [sum(a[i][k] * b[k][j] for k in range(inner)) for j in range(cols)]
        for i in range(rows)
    ]


def transpose(m):
    return [list(col) for col in zip(*m)]


def matrix_power(m, n):
    result = identity(len(m))
    base = to_fractions(m)
    while n:
        if n & 1:
            result = multiply(result, base)
        base = multiply(base, base)
        n >>= 1
    return result


def gaussian_solve(a, b):
    n = len(a)
    m = [row + [Fraction(bv)] for row, bv in zip(to_fractions(a), b)]
    for col in range(n):
        pivot = next((r for r in range(col, n) if m[r][col] != 0), None)
        if pivot is None:
            raise ValueError("Matrix is singular")
        m[col], m[pivot] = m[pivot], m[col]
        pv = m[col][col]
        m[col] = [x / pv for x in m[col]]
        for r in range(n):
            if r != col and m[r][col] != 0:
                factor = m[r][col]
                m[r] = [x - factor * y for x, y in zip(m[r], m[col])]
    return [m[i][n] for i in range(n)]


def inverse(a):
    n = len(a)
    m = [row + identity(n)[i] for i, row in enumerate(to_fractions(a))]
    for col in range(n):
        pivot = next((r for r in range(col, n) if m[r][col] != 0), None)
        if pivot is None:
            raise ValueError("Matrix is singular")
        m[col], m[pivot] = m[pivot], m[col]
        pv = m[col][col]
        m[col] = [x / pv for x in m[col]]
        for r in range(n):
            if r != col and m[r][col] != 0:
                factor = m[r][col]
                m[r] = [x - factor * y for x, y in zip(m[r], m[col])]
    return [row[n:] for row in m]


def determinant(a):
    m = to_fractions(a)
    n = len(m)
    det = Fraction(1)
    for col in range(n):
        pivot = next((r for r in range(col, n) if m[r][col] != 0), None)
        if pivot is None:
            return Fraction(0)
        if pivot != col:
            m[col], m[pivot] = m[pivot], m[col]
            det = -det
        det *= m[col][col]
        for r in range(col + 1, n):
            factor = m[r][col] / m[col][col]
            m[r] = [x - factor * y for x, y in zip(m[r], m[col])]
    return det


def rank(a):
    m = to_fractions(a)
    rows, cols = len(m), len(m[0])
    r = 0
    for c in range(cols):
        pivot = next((i for i in range(r, rows) if m[i][c] != 0), None)
        if pivot is None:
            continue
        m[r], m[pivot] = m[pivot], m[r]
        for i in range(r + 1, rows):
            factor = m[i][c] / m[r][c]
            m[i] = [x - factor * y for x, y in zip(m[i], m[r])]
        r += 1
        if r == rows:
            break
    return r


def cramer(a, b):
    det = determinant(a)
    if det == 0:
        raise ValueError("Matrix is singular")
    n = len(a)
    result = []
    for col in range(n):
        replaced = [row[:] for row in a]
        for r in range(n):
            replaced[r][col] = b[r]
        result.append(determinant(replaced) / det)
    return result


def hilbert(n):
    return [[Fraction(1, i + j + 1) for j in range(n)] for i in range(n)]


def trace(m):
    return sum(m[i][i] for i in range(len(m)))


def print_matrix(m, label=None):
    if label:
        print(label)
    cells = [[str(x) for x in row] for row in m]
    width = max(len(c) for row in cells for c in row)
    for row in cells:
        print("  [" + "  ".join(c.rjust(width) for c in row) + "]")


if __name__ == "__main__":
    a = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]
    b = [8, -11, -3]
    print("Gauss solution (x, y, z):", [str(v) for v in gaussian_solve(a, b)])
    print("Cramer solution         :", [str(v) for v in cramer(a, b)])
    print("Determinant             :", determinant(a))
    print("Trace                   :", trace(a))
    print("Rank                    :", rank(a))

    inv = inverse(a)
    print_matrix(inv, "Inverse:")
    print("A times inverse is I    :", multiply(a, inv) == identity(3))

    print()
    small = [[4, 7], [2, 6]]
    print_matrix(inverse(small), "Inverse of [[4, 7], [2, 6]]:")
    print("Transpose               :", transpose([[1, 2, 3], [4, 5, 6]]))

    print()
    print("Rank of 3x3 sequence    :", rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
    print("Det of 3x3 sequence     :", determinant([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
    print("Rank of identity(4)     :", rank(identity(4)))

    print()
    for n in range(2, 6):
        print(f"Hilbert {n}x{n} determinant:", determinant(hilbert(n)))
    h3 = hilbert(3)
    print("Hilbert 3 solves exactly:", [str(v) for v in gaussian_solve(h3, [1, 1, 1])])

    print()
    fib = matrix_power([[1, 1], [1, 0]], 30)
    print("Fibonacci via matrix power:", fib[0][1])

    for bad in ([[1, 2], [2, 4]],):
        try:
            gaussian_solve(bad, [3, 6])
        except ValueError as e:
            print("Solve error             :", e)
        try:
            inverse(bad)
        except ValueError as e:
            print("Inverse error           :", e)
        try:
            cramer(bad, [3, 6])
        except ValueError as e:
            print("Cramer error            :", e)
