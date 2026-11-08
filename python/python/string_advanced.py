def manacher(s):
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0
    for i in range(n):
        mirror = 2 * center - i
        if i < right:
            p[i] = min(right - i, p[mirror])
        a, b = i + p[i] + 1, i - p[i] - 1
        while a < n and b >= 0 and t[a] == t[b]:
            p[i] += 1
            a += 1
            b -= 1
        if i + p[i] > right:
            center, right = i, i + p[i]
    maxlen = max(p)
    idx = p.index(maxlen)
    start = (idx - maxlen) // 2
    return s[start:start + maxlen], maxlen

def z_algorithm(s):
    n = len(s)
    z = [0] * n
    l = r = 0
    for i in range(1, n):
        if i <= r:
            z[i] = min(r - i + 1, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] - 1 > r:
            l, r = i, i + z[i] - 1
    z[0] = n
    return z

def kmp_prefix(s):
    n = len(s)
    pi = [0] * n
    j = 0
    for i in range(1, n):
        while j > 0 and s[i] != s[j]:
            j = pi[j - 1]
        if s[i] == s[j]:
            j += 1
            pi[i] = j
    return pi

def kmp_search(text, pattern):
    if not pattern:
        return list(range(len(text) + 1))
    pi = kmp_prefix(pattern)
    res = []
    j = 0
    for i, ch in enumerate(text):
        while j > 0 and ch != pattern[j]:
            j = pi[j - 1]
        if ch == pattern[j]:
            j += 1
            if j == len(pattern):
                res.append(i - j + 1)
                j = pi[j - 1]
    return res

if __name__ == "__main__":
    s = "babad"
    pal, length = manacher(s)
    print("Manacher")
    print("  longest palindrome :", pal, "len", length)
    print("  another            :", manacher("cbbd")[0])
    print()
    text = "ababaabab"
    print("Z-array of", text, ":", z_algorithm(text))
    print()
    print("KMP prefix 'ababaca':", kmp_prefix("ababaca"))
    print("KMP search 'ab' in 'ababaabab':", kmp_search("ababaabab", "ab"))
    print("KMP search 'aa' in 'aaaaa'    :", kmp_search("aaaaa", "aa"))
