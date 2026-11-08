class RegisterVM:
    def __init__(self, n_regs=8):
        self.regs = [0] * n_regs
        self.ip = 0
        self.halted = False
        self.output = []
        self.ops = {
            "LOAD": self._load,
            "MOVE": self._move,
            "ADD": self._add,
            "SUB": self._sub,
            "MUL": self._mul,
            "DIV": self._div,
            "JMP": self._jmp,
            "JZ": self._jz,
            "JNZ": self._jnz,
            "CMP": self._cmp,
            "OUT": self._out,
            "HALT": self._halt,
        }

    def _reg(self, name):
        return int(name[1:])

    def _load(self, args):
        r, val = args
        self.regs[self._reg(r)] = int(val)

    def _move(self, args):
        a, b = args
        self.regs[self._reg(a)] = self.regs[self._reg(b)]

    def _add(self, args):
        a, b, c = args
        self.regs[self._reg(a)] = self.regs[self._reg(b)] + self.regs[self._reg(c)]

    def _sub(self, args):
        a, b, c = args
        self.regs[self._reg(a)] = self.regs[self._reg(b)] - self.regs[self._reg(c)]

    def _mul(self, args):
        a, b, c = args
        self.regs[self._reg(a)] = self.regs[self._reg(b)] * self.regs[self._reg(c)]

    def _div(self, args):
        a, b, c = args
        denom = self.regs[self._reg(c)]
        self.regs[self._reg(a)] = self.regs[self._reg(b)] // denom if denom else 0

    def _jmp(self, args):
        self.ip = int(args[0]) - 1

    def _jz(self, args):
        r, target = args
        if self.regs[self._reg(r)] == 0:
            self.ip = int(target) - 1

    def _jnz(self, args):
        r, target = args
        if self.regs[self._reg(r)] != 0:
            self.ip = int(target) - 1

    def _cmp(self, args):
        a, b, c = args
        x, y = self.regs[self._reg(b)], self.regs[self._reg(c)]
        self.regs[self._reg(a)] = (x > y) - (x < y)

    def _out(self, args):
        self.output.append(self.regs[self._reg(args[0])])

    def _halt(self, args):
        self.halted = True

    def run(self, program, max_steps=10000):
        self.ip = 0
        self.halted = False
        self.output = []
        self.regs = [0] * len(self.regs)
        steps = 0
        while not self.halted and self.ip < len(program) and steps < max_steps:
            line = program[self.ip].strip()
            if not line or line.startswith("#"):
                self.ip += 1
                continue
            parts = line.split()
            op, args = parts[0].upper(), parts[1:]
            if op not in self.ops:
                raise ValueError(f"Unknown op {op}")
            self.ops[op](args)
            self.ip += 1
            steps += 1
        return self.output


if __name__ == "__main__":
    vm = RegisterVM()

    # factorial-ish: compute 5! using loop
    prog = [
        "LOAD R1 5",      # n
        "LOAD R2 1",      # result
        "LOAD R3 1",      # i
        "# loop",
        "MUL R2 R2 R3",
        "ADD R3 R3 R1",   # wrong on purpose? wait fix
    ]
    # correct factorial
    prog = [
        "LOAD R0 5",      # n
        "LOAD R1 1",      # acc
        "LOAD R2 1",      # i
        "ADD R2 R2 R0",   # sentinel trick replaced by cmp
        "LOAD R3 1",
        "CMP R4 R2 R0",   # R4 = sign(i - n)
        "JZ R4 10",       # if i == n finish? better rewrite
        "MUL R1 R1 R2",
        "ADD R2 R2 R3",
        "JMP 5",
        "OUT R1",
        "HALT",
    ]
    # cleaner version
    prog = [
        "LOAD R0 6",          # n
        "LOAD R1 1",          # result
        "LOAD R2 1",          # counter
        "LOAD R5 1",          # constant 1
        "CMP R3 R2 R0",       # counter ? n
        "JZ R3 9",            # if equal jump to out
        "MUL R1 R1 R2",
        "ADD R2 R2 R5",
        "JMP 4",
        "OUT R1",
        "HALT",
    ]
    out = vm.run(prog)
    print("6!                  :", out)
    print("Expected 720         :", out == [720])

    # sum 1..10
    prog2 = [
        "LOAD R0 10",
        "LOAD R1 0",
        "LOAD R2 1",
        "LOAD R5 1",
        "CMP R3 R2 R0",
        "JZ R3 10",
        "ADD R1 R1 R2",
        "ADD R2 R2 R5",
        "JMP 4",
        "ADD R1 R1 R0",       # include n
        "OUT R1",
        "HALT",
    ]
    out2 = vm.run(prog2)
    print("Sum 1..10            :", out2)
    print("Expected 55          :", out2 == [55])

    # simple move / out
    prog3 = ["LOAD R0 42", "MOVE R1 R0", "OUT R1", "HALT"]
    print("Move test            :", vm.run(prog3) == [42])
