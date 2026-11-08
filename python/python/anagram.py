def is_anagram(a, b):
    if len(a) != len(b):
        return False
    counts = {}
    for ch in a:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in b:
        if counts.get(ch, 0) == 0:
            return False
        counts[ch] -= 1
    return True


if __name__ == "__main__":
    print(is_anagram("listen", "silent"))  # expected True
    print(is_anagram("rat", "car"))        # expected False
    print(is_anagram("aab", "aba"))        # expected True
