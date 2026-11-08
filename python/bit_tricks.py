def set_bit(n, i):
    return n | (1 << i)

def clear_bit(n, i):
    return n & ~(1 << i)

def toggle_bit(n, i):
    return n ^ (1 << i)

def get_bit(n, i):
    return (n >> i) & 1

def count_bits(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count

def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

def lowest_set_bit(n):
    return n & -n

def reverse_bits(n, width=32):
    result = 0
    for i in range(width):
        if n & (1 << i):
            result |= 1 << (width - 1 - i)
    return result

def swap_bits(n, i, j):
    bi = get_bit(n, i)
    bj = get_bit(n, j)
    if bi != bj:
        n = toggle_bit(n, i)
        n = toggle_bit(n, j)
    return n

def next_power_of_two(n):
    if n <= 1:
        return 1
    n -= 1
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16
    return n + 1

def only_one_bit_set(n):
    return is_power_of_two(n)

def gray_code(n):
    return n ^ (n >> 1)

def from_gray(g):
    n = g
    while g:
        g >>= 1
        n ^= g
    return n

def bit_range(n, start, end):
    mask = ((1 << (end - start + 1)) - 1) << start
    return (n & mask) >> start

def print_binary(n, width=8):
    return format(n & ((1 << width) - 1), f"0{width}b")

def single_number(nums):
    """Find the number that appears once (others twice)"""
    result = 0
    for x in nums:
        result ^= x
    return result

def missing_number(nums):
    """Find missing number in 0..n"""
    n = len(nums)
    xor_all = 0
    for i in range(n + 1):
        xor_all ^= i
    for x in nums:
        xor_all ^= x
    return xor_all

def max_xor_pair(nums):
    """Naive O(n^2) max xor of any two numbers"""
    best = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            best = max(best, nums[i] ^ nums[j])
    return best

if __name__ == "__main__":
    print("=== Bit operations ===")
    n = 0b10110100
    print(f"Original          : {print_binary(n)} ({n})")
    print(f"Set bit 1         : {print_binary(set_bit(n, 1))}")
    print(f"Clear bit 2       : {print_binary(clear_bit(n, 2))}")
    print(f"Toggle bit 7      : {print_binary(toggle_bit(n, 7))}")
    print(f"Get bit 4         : {get_bit(n, 4)}")
    print(f"Count bits        : {count_bits(n)}")
    print(f"Is power of two   : {is_power_of_two(n)}")
    print(f"Lowest set bit    : {print_binary(lowest_set_bit(n))}")
    print()

    print("=== Power of two checks ===")
    for x in [1, 2, 3, 8, 12, 16, 1024, 1000]:
        print(f"  {x:5}  power_of_two={is_power_of_two(x)}  next_pow2={next_power_of_two(x)}")
    print()

    print("=== Reverse bits (8-bit) ===")
    for x in [0b00000001, 0b10110000, 0b11110000]:
        r = reverse_bits(x, 8)
        print(f"  {print_binary(x)} -> {print_binary(r)}")
    print()

    print("=== Gray codes ===")
    for i in range(8):
        g = gray_code(i)
        print(f"  {i} -> gray {print_binary(g, 4)} -> back {from_gray(g)}")
    print()

    print("=== Classic problems ===")
    print("Single number     :", single_number([4, 1, 2, 1, 2]))
    print("Missing number    :", missing_number([3, 0, 1]))
    print("Missing number    :", missing_number([9, 6, 4, 2, 3, 5, 7, 0, 1]))
    print("Max xor pair      :", max_xor_pair([3, 10, 5, 25, 2, 8]))
    print()

    print("=== Swap bits ===")
    x = 0b10101010
    print(f"Before : {print_binary(x)}")
    print(f"Swap 1&6: {print_binary(swap_bits(x, 1, 6))}")
