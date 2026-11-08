def word_break(s, word_dict):
    word_set = set(word_dict)
    dp = [False] * (len(s) + 1)
    dp[0] = True
    
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[-1]

if __name__ == "__main__":
    s = "leetcode"
    words = ["leet", "code"]
    result = word_break(s, words)
    print(f"Can break '{s}':", result)
    print("Test passed:", result is True)
