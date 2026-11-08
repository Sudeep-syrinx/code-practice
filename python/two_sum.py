def two_sum(nums, target):
    seen = {}                      # value -> index where we saw it
    for i, n in enumerate(nums):
        need = target - n
        if need in seen:
            return [seen[need], i]
        seen[n] = i
    return []


if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))   # expected [0, 1]
    print(two_sum([3, 2, 4], 6))        # expected [1, 2]
    print(two_sum([3, 3], 6))           # expected [0, 1]