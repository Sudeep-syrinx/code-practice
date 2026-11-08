def run_brainfuck(code, input_data="", max_steps=1_000_000):
    tape = [0] * 30000
    ptr = 0
    ip = 0
    input_idx = 0
    output = []
    steps = 0

    # precompute jump table
    jump = {}
    stack = []
    for i, c in enumerate(code):
        if c == "[":
            stack.append(i)
        elif c == "]":
            if not stack:
                raise ValueError("unmatched ]")
            j = stack.pop()
            jump[j] = i
            jump[i] = j
    if stack:
        raise ValueError("unmatched [")

    while ip < len(code) and steps < max_steps:
        c = code[ip]
        if c == ">":
            ptr += 1
            if ptr >= len(tape):
                tape.append(0)
        elif c == "<":
            ptr = max(0, ptr - 1)
        elif c == "+":
            tape[ptr] = (tape[ptr] + 1) % 256
        elif c == "-":
            tape[ptr] = (tape[ptr] - 1) % 256
        elif c == ".":
            output.append(chr(tape[ptr]))
        elif c == ",":
            if input_idx < len(input_data):
                tape[ptr] = ord(input_data[input_idx])
                input_idx += 1
            else:
                tape[ptr] = 0
        elif c == "[":
            if tape[ptr] == 0:
                ip = jump[ip]
        elif c == "]":
            if tape[ptr] != 0:
                ip = jump[ip]
        ip += 1
        steps += 1

    return "".join(output), steps


if __name__ == "__main__":
    # Hello World
    hello = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."
    out, steps = run_brainfuck(hello)
    print("Hello World          :", repr(out))
    print("Correct              :", out == "Hello World!\n" or out.startswith("Hello World"))

    # add two numbers (cell0 + cell1)
    # simple: +++>++<[>+<-]>.  -> should output 5
    add = "+++>++<[>+<-]>."
    out2, _ = run_brainfuck(add)
    print()
    print("3+2                  :", ord(out2[0]) if out2 else None)
    print("Expected 5           :", out2 and ord(out2[0]) == 5)

    # cat
    cat = ",[.,]"
    out3, _ = run_brainfuck(cat, "Hi")
    print("Cat                  :", repr(out3))
    print("Expected Hi          :", out3 == "Hi")

    # unmatched
    try:
        run_brainfuck("[[]")
        print("Should have failed")
    except ValueError as e:
        print("Unmatched detected   :", str(e))
