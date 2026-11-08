import re
from collections import Counter


def clean_words(text):
    return re.findall(r"[a-zA-Z']+", text.lower())


def word_frequency(text, top=5):
    return Counter(clean_words(text)).most_common(top)


def longest_word(text):
    words = clean_words(text)
    return max(words, key=len) if words else ""


def average_word_length(text):
    words = clean_words(text)
    if not words:
        return 0.0
    return round(sum(len(w) for w in words) / len(words), 2)


def sentence_count(text):
    parts = re.split(r"[.!?]+", text)
    return len([p for p in parts if p.strip()])


def count_vowels(text):
    return sum(1 for c in text.lower() if c in "aeiou")


def is_pangram(text):
    letters = set(c for c in text.lower() if c.isalpha())
    return len(letters) == 26


def caesar_encrypt(text, shift):
    result = []
    for c in text:
        if c.isalpha():
            base = ord("A") if c.isupper() else ord("a")
            result.append(chr((ord(c) - base + shift) % 26 + base))
        else:
            result.append(c)
    return "".join(result)


def caesar_decrypt(text, shift):
    return caesar_encrypt(text, -shift)


def title_case(text):
    small = {"a", "an", "the", "of", "and", "in", "on", "to"}
    words = text.lower().split()
    out = []
    for i, w in enumerate(words):
        if i == 0 or w not in small:
            out.append(w.capitalize())
        else:
            out.append(w)
    return " ".join(out)


def compress(text):
    if not text:
        return ""
    out = []
    count = 1
    for i in range(1, len(text)):
        if text[i] == text[i - 1]:
            count += 1
        else:
            out.append(text[i - 1] + str(count))
            count = 1
    out.append(text[-1] + str(count))
    return "".join(out)


if __name__ == "__main__":
    sample = (
        "Python is simple. Python is powerful! "
        "Many developers love Python because it is readable and fun."
    )
    print("Words        :", len(clean_words(sample)))
    print("Sentences    :", sentence_count(sample))
    print("Top words    :", word_frequency(sample, 3))
    print("Longest word :", longest_word(sample))
    print("Avg length   :", average_word_length(sample))
    print("Vowels       :", count_vowels(sample))
    print("Pangram      :", is_pangram("The quick brown fox jumps over the lazy dog"))
    print("Pangram      :", is_pangram(sample))

    secret = caesar_encrypt("Hello, World!", 3)
    print("Encrypted    :", secret)
    print("Decrypted    :", caesar_decrypt(secret, 3))
    print("Title case   :", title_case("the lord of the rings and the return of the king"))
    print("Compressed   :", compress("aaabbbccccd"))
