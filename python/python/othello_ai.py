import math
import random
from copy import deepcopy

SIZE = 8
DIRS = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def create_board():
    b = [["." for _ in range(SIZE)] for _ in range(SIZE)]
    b[3][3] = b[4][4] = "O"
    b[3][4] = b[4][3] = "X"
    return b

def print_board(board):
    print("  " + " ".join(str(i) for i in range(SIZE)))
    for r in range(SIZE):
        print(f"{r} " + " ".join(board[r]))
    print()

def inside(r, c):
    return 0 <= r < SIZE and 0 <= c < SIZE

def opponent(piece):
    return "O" if piece == "X" else "X"

def valid_moves(board, piece):
    moves = []
    opp = opponent(piece)
    for r in range(SIZE):
        for c in range(SIZE):
            if board[r][c] != ".":
                continue
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                found_opp = False
                while inside(nr, nc) and board[nr][nc] == opp:
                    found_opp = True
                    nr += dr
                    nc += dc
                if found_opp and inside(nr, nc) and board[nr][nc] == piece:
                    moves.append((r, c))
                    break
    return moves

def apply_move(board, r, c, piece):
    board[r][c] = piece
    opp = opponent(piece)
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        path = []
        while inside(nr, nc) and board[nr][nc] == opp:
            path.append((nr, nc))
            nr += dr
            nc += dc
        if path and inside(nr, nc) and board[nr][nc] == piece:
            for pr, pc in path:
                board[pr][pc] = piece

def score(board):
    x = sum(row.count("X") for row in board)
    o = sum(row.count("O") for row in board)
    return x - o

def corner_score(board, piece):
    corners = [(0,0),(0,7),(7,0),(7,7)]
    return sum(1 for r,c in corners if board[r][c] == piece)

def evaluate(board, piece):
    my = sum(row.count(piece) for row in board)
    opp = sum(row.count(opponent(piece)) for row in board)
    mobility = len(valid_moves(board, piece)) - len(valid_moves(board, opponent(piece)))
    corners = corner_score(board, piece) - corner_score(board, opponent(piece))
    return (my - opp) + 3 * mobility + 20 * corners

def minimax(board, depth, alpha, beta, maximizing, piece):
    moves = valid_moves(board, piece if maximizing else opponent(piece))
    if depth == 0 or (not moves and not valid_moves(board, opponent(piece) if maximizing else piece)):
        return None, evaluate(board, piece)
    if not moves:
        return minimax(board, depth - 1, alpha, beta, not maximizing, piece)
    best_move = moves[0]
    if maximizing:
        value = -math.inf
        for m in moves:
            b2 = deepcopy(board)
            apply_move(b2, m[0], m[1], piece)
            _, sc = minimax(b2, depth - 1, alpha, beta, False, piece)
            if sc > value:
                value = sc
                best_move = m
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_move, value
    else:
        value = math.inf
        opp = opponent(piece)
        for m in moves:
            b2 = deepcopy(board)
            apply_move(b2, m[0], m[1], opp)
            _, sc = minimax(b2, depth - 1, alpha, beta, True, piece)
            if sc < value:
                value = sc
                best_move = m
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_move, value

def play_game(depth=3, verbose=False):
    board = create_board()
    piece = "X"
    while True:
        moves = valid_moves(board, piece)
        if not moves:
            if not valid_moves(board, opponent(piece)):
                break
            piece = opponent(piece)
            continue
        if piece == "X":
            move, _ = minimax(board, depth, -math.inf, math.inf, True, "X")
        else:
            move = random.choice(moves)
        apply_move(board, move[0], move[1], piece)
        if verbose:
            print(f"{piece} plays {move}")
            print_board(board)
        piece = opponent(piece)
    s = score(board)
    if s > 0: return "X"
    if s < 0: return "O"
    return "Draw"

if __name__ == "__main__":
    random.seed(2)
    board = create_board()
    print("Initial board:")
    print_board(board)
    print("Valid moves for X:", valid_moves(board, "X"))
    print()
    print("=== 15 games AI(X) vs Random(O), depth 3 ===")
    wins = {"X": 0, "O": 0, "Draw": 0}
    for _ in range(15):
        wins[play_game(depth=3)] += 1
    print(wins)
    print("AI win rate:", round(wins["X"] / 15, 2))
