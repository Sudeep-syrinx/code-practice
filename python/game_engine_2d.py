"""
A complete 2D Game Engine featuring an Entity Component System (ECS),
Spatial Hashing for collisions, and a Physics system.
"""

import math
import collections

class Vector2:
    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector2(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vector2(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):
        return Vector2(self.x * scalar, self.y * scalar)

    def length(self):
        return math.sqrt(self.x**2 + self.y**2)

    def normalize(self):
        l = self.length()
        if l == 0:
            return Vector2(0, 0)
        return Vector2(self.x / l, self.y / l)

    def __repr__(self):
        return f"Vec2({self.x:.2f}, {self.y:.2f})"

class Entity:
    _id_counter = 0

    def __init__(self):
        self.id = Entity._id_counter
        Entity._id_counter += 1
        self.components = {}

    def add_component(self, component):
        self.components[type(component).__name__] = component

    def get_component(self, component_type):
        return self.components.get(component_type)

    def has_component(self, component_type):
        return component_type in self.components

class Transform:
    def __init__(self, position=None, velocity=None):
        self.position = position if position else Vector2()
        self.velocity = velocity if velocity else Vector2()

class Collider:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.aabb = (self.position.x - width/2, self.position.y - height/2, width, height)

class Renderer:
    def __init__(self, color="white", shape="box"):
        self.color = color
        self.shape = shape

class SpatialHash:
    def __init__(self, cell_size):
        self.cell_size = cell_size
        self.grid = collections.defaultdict(list)

    def clear(self):
        self.grid.clear()

    def insert(self, entity, rect):
        min_x = int(rect[0] // self.cell_size)
        max_x = int((rect[0] + rect[2]) // self.cell_size)
        min_y = int(rect[1] // self.cell_size)
        max_y = int((rect[1] + rect[3]) // self.cell_size)
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                self.grid[(x, y)].append(entity)

    def get_nearby(self, rect):
        min_x = int(rect[0] // self.cell_size)
        max_x = int((rect[0] + rect[2]) // self.cell_size)
        min_y = int(rect[1] // self.cell_size)
        max_y = int((rect[1] + rect[3]) // self.cell_size)
        nearby = set()
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                nearby.update(self.grid[(x, y)])
        return nearby

class PhysicsSystem:
    def update(self, entities, dt):
        for entity in entities:
            transform = entity.get_component(Transform)
            if transform:
                transform.position = transform.position + transform.velocity * dt
                collider = entity.get_component(Collider)
                if collider:
                    collider.aabb = (transform.position.x - collider.width/2, 
                                     transform.position.y - collider.height/2, 
                                     collider.width, collider.height)

class CollisionSystem:
    def __init__(self, cell_size=100):
        self.spatial_hash = SpatialHash(cell_size)

    def update(self, entities):
        self.spatial_hash.clear()
        for entity in entities:
            collider = entity.get_component(Collider)
            if collider:
                self.spatial_hash.insert(entity, collider.aabb)

        collisions = []
        checked = set()
        for entity in entities:
            collider = entity.get_component(Collider)
            if not collider:
                continue
            nearby = self.spatial_hash.get_nearby(collider.aabb)
            for other in nearby:
                if entity.id == other.id:
                    continue
                pair = tuple(sorted([entity.id, other.id]))
                if pair in checked:
                    continue
                checked.add(pair)
                other_col = other.get_component(Collider)
                if self.check_aabb(collider.aabb, other_col.aabb):
                    collisions.append((entity, other))
        return collisions

    def check_aabb(self, a, b):
        return (a[0] < b[0] + b[2] and
                a[0] + a[2] > b[0] and
                a[1] < b[1] + b[3] and
                a[1] + a[3] > b[1])

class World:
    def __init__(self):
        self.entities = []
        self.physics = PhysicsSystem()
        self.collision = CollisionSystem()
        self.time = 0.0

    def create_entity(self):
        e = Entity()
        self.entities.append(e)
        return e

    def update(self, dt):
        self.time += dt
        self.physics.update(self.entities, dt)
        collisions = self.collision.update(self.entities)
        return collisions

if __name__ == "__main__":
    world = World()
    
    player = world.create_entity()
    player.add_component(Transform(Vector2(0, 0), Vector2(50, 0)))
    player.add_component(Collider(10, 10))
    player.add_component(Renderer("green"))
    
    enemy = world.create_entity()
    enemy.add_component(Transform(Vector2(100, 0), Vector2(-50, 0)))
    enemy.add_component(Collider(20, 20))
    enemy.add_component(Renderer("red"))
    
    print("Starting simulation...")
    for frame in range(1, 5):
        collisions = world.update(0.1)
        p_transform = player.get_component(Transform)
        e_transform = enemy.get_component(Transform)
        print(f"Frame {frame}: Player at {p_transform.position}, Enemy at {e_transform.position}")
        if collisions:
            print("  COLLISION DETECTED!")
