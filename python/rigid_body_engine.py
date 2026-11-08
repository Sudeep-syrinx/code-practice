"""
A 2D Rigid Body Physics Engine.
Includes Vector Math, Rigid Bodies, Collision Detection (SAT), 
and Impulse-based Collision Resolution.
"""

import math

class Vector2D:
    def __init__(self, x=0.0, y=0.0):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):
        return Vector2D(self.x * scalar, self.y * scalar)

    def dot(self, other):
        return self.x * other.x + self.y * other.y

    def cross(self, other):
        return self.x * other.y - self.y * other.x

    def length(self):
        return math.sqrt(self.x**2 + self.y**2)

    def normalize(self):
        l = self.length()
        if l == 0:
            return Vector2D(0, 0)
        return Vector2D(self.x / l, self.y / l)

    def rotate(self, angle):
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        return Vector2D(self.x * cos_a - self.y * sin_a, self.x * sin_a + self.y * cos_a)

class RigidBody:
    def __init__(self, position, mass=1.0, width=1.0, height=1.0):
        self.position = position
        self.velocity = Vector2D(0, 0)
        self.angular_velocity = 0.0
        self.angle = 0.0
        self.mass = mass
        self.inv_mass = 1.0 / mass if mass > 0 else 0.0
        self.width = width
        self.height = height
        self.inertia = (mass * (width**2 + height**2)) / 12.0
        self.inv_inertia = 1.0 / self.inertia if self.inertia > 0 else 0.0

    def get_corners(self):
        hw = self.width / 2.0
        hh = self.height / 2.0
        corners = [
            Vector2D(-hw, -hh),
            Vector2D(hw, -hh),
            Vector2D(hw, hh),
            Vector2D(-hw, hh)
        ]
        return [self.position + c.rotate(self.angle) for c in corners]

def get_axes(corners):
    axes = []
    for i in range(4):
        edge = corners[(i + 1) % 4] - corners[i]
        normal = Vector2D(-edge.y, edge.x).normalize()
        axes.append(normal)
    return axes

def project(corners, axis):
    min_proj = float('inf')
    max_proj = float('-inf')
    for c in corners:
        proj = c.dot(axis)
        if proj < min_proj:
            min_proj = proj
        if proj > max_proj:
            max_proj = proj
    return min_proj, max_proj

def check_collision(body1, body2):
    corners1 = body1.get_corners()
    corners2 = body2.get_corners()
    axes = get_axes(corners1) + get_axes(corners2)
    
    min_overlap = float('inf')
    collision_normal = None
    
    for axis in axes:
        min1, max1 = project(corners1, axis)
        min2, max2 = project(corners2, axis)
        
        if max1 < min2 or max2 < min1:
            return False, None, 0
            
        overlap = min(max1, max2) - max(min1, min2)
        if overlap < min_overlap:
            min_overlap = overlap
            collision_normal = axis
            
    if collision_normal is None:
        return False, None, 0
        
    direction = body2.position - body1.position
    if direction.dot(collision_normal) < 0:
        collision_normal = collision_normal * -1.0
        
    return True, collision_normal, min_overlap

class PhysicsWorld:
    def __init__(self):
        self.bodies = []

    def add_body(self, body):
        self.bodies.append(body)

    def step(self, dt):
        for body in self.bodies:
            body.position = body.position + body.velocity * dt
            body.angle += body.angular_velocity * dt

        for i in range(len(self.bodies)):
            for j in range(i + 1, len(self.bodies)):
                b1 = self.bodies[i]
                b2 = self.bodies[j]
                collided, normal, depth = check_collision(b1, b2)
                if collided:
                    rv = b2.velocity - b1.velocity
                    vel_along_normal = rv.dot(normal)
                    if vel_along_normal > 0:
                        continue
                    e = 0.5
                    j_impulse = -(1 + e) * vel_along_normal
                    j_impulse /= (b1.inv_mass + b2.inv_mass)
                    impulse = normal * j_impulse
                    b1.velocity = b1.velocity - impulse * b1.inv_mass
                    b2.velocity = b2.velocity + impulse * b2.inv_mass

if __name__ == "__main__":
    print("Testing Rigid Body Physics Engine...")
    world = PhysicsWorld()
    
    box1 = RigidBody(Vector2D(0, 0), mass=1.0, width=2.0, height=2.0)
    box2 = RigidBody(Vector2D(2.5, 0), mass=1.0, width=2.0, height=2.0)
    box2.velocity = Vector2D(-2.0, 0)
    
    world.add_body(box1)
    world.add_body(box2)
    
    for step in range(5):
        world.step(0.1)
        print(f"Step {step+1}: Box1 pos={box1.position.x:.2f}, Box2 pos={box2.position.x:.2f}")
        
    print("Physics simulation complete.")
