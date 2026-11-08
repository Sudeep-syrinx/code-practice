import re

def escape_html(text):
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;"))

def parse_inline(text):
    # code
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # bold
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__(.+?)__", r"<strong>\1</strong>", text)
    # italic
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"_(.+?)_", r"<em>\1</em>", text)
    # links
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text

def markdown_to_html(md):
    lines = md.replace("\r\n", "\n").split("\n")
    html = []
    i = 0
    in_code = False
    code_lines = []
    in_list = False
    list_type = None

    def close_list():
        nonlocal in_list, list_type
        if in_list:
            html.append(f"</{list_type}>")
            in_list = False
            list_type = None

    while i < len(lines):
        line = lines[i]
        # fenced code
        if line.strip().startswith("```"):
            if not in_code:
                close_list()
                in_code = True
                code_lines = []
            else:
                html.append("<pre><code>" + escape_html("\n".join(code_lines)) + "</code></pre>")
                in_code = False
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # headers
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            close_list()
            level = len(m.group(1))
            html.append(f"<h{level}>{parse_inline(m.group(2))}</h{level}>")
            i += 1
            continue

        # unordered list
        m = re.match(r"^[\*\-\+]\s+(.*)", line)
        if m:
            if not in_list or list_type != "ul":
                close_list()
                html.append("<ul>")
                in_list = True
                list_type = "ul"
            html.append(f"<li>{parse_inline(m.group(1))}</li>")
            i += 1
            continue

        # ordered list
        m = re.match(r"^\d+\.\s+(.*)", line)
        if m:
            if not in_list or list_type != "ol":
                close_list()
                html.append("<ol>")
                in_list = True
                list_type = "ol"
            html.append(f"<li>{parse_inline(m.group(1))}</li>")
            i += 1
            continue

        # horizontal rule
        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", line.strip()):
            close_list()
            html.append("<hr>")
            i += 1
            continue

        # empty line
        if not line.strip():
            close_list()
            i += 1
            continue

        # paragraph
        close_list()
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,6}\s|[\*\-\+]\s|\d+\.\s|```)", lines[i]):
            para.append(lines[i])
            i += 1
        html.append("<p>" + parse_inline(" ".join(para)) + "</p>")

    close_list()
    if in_code:
        html.append("<pre><code>" + escape_html("\n".join(code_lines)) + "</code></pre>")
    return "\n".join(html)

if __name__ == "__main__":
    sample = """
# Hello Markdown

This is a **bold** statement and this is *italic*.

## Features

- Lists are supported
- Links like [Python](https://python.org)
- Inline `code` too

cd "$([Environment]::GetFolderPath('Desktop'))\code-practice\python"

@'
import math
import random
from copy import deepcopy

ROWS, COLS = 6, 7

def create_board():
    return [["." for _ in range(COLS)] for _ in range(ROWS)]

def print_board(board):
    print("  " + " ".join(str(i) for i in range(COLS)))
    for r in range(ROWS):
        print(f"{r} " + " ".join(board[r]))
    print()

def drop_piece(board, col, piece):
    for r in range(ROWS - 1, -1, -1):
        if board[r][col] == ".":
            board[r][col] = piece
            return r
    return -1

def is_valid(board, col):
    return board[0][col] == "."

def get_valid_cols(board):
    return [c for c in range(COLS) if is_valid(board, c)]

def winning_move(board, piece):
    for r in range(ROWS):
        for c in range(COLS - 3):
            if all(board[r][c + i] == piece for i in range(4)):
                return True
    for c in range(COLS):
        for r in range(ROWS - 3):
            if all(board[r + i][c] == piece for i in range(4)):
                return True
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if all(board[r - i][c + i] == piece for i in range(4)):
                return True
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if all(board[r + i][c + i] == piece for i in range(4)):
                return True
    return False

def score_window(window, piece):
    opp = "O" if piece == "X" else "X"
    score = 0
    if window.count(piece) == 4:
        score += 100
    elif window.count(piece) == 3 and window.count(".") == 1:
        score += 5
    elif window.count(piece) == 2 and window.count(".") == 2:
        score += 2
    if window.count(opp) == 3 and window.count(".") == 1:
        score -= 4
    return score

def score_position(board, piece):
    score = 0
    center = [board[r][COLS // 2] for r in range(ROWS)]
    score += center.count(piece) * 3
    for r in range(ROWS):
        row = board[r]
        for c in range(COLS - 3):
            score += score_window(row[c:c + 4], piece)
    for c in range(COLS):
        col = [board[r][c] for r in range(ROWS)]
        for r in range(ROWS - 3):
            score += score_window(col[r:r + 4], piece)
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            window = [board[r + i][c + i] for i in range(4)]
            score += score_window(window, piece)
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            window = [board[r - i][c + i] for i in range(4)]
            score += score_window(window, piece)
    return score

def is_terminal(board):
    return winning_move(board, "X") or winning_move(board, "O") or len(get_valid_cols(board)) == 0

def minimax(board, depth, alpha, beta, maximizing):
    valid = get_valid_cols(board)
    terminal = is_terminal(board)
    if depth == 0 or terminal:
        if terminal:
            if winning_move(board, "X"):
                return None, 1000000
            if winning_move(board, "O"):
                return None, -1000000
            return None, 0
        return None, score_position(board, "X")
    if maximizing:
        value = -math.inf
        best_col = random.choice(valid)
        for col in valid:
            bcopy = deepcopy(board)
            drop_piece(bcopy, col, "X")
            _, new_score = minimax(bcopy, depth - 1, alpha, beta, False)
            if new_score > value:
                value = new_score
                best_col = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_col, value
    else:
        value = math.inf
        best_col = random.choice(valid)
        for col in valid:
            bcopy = deepcopy(board)
            drop_piece(bcopy, col, "O")
            _, new_score = minimax(bcopy, depth - 1, alpha, beta, True)
            if new_score < value:
                value = new_score
                best_col = col
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_col, value

def play_game(depth=4, verbose=True):
    board = create_board()
    turn = 0
    while not is_terminal(board):
        if turn == 0:
            col, score = minimax(board, depth, -math.inf, math.inf, True)
            drop_piece(board, col, "X")
            if verbose:
                print(f"AI plays column {col} (score {score})")
                print_board(board)
            if winning_move(board, "X"):
                return "X"
        else:
            valid = get_valid_cols(board)
            col = random.choice(valid)
            drop_piece(board, col, "O")
            if verbose:
                print(f"Random plays column {col}")
                print_board(board)
            if winning_move(board, "O"):
                return "O"
        turn = 1 - turn
    return "Draw"

if __name__ == "__main__":
    random.seed(1)
    print("=== Single game (depth 4) ===")
    result = play_game(depth=4, verbose=True)
    print("Result:", result)
    print()
    print("=== 20 games AI vs Random (depth 3) ===")
    wins = {"X": 0, "O": 0, "Draw": 0}
    for i in range(20):
        r = play_game(depth=3, verbose=False)
        wins[r] += 1
    print(wins)
    print("AI win rate:", wins["X"] / 20)
