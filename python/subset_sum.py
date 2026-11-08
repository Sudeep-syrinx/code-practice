def subset_sum(arr, target):
    dp = [False] * (target + 1)
    dp[0] = True
    
    for num in arr:
        for i in range(target, num - 1, -1):
            if dp[i - num]:
                dp[i] = True
                
    return dp[target]

if __name__ == "__main__":
    arr = [3, 34, 4, 12, 5, 2]
    target = 9
    result = subset_sum(arr, target)
    print(f"Array: {arr}")
    print(f"Subset sum for {target}: {result}")
    print("Test passed:", result is True)
