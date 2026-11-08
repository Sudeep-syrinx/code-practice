def solve_nqueens(n):
    solutions = []
    board = [-1] * n

    def is_safe(row, col):
        for r in range(row):
            c = board[r]
            if c == col or abs(c - col) == abs(r - row):
                return False
        return True

    def backtrack(row):
        if row == n:
            solutions.append(board[:])
            return
        for col in range(n):
            if is_safe(row, col):
                board[row] = col
                backtrack(row + 1)
                board[row] = -1

    backtrack(0)
    return solutions

def print_board(placement):
    n = len(placement)
    for row in range(n):
        line = ""
        for col in range(n):
            line += "Q " if placement[row] == col else ". "
        print("  " + line)
    print()

def solve_sudoku_like(grid, size=4):
    """Generic backtracking for size x size grid (2x2 boxes for size=4)"""
    def find_empty():
        for i in range(size):
            for j in range(size):
                if grid[i][j] == 0:
                    return i, j
        return None

    def valid(r, c, val):
        if val in grid[r]:
            return False
        if val in [grid[i][c] for i in range(size)]:
            return False
        box = int(size ** 0.5)
        br, bc = (r // box) * box, (c // box) * box
        for i in range(br, br + box):
            for j in range(bc, bc + box):
                if grid[i][j] == val:
                    return False
        return True

    def solve():
        empty = find_empty()
        if not empty:
            return True
        r, c = empty
        for val in range(1, size + 1):
            if valid(r, c, val):
                grid[r][c] = val
                if solve():
                    return True
                grid[r][c] = 0
        return False

    return solve()

def permutations(items):
    result = []
    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return
        for i in range(len(remaining)):
            path.append(remaining[i])
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()
    backtrack([], items)
    return result

def combination_sum(candidates, target):
    result = []
    candidates = sorted(candidates)
    def backtrack(start, path, total):
        if total == target:
            result.append(path[:])
            return
        if total > target:
            return
        for i in range(start, len(candidates)):
            path.append(candidates[i])
            backtrack(i, path, total + candidates[i])  # reuse allowed
            path.pop()
    backtrack(0, [], 0)
    return result

if __name__ == "__main__":
    print("=== N-Queens ===")
    for n in [4, 5, 8]:
        sols = solve_nqueens(n)
        print(f"N={n}: {len(sols)} solutions")
    print()
    print("One solution for N=4:")
    print_board(solve_nqueens(4)[0])
    print("One solution for N=8:")
    print_board(solve_nqueens(8)[0])

    print("=== 4x4 Sudoku-like ===")
    grid = [
        [0, 0, 3, 0],
        [0, 0, 0, 2],
        [0, 4, 0, 0],
        [1, 0, 0, 0],
    ]
    print("Before:")
    for row in grid:
        print(" ", row)
    solve_sudoku_like(grid, 4)
    print("After:")
    for row in grid:
        print(" ", row)
    print()

    print("=== Permutations of [1,2,3] ===")
    print(permutations([1, 2, 3]))
    print()

    print("=== Combination sum (candidates=[2,3,6,7], target=7) ===")
    print(combination_sum([2, 3, 6, 7], 7))
