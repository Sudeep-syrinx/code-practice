def subset_sum(nums, target):
    n = len(nums)
    dp = [[False] * (target + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = True
    for i in range(1, n + 1):
        for j in range(1, target + 1):
            if nums[i-1] <= j:
                dp[i][j] = dp[i-1][j] or dp[i-1][j - nums[i-1]]
            else:
                dp[i][j] = dp[i-1][j]
    return dp[n][target]

def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(values[i-1] + dp[i-1][w - weights[i-1]], dp[i-1][w])
            else:
                dp[i][w] = dp[i-1][w]
    return dp[n][capacity]

if __name__ == "__main__":
    print("Subset sum:", subset_sum([3, 34, 4, 12, 5, 2], 9))
    print("Coin change:", coin_change([1, 2, 5], 11))
    print("Knapsack:", knapsack_01([1, 2, 3], [10, 15, 40], 5))
    print("Test passed:", subset_sum([3, 34, 4, 12, 5, 2], 9) is True and coin_change([1, 2, 5], 11) == 3 and knapsack_01([1, 2, 3], [10, 15, 40], 5) == 55)
