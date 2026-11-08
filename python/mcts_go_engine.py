import math
import random
import copy
from typing import List, Tuple, Set, Optional

# --- Go Board Engine ---
BLACK, WHITE, EMPTY = 1, -1, 0

class GoBoard:
    def __init__(self, size=9):
        self.size = size
        self.board = [[EMPTY for _ in range(size)] for _ in range(size)]
        self.current_player = BLACK
        self.ko_point = None
        self.passed_last = False
        self.game_over = False

    def clone(self):
        new_board = GoBoard(self.size)
        new_board.board = [row[:] for row in self.board]
        new_board.current_player = self.current_player
        new_board.ko_point = self.ko_point
        new_board.passed_last = self.passed_last
        new_board.game_over = self.game_over
        return new_board

    def get_neighbors(self, r: int, c: int) -> List[Tuple[int, int]]:
        n = []
        if r > 0: n.append((r-1, c))
        if r < self.size - 1: n.append((r+1, c))
        if c > 0: n.append((r, c-1))
        if c < self.size - 1: n.append((r, c+1))
        return n

    def get_group_and_liberties(self, r: int, c: int) -> Tuple[Set[Tuple[int, int]], Set[Tuple[int, int]]]:
        color = self.board[r][c]
        if color == EMPTY: return set(), set()
        
        group = set()
        liberties = set()
        queue = [(r, c)]
        group.add((r, c))
        
        while queue:
            curr_r, curr_c = queue.pop(0)
            for nr, nc in self.get_neighbors(curr_r, curr_c):
                if self.board[nr][nc] == EMPTY:
                    liberties.add((nr, nc))
                elif self.board[nr][nc] == color and (nr, nc) not in group:
                    group.add((nr, nc))
                    queue.append((nr, nc))
        return group, liberties

    def is_valid_move(self, r: int, c: int) -> bool:
        if self.game_over: return False
        if r < 0 or r >= self.size or c < 0 or c >= self.size: return False
        if self.board[r][c] != EMPTY: return False
        if (r, c) == self.ko_point: return False

        # Simulate move
        self.board[r][c] = self.current_player
        captured_any = False
        
        # Check opponent neighbors for capture
        for nr, nc in self.get_neighbors(r, c):
            if self.board[nr][nc] == -self.current_player:
                _, libs = self.get_group_and_liberties(nr, nc)
                if not libs:
                    captured_any = True
                    break
        
        # Check self suicide
        _, self_libs = self.get_group_and_liberties(r, c)
        self.board[r][c] = EMPTY # Revert
        
        if not self_libs and not captured_any:
            return False # Suicide is illegal
            
        return True

    def get_valid_moves(self) -> List[Tuple[int, int]]:
        moves = []
        for r in range(self.size):
            for c in range(self.size):
                if self.is_valid_move(r, c):
                    moves.append((r, c))
        moves.append(None) # Pass
        return moves

    def play(self, move: Optional[Tuple[int, int]]):
        if move is None:
            if self.passed_last:
                self.game_over = True
            self.passed_last = True
            self.current_player = -self.current_player
            self.ko_point = None
            return

        r, c = move
        if not self.is_valid_move(r, c): raise ValueError(f"Invalid move {r},{c}")
        
        self.passed_last = False
        self.board[r][c] = self.current_player
        
        captured_stones = set()
        for nr, nc in self.get_neighbors(r, c):
            if self.board[nr][nc] == -self.current_player:
                group, libs = self.get_group_and_liberties(nr, nc)
                if not libs:
                    captured_stones.update(group)
                    
        for cr, cc in captured_stones:
            self.board[cr][cc] = EMPTY
            
        # Update Ko Rule
        if len(captured_stones) == 1:
            _, self_libs = self.get_group_and_liberties(r, c)
            if len(self_libs) == 1:
                self.ko_point = list(captured_stones)[0]
            else:
                self.ko_point = None
        else:
            self.ko_point = None
            
        self.current_player = -self.current_player

    def calculate_score(self) -> float:
        # Simple area scoring (stones + territory)
        score = 0
        for r in range(self.size):
            for c in range(self.size):
                score += self.board[r][c]
        return score

# --- Monte Carlo Tree Search (MCTS) ---
class Node:
    def __init__(self, state: GoBoard, move: Optional[Tuple[int, int]] = None, parent=None):
        self.state = state
        self.move = move
        self.parent = parent
        self.children = []
        self.wins = 0.0
        self.visits = 0
        self.untried_moves = state.get_valid_moves()

    def uct_select_child(self) -> 'Node':
        c_param = 1.414
        best_score = -float('inf')
        best_child = None
        for child in self.children:
            if child.visits == 0:
                return child
            # UCB1 formula
            exploit = child.wins / child.visits
            explore = math.sqrt(2.0 * math.log(self.visits) / child.visits)
            score = exploit + c_param * explore
            if score > best_score:
                best_score = score
                best_child = child
        return best_child

    def add_child(self, move: Optional[Tuple[int, int]], state: GoBoard) -> 'Node':
        n = Node(state, move, parent=self)
        self.untried_moves.remove(move)
        self.children.append(n)
        return n

    def update(self, result: float):
        self.visits += 1
        self.wins += result

def mcts(root_state: GoBoard, itermax: int) -> Optional[Tuple[int, int]]:
    root_node = Node(root_state)

    for i in range(itermax):
        node = root_node
        state = root_state.clone()

        # 1. Selection
        while not node.untried_moves and node.children:
            node = node.uct_select_child()
            state.play(node.move)

        # 2. Expansion
        if node.untried_moves:
            m = random.choice(node.untried_moves)
            state.play(m)
            node = node.add_child(m, state)

        # 3. Simulation (Rollout)
        moves_limit = 50
        moves_made = 0
        while not state.game_over and moves_made < moves_limit:
            valid = state.get_valid_moves()
            if not valid: break
            state.play(random.choice(valid))
            moves_made += 1

        # 4. Backpropagation
        score = state.calculate_score()
        # Relative to the player who just moved to reach 'node'
        while node is not None:
            # If node.state.current_player is WHITE, Black just moved.
            # If score > 0, Black is winning.
            result = 1.0 if (score > 0 and node.state.current_player == WHITE) or \
                            (score < 0 and node.state.current_player == BLACK) else 0.0
            if score == 0: result = 0.5
            
            node.update(result)
            node = node.parent

    # Return the move that was most visited
    if not root_node.children: return None
    return sorted(root_node.children, key=lambda c: c.visits)[-1].move

def print_board(board: GoBoard):
    chars = {EMPTY: '.', BLACK: 'X', WHITE: 'O'}
    print("  " + " ".join(str(i) for i in range(board.size)))
    for r in range(board.size):
        row_str = [chars[board.board[r][c]] for c in range(board.size)]
        print(f"{r} " + " ".join(row_str))
    print()

if __name__ == "__main__":
    print("--- MCTS GO (BADUK) ENGINE ---")
    board = GoBoard(size=5) # 5x5 board for fast simulation
    
    print("Initial Board:")
    print_board(board)
    
    # Simulate a few turns of AI vs AI
    for turn in range(4):
        player_name = "Black (X)" if board.current_player == BLACK else "White (O)"
        print(f"{player_name} is thinking (MCTS 500 iterations)...")
        best_move = mcts(board, 500)
        
        if best_move is None:
            print(f"{player_name} passed.")
        else:
            print(f"{player_name} played at {best_move}")
            
        board.play(best_move)
        print_board(board)
        
        if board.game_over:
            print("Game Over!")
            break
