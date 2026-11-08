VALUES = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]
LETTERS = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}


def to_roman(n):
    if not isinstance(n, int) or not 1 <= n <= 3999:
        raise ValueError("number must be an integer from 1 to 3999")
    out = []
    for value, symbol in VALUES:
        while n >= value:
            out.append(symbol)
            n -= value
    return "".join(out)


def from_roman(text):
    text = text.strip().upper()
    if not text:
        raise ValueError("empty numeral")
    total = 0
    for i, ch in enumerate(text):
        if ch not in LETTERS:
            raise ValueError("bad letter " + ch)
        value = LETTERS[ch]
        if i + 1 < len(text) and LETTERS.get(text[i + 1], 0) > value:
            total -= value
        else:
            total += value
    if total < 1 or total > 3999 or to_roman(total) != text:
        raise ValueError("not a valid numeral: " + text)
    return total


def raises(fn):
    try:
        fn()
    except ValueError:
        return True
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    check("one", to_roman(1), "I")
    check("four", to_roman(4), "IV")
    check("nine", to_roman(9), "IX")
    check("fifty eight", to_roman(58), "LVIII")
    check("1994", to_roman(1994), "MCMXCIV")
    check("3999", to_roman(3999), "MMMCMXCIX")
    check("parse 1994", from_roman("MCMXCIV"), 1994)
    check("parse lowercase", from_roman("xiv"), 14)
    check("zero rejected", raises(lambda: to_roman(0)), True)
    check("4000 rejected", raises(lambda: to_roman(4000)), True)
    check("bad letter", raises(lambda: from_roman("ABC")), True)
    check("bad order", raises(lambda: from_roman("IIII")), True)
    check("empty rejected", raises(lambda: from_roman("")), True)

    all_ok = True
    for n in range(1, 4000):
        if from_roman(to_roman(n)) != n:
            all_ok = False
    print()
    print("Round trip 1 to 3999 :", all_ok)
    results.append(all_ok)
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
