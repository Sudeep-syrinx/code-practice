def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i - 1] <= w:
                dp[i][w] = max(
                    values[i - 1] + dp[i - 1][w - weights[i - 1]],
                    dp[i - 1][w]
                )
            else:
                dp[i][w] = dp[i - 1][w]
                
    return dp[n][capacity]

if __name__ == "__main__":
    weights = [1, 2, 3]
    values = [10, 15, 40]
    capacity = 5
    max_value = knapsack_01(weights, values, capacity)
    print(f"Max value for capacity {capacity}: {max_value}")
    print("Test passed:", max_value == 55)
