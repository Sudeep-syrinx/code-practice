class Life:
    def __init__(self, rows, cols, alive=None):
        self.rows = rows
        self.cols = cols
        self.cells = set(alive or [])
        self.generation = 0

    def neighbors(self, r, c):
        count = 0
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                if ((r + dr) % self.rows, (c + dc) % self.cols) in self.cells:
                    count += 1
        return count

    def step(self):
        new_cells = set()
        for r in range(self.rows):
            for c in range(self.cols):
                n = self.neighbors(r, c)
                if (r, c) in self.cells:
                    if n in (2, 3):
                        new_cells.add((r, c))
                elif n == 3:
                    new_cells.add((r, c))
        self.cells = new_cells
        self.generation += 1

    def population(self):
        return len(self.cells)

    def render(self):
        lines = []
        for r in range(self.rows):
            line = "".join("O" if (r, c) in self.cells else "." for c in range(self.cols))
            lines.append(line)
        return "\n".join(lines)

    def show(self):
        print(f"Generation {self.generation}  population {self.population()}")
        print(self.render())
        print()

    def run(self, generations, verbose=True):
        if verbose:
            self.show()
        for _ in range(generations):
            self.step()
            if verbose:
                self.show()

    def is_stable(self):
        before = set(self.cells)
        self.step()
        same = before == self.cells
        self.cells = before
        self.generation -= 1
        return same

    def find_period(self, limit=20):
        start = frozenset(self.cells)
        saved_cells = set(self.cells)
        saved_gen = self.generation
        period = None
        for i in range(1, limit + 1):
            self.step()
            if frozenset(self.cells) == start:
                period = i
                break
        self.cells = saved_cells
        self.generation = saved_gen
        return period


if __name__ == "__main__":
    print("Blinker")
    blinker = Life(5, 5, [(2, 1), (2, 2), (2, 3)])
    blinker.run(2)

    print("Glider")
    glider = Life(6, 6, [(0, 1), (1, 2), (2, 0), (2, 1), (2, 2)])
    glider.run(4)

    block = Life(4, 4, [(1, 1), (1, 2), (2, 1), (2, 2)])
    print("Block stable    :", block.is_stable())
    print("Blinker stable  :", Life(5, 5, [(2, 1), (2, 2), (2, 3)]).is_stable())
    print("Blinker period  :", Life(5, 5, [(2, 1), (2, 2), (2, 3)]).find_period())
    print("Glider period   :", Life(6, 6, [(0, 1), (1, 2), (2, 0), (2, 1), (2, 2)]).find_period(30))

    lonely = Life(5, 5, [(2, 2)])
    lonely.step()
    print("Lonely cell dies:", lonely.population() == 0)
