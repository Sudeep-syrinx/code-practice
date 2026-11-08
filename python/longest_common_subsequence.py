def longest_common_subsequence(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
                
    lcs = []
    i, j = m, n
    while i > 0 and j > 0:
        if s1[i - 1] == s2[j - 1]:
            lcs.append(s1[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
            
    return "".join(reversed(lcs)), dp[m][n]

if __name__ == "__main__":
    str1 = "AGGTAB"
    str2 = "GXTXAYB"
    seq, length = longest_common_subsequence(str1, str2)
    print(f"String 1: {str1}")
    print(f"String 2: {str2}")
    print(f"LCS: '{seq}' (Length: {length})")
    print("Test passed:", seq == "GTAB" and length == 4)
