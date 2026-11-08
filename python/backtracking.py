def permutations(items):
    result = []

    def backtrack(path, used):
        if len(path) == len(items):
            result.append(path[:])
            return
        for i in range(len(items)):
            if used[i]:
                continue
            used[i] = True
            path.append(items[i])
            backtrack(path, used)
            path.pop()
            used[i] = False

    backtrack([], [False] * len(items))
    return result


def subsets(items):
    result = []

    def backtrack(start, path):
        result.append(path[:])
        for i in range(start, len(items)):
            path.append(items[i])
            backtrack(i + 1, path)
            path.pop()

    backtrack(0, [])
    return result


def combination_sum(candidates, target):
    result = []
    candidates = sorted(candidates)

    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])
            path.pop()

    backtrack(0, [], target)
    return result


def generate_parentheses(n):
    result = []

    def build(current, opened, closed):
        if len(current) == 2 * n:
            result.append(current)
            return
        if opened < n:
            build(current + "(", opened + 1, closed)
        if closed < opened:
            build(current + ")", opened, closed + 1)

    build("", 0, 0)
    return result


def n_queens(n):
    solutions = []
    cols, diag1, diag2 = set(), set(), set()
    board = []

    def place(row):
        if row == n:
            solutions.append(board[:])
            return
        for c in range(n):
            if c in cols or row - c in diag1 or row + c in diag2:
                continue
            cols.add(c)
            diag1.add(row - c)
            diag2.add(row + c)
            board.append(c)
            place(row + 1)
            board.pop()
            cols.remove(c)
            diag1.remove(row - c)
            diag2.remove(row + c)

    place(0)
    return solutions


def render_queens(solution):
    n = len(solution)
    rows = []
    for col in solution:
        rows.append("".join("Q" if c == col else "." for c in range(n)))
    return "\n".join(rows)


def parse_sudoku(rows):
    return [[0 if ch == "." else int(ch) for ch in row] for row in rows]


def solve_sudoku(grid):
    def possible(r, c, v):
        for i in range(9):
            if grid[r][i] == v or grid[i][c] == v:
                return False
        br, bc = r // 3 * 3, c // 3 * 3
        for i in range(3):
            for j in range(3):
                if grid[br + i][bc + j] == v:
                    return False
        return True

    def solve():
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    for v in range(1, 10):
                        if possible(r, c, v):
                            grid[r][c] = v
                            if solve():
                                return True
                            grid[r][c] = 0
                    return False
        return True

    return solve()


def print_sudoku(grid):
    for r, row in enumerate(grid):
        if r % 3 == 0 and r > 0:
            print("------+-------+------")
        parts = []
        for c, v in enumerate(row):
            if c % 3 == 0 and c > 0:
                parts.append("|")
            parts.append(str(v))
        print(" ".join(parts))


def word_search(board, word):
    rows, cols = len(board), len(board[0])

    def dfs(r, c, i):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False
        saved = board[r][c]
        board[r][c] = "*"
        found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = saved
        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))


if __name__ == "__main__":
    print("Permutations of [1, 2, 3]:")
    for p in permutations([1, 2, 3]):
        print(" ", p)
    print("Subsets of [1, 2, 3]     :", subsets([1, 2, 3]))
    print("Combination sum 7        :", combination_sum([2, 3, 6, 7], 7))
    print("Combination sum 8        :", combination_sum([2, 3, 5], 8))
    print("Parentheses (3)          :", generate_parentheses(3))

    print()
    for size in range(4, 9):
        print(f"{size}-queens solutions: {len(n_queens(size))}")
    print()
    print("First 6-queens solution:")
    print(render_queens(n_queens(6)[0]))

    print()
    puzzle = parse_sudoku([
        "53..7....",
        "6..195...",
        ".98....6.",
        "8...6...3",
        "4..8.3..1",
        "7...2...6",
        ".6....28.",
        "...419..5",
        "....8..79",
    ])
    print("Sudoku solved:", solve_sudoku(puzzle))
    print_sudoku(puzzle)

    print()
    letters = [
        list("ABCE"),
        list("SFCS"),
        list("ADEE"),
    ]
    for w in ["ABCCED", "SEE", "ABCB", "ASADFB"]:
        print(f"Word search {w:<8}:", word_search(letters, w))
