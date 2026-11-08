def rabin_karp(text, pattern, base=257, mod=10**9 + 7):
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    high = pow(base, m - 1, mod)
    ph = th = 0
    for i in range(m):
        ph = (ph * base + ord(pattern[i])) % mod
        th = (th * base + ord(text[i])) % mod
    matches = []
    for i in range(n - m + 1):
        if ph == th and text[i:i + m] == pattern:
            matches.append(i)
        if i < n - m:
            th = ((th - ord(text[i]) * high) * base + ord(text[i + m])) % mod
    return matches


def kmp_table(pattern):
    table = [0] * len(pattern)
    k = 0
    for i in range(1, len(pattern)):
        while k and pattern[i] != pattern[k]:
            k = table[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        table[i] = k
    return table


def kmp_search(text, pattern):
    if not pattern:
        return []
    table = kmp_table(pattern)
    matches = []
    k = 0
    for i, ch in enumerate(text):
        while k and ch != pattern[k]:
            k = table[k - 1]
        if ch == pattern[k]:
            k += 1
        if k == len(pattern):
            matches.append(i - len(pattern) + 1)
            k = table[k - 1]
    return matches


def naive_search(text, pattern):
    return [i for i in range(len(text) - len(pattern) + 1) if text[i:i + len(pattern)] == pattern]


if __name__ == "__main__":
    text = "abracadabra abracadabra"
    pattern = "abra"
    print("Naive  :", naive_search(text, pattern))
    print("KMP    :", kmp_search(text, pattern))
    print("RK     :", rabin_karp(text, pattern))
    print("Agree  :", naive_search(text, pattern) == kmp_search(text, pattern) == rabin_karp(text, pattern))
    print("Prefix :", kmp_table("aabaaab"))
    print("Empty  :", kmp_search("abc", ""))
