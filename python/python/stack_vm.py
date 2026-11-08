class VMError(Exception):
    pass


def safe_div(a, b):
    if b == 0:
        raise VMError("Division by zero")
    return a // b


def safe_mod(a, b):
    if b == 0:
        raise VMError("Modulo by zero")
    return a % b


BINARY = {
    "ADD": lambda a, b: a + b,
    "SUB": lambda a, b: a - b,
    "MUL": lambda a, b: a * b,
    "DIV": safe_div,
    "MOD": safe_mod,
    "LT": lambda a, b: int(a < b),
    "GT": lambda a, b: int(a > b),
    "EQ": lambda a, b: int(a == b),
}

OPS = set(BINARY) | {
    "PUSH", "POP", "DUP", "SWAP", "JMP", "JZ", "JNZ",
    "LOAD", "STORE", "PRINT", "HALT", "CALL", "RET",
}
OPS_WITH_ARG = {"PUSH", "JMP", "JZ", "JNZ", "LOAD", "STORE", "CALL"}


def assemble(source):
    labels = {}
    lines = []
    for raw in source.strip().splitlines():
        line = raw.split(";")[0].strip()
        if not line:
            continue
        if line.endswith(":"):
            labels[line[:-1]] = len(lines)
            continue
        lines.append(line)

    program = []
    for line in lines:
        parts = line.split()
        op = parts[0].upper()
        if op not in OPS:
            raise VMError(f"Unknown instruction {op}")
        if op not in OPS_WITH_ARG:
            if len(parts) != 1:
                raise VMError(f"{op} takes no argument")
            program.append((op, None))
            continue
        if len(parts) != 2:
            raise VMError(f"{op} needs exactly one argument")
        arg = parts[1]
        if op in ("LOAD", "STORE"):
            program.append((op, arg))
        elif arg in labels:
            program.append((op, labels[arg]))
        else:
            try:
                program.append((op, int(arg)))
            except ValueError:
                raise VMError(f"Unknown label {arg}")
    return program


def disassemble(program):
    lines = []
    for i, (op, arg) in enumerate(program):
        text = f"{i:>3}  {op}"
        if arg is not None:
            text += f" {arg}"
        lines.append(text)
    return lines


class VM:
    def __init__(self, program, max_steps=100000):
        self.program = program
        self.stack = []
        self.calls = []
        self.vars = {}
        self.pc = 0
        self.output = []
        self.steps = 0
        self.max_steps = max_steps

    def pop(self):
        if not self.stack:
            raise VMError("Stack underflow")
        return self.stack.pop()

    def run(self):
        while self.pc < len(self.program):
            if self.steps >= self.max_steps:
                raise VMError("Step limit exceeded")
            self.steps += 1
            op, arg = self.program[self.pc]
            self.pc += 1
            if op == "PUSH":
                self.stack.append(arg)
            elif op == "POP":
                self.pop()
            elif op == "DUP":
                v = self.pop()
                self.stack.extend([v, v])
            elif op == "SWAP":
                b = self.pop()
                a = self.pop()
                self.stack.extend([b, a])
            elif op in BINARY:
                b = self.pop()
                a = self.pop()
                self.stack.append(BINARY[op](a, b))
            elif op == "JMP":
                self.pc = arg
            elif op == "JZ":
                if self.pop() == 0:
                    self.pc = arg
            elif op == "JNZ":
                if self.pop() != 0:
                    self.pc = arg
            elif op == "LOAD":
                if arg not in self.vars:
                    raise VMError(f"Undefined variable {arg}")
                self.stack.append(self.vars[arg])
            elif op == "STORE":
                self.vars[arg] = self.pop()
            elif op == "PRINT":
                self.output.append(self.pop())
            elif op == "CALL":
                self.calls.append(self.pc)
                self.pc = arg
            elif op == "RET":
                if not self.calls:
                    raise VMError("RET without CALL")
                self.pc = self.calls.pop()
            elif op == "HALT":
                break
        return self.output


PROGRAMS = {
    "factorial 10": """
        PUSH 10
        STORE n
        PUSH 1
        STORE acc
        loop:
        LOAD n
        JZ end
        LOAD acc
        LOAD n
        MUL
        STORE acc
        LOAD n
        PUSH 1
        SUB
        STORE n
        JMP loop
        end:
        LOAD acc
        PRINT
        HALT
    """,
    "fibonacci": """
        PUSH 0
        STORE a
        PUSH 1
        STORE b
        PUSH 0
        STORE i
        loop:
        LOAD i
        PUSH 10
        LT
        JZ done
        LOAD a
        PRINT
        LOAD a
        LOAD b
        ADD
        LOAD b
        STORE a
        STORE b
        LOAD i
        PUSH 1
        ADD
        STORE i
        JMP loop
        done:
        HALT
    """,
    "squares": """
        PUSH 7
        CALL square
        PRINT
        PUSH 12
        CALL square
        PRINT
        HALT
        square:
        DUP
        MUL
        RET
    """,
    "primes < 30": """
        PUSH 2
        STORE n
        outer:
        LOAD n
        PUSH 30
        LT
        JZ finish
        PUSH 2
        STORE d
        inner:
        LOAD d
        LOAD d
        MUL
        LOAD n
        GT
        JNZ isprime
        LOAD n
        LOAD d
        MOD
        JZ next
        LOAD d
        PUSH 1
        ADD
        STORE d
        JMP inner
        isprime:
        LOAD n
        PRINT
        next:
        LOAD n
        PUSH 1
        ADD
        STORE n
        JMP outer
        finish:
        HALT
    """,
    "gcd 1071 462": """
        PUSH 1071
        STORE a
        PUSH 462
        STORE b
        loop:
        LOAD b
        JZ done
        LOAD a
        LOAD b
        MOD
        LOAD b
        STORE a
        STORE b
        JMP loop
        done:
        LOAD a
        PRINT
        HALT
    """,
    "countdown": """
        PUSH 5
        STORE i
        top:
        LOAD i
        JZ end
        LOAD i
        PRINT
        LOAD i
        PUSH 1
        SUB
        STORE i
        JMP top
        end:
        HALT
    """,
}

BROKEN = {
    "underflow": "PUSH 1\nADD",
    "divide by zero": "PUSH 1\nPUSH 0\nDIV",
    "infinite loop": "top:\nJMP top",
    "unknown op": "PUSH 1\nFLY",
    "unknown label": "JMP nowhere",
    "bad variable": "LOAD ghost",
    "ret alone": "RET",
    "missing arg": "PUSH",
}


def run_source(name, source, limit=5000):
    try:
        vm = VM(assemble(source), max_steps=limit)
        vm.run()
        print(f"{name:<16}: {vm.output}  steps {vm.steps}")
        return vm.output
    except VMError as e:
        print(f"{name:<16}! VMError: {e}")
        return None


if __name__ == "__main__":
    results = {}
    for name, source in PROGRAMS.items():
        results[name] = run_source(name, source)

    print()
    print("Factorial correct :", results["factorial 10"] == [3628800])
    print("Fibonacci correct :", results["fibonacci"] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
    print("Squares correct   :", results["squares"] == [49, 144])
    print("Primes correct    :", results["primes < 30"] == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29])
    print("GCD correct       :", results["gcd 1071 462"] == [21])
    print("Countdown correct :", results["countdown"] == [5, 4, 3, 2, 1])

    print()
    print("Disassembly of squares:")
    for line in disassemble(assemble(PROGRAMS["squares"])):
        print(" ", line)

    print()
    print("Broken programs")
    for name, source in BROKEN.items():
        run_source(name, source, limit=1000)
