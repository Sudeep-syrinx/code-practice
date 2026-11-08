from collections import deque


class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False
        self.count = 0


class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.size = 0

    def insert(self, word):
        if self.contains(word):
            return
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
            node.count += 1
        node.end = True
        self.size += 1

    def _walk(self, prefix):
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def contains(self, word):
        node = self._walk(word)
        return node is not None and node.end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def count_prefix(self, prefix):
        node = self._walk(prefix)
        return node.count if node else 0

    def autocomplete(self, prefix, limit=5):
        node = self._walk(prefix)
        if node is None:
            return []
        results = []

        def collect(current, path):
            if len(results) >= limit:
                return
            if current.end:
                results.append(prefix + path)
            for ch in sorted(current.children):
                collect(current.children[ch], path + ch)

        collect(node, "")
        return results


def build_lps(pattern):
    lps = [0] * len(pattern)
    length = 0
    i = 1
    while i < len(pattern):
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        elif length:
            length = lps[length - 1]
        else:
            lps[i] = 0
            i += 1
    return lps


def kmp_search(text, pattern):
    if not pattern:
        return []
    lps = build_lps(pattern)
    matches = []
    i = j = 0
    while i < len(text):
        if text[i] == pattern[j]:
            i += 1
            j += 1
            if j == len(pattern):
                matches.append(i - j)
                j = lps[j - 1]
        elif j:
            j = lps[j - 1]
        else:
            i += 1
    return matches


def rabin_karp(text, pattern, base=256, mod=1000003):
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    high = pow(base, m - 1, mod)
    pattern_hash = text_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * base + ord(pattern[i])) % mod
        text_hash = (text_hash * base + ord(text[i])) % mod
    matches = []
    for i in range(n - m + 1):
        if pattern_hash == text_hash and text[i:i + m] == pattern:
            matches.append(i)
        if i < n - m:
            text_hash = ((text_hash - ord(text[i]) * high) * base + ord(text[i + m])) % mod
    return matches


def z_function(s):
    n = len(s)
    z = [0] * n
    left = right = 0
    for i in range(1, n):
        if i < right:
            z[i] = min(right - i, z[i - left])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > right:
            left, right = i, i + z[i]
    return z


def longest_common_prefix(words):
    if not words:
        return ""
    first, last = min(words), max(words)
    i = 0
    while i < len(first) and first[i] == last[i]:
        i += 1
    return first[:i]


def longest_unique_substring(s):
    last_seen = {}
    start = best = best_start = 0
    for i, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1
        last_seen[ch] = i
        if i - start + 1 > best:
            best = i - start + 1
            best_start = start
    return s[best_start:best_start + best]


def group_anagrams(words):
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return list(groups.values())


def is_rotation(a, b):
    return len(a) == len(b) and b in a + a


def is_subsequence(small, big):
    it = iter(big)
    return all(ch in it for ch in small)


def count_palindromic_substrings(s):
    count = 0
    for center in range(2 * len(s) - 1):
        left = center // 2
        right = left + center % 2
        while left >= 0 and right < len(s) and s[left] == s[right]:
            count += 1
            left -= 1
            right += 1
    return count


def minimum_window(s, t):
    need = {}
    for ch in t:
        need[ch] = need.get(ch, 0) + 1
    missing = len(t)
    best = (0, 0)
    best_len = float("inf")
    left = 0
    for right, ch in enumerate(s, start=1):
        if need.get(ch, 0) > 0:
            missing -= 1
        need[ch] = need.get(ch, 0) - 1
        if missing == 0:
            while need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            if right - left < best_len:
                best_len = right - left
                best = (left, right)
            need[s[left]] += 1
            missing += 1
            left += 1
    return s[best[0]:best[1]]


def sliding_window_unique_counts(s, k):
    window = deque()
    counts = {}
    result = []
    for ch in s:
        window.append(ch)
        counts[ch] = counts.get(ch, 0) + 1
        if len(window) > k:
            old = window.popleft()
            counts[old] -= 1
            if counts[old] == 0:
                del counts[old]
        if len(window) == k:
            result.append(len(counts))
    return result


if __name__ == "__main__":
    text = "abracadabra abracadabra"
    kmp = kmp_search(text, "abra")
    print("KMP matches        :", kmp)
    print("Rabin-Karp matches :", rabin_karp(text, "abra"))
    print("Both agree         :", kmp == rabin_karp(text, "abra"))
    print("Overlapping search :", kmp_search("aaaaa", "aa"))
    print("LPS of aabaaab     :", build_lps("aabaaab"))
    print("Z of aabxaab       :", z_function("aabxaab"))

    print()
    words = ["apple", "app", "application", "apt", "banana", "band", "bandana", "can", "candy"]
    trie = Trie()
    for w in words:
        trie.insert(w)
    trie.insert("apple")
    print("Words stored       :", trie.size)
    print("Contains app       :", trie.contains("app"))
    print("Contains appl      :", trie.contains("appl"))
    print("Prefix appl        :", trie.starts_with("appl"))
    print("Count prefix ban   :", trie.count_prefix("ban"))
    print("Autocomplete ap    :", trie.autocomplete("ap"))
    print("Autocomplete ban   :", trie.autocomplete("ban", limit=2))
    print("Autocomplete zzz   :", trie.autocomplete("zzz"))

    print()
    print("Common prefix      :", longest_common_prefix(["flower", "flow", "flight"]))
    print("No common prefix   :", repr(longest_common_prefix(["dog", "racecar", "car"])))
    print("Unique substring   :", longest_unique_substring("abcabcbbpwwkew"))
    print("Anagram groups     :", group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
    print("Rotation           :", is_rotation("waterbottle", "erbottlewat"))
    print("Not rotation       :", is_rotation("abcd", "acbd"))
    print("Subsequence        :", is_subsequence("ace", "abcde"))
    print("Not subsequence    :", is_subsequence("aec", "abcde"))
    print("Palindromic subs   :", count_palindromic_substrings("aaaba"))
    print("Minimum window     :", minimum_window("ADOBECODEBANC", "ABC"))
    print("Unique per window  :", sliding_window_unique_counts("abcabcbb", 3))
