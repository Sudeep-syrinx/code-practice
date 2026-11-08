def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1

if __name__ == "__main__":
    coins = [1, 2, 5]
    amount = 11
    result = coin_change(coins, amount)
    print(f"Minimum coins for {amount}: {result}")
    print("Test passed:", result == 3)
