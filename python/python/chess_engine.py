from copy import deepcopy

PIECES = {
    "K": 10000, "Q": 900, "R": 500, "B": 330, "N": 320, "P": 100,
    "k": -10000, "q": -900, "r": -500, "b": -330, "n": -320, "p": -100,
}

def initial_board():
    return [
        list("rnbqkbnr"),
        list("pppppppp"),
        list("........"),
        list("........"),
        list("........"),
        list("........"),
        list("PPPPPPPP"),
        list("RNBQKBNR"),
    ]

def in_bounds(r, c):
    return 0 <= r < 8 and 0 <= c < 8

def is_white(piece):
    return piece.isupper()

def is_black(piece):
    return piece.islower()

def opponent(white_to_move):
    return not white_to_move

def piece_moves(board, r, c, white_to_move):
    piece = board[r][c]
    if piece == ".":
        return []
    if is_white(piece) != white_to_move:
        return []
    moves = []
    p = piece.upper()

    def add(nr, nc, can_capture=True, must_capture=False):
        if not in_bounds(nr, nc):
            return False
        target = board[nr][nc]
        if target == ".":
            if not must_capture:
                moves.append((nr, nc))
            return True
        if can_capture and is_white(target) != white_to_move:
            moves.append((nr, nc))
        return False

    if p == "P":
        direction = -1 if white_to_move else 1
        start_row = 6 if white_to_move else 1
        if add(r + direction, c, can_capture=False):
            if r == start_row:
                add(r + 2 * direction, c, can_capture=False)
        for dc in (-1, 1):
            nr, nc = r + direction, c + dc
            if in_bounds(nr, nc) and board[nr][nc] != "." and is_white(board[nr][nc]) != white_to_move:
                moves.append((nr, nc))
    elif p == "N":
        for dr, dc in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
            add(r + dr, c + dc)
    elif p == "B" or p == "Q" or p == "R":
        directions = []
        if p in ("B", "Q"):
            directions += [(-1,-1),(-1,1),(1,-1),(1,1)]
        if p in ("R", "Q"):
            directions += [(-1,0),(1,0),(0,-1),(0,1)]
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            while add(nr, nc):
                nr += dr
                nc += dc
    elif p == "K":
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    add(r + dr, c + dc)
    return moves

def all_moves(board, white_to_move):
    result = []
    for r in range(8):
        for c in range(8):
            for nr, nc in piece_moves(board, r, c, white_to_move):
                result.append(((r, c), (nr, nc)))
    return result

def make_move(board, move):
    (r, c), (nr, nc) = move
    new_board = deepcopy(board)
    new_board[nr][nc] = new_board[r][c]
    new_board[r][c] = "."
    # simple promotion
    if new_board[nr][nc] == "P" and nr == 0:
        new_board[nr][nc] = "Q"
    if new_board[nr][nc] == "p" and nr == 7:
        new_board[nr][nc] = "q"
    return new_board

def evaluate(board):
    score = 0
    for row in board:
        for p in row:
            score += PIECES.get(p, 0)
    return score

def find_king(board, white):
    target = "K" if white else "k"
    for r in range(8):
        for c in range(8):
            if board[r][c] == target:
                return r, c
    return None

def in_check(board, white_to_move):
    king = find_king(board, white_to_move)
    if king is None:
        return True
    kr, kc = king
    for (r, c), (nr, nc) in all_moves(board, not white_to_move):
        if (nr, nc) == (kr, kc):
            return True
    return False

def legal_moves(board, white_to_move):
    legal = []
    for move in all_moves(board, white_to_move):
        nb = make_move(board, move)
        if not in_check(nb, white_to_move):
            legal.append(move)
    return legal

def minimax(board, depth, white_to_move, alpha=-99999, beta=99999):
    if depth == 0:
        return evaluate(board), None
    moves = legal_moves(board, white_to_move)
    if not moves:
        if in_check(board, white_to_move):
            return (-100000 if white_to_move else 100000), None
        return 0, None  # stalemate
    best_move = moves[0]
    if white_to_move:
        best = -99999
        for m in moves:
            nb = make_move(board, m)
            val, _ = minimax(nb, depth - 1, False, alpha, beta)
            if val > best:
                best = val
                best_move = m
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best, best_move
    else:
        best = 99999
        for m in moves:
            nb = make_move(board, m)
            val, _ = minimax(nb, depth - 1, True, alpha, beta)
            if val < best:
                best = val
                best_move = m
            beta = min(beta, best)
            if beta <= alpha:
                break
        return best, best_move

def board_to_str(board):
    lines = ["  a b c d e f g h"]
    for i, row in enumerate(board):
        lines.append(f"{8-i} " + " ".join(row) + f" {8-i}")
    lines.append("  a b c d e f g h")
    return "\n".join(lines)

if __name__ == "__main__":
    board = initial_board()
    print("Initial position")
    print(board_to_str(board))
    print()
    print("Material evaluation:", evaluate(board))
    moves = legal_moves(board, True)
    print("White legal moves from start:", len(moves))
    print()

    # play a few self-play moves at depth 2
    white = True
    for ply in range(6):
        score, move = minimax(board, 2, white)
        if move is None:
            print("Game over")
            break
        (r, c), (nr, nc) = move
        piece = board[r][c]
        board = make_move(board, move)
        side = "White" if white else "Black"
        print(f"{side} plays {piece} {chr(97+c)}{8-r} -> {chr(97+nc)}{8-nr}  (eval {score})")
        white = not white
    print()
    print(board_to_str(board))
    print("Final evaluation:", evaluate(board))
