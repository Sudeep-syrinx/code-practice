def build_suffix_array(s):
    n = len(s)
    sa = list(range(n))
    rank = [ord(c) for c in s]
    tmp = [0] * n
    k = 1
    while True:
        sa.sort(key=lambda i: (rank[i], rank[i + k] if i + k < n else -1))
        tmp[sa[0]] = 0
        for i in range(1, n):
            prev, curr = sa[i - 1], sa[i]
            left = (rank[prev], rank[prev + k] if prev + k < n else -1)
            right = (rank[curr], rank[curr + k] if curr + k < n else -1)
            tmp[curr] = tmp[prev] + (left < right)
        rank = tmp[:]
        if rank[sa[-1]] == n - 1:
            break
        k *= 2
    return sa

def build_lcp(s, sa):
    n = len(s)
    rank = [0] * n
    for i, p in enumerate(sa):
        rank[p] = i
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] == 0:
            continue
        j = sa[rank[i] - 1]
        while i + h < n and j + h < n and s[i + h] == s[j + h]:
            h += 1
        lcp[rank[i]] = h
        if h:
            h -= 1
    return lcp

def longest_repeated_substring(s):
    sa = build_suffix_array(s)
    lcp = build_lcp(s, sa)
    max_lcp = max(lcp)
    if max_lcp == 0:
        return ""
    idx = lcp.index(max_lcp)
    return s[sa[idx]:sa[idx] + max_lcp]

def count_unique_substrings(s):
    sa = build_suffix_array(s)
    lcp = build_lcp(s, sa)
    n = len(s)
    return n * (n + 1) // 2 - sum(lcp)

def find_pattern(text, pattern):
    sa = build_suffix_array(text)
    lo, hi = 0, len(text)
    while lo < hi:
        mid = (lo + hi) // 2
        if text[sa[mid]:sa[mid] + len(pattern)] < pattern:
            lo = mid + 1
        else:
            hi = mid
    starts = []
    while lo < len(text) and text[sa[lo]:sa[lo] + len(pattern)] == pattern:
        starts.append(sa[lo])
        lo += 1
    return sorted(starts)

if __name__ == "__main__":
    s = "banana"
    sa = build_suffix_array(s)
    lcp = build_lcp(s, sa)
    print("String            :", s)
    print("Suffix array      :", sa)
    print("LCP               :", lcp)
    print("Suffixes in order :")
    for i in sa:
        print(" ", s[i:])
    print()
    print("Longest repeated  :", longest_repeated_substring(s))
    print("Unique substrings :", count_unique_substrings(s))
    print()
    text = "abracadabra"
    print("Text              :", text)
    print("Pattern 'abra'    :", find_pattern(text, "abra"))
    print("Pattern 'cad'     :", find_pattern(text, "cad"))
    print("Pattern 'xyz'     :", find_pattern(text, "xyz"))
    print()
    big = "mississippi" * 5
    print("Big string length :", len(big))
    print("Longest repeated  :", longest_repeated_substring(big)[:40] + "...")
    print("Unique substrings :", count_unique_substrings(big))
