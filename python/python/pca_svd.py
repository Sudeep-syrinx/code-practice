import math
import random


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def norm(v):
    return math.sqrt(dot(v, v))


def mat_vec(M, v):
    return [dot(row, v) for row in M]


def transpose(M):
    return [list(col) for col in zip(*M)]


def power_iteration(A, num_iter=100, tol=1e-10):
    n = len(A)
    v = [random.gauss(0, 1) for _ in range(n)]
    v = [x / norm(v) for x in v]
    for _ in range(num_iter):
        Av = mat_vec(A, v)
        nAv = norm(Av)
        if nAv < 1e-15:
            return 0.0, v
        new_v = [x / nAv for x in Av]
        if sum(abs(a - b) for a, b in zip(new_v, v)) < tol:
            v = new_v
            break
        v = new_v
    eigenvalue = dot(v, mat_vec(A, v))
    return eigenvalue, v


def deflate(A, eigenvalue, eigenvector):
    n = len(A)
    outer = [[eigenvalue * eigenvector[i] * eigenvector[j] for j in range(n)] for i in range(n)]
    return [[A[i][j] - outer[i][j] for j in range(n)] for i in range(n)]


def pca(X, k=2):
    """X is list of samples (each a list of features). Returns projected data and components."""
    n = len(X)
    d = len(X[0])
    mean = [sum(row[j] for row in X) / n for j in range(d)]
    centered = [[row[j] - mean[j] for j in range(d)] for row in X]
    # covariance
    cov = [[0.0] * d for _ in range(d)]
    for row in centered:
        for i in range(d):
            for j in range(d):
                cov[i][j] += row[i] * row[j]
    cov = [[v / (n - 1) for v in row] for row in cov]

    components = []
    eigenvalues = []
    A = [row[:] for row in cov]
    for _ in range(min(k, d)):
        eigval, eigvec = power_iteration(A)
        eigenvalues.append(eigval)
        components.append(eigvec)
        A = deflate(A, eigval, eigvec)

    projected = []
    for row in centered:
        projected.append([dot(row, comp) for comp in components])
    return projected, components, eigenvalues, mean


if __name__ == "__main__":
    random.seed(5)
    # synthetic data: points along a line with noise
    true = []
    for _ in range(80):
        t = random.uniform(-5, 5)
        true.append([t + random.gauss(0, 0.3), 2 * t + random.gauss(0, 0.3), random.gauss(0, 0.2)])

    proj, comps, eigs, mean = pca(true, k=2)
    print("Eigenvalues          :", [round(e, 4) for e in eigs])
    print("First component      :", [round(c, 4) for c in comps[0]])
    print("Explained ratio      :", round(eigs[0] / sum(eigs), 3) if sum(eigs) else 0)

    # reconstruction error of first component should be small relative to total variance
    total_var = sum(eigs)
    print("Top-1 variance share :", round(eigs[0] / total_var, 3))
    print("Top component dominates:", eigs[0] > eigs[1] * 2)

    # identity-ish data
    data2 = [[random.gauss(0, 1), random.gauss(0, 1)] for _ in range(50)]
    _, _, eigs2, _ = pca(data2, k=2)
    print()
    print("Isotropic eigenvalues:", [round(e, 3) for e in eigs2])
    print("Roughly equal        :", abs(eigs2[0] - eigs2[1]) / max(eigs2[0], 1e-9) < 1.5)
