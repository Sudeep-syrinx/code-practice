class ChessBoard:
    def __init__(self):
        self.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ]
        self.turn = 'white'

    def display(self):
        for row in self.board:
            print(" ".join(row))
        print(f"Turn: {self.turn}")

    def is_valid_move(self, start, end):
        sr, sc = start
        er, ec = end
        piece = self.board[sr][sc]
        if piece == '.':
            return False
        if self.turn == 'white' and piece.islower():
            return False
        if self.turn == 'black' and piece.isupper():
            return False
        
        if piece.lower() == 'p':
            direction = -1 if piece.isupper() else 1
            if sc == ec and self.board[er][ec] == '.':
                if er == sr + direction:
                    return True
                if abs(er - sr) == 2 and sr == (6 if piece.isupper() else 1):
                    if self.board[sr + direction][sc] == '.':
                        return True
            if abs(sc - ec) == 1 and er == sr + direction:
                if self.board[er][ec] != '.' and self.board[er][ec].isupper() != piece.isupper():
                    return True
        return False

    def move(self, start, end):
        if self.is_valid_move(start, end):
            self.board[end[0]][end[1]] = self.board[start[0]][start[1]]
            self.board[start[0]][start[1]] = '.'
            self.turn = 'black' if self.turn == 'white' else 'white'
            return True
        return False

if __name__ == "__main__":
    board = ChessBoard()
    board.display()
    print("\nMoving white pawn from (6, 4) to (4, 4)")
    success = board.move((6, 4), (4, 4))
    print("Move successful:", success)
    board.display()
    print("Test passed:", success is True and board.board[4][4] == 'P')
