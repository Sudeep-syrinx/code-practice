import math


def lu_decomposition(matrix):
    n = len(matrix)
    L = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    U = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for k in range(i, n):
            s = sum(L[i][j] * U[j][k] for j in range(i))
            U[i][k] = matrix[i][k] - s
        for k in range(i + 1, n):
            s = sum(L[k][j] * U[j][i] for j in range(i))
            if abs(U[i][i]) < 1e-12:
                raise ValueError("Singular matrix")
            L[k][i] = (matrix[k][i] - s) / U[i][i]
    return L, U


def qr_decomposition(matrix):
    n = len(matrix)
    m = len(matrix[0])
    Q = [[0.0] * m for _ in range(n)]
    R = [[0.0] * m for _ in range(m)]
    
    for j in range(m):
        v = [matrix[i][j] for i in range(n)]
        for i in range(j):
            R[i][j] = sum(Q[k][i] * matrix[k][j] for k in range(n))
            v = [v[k] - R[i][j] * Q[k][i] for k in range(n)]
        R[j][j] = math.sqrt(sum(x ** 2 for x in v))
        if R[j][j] < 1e-12:
            raise ValueError("Linearly dependent columns")
        for k in range(n):
            Q[k][j] = v[k] / R[j][j]
    return Q, R


def matrix_multiply(A, B):
    return [[sum(a * b for a, b in zip(row, col)) for col in zip(*B)] for row in A]


if __name__ == "__main__":
    A = [
        [4.0, 3.0, 2.0],
        [6.0, 3.0, 1.0],
        [2.0, 5.0, 7.0]
    ]
    
    print("LU Decomposition:")
    L, U = lu_decomposition(A)
    print("  L:", L)
    print("  U:", U)
    print("  L*U == A:", matrix_multiply(L, U) == A)
    
    print("\nQR Decomposition:")
    Q, R = qr_decomposition(A)
    print("  Q:", [[round(x, 2) for x in row] for row in Q])
    print("  R:", [[round(x, 2) for x in row] for row in R])
    
    QR = matrix_multiply(Q, R)
    is_correct = all(abs(QR[i][j] - A[i][j]) < 1e-9 for i in range(3) for j in range(3))
    print("  Q*R == A:", is_correct)
