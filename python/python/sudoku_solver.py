import random
import copy

def is_valid(board, row, col, num):
    for i in range(9):
        if board[row][i] == num or board[i][col] == num:
            return False
    br, bc = 3 * (row // 3), 3 * (col // 3)
    for i in range(br, br + 3):
        for j in range(bc, bc + 3):
            if board[i][j] == num:
                return False
    return True

def find_empty(board):
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                return i, j
    return None

def solve(board):
    empty = find_empty(board)
    if not empty:
        return True
    row, col = empty
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve(board):
                return True
            board[row][col] = 0
    return False

def count_solutions(board, limit=2):
    empty = find_empty(board)
    if not empty:
        return 1
    row, col = empty
    count = 0
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            count += count_solutions(board, limit)
            board[row][col] = 0
            if count >= limit:
                return count
    return count

def generate_full():
    board = [[0] * 9 for _ in range(9)]
    def fill(cell=0):
        if cell == 81:
            return True
        row, col = divmod(cell, 9)
        nums = list(range(1, 10))
        random.shuffle(nums)
        for num in nums:
            if is_valid(board, row, col, num):
                board[row][col] = num
                if fill(cell + 1):
                    return True
                board[row][col] = 0
        return False
    fill()
    return board

def make_puzzle(difficulty=40):
    board = generate_full()
    puzzle = copy.deepcopy(board)
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    removed = 0
    for r, c in cells:
        if removed >= difficulty:
            break
        backup = puzzle[r][c]
        puzzle[r][c] = 0
        if count_solutions(copy.deepcopy(puzzle)) != 1:
            puzzle[r][c] = backup
        else:
            removed += 1
    return puzzle, board

def print_board(board, title=""):
    if title:
        print(title)
    for i, row in enumerate(board):
        if i % 3 == 0 and i != 0:
            print("------+-------+------")
        line = ""
        for j, val in enumerate(row):
            if j % 3 == 0 and j != 0:
                line += "| "
            line += (str(val) if val != 0 else ".") + " "
        print(line)
    print()

if __name__ == "__main__":
    random.seed(7)
    print("=== Easy fixed puzzle ===")
    easy = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
    print_board(easy, "Puzzle:")
    solved = copy.deepcopy(easy)
    ok = solve(solved)
    print_board(solved, "Solved:" if ok else "Failed:")
    print("Solved successfully:", ok)
    print()

    print("=== Generated puzzle ===")
    puzzle, solution = make_puzzle(difficulty=45)
    print_board(puzzle, "Generated puzzle:")
    check = copy.deepcopy(puzzle)
    solve(check)
    print("Matches original solution:", check == solution)
    print("Empty cells:", sum(1 for row in puzzle for x in row if x == 0))
