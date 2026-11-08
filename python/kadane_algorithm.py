def kadane_algorithm(arr):
    max_so_far = float('-inf')
    max_ending_here = 0
    start = end = s = 0
    
    for i, x in enumerate(arr):
        max_ending_here += x
        if max_so_far < max_ending_here:
            max_so_far = max_ending_here
            start = s
            end = i
        if max_ending_here < 0:
            max_ending_here = 0
            s = i + 1
            
    return max_so_far, start, end

if __name__ == "__main__":
    arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
    max_sum, start, end = kadane_algorithm(arr)
    print("Array:", arr)
    print(f"Max Subarray Sum: {max_sum} from index {start} to {end}")
    print(f"Subarray: {arr[start:end+1]}")
    print("Test passed:", max_sum == 6)
