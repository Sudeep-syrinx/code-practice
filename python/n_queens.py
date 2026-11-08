def n_queens(n):
    def is_safe(board, row, col):
        for i in range(row):
            if board[i] == col or \
               board[i] - i == col - row or \
               board[i] + i == col + row:
                return False
        return True

    def solve(row, board):
        if row == n:
            return [board[:]]
        solutions = []
        for col in range(n):
            if is_safe(board, row, col):
                board.append(col)
                solutions.extend(solve(row + 1, board))
                board.pop()
        return solutions

    return solve(0, [])

if __name__ == "__main__":
    n = 8
    solutions = n_queens(n)
    print(f"Number of solutions for {n}-Queens: {len(solutions)}")
    print("First solution (col indexes per row):", solutions[0])
    print("Test passed:", len(solutions) == 92)
