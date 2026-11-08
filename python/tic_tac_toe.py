from functools import lru_cache


def winner(board):
    lines = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8),
        (0, 3, 6), (1, 4, 7), (2, 5, 8),
        (0, 4, 8), (2, 4, 6),
    ]
    for a, b, c in lines:
        if board[a] != " " and board[a] == board[b] == board[c]:
            return board[a]
    return None


def is_full(board):
    return " " not in board


def print_board(board):
    for row in range(3):
        cells = board[row * 3:row * 3 + 3]
        print(" " + " | ".join(cells))
        if row < 2:
            print("---+---+---")


@lru_cache(maxsize=None)
def minimax(board, player):
    w = winner(board)
    if w == "X":
        return 1
    if w == "O":
        return -1
    if is_full(board):
        return 0
    scores = []
    for i in range(9):
        if board[i] == " ":
            new_board = board[:i] + (player,) + board[i + 1:]
            scores.append(minimax(new_board, "O" if player == "X" else "X"))
    return max(scores) if player == "X" else min(scores)


def best_move(board, player):
    best_index = None
    best_score = None
    for i in range(9):
        if board[i] == " ":
            new_board = board[:i] + (player,) + board[i + 1:]
            score = minimax(new_board, "O" if player == "X" else "X")
            if best_score is None:
                better = True
            elif player == "X":
                better = score > best_score
            else:
                better = score < best_score
            if better:
                best_score = score
                best_index = i
    return best_index


def play_game(first_moves=None):
    board = (" ",) * 9
    player = "X"
    forced = list(first_moves or [])
    while winner(board) is None and not is_full(board):
        move = forced.pop(0) if forced else best_move(board, player)
        board = board[:move] + (player,) + board[move + 1:]
        player = "O" if player == "X" else "X"
    return board


if __name__ == "__main__":
    print("Perfect play (X vs O):")
    final = play_game()
    print_board(final)
    print("Winner:", winner(final))

    print()
    print("X starts in a corner, O plays badly in an edge:")
    final = play_game(first_moves=[0, 1])
    print_board(final)
    print("Winner:", winner(final))

    print()
    print("Value of empty board:", minimax((" ",) * 9, "X"))
