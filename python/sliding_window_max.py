from collections import deque

def sliding_window_maximum(nums, k):
    if not nums or k == 0:
        return []
    result = []
    dq = deque()
    
    for i, num in enumerate(nums):
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        while dq and nums[dq[-1]] < num:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result

if __name__ == "__main__":
    nums = [1, 3, -1, -3, 5, 3, 6, 7]
    k = 3
    result = sliding_window_maximum(nums, k)
    print("Array:", nums)
    print("Window Max:", result)
    print("Test passed:", result == [3, 3, 5, 5, 6, 7])
