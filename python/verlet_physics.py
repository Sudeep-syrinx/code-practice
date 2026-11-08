import math
import random


class Vec2:
    def __init__(self, x=0.0, y=0.0):
        self.x = x
        self.y = y

    def __add__(self, o):
        return Vec2(self.x + o.x, self.y + o.y)

    def __sub__(self, o):
        return Vec2(self.x - o.x, self.y - o.y)

    def __mul__(self, s):
        return Vec2(self.x * s, self.y * s)

    def __rmul__(self, s):
        return self.__mul__(s)

    def length(self):
        return math.hypot(self.x, self.y)

    def normalized(self):
        L = self.length()
        return Vec2(self.x / L, self.y / L) if L > 1e-9 else Vec2()


class Particle:
    def __init__(self, pos, pinned=False):
        self.pos = pos
        self.old = Vec2(pos.x, pos.y)
        self.acc = Vec2()
        self.pinned = pinned

    def add_force(self, f):
        self.acc = self.acc + f


class DistanceConstraint:
    def __init__(self, a, b, rest=None, stiffness=1.0):
        self.a = a
        self.b = b
        self.rest = rest if rest is not None else (a.pos - b.pos).length()
        self.stiffness = stiffness

    def satisfy(self):
        delta = self.b.pos - self.a.pos
        dist = delta.length()
        if dist < 1e-9:
            return
        diff = (dist - self.rest) / dist
        correction = delta * (0.5 * diff * self.stiffness)
        if not self.a.pinned:
            self.a.pos = self.a.pos + correction
        if not self.b.pinned:
            self.b.pos = self.b.pos - correction


class VerletWorld:
    def __init__(self, gravity=Vec2(0, -0.2), damping=0.99):
        self.particles = []
        self.constraints = []
        self.gravity = gravity
        self.damping = damping

    def add_particle(self, x, y, pinned=False):
        p = Particle(Vec2(x, y), pinned)
        self.particles.append(p)
        return p

    def add_constraint(self, a, b, stiffness=1.0):
        c = DistanceConstraint(a, b, stiffness=stiffness)
        self.constraints.append(c)
        return c

    def step(self, iterations=3):
        for p in self.particles:
            if p.pinned:
                p.old = Vec2(p.pos.x, p.pos.y)
                p.acc = Vec2()
                continue
            p.add_force(self.gravity)
            vel = (p.pos - p.old) * self.damping
            p.old = Vec2(p.pos.x, p.pos.y)
            p.pos = p.pos + vel + p.acc
            p.acc = Vec2()
        for _ in range(iterations):
            for c in self.constraints:
                c.satisfy()

    def total_energy_proxy(self):
        e = 0.0
        for p in self.particles:
            vel = p.pos - p.old
            e += 0.5 * (vel.x ** 2 + vel.y ** 2)
        return e


if __name__ == "__main__":
    world = VerletWorld()
    # simple hanging rope
    nodes = []
    for i in range(8):
        pinned = i == 0
        nodes.append(world.add_particle(i * 1.0, 5.0, pinned=pinned))
    for i in range(len(nodes) - 1):
        world.add_constraint(nodes[i], nodes[i + 1], stiffness=0.9)

    start_y = [p.pos.y for p in nodes]
    for _ in range(120):
        world.step()
    end_y = [p.pos.y for p in nodes]

    print("Pinned stays put     :", abs(nodes[0].pos.x) < 1e-6 and abs(nodes[0].pos.y - 5) < 1e-6)
    print("Rope sagged          :", end_y[-1] < start_y[-1] - 0.5)
    print("Last particle y      :", round(end_y[-1], 3))

    # two particle spring
    w2 = VerletWorld(gravity=Vec2(0, 0))
    a = w2.add_particle(0, 0)
    b = w2.add_particle(2, 0)
    w2.add_constraint(a, b, stiffness=1.0)
    b.pos = Vec2(3, 0)          # stretch
    for _ in range(50):
        w2.step(iterations=5)
    dist = (a.pos - b.pos).length()
    print()
    print("Spring rest distance :", round(dist, 3))
    print("Returned near 2.0    :", abs(dist - 2.0) < 0.15)
