import re


def parse_class(pattern, i):
    negate = False
    i += 1
    if i < len(pattern) and pattern[i] == "^":
        negate = True
        i += 1
    chars = set()
    ranges = []
    while i < len(pattern) and pattern[i] != "]":
        if i + 2 < len(pattern) and pattern[i + 1] == "-" and pattern[i + 2] != "]":
            ranges.append((pattern[i], pattern[i + 2]))
            i += 3
        else:
            chars.add(pattern[i])
            i += 1
    if i >= len(pattern):
        raise ValueError("Unterminated character class")
    return ("class", frozenset(chars), tuple(ranges), negate), i + 1


def parse(pattern):
    tokens = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "[":
            atom, i = parse_class(pattern, i)
        elif ch == "\\":
            if i + 1 >= len(pattern):
                raise ValueError("Dangling escape")
            nxt = pattern[i + 1]
            if nxt == "d":
                atom = ("class", frozenset(), (("0", "9"),), False)
            elif nxt == "w":
                atom = ("class", frozenset("_"), (("a", "z"), ("A", "Z"), ("0", "9")), False)
            elif nxt == "s":
                atom = ("class", frozenset(" \t\n\r"), (), False)
            else:
                atom = ("char", nxt)
            i += 2
        elif ch == ".":
            atom = ("any",)
            i += 1
        elif ch in "*+?":
            raise ValueError(f"Nothing to repeat before {ch!r}")
        elif ch == "^":
            atom = ("bol",)
            i += 1
        elif ch == "$":
            atom = ("eol",)
            i += 1
        else:
            atom = ("char", ch)
            i += 1
        quant = ""
        if i < len(pattern) and pattern[i] in "*+?" and atom[0] not in ("bol", "eol"):
            quant = pattern[i]
            i += 1
        tokens.append((atom, quant))
    return tokens


def atom_matches(atom, ch):
    kind = atom[0]
    if kind == "any":
        return ch != "\n"
    if kind == "char":
        return ch == atom[1]
    _, chars, ranges, negate = atom
    hit = ch in chars or any(lo <= ch <= hi for lo, hi in ranges)
    return hit != negate


def match_here(tokens, ti, text, pos):
    if ti == len(tokens):
        return pos
    atom, quant = tokens[ti]
    kind = atom[0]
    if kind == "bol":
        return match_here(tokens, ti + 1, text, pos) if pos == 0 else -1
    if kind == "eol":
        return match_here(tokens, ti + 1, text, pos) if pos == len(text) else -1
    if quant == "":
        if pos < len(text) and atom_matches(atom, text[pos]):
            return match_here(tokens, ti + 1, text, pos + 1)
        return -1
    low = 1 if quant == "+" else 0
    high = 1 if quant == "?" else len(text) - pos
    count = 0
    while count < high and pos + count < len(text) and atom_matches(atom, text[pos + count]):
        count += 1
    while count >= low:
        end = match_here(tokens, ti + 1, text, pos + count)
        if end != -1:
            return end
        count -= 1
    return -1


def find_from(tokens, text, start):
    for s in range(start, len(text) + 1):
        end = match_here(tokens, 0, text, s)
        if end != -1:
            return s, end
    return None


def search(pattern, text):
    return find_from(parse(pattern), text, 0)


def fullmatch(pattern, text):
    tokens = parse(pattern) + [(("eol",), "")]
    return match_here(tokens, 0, text, 0) != -1


def findall(pattern, text):
    tokens = parse(pattern)
    results = []
    pos = 0
    while pos <= len(text):
        found = find_from(tokens, text, pos)
        if found is None:
            break
        s, e = found
        results.append(text[s:e])
        pos = e if e > s else e + 1
    return results


def sub(pattern, repl, text):
    tokens = parse(pattern)
    out = []
    pos = 0
    while pos <= len(text):
        found = find_from(tokens, text, pos)
        if found is None:
            break
        s, e = found
        out.append(text[pos:s])
        out.append(repl)
        if e > s:
            pos = e
        else:
            if s < len(text):
                out.append(text[s])
            pos = s + 1
    out.append(text[pos:])
    return "".join(out)


if __name__ == "__main__":
    search_cases = [
        ("a.c", "xxabcxx"),
        ("colou?r", "my color"),
        ("colou?r", "my colour"),
        ("^ab*c$", "abbbc"),
        ("^ab*c$", "abbbcd"),
        ("[a-c]+", "xxabcabcyy"),
        ("[^0-9]+", "123abc456"),
        ("\\d+", "order 12345 now"),
        ("\\w+@\\w+", "mail bob@site now"),
        ("a*", "bbb"),
        ("x+y", "xxxxz"),
        ("h.llo", "hello"),
        ("[0-9][0-9]-[0-9][0-9]", "call 12-34 now"),
        ("\\s+", "no_space"),
        ("a.*b", "xxaYYbZZbQQ"),
    ]
    mismatches = 0
    print("Search")
    for pattern, text in search_cases:
        mine = search(pattern, text)
        real = re.search(pattern, text)
        expected = real.span() if real else None
        flag = "ok" if mine == expected else "MISMATCH"
        if mine != expected:
            mismatches += 1
        print(f"  {pattern!r:<26} in {text!r:<22} -> {mine}  {flag}")

    full_cases = [
        ("a*b", "aaab"), ("a*b", "aaabc"), ("[a-z]+[0-9]?", "hello5"),
        ("..", "ab"), (".", ""), ("\\d\\d\\d", "123"), ("\\d\\d\\d", "1234"),
        ("b?a+", "baaa"), ("b?a+", "bba"),
    ]
    print()
    print("Full match")
    for pattern, text in full_cases:
        mine = fullmatch(pattern, text)
        real = re.fullmatch(pattern, text) is not None
        flag = "ok" if mine == real else "MISMATCH"
        if mine != real:
            mismatches += 1
        print(f"  {pattern!r:<18} vs {text!r:<10} -> {mine!s:<6} {flag}")

    findall_cases = [
        ("[0-9]+", "a1b22c333"), ("ab", "ababab"), ("[a-z]+", "hi there you"),
        ("\\w+", "snake_case and CamelCase"), ("x+", "no match here"),
    ]
    print()
    print("Find all")
    for pattern, text in findall_cases:
        mine = findall(pattern, text)
        real = re.findall(pattern, text)
        flag = "ok" if mine == real else "MISMATCH"
        if mine != real:
            mismatches += 1
        print(f"  {pattern!r:<12} -> {mine}  {flag}")

    sub_cases = [
        ("[0-9]+", "#", "a1b22c333"), ("\\s+", "_", "too   many    spaces"),
        ("a+", "A", "banana bandana"),
    ]
    print()
    print("Substitute")
    for pattern, repl, text in sub_cases:
        mine = sub(pattern, repl, text)
        real = re.sub(pattern, lambda m: repl, text)
        flag = "ok" if mine == real else "MISMATCH"
        if mine != real:
            mismatches += 1
        print(f"  {pattern!r:<10} -> {mine!r}  {flag}")

    print()
    for bad in ["*abc", "[abc", "ab\\"]:
        try:
            parse(bad)
            print(f"  {bad!r} parsed")
        except ValueError as e:
            print(f"  {bad!r:<8} ValueError: {e}")

    print()
    print("Mismatches        :", mismatches)
    print("All match re module:", mismatches == 0)
