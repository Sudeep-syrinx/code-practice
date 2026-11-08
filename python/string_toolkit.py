def caesar(text, shift):
    out = []
    for ch in text:
        if "a" <= ch <= "z":
            out.append(chr((ord(ch) - 97 + shift) % 26 + 97))
        elif "A" <= ch <= "Z":
            out.append(chr((ord(ch) - 65 + shift) % 26 + 65))
        else:
            out.append(ch)
    return "".join(out)


def count_vowels(text):
    return sum(1 for ch in text.lower() if ch in "aeiou")


def word_freq(text):
    freq = {}
    for word in text.lower().split():
        freq[word] = freq.get(word, 0) + 1
    return freq


def letters_only(text):
    return [ch.lower() for ch in text if ch.isalpha()]


def is_anagram(a, b):
    return sorted(letters_only(a)) == sorted(letters_only(b))


def is_palindrome(text):
    cleaned = [ch.lower() for ch in text if ch.isalnum()]
    return cleaned == cleaned[::-1]


def reverse_words(text):
    return " ".join(reversed(text.split()))


def capitalize_words(text):
    return " ".join(w[:1].upper() + w[1:].lower() for w in text.split())


def longest_word(text):
    words = text.split()
    return max(words, key=len) if words else ""


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    check("caesar encode", caesar("Hello, World!", 3), "Khoor, Zruog!")
    check("caesar decode", caesar("Khoor, Zruog!", -3), "Hello, World!")
    check("caesar wraps", caesar("xyz", 3), "abc")
    check("caesar round trip", caesar(caesar("Python 3", 7), -7), "Python 3")
    check("count vowels", count_vowels("Hello World"), 3)
    check("word frequency", word_freq("a b a"), {"a": 2, "b": 1})
    check("anagram yes", is_anagram("Listen", "Silent"), True)
    check("anagram no", is_anagram("hello", "world"), False)
    check("palindrome yes", is_palindrome("A man, a plan, a canal: Panama"), True)
    check("palindrome no", is_palindrome("hello"), False)
    check("reverse words", reverse_words("one two three"), "three two one")
    check("capitalize words", capitalize_words("hello big WORLD"), "Hello Big World")
    check("longest word", longest_word("a quick brown fox"), "quick")
    check("longest of empty", longest_word(""), "")

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
