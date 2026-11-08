def reverse_string(s):
    chars = list(s)
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
    return "".join(chars)


if __name__ == "__main__":
    print(reverse_string("hello"))    # expected olleh
    print(reverse_string("Python"))   # expected nohtyP
    print(reverse_string(""))         # expected (empty line)
