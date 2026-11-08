def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack


if __name__ == "__main__":
    print(is_valid("()[]{}"))   # expected True
    print(is_valid("(]"))       # expected False
    print(is_valid("([{}])"))   # expected True
    print(is_valid("(("))       # expected False
