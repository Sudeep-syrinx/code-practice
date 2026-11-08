def apply_l_system(axiom, rules, iterations):
    current = axiom
    for _ in range(iterations):
        next_str = []
        for ch in current:
            next_str.append(rules.get(ch, ch))
        current = "".join(next_str)
    return current


def interpret(commands, angle=60, step=10):
    """Return list of line segments ((x1,y1), (x2,y2))."""
    import math
    x = y = 0.0
    heading = 90.0
    stack = []
    segments = []
    for cmd in commands:
        if cmd == "F" or cmd == "G":
            nx = x + step * math.cos(math.radians(heading))
            ny = y + step * math.sin(math.radians(heading))
            segments.append(((x, y), (nx, ny)))
            x, y = nx, ny
        elif cmd == "+":
            heading += angle
        elif cmd == "-":
            heading -= angle
        elif cmd == "[":
            stack.append((x, y, heading))
        elif cmd == "]":
            x, y, heading = stack.pop()
    return segments


if __name__ == "__main__":
    # Koch curve
    koch_rules = {"F": "F+F--F+F"}
    koch = apply_l_system("F", koch_rules, 3)
    print("Koch length          :", len(koch))
    print("Koch starts with F+  :", koch.startswith("F+"))
    segs = interpret(koch, angle=60, step=1)
    print("Koch segments        :", len(segs))

    # Sierpinski arrowhead
    rules_s = {"A": "B-A-B", "B": "A+B+A"}
    sier = apply_l_system("A", rules_s, 5)
    print()
    print("Sierpinski length    :", len(sier))
    segs2 = interpret(sier.replace("A", "F").replace("B", "F"), angle=60, step=1)
    print("Sierpinski segments  :", len(segs2))

    # Plant-like
    plant_rules = {"X": "F+[[X]-X]-F[-FX]+X", "F": "FF"}
    plant = apply_l_system("X", plant_rules, 3)
    print()
    print("Plant string length  :", len(plant))
    segs3 = interpret(plant, angle=25, step=5)
    print("Plant segments       :", len(segs3))
    print("Has branching        :", "[" in plant and "]" in plant)

    # identity
    print()
    print("0 iterations         :", apply_l_system("ABC", {"A": "AA"}, 0) == "ABC")
    print("Unknown kept         :", apply_l_system("AZ", {"A": "B"}, 1) == "BZ")
