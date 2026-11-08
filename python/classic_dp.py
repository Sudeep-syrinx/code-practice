def longest_common_subsequence(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    # reconstruct
    i, j = m, n
    seq = []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            seq.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    seq.reverse()
    return dp[m][n], "".join(seq) if isinstance(a, str) else seq

def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[m][n]

def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i - 1][w]
            if weights[i - 1] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
    # reconstruct
    res = []
    w = capacity
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            res.append(i - 1)
            w -= weights[i - 1]
    res.reverse()
    return dp[n][capacity], res

def longest_increasing_subsequence(arr):
    if not arr:
        return 0, []
    n = len(arr)
    dp = [1] * n
    parent = [-1] * n
    for i in range(n):
        for j in range(i):
            if arr[j] < arr[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
                parent[i] = j
    best_i = max(range(n), key=lambda i: dp[i])
    seq = []
    while best_i != -1:
        seq.append(arr[best_i])
        best_i = parent[best_i]
    seq.reverse()
    return dp[max(range(n), key=lambda i: dp[i])], seq

def coin_change(coins, amount):
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    parent = [-1] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
                parent[a] = c
    if dp[amount] == float("inf"):
        return -1, []
    result = []
    a = amount
    while a > 0:
        c = parent[a]
        result.append(c)
        a -= c
    return dp[amount], result

if __name__ == "__main__":
    print("LCS length/string    :", longest_common_subsequence("ABCBDAB", "BDCAB"))
    print("Edit distance        :", edit_distance("kitten", "sitting"))
    print("Edit distance empty  :", edit_distance("", "abc"))
    print()
    val, items = knapsack_01([2, 3, 4, 5], [3, 4, 5, 6], 5)
    print("Knapsack value       :", val, "items", items)
    print()
    length, seq = longest_increasing_subsequence([10, 9, 2, 5, 3, 7, 101, 18])
    print("LIS length           :", length, "seq", seq)
    print()
    cnt, coins = coin_change([1, 3, 4], 6)
    print("Coin change 6        :", cnt, coins)
    print("Coin change 0        :", coin_change([1, 2], 0))
