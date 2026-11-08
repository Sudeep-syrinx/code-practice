import heapq
import random
from collections import deque


class Maze:
    DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def __init__(self, width, height, seed=None):
        self.width = width
        self.height = height
        self.rows = height * 2 + 1
        self.cols = width * 2 + 1
        self.grid = [[1] * self.cols for _ in range(self.rows)]
        self.rng = random.Random(seed)
        self.start = (1, 1)
        self.goal = (self.rows - 2, self.cols - 2)
        self._carve()

    def _carve(self):
        stack = [self.start]
        self.grid[1][1] = 0
        while stack:
            r, c = stack[-1]
            options = []
            for dr, dc in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                nr, nc = r + dr, c + dc
                if 0 < nr < self.rows - 1 and 0 < nc < self.cols - 1 and self.grid[nr][nc] == 1:
                    options.append((nr, nc, dr, dc))
            if options:
                nr, nc, dr, dc = self.rng.choice(options)
                self.grid[r + dr // 2][c + dc // 2] = 0
                self.grid[nr][nc] = 0
                stack.append((nr, nc))
            else:
                stack.pop()

    def add_loops(self, count):
        candidates = []
        for r in range(1, self.rows - 1):
            for c in range(1, self.cols - 1):
                if self.grid[r][c] != 1:
                    continue
                horizontal = r % 2 == 1 and c % 2 == 0 and self.grid[r][c - 1] == 0 and self.grid[r][c + 1] == 0
                vertical = r % 2 == 0 and c % 2 == 1 and self.grid[r - 1][c] == 0 and self.grid[r + 1][c] == 0
                if horizontal or vertical:
                    candidates.append((r, c))
        chosen = self.rng.sample(candidates, min(count, len(candidates)))
        for r, c in chosen:
            self.grid[r][c] = 0
        return len(chosen)

    def neighbors(self, cell):
        r, c = cell
        for dr, dc in self.DIRECTIONS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < self.rows and 0 <= nc < self.cols and self.grid[nr][nc] == 0:
                yield (nr, nc)

    def _build_path(self, parents):
        if self.goal not in parents:
            return []
        path = []
        cur = self.goal
        while cur is not None:
            path.append(cur)
            cur = parents[cur]
        return path[::-1]

    def solve_bfs(self):
        parents = {self.start: None}
        queue = deque([self.start])
        while queue:
            cell = queue.popleft()
            if cell == self.goal:
                break
            for nxt in self.neighbors(cell):
                if nxt not in parents:
                    parents[nxt] = cell
                    queue.append(nxt)
        return self._build_path(parents), len(parents)

    def solve_dfs(self):
        parents = {self.start: None}
        stack = [self.start]
        while stack:
            cell = stack.pop()
            if cell == self.goal:
                break
            for nxt in self.neighbors(cell):
                if nxt not in parents:
                    parents[nxt] = cell
                    stack.append(nxt)
        return self._build_path(parents), len(parents)

    def solve_astar(self):
        def heuristic(cell):
            return abs(cell[0] - self.goal[0]) + abs(cell[1] - self.goal[1])

        parents = {self.start: None}
        cost = {self.start: 0}
        heap = [(heuristic(self.start), 0, self.start)]
        while heap:
            _, g, cell = heapq.heappop(heap)
            if cell == self.goal:
                break
            if g > cost[cell]:
                continue
            for nxt in self.neighbors(cell):
                new_cost = g + 1
                if nxt not in cost or new_cost < cost[nxt]:
                    cost[nxt] = new_cost
                    parents[nxt] = cell
                    heapq.heappush(heap, (new_cost + heuristic(nxt), new_cost, nxt))
        return self._build_path(parents), len(cost)

    def dead_ends(self):
        count = 0
        for r in range(self.rows):
            for c in range(self.cols):
                if self.grid[r][c] == 0 and len(list(self.neighbors((r, c)))) == 1:
                    count += 1
        return count

    def render(self, path=None):
        on_path = set(path or [])
        lines = []
        for r in range(self.rows):
            row = []
            for c in range(self.cols):
                cell = (r, c)
                if cell == self.start:
                    row.append("S")
                elif cell == self.goal:
                    row.append("E")
                elif self.grid[r][c] == 1:
                    row.append("#")
                elif cell in on_path:
                    row.append("*")
                else:
                    row.append(" ")
            lines.append("".join(row))
        return "\n".join(lines)


if __name__ == "__main__":
    maze = Maze(12, 6, seed=7)
    print("Perfect maze (one route only):")
    print(maze.render())
    path, explored = maze.solve_bfs()
    print("Steps:", len(path) - 1, " explored:", explored)
    print("Dead ends:", maze.dead_ends())

    print()
    removed = maze.add_loops(12)
    print(f"Removed {removed} walls to create loops")
    bfs_path, bfs_seen = maze.solve_bfs()
    dfs_path, dfs_seen = maze.solve_dfs()
    star_path, star_seen = maze.solve_astar()
    print(f"BFS   steps {len(bfs_path) - 1:>3}  explored {bfs_seen}")
    print(f"DFS   steps {len(dfs_path) - 1:>3}  explored {dfs_seen}")
    print(f"A*    steps {len(star_path) - 1:>3}  explored {star_seen}")
    print()
    print("Shortest path:")
    print(maze.render(star_path))
    print()
    print("DFS path (not always shortest):")
    print(maze.render(dfs_path))
