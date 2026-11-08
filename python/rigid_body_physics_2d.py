import math
from typing import List, Tuple

class Vec2:
    def __init__(self, x: float, y: float):
        self.x, self.y = x, y
    def __add__(self, o): return Vec2(self.x + o.x, self.y + o.y)
    def __sub__(self, o): return Vec2(self.x - o.x, self.y - o.y)
    def __mul__(self, s: float): return Vec2(self.x * s, self.y * s)
    def dot(self, o): return self.x * o.x + self.y * o.y
    def cross(self, o): return self.x * o.y - self.y * o.x
    def mag(self): return math.sqrt(self.x**2 + self.y**2)
    def normalize(self): 
        m = self.mag()
        return Vec2(self.x / m, self.y / m) if m != 0 else Vec2(0, 0)

class Body:
    def __init__(self, pos: Vec2, mass: float):
        self.pos = pos
        self.vel = Vec2(0, 0)
        self.force = Vec2(0, 0)
        self.mass = mass
        self.inv_mass = 1.0 / mass if mass > 0 else 0
        self.restitution = 0.5 # Bounciness

class Circle(Body):
    def __init__(self, pos: Vec2, radius: float, mass: float):
        super().__init__(pos, mass)
        self.radius = radius
        self.type = "circle"

class Polygon(Body):
    def __init__(self, pos: Vec2, vertices: List[Vec2], mass: float):
        super().__init__(pos, mass)
        self.vertices = vertices # relative to center
        self.type = "polygon"
        
    def get_world_vertices(self):
        return [self.pos + v for v in self.vertices]
        
    def get_normals(self):
        world_verts = self.get_world_vertices()
        normals = []
        for i in range(len(world_verts)):
            p1 = world_verts[i]
            p2 = world_verts[(i + 1) % len(world_verts)]
            edge = p2 - p1
            normals.append(Vec2(-edge.y, edge.x).normalize())
        return normals

class Manifold:
    def __init__(self, a: Body, b: Body, penetration: float, normal: Vec2):
        self.a = a
        self.b = b
        self.penetration = penetration
        self.normal = normal

def check_collision_circle_circle(a: Circle, b: Circle) -> Manifold:
    normal = b.pos - a.pos
    dist = normal.mag()
    radius_sum = a.radius + b.radius
    if dist >= radius_sum:
        return None
    if dist == 0:
        return Manifold(a, b, a.radius, Vec2(1, 0))
    return Manifold(a, b, radius_sum - dist, normal.normalize())

def check_collision_poly_poly(a: Polygon, b: Polygon) -> Manifold:
    # Separating Axis Theorem (SAT)
    def get_min_max(poly: Polygon, axis: Vec2):
        min_proj = float('inf')
        max_proj = -float('inf')
        for v in poly.get_world_vertices():
            proj = v.dot(axis)
            min_proj = min(min_proj, proj)
            max_proj = max(max_proj, proj)
        return min_proj, max_proj

    min_overlap = float('inf')
    smallest_axis = None

    axes = a.get_normals() + b.get_normals()
    for axis in axes:
        min_a, max_a = get_min_max(a, axis)
        min_b, max_b = get_min_max(b, axis)
        
        if max_a < min_b or max_b < min_a:
            return None # Gap found
            
        overlap = min(max_a, max_b) - max(min_a, min_b)
        if overlap < min_overlap:
            min_overlap = overlap
            smallest_axis = axis

    # Ensure normal points from a to b
    if (b.pos - a.pos).dot(smallest_axis) < 0:
        smallest_axis = smallest_axis * -1

    return Manifold(a, b, min_overlap, smallest_axis)

def resolve_collision(m: Manifold):
    rv = m.b.vel - m.a.vel
    vel_along_normal = rv.dot(m.normal)
    if vel_along_normal > 0: return # Moving apart

    e = min(m.a.restitution, m.b.restitution)
    j = -(1 + e) * vel_along_normal
    j /= m.a.inv_mass + m.b.inv_mass

    impulse = m.normal * j
    m.a.vel = m.a.vel - impulse * m.a.inv_mass
    m.b.vel = m.b.vel + impulse * m.b.inv_mass

def positional_correction(m: Manifold):
    percent = 0.2 # Penetration percentage to correct
    slop = 0.01 # Penetration allowance
    correction = m.normal * (max(m.penetration - slop, 0.0) / (m.a.inv_mass + m.b.inv_mass) * percent)
    m.a.pos = m.a.pos - correction * m.a.inv_mass
    m.b.pos = m.b.pos + correction * m.b.inv_mass

class PhysicsWorld:
    def __init__(self):
        self.bodies = []
        self.gravity = Vec2(0, 9.81)

    def add(self, body: Body):
        self.bodies.append(body)

    def step(self, dt: float):
        # 1. Apply Forces & Gravity
        for b in self.bodies:
            if b.inv_mass == 0: continue
            b.vel = b.vel + (self.gravity + (b.force * b.inv_mass)) * dt

        # 2. Collision Detection
        manifolds = []
        for i in range(len(self.bodies)):
            for j in range(i + 1, len(self.bodies)):
                a, b = self.bodies[i], self.bodies[j]
                if a.inv_mass == 0 and b.inv_mass == 0: continue
                
                m = None
                if a.type == "circle" and b.type == "circle":
                    m = check_collision_circle_circle(a, b)
                elif a.type == "polygon" and b.type == "polygon":
                    m = check_collision_poly_poly(a, b)
                    
                if m: manifolds.append(m)

        # 3. Collision Resolution
        for m in manifolds:
            resolve_collision(m)

        # 4. Integrate Positions
        for b in self.bodies:
            b.pos = b.pos + b.vel * dt
            b.force = Vec2(0, 0) # Clear forces

        # 5. Positional Correction
        for m in manifolds:
            positional_correction(m)

if __name__ == "__main__":
    print("--- 2D RIGID BODY PHYSICS ENGINE ---")
    world = PhysicsWorld()
    
    # Ground (Infinite mass, 0 inv_mass)
    ground_verts = [Vec2(-50, -5), Vec2(50, -5), Vec2(50, 5), Vec2(-50, 5)]
    ground = Polygon(Vec2(0, 100), ground_verts, 0)
    world.add(ground)
    
    # Falling Box
    box_verts = [Vec2(-5, -5), Vec2(5, -5), Vec2(5, 5), Vec2(-5, 5)]
    box = Polygon(Vec2(0, 0), box_verts, mass=10)
    world.add(box)
    
    # Falling Circle
    ball = Circle(Vec2(2, -50), radius=5, mass=5)
    world.add(ball)

    print("Simulating 60 frames (dt=0.016s) with Gravity (9.81)...")
    for frame in range(60):
        world.step(0.016)
        if frame % 10 == 0 or frame == 59:
            print(f"Frame {frame:02d} | Box Y: {box.pos.y:.2f} | Box Vel Y: {box.vel.y:.2f} | Ball Y: {ball.pos.y:.2f}")
