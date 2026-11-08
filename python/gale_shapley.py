def gale_shapley(men_pref, women_pref):
    """
    men_pref[m] = list of women in preference order
    women_pref[w] = list of men in preference order
    Returns matching dict man -> woman
    """
    n = len(men_pref)
    free_men = list(range(n))
    next_proposal = [0] * n
    woman_partner = [-1] * n
    # rank of each man for each woman
    rank = [[0] * n for _ in range(n)]
    for w in range(n):
        for r, m in enumerate(women_pref[w]):
            rank[w][m] = r

    while free_men:
        m = free_men.pop(0)
        w = men_pref[m][next_proposal[m]]
        next_proposal[m] += 1
        if woman_partner[w] == -1:
            woman_partner[w] = m
        else:
            m2 = woman_partner[w]
            if rank[w][m] < rank[w][m2]:
                woman_partner[w] = m
                free_men.append(m2)
            else:
                free_men.append(m)

    return {woman_partner[w]: w for w in range(n)}


def is_stable(matching, men_pref, women_pref):
    n = len(men_pref)
    woman_of = matching
    man_of = {w: m for m, w in matching.items()}
    rank_m = [{w: r for r, w in enumerate(men_pref[m])} for m in range(n)]
    rank_w = [{m: r for r, m in enumerate(women_pref[w])} for w in range(n)]
    for m in range(n):
        w = woman_of[m]
        for w2 in men_pref[m]:
            if w2 == w:
                break
            m2 = man_of[w2]
            if rank_w[w2][m] < rank_w[w2][m2]:
                return False
    return True


if __name__ == "__main__":
    # classic example
    men = [
        [0, 1, 2],
        [1, 0, 2],
        [0, 1, 2],
    ]
    women = [
        [1, 0, 2],
        [0, 1, 2],
        [0, 1, 2],
    ]
    matching = gale_shapley(men, women)
    print("Matching             :", matching)
    print("Is stable            :", is_stable(matching, men, women))

    # all prefer same order
    n = 4
    men2 = [list(range(n)) for _ in range(n)]
    women2 = [list(range(n)) for _ in range(n)]
    m2 = gale_shapley(men2, women2)
    print()
    print("Uniform prefs match  :", m2)
    print("Stable               :", is_stable(m2, men2, women2))
    print("Identity matching    :", m2 == {i: i for i in range(n)})

    import random
    rng = random.Random(17)
    ok = True
    for _ in range(40):
        n = rng.randint(2, 6)
        men_p = [rng.sample(range(n), n) for _ in range(n)]
        women_p = [rng.sample(range(n), n) for _ in range(n)]
        match = gale_shapley(men_p, women_p)
        if not is_stable(match, men_p, women_p):
            ok = False
        if len(match) != n or len(set(match.values())) != n:
            ok = False
    print("40 random stable ok  :", ok)
