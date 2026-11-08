def is_palindrome(s):
    cleaned = [c.lower() for c in s if c.isalnum()]
    return cleaned == cleaned[::-1]


if __name__ == "__main__":
    print(is_palindrome("A man, a plan, a canal: Panama"))  # expected True
    print(is_palindrome("race a car"))                      # expected False
    print(is_palindrome("madam"))                           # expected True
