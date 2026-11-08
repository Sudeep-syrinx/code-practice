import random


def lcs_table(a, b):
    n, m = len(a), len(b)
    t = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            if a[i] == b[j]:
                t[i][j] = t[i + 1][j + 1] + 1
            else:
                t[i][j] = max(t[i + 1][j], t[i][j + 1])
    return t


def diff(a, b):
    t = lcs_table(a, b)
    i = j = 0
    ops = []
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            ops.append((" ", a[i]))
            i += 1
            j += 1
        elif t[i + 1][j] >= t[i][j + 1]:
            ops.append(("-", a[i]))
            i += 1
        else:
            ops.append(("+", b[j]))
            j += 1
    while i < len(a):
        ops.append(("-", a[i]))
        i += 1
    while j < len(b):
        ops.append(("+", b[j]))
        j += 1
    return ops


def old_side(ops):
    return [x for op, x in ops if op != "+"]


def new_side(ops):
    return [x for op, x in ops if op != "-"]


def summary(ops):
    added = sum(1 for op, _ in ops if op == "+")
    removed = sum(1 for op, _ in ops if op == "-")
    kept = sum(1 for op, _ in ops if op == " ")
    return added, removed, kept


def render(ops):
    return "\n".join(f"{op} {x}" for op, x in ops)


def edit_distance(a, b):
    added, removed, _ = summary(diff(a, b))
    return added + removed


if __name__ == "__main__":
    old = ["import os", "import sys", "", "def main():", "    print('hi')", "", "main()"]
    new = ["import os", "import json", "", "def main():", "    print('hello')", "    return 0", "", "main()"]
    ops = diff(old, new)
    print(render(ops))
    added, removed, kept = summary(ops)
    print()
    print("Added / removed / kept :", added, removed, kept)
    print("Old side rebuilt       :", old_side(ops) == old)
    print("New side rebuilt       :", new_side(ops) == new)

    print()
    print("Identical inputs       :", summary(diff(list("abc"), list("abc"))))
    print("Empty to something     :", summary(diff([], list("abc"))))
    print("Something to empty     :", summary(diff(list("abc"), [])))
    print("Both empty             :", diff([], []))
    print("kitten -> sitting      :", edit_distance(list("kitten"), list("sitting")))
    print("Known answer is 5      :", edit_distance(list("kitten"), list("sitting")) == 5)

    rng = random.Random(5)
    rebuild_ok = True
    optimal_ok = True
    for _ in range(500):
        a = [rng.choice("abcd") for _ in range(rng.randint(0, 14))]
        b = [rng.choice("abcd") for _ in range(rng.randint(0, 14))]
        ops = diff(a, b)
        if old_side(ops) != a or new_side(ops) != b:
            rebuild_ok = False
        kept = summary(ops)[2]
        if kept != lcs_table(a, b)[0][0]:
            optimal_ok = False
    print()
    print("500 random pairs")
    print("  Both sides rebuild exactly   :", rebuild_ok)
    print("  Kept lines equal the LCS     :", optimal_ok)
