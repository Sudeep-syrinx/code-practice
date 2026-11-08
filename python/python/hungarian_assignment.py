def hungarian(cost):
    """
    Solve the assignment problem (minimize).
    cost: square matrix (list of lists)
    Returns (total_cost, assignment) where assignment[row] = col
    """
    n = len(cost)
    # working copy
    u = [0] * (n + 1)
    v = [0] * (n + 1)
    p = [0] * (n + 1)
    way = [0] * (n + 1)

    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [float("inf")] * (n + 1)
        used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = float("inf")
            j1 = 0
            for j in range(1, n + 1):
                if not used[j]:
                    cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j] = cur
                        way[j] = j0
                    if minv[j] < delta:
                        delta = minv[j]
                        j1 = j
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break

    assignment = [-1] * n
    for j in range(1, n + 1):
        if p[j] != 0:
            assignment[p[j] - 1] = j - 1
    total = sum(cost[i][assignment[i]] for i in range(n))
    return total, assignment


if __name__ == "__main__":
    cost = [
        [9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4],
    ]
    total, assign = hungarian(cost)
    print("Total cost           :", total)
    print("Assignment           :", assign)
    print("Expected cost 13     :", total == 13)

    # identity
    ident = [[0 if i == j else 5 for j in range(3)] for i in range(3)]
    t2, a2 = hungarian(ident)
    print()
    print("Identity cost        :", t2)
    print("Identity assignment  :", a2)
    print("Perfect matching     :", t2 == 0 and a2 == [0, 1, 2])

    # random consistency with brute for n=3
    import itertools, random
    rng = random.Random(3)
    ok = True
    for _ in range(30):
        mat = [[rng.randint(1, 20) for _ in range(3)] for _ in range(3)]
        best = min(
            sum(mat[i][p[i]] for i in range(3))
            for p in itertools.permutations(range(3))
        )
        got, _ = hungarian(mat)
        if got != best:
            ok = False
    print("30 random n=3 ok     :", ok)
