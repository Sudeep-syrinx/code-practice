import math
import random
from dataclasses import dataclass, field
from typing import List

@dataclass
class Particle:
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    radius: float = 4.0
    mass: float = 1.0
    color: str = "white"

class ParticleSystem:
    def __init__(self, width=400, height=300, gravity=(0, 0.15), damping=0.99):
        self.width = width
        self.height = height
        self.gravity = gravity
        self.damping = damping
        self.particles: List[Particle] = []
        self.time = 0.0

    def add(self, p: Particle):
        self.particles.append(p)

    def spawn_random(self, n, speed=2.0):
        for _ in range(n):
            p = Particle(
                x=random.uniform(20, self.width - 20),
                y=random.uniform(20, self.height - 20),
                vx=random.uniform(-speed, speed),
                vy=random.uniform(-speed, speed),
                radius=random.uniform(3, 7),
                mass=random.uniform(0.8, 2.0),
            )
            self.particles.append(p)

    def step(self, dt=1.0):
        self.time += dt
        g = self.gravity
        for p in self.particles:
            p.vx += g[0] * dt
            p.vy += g[1] * dt
            p.vx *= self.damping
            p.vy *= self.damping
            p.x += p.vx * dt
            p.y += p.vy * dt
            self._walls(p)
        self._collisions()

    def _walls(self, p):
        if p.x - p.radius < 0:
            p.x = p.radius
            p.vx = -p.vx * 0.9
        elif p.x + p.radius > self.width:
            p.x = self.width - p.radius
            p.vx = -p.vx * 0.9
        if p.y - p.radius < 0:
            p.y = p.radius
            p.vy = -p.vy * 0.9
        elif p.y + p.radius > self.height:
            p.y = self.height - p.radius
            p.vy = -p.vy * 0.85

    def _collisions(self):
        n = len(self.particles)
        for i in range(n):
            for j in range(i + 1, n):
                a, b = self.particles[i], self.particles[j]
                dx = b.x - a.x
                dy = b.y - a.y
                dist = math.hypot(dx, dy)
                min_dist = a.radius + b.radius
                if dist < min_dist and dist > 0:
                    # separate
                    overlap = min_dist - dist
                    nx, ny = dx / dist, dy / dist
                    a.x -= nx * overlap * 0.5
                    a.y -= ny * overlap * 0.5
                    b.x += nx * overlap * 0.5
                    b.y += ny * overlap * 0.5
                    # elastic collision response
                    dvx = a.vx - b.vx
                    dvy = a.vy - b.vy
                    dvn = dvx * nx + dvy * ny
                    if dvn > 0:
                        continue
                    impulse = 2 * dvn / (a.mass + b.mass)
                    a.vx -= impulse * b.mass * nx
                    a.vy -= impulse * b.mass * ny
                    b.vx += impulse * a.mass * nx
                    b.vy += impulse * a.mass * ny

    def energy(self):
        ke = sum(0.5 * p.mass * (p.vx ** 2 + p.vy ** 2) for p in self.particles)
        pe = sum(p.mass * abs(self.gravity[1]) * (self.height - p.y) for p in self.particles)
        return ke, pe, ke + pe

    def bounds_ok(self):
        for p in self.particles:
            if not (0 <= p.x <= self.width and 0 <= p.y <= self.height):
                return False
        return True

if __name__ == "__main__":
    random.seed(11)
    sys = ParticleSystem(width=300, height=200, gravity=(0, 0.2))
    sys.spawn_random(25, speed=3.0)
    print("Particles          :", len(sys.particles))
    print("Initial energy     :", tuple(round(x, 1) for x in sys.energy()))
    for step in range(1, 301):
        sys.step()
        if step % 50 == 0:
            ke, pe, total = sys.energy()
            print(f"Step {step:3d}  KE={ke:7.1f}  PE={pe:7.1f}  Total={total:7.1f}  in_bounds={sys.bounds_ok()}")
    print()
    print("All particles still inside:", sys.bounds_ok())
    speeds = [math.hypot(p.vx, p.vy) for p in sys.particles]
    print("Avg speed after 300 steps :", round(sum(speeds) / len(speeds), 3))
    print("Max speed                 :", round(max(speeds), 3))
