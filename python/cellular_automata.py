def rule_30_step(state):
    new_state = [0] * len(state)
    for i in range(len(state)):
        left = state[(i - 1) % len(state)]
        center = state[i]
        right = state[(i + 1) % len(state)]
        pattern = (left << 2) | (center << 1) | right
        new_state[i] = (30 >> pattern) & 1
    return new_state


def rule_110_step(state):
    new_state = [0] * len(state)
    for i in range(len(state)):
        left = state[(i - 1) % len(state)]
        center = state[i]
        right = state[(i + 1) % len(state)]
        pattern = (left << 2) | (center << 1) | right
        new_state[i] = (110 >> pattern) & 1
    return new_state


def game_of_life_step(grid):
    rows, cols = len(grid), len(grid[0])
    new_grid = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            neighbors = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbors += grid[nr][nc]
            if grid[r][c] == 1:
                new_grid[r][c] = 1 if neighbors in (2, 3) else 0
            else:
                new_grid[r][c] = 1 if neighbors == 3 else 0
    return new_grid


def display(grid):
    for row in grid:
        print("".join("██" if cell else "  " for cell in row))


if __name__ == "__main__":
    print("Rule 30 (1D):")
    state = [0] * 31
    state[15] = 1
    for _ in range(15):
        print("".join("██" if x else "  " for x in state))
        state = rule_30_step(state)
        
    print("\nGame of Life (Glider):")
    glider = [
        [0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ]
    for _ in range(4):
        display(glider)
        print()
        glider = game_of_life_step(glider)
