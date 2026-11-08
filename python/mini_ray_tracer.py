import math

class Vec3:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

    def __add__(self, o): return Vec3(self.x+o.x, self.y+o.y, self.z+o.z)
    def __sub__(self, o): return Vec3(self.x-o.x, self.y-o.y, self.z-o.z)
    def __mul__(self, s): return Vec3(self.x*s, self.y*s, self.z*s)
    def dot(self, o): return self.x*o.x + self.y*o.y + self.z*o.z
    def length(self): return math.sqrt(self.dot(self))
    def normalize(self): 
        l = self.length()
        return Vec3(self.x/l, self.y/l, self.z/l)

class Ray:
    def __init__(self, origin, direction):
        self.origin = origin
        self.direction = direction

class Sphere:
    def __init__(self, center, radius, color):
        self.center = center
        self.radius = radius
        self.color = color

    def intersect(self, ray):
        oc = ray.origin - self.center
        a = ray.direction.dot(ray.direction)
        b = 2.0 * oc.dot(ray.direction)
        c = oc.dot(oc) - self.radius * self.radius
        discriminant = b*b - 4*a*c
        if discriminant < 0:
            return None
        t = (-b - math.sqrt(discriminant)) / (2.0 * a)
        if t > 0.001:
            return t
        return None

if __name__ == "__main__":
    sphere = Sphere(Vec3(0, 0, -5), 1.0, (255, 0, 0))
    ray = Ray(Vec3(0, 0, 0), Vec3(0, 0, -1))
    hit = sphere.intersect(ray)
    print("Ray-sphere intersection distance:", hit)
    print("Test passed:", hit is not None and abs(hit - 4.0) < 1e-5)
