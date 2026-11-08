ROMAN = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]

DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
]
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
SCALES = [(10 ** 9, "billion"), (10 ** 6, "million"), (10 ** 3, "thousand")]


def to_roman(n):
    if not 0 < n < 4000:
        raise ValueError("Roman numerals support 1 to 3999")
    out = []
    for value, symbol in ROMAN:
        while n >= value:
            out.append(symbol)
            n -= value
    return "".join(out)


def from_roman(text):
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i, ch in enumerate(text.upper()):
        v = values[ch]
        if i + 1 < len(text) and values[text[i + 1].upper()] > v:
            total -= v
        else:
            total += v
    return total


def to_base(n, base):
    if not 2 <= base <= 36:
        raise ValueError("Base must be between 2 and 36")
    if n == 0:
        return "0"
    sign = "-" if n < 0 else ""
    n = abs(n)
    out = []
    while n:
        out.append(DIGITS[n % base])
        n //= base
    return sign + "".join(reversed(out))


def from_base(text, base):
    negative = text.startswith("-")
    total = 0
    for ch in text.lstrip("-").upper():
        digit = DIGITS.index(ch)
        if digit >= base:
            raise ValueError(f"Digit {ch} is not valid in base {base}")
        total = total * base + digit
    return -total if negative else total


def below_thousand(n):
    parts = []
    if n >= 100:
        parts.append(ONES[n // 100] + " hundred")
        n %= 100
    if n >= 20:
        word = TENS[n // 10]
        if n % 10:
            word += "-" + ONES[n % 10]
        parts.append(word)
    elif n > 0:
        parts.append(ONES[n])
    return " ".join(parts)


def number_to_words(n):
    if n == 0:
        return "zero"
    if n < 0:
        return "minus " + number_to_words(-n)
    if n >= 10 ** 12:
        raise ValueError("Number too large")
    parts = []
    for value, name in SCALES:
        if n >= value:
            parts.append(below_thousand(n // value) + " " + name)
            n %= value
    if n > 0:
        parts.append(below_thousand(n))
    return " ".join(parts)


def indian_grouping(n):
    digits = str(abs(n))
    if len(digits) <= 3:
        grouped = digits
    else:
        head, tail = digits[:-3], digits[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        grouped = ",".join(groups + [tail])
    return ("-" if n < 0 else "") + grouped


def western_grouping(n):
    return f"{n:,}"


def ordinal(n):
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0


def count_bits(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count


def gray_code(bits):
    return [format(i ^ (i >> 1), f"0{bits}b") for i in range(2 ** bits)]


def digit_sum(n):
    return sum(int(d) for d in str(abs(n)))


def digital_root(n):
    while n >= 10:
        n = digit_sum(n)
    return n


def is_armstrong(n):
    digits = str(n)
    return sum(int(d) ** len(digits) for d in digits) == n


def collatz_length(n):
    steps = 0
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        steps += 1
    return steps


if __name__ == "__main__":
    print("Roman numerals")
    for n in [4, 9, 14, 40, 90, 400, 1994, 2026, 3999]:
        roman = to_roman(n)
        print(f"  {n:>4} -> {roman:<12} -> {from_roman(roman)}")

    print()
    print("Base conversion of 2026")
    for base in [2, 8, 16, 36]:
        text = to_base(2026, base)
        print(f"  base {base:<2} -> {text:<10} -> {from_base(text, base)}")
    print("  negative       :", to_base(-255, 16))

    print()
    print("Number to words")
    for n in [0, 7, 13, 21, 100, 342, 1000, 12345, 1000001, 2026000000, -45]:
        print(f"  {n:>12} : {number_to_words(n)}")

    print()
    for n in [999, 12345, 1234567, 98765432100]:
        print(f"  {n:>12} -> indian {indian_grouping(n):<18} western {western_grouping(n)}")

    print()
    print("Ordinals :", [ordinal(n) for n in [1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 112]])
    print("Powers of two up to 70 :", [n for n in range(1, 71) if is_power_of_two(n)])
    print("Bits in 255, 1024, 1023:", count_bits(255), count_bits(1024), count_bits(1023))
    print("Gray code (3 bits)     :", gray_code(3))
    print("Digit sum of 98765     :", digit_sum(98765))
    print("Digital root of 98765  :", digital_root(98765))
    print("Armstrong numbers      :", [n for n in range(1, 1000) if is_armstrong(n)])
    print("Collatz steps for 27   :", collatz_length(27))
