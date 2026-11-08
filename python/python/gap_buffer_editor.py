class GapBuffer:
    def __init__(self, initial=""):
        self.buf = list(initial) + [None] * 64
        self.gap_start = len(initial)
        self.gap_end = len(self.buf)
        self.point = len(initial)  # cursor

    def _gap_size(self):
        return self.gap_end - self.gap_start

    def _move_gap(self, pos):
        if pos < self.gap_start:
            # move gap left
            n = self.gap_start - pos
            self.buf[self.gap_end - n:self.gap_end] = self.buf[pos:self.gap_start]
            self.gap_start = pos
            self.gap_end -= n
        elif pos > self.gap_start:
            # move gap right
            n = pos - self.gap_start
            self.buf[self.gap_start:self.gap_start + n] = self.buf[self.gap_end:self.gap_end + n]
            self.gap_start += n
            self.gap_end += n

    def _grow(self):
        old_size = len(self.buf)
        new_size = old_size * 2
        new_buf = [None] * new_size
        new_buf[:self.gap_start] = self.buf[:self.gap_start]
        tail_len = old_size - self.gap_end
        new_buf[new_size - tail_len:] = self.buf[self.gap_end:]
        self.gap_end = new_size - tail_len
        self.buf = new_buf

    def insert(self, text):
        self._move_gap(self.point)
        for ch in text:
            if self._gap_size() == 0:
                self._grow()
            self.buf[self.gap_start] = ch
            self.gap_start += 1
            self.point += 1

    def delete_backward(self, n=1):
        self._move_gap(self.point)
        deleted = 0
        while deleted < n and self.gap_start > 0:
            self.gap_start -= 1
            self.point -= 1
            deleted += 1
        return deleted

    def delete_forward(self, n=1):
        self._move_gap(self.point)
        deleted = 0
        while deleted < n and self.gap_end < len(self.buf):
            self.gap_end += 1
            deleted += 1
        return deleted

    def move(self, pos):
        pos = max(0, min(pos, self.length()))
        self.point = pos

    def move_relative(self, delta):
        self.move(self.point + delta)

    def length(self):
        return len(self.buf) - self._gap_size()

    def text(self):
        return "".join(ch for ch in self.buf[:self.gap_start] if ch is not None) + \
               "".join(ch for ch in self.buf[self.gap_end:] if ch is not None)

    def get_line_info(self):
        t = self.text()
        before = t[:self.point]
        line = before.count("\n") + 1
        col = self.point - before.rfind("\n")
        return line, col

    def __str__(self):
        return self.text()

class Editor:
    def __init__(self):
        self.buffer = GapBuffer()
        self.history = []
        self.history_index = -1
        self._save_state()

    def _save_state(self):
        state = (self.buffer.text(), self.buffer.point)
        self.history = self.history[:self.history_index + 1]
        self.history.append(state)
        self.history_index += 1
        if len(self.history) > 100:
            self.history.pop(0)
            self.history_index -= 1

    def insert(self, text):
        self.buffer.insert(text)
        self._save_state()

    def backspace(self, n=1):
        self.buffer.delete_backward(n)
        self._save_state()

    def delete(self, n=1):
        self.buffer.delete_forward(n)
        self._save_state()

    def move_left(self, n=1):
        self.buffer.move_relative(-n)

    def move_right(self, n=1):
        self.buffer.move_relative(n)

    def move_home(self):
        t = self.buffer.text()
        pos = self.buffer.point
        start = t.rfind("\n", 0, pos) + 1
        self.buffer.move(start)

    def move_end(self):
        t = self.buffer.text()
        pos = self.buffer.point
        end = t.find("\n", pos)
        if end == -1:
            end = len(t)
        self.buffer.move(end)

    def undo(self):
        if self.history_index > 0:
            self.history_index -= 1
            text, point = self.history[self.history_index]
            self.buffer = GapBuffer(text)
            self.buffer.point = point

    def redo(self):
        if self.history_index < len(self.history) - 1:
            self.history_index += 1
            text, point = self.history[self.history_index]
            self.buffer = GapBuffer(text)
            self.buffer.point = point

    def status(self):
        line, col = self.buffer.get_line_info()
        return f"L{line}:C{col}  len={self.buffer.length()}  point={self.buffer.point}"

if __name__ == "__main__":
    ed = Editor()
    ed.insert("Hello, World!\nThis is a gap buffer editor.\n")
    print("Text:")
    print(repr(ed.buffer.text()))
    print(ed.status())
    print()

    ed.move_left(20)
    ed.insert("awesome ")
    print("After insert in middle:")
    print(repr(ed.buffer.text()))
    print(ed.status())
    print()

    ed.backspace(8)
    print("After backspace:")
    print(repr(ed.buffer.text()))
    print()

    ed.undo()
    print("After undo:")
    print(repr(ed.buffer.text()))
    ed.redo()
    print("After redo:")
    print(repr(ed.buffer.text()))
    print()

    # stress
    buf = GapBuffer()
    for i in range(1000):
        buf.insert(f"line {i}\n")
    print("After 1000 lines insert, length:", buf.length())
    buf.move(500)
    buf.insert("<<<INSERTED>>>")
    print("Inserted in middle, length:", buf.length())
    print("Contains marker:", "<<<INSERTED>>>" in buf.text())
    for _ in range(100):
        buf.delete_backward(5)
    print("After 100 backspaces, length:", buf.length())
