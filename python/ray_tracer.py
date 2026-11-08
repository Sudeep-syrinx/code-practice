import math
from typing import List, Tuple

Vec3 = Tuple[float, float, float]

def add(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])

def sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

def mul(a: Vec3, s: float) -> Vec3:
    return (a[0] * s, a[1] * s, a[2] * s)

def dot(a: Vec3, b: Vec3) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

def length(v: Vec3) -> float:
    return math.sqrt(dot(v, v))

def normalize(v: Vec3) -> Vec3:
    l = length(v)
    return (0, 0, 0) if l == 0 else mul(v, 1 / l)

def reflect(v: Vec3, n: Vec3) -> Vec3:
    return sub(v, mul(n, 2 * dot(v, n)))

class Sphere:
    def __init__(self, center: Vec3, radius: float, color: Vec3, reflectivity=0.0):
        self.center = center
        self.radius = radius
        self.color = color
        self.reflectivity = reflectivity

    def intersect(self, origin: Vec3, direction: Vec3):
        oc = sub(origin, self.center)
        a = dot(direction, direction)
        b = 2 * dot(oc, direction)
        c = dot(oc, oc) - self.radius ** 2
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        t = (-b - math.sqrt(disc)) / (2 * a)
        if t < 1e-4:
            t = (-b + math.sqrt(disc)) / (2 * a)
        if t < 1e-4:
            return None
        return t

class Plane:
    def __init__(self, point: Vec3, normal: Vec3, color: Vec3, reflectivity=0.0):
        self.point = point
        self.normal = normalize(normal)
        self.color = color
        self.reflectivity = reflectivity

    def intersect(self, origin: Vec3, direction: Vec3):
        denom = dot(self.normal, direction)
        if abs(denom) < 1e-6:
            return None
        t = dot(sub(self.point, origin), self.normal) / denom
        return t if t > 1e-4 else None

def closest_intersection(origin, direction, objects):
    closest_t = float("inf")
    hit_obj = None
    for obj in objects:
        t = obj.intersect(origin, direction)
        if t and t < closest_t:
            closest_t = t
            hit_obj = obj
    return (closest_t, hit_obj) if hit_obj else (None, None)

def trace_ray(origin, direction, objects, light_pos, depth=0, max_depth=3):
    t, obj = closest_intersection(origin, direction)
    if obj is None:
        return (0.1, 0.1, 0.15)  # background

    hit_point = add(origin, mul(direction, t))
    if isinstance(obj, Sphere):
        normal = normalize(sub(hit_point, obj.center))
    else:
        normal = obj.normal

    # ambient + diffuse
    to_light = normalize(sub(light_pos, hit_point))
    shadow_t, _ = closest_intersection(add(hit_point, mul(normal, 1e-4)), to_light, objects)
    in_shadow = shadow_t is not None and shadow_t < length(sub(light_pos, hit_point))

    ambient = 0.15
    diffuse = max(0, dot(normal, to_light)) * (0.2 if in_shadow else 1.0)
    color = mul(obj.color, ambient + diffuse * 0.85)

    # reflection
    if obj.reflectivity > 0 and depth < max_depth:
        refl_dir = reflect(direction, normal)
        refl_color = trace_ray(add(hit_point, mul(normal, 1e-4)), refl_dir, objects, light_pos, depth + 1, max_depth)
        color = add(mul(color, 1 - obj.reflectivity), mul(refl_color, obj.reflectivity))

    return tuple(max(0, min(1, c)) for c in color)

def render(width, height, objects, light_pos, camera=(0, 0, -4)):
    aspect = width / height
    image = []
    for j in range(height):
        row = []
        for i in range(width):
            x = (2 * (i + 0.5) / width - 1) * aspect
            y = 1 - 2 * (j + 0.5) / height
            direction = normalize((x, y, 1))
            color = trace_ray(camera, direction, objects, light_pos)
            row.append(color)
        image.append(row)
    return image

def to_ppm(image, filename):
    h, w = len(image), len(image[0])
    with open(filename, "w") as f:
        f.write(f"P3\n{w} {h}\n255\n")
        for row in image:
            for r, g, b in row:
                f.write(f"{int(r*255)} {int(g*255)} {int(b*255)} ")
            f.write("\n")

if __name__ == "__main__":
    objects = [
        Sphere((0, 0, 0), 1.0, (0.9, 0.3, 0.3), reflectivity=0.3),
        Sphere((-1.8, -0.3, 1.5), 0.7, (0.3, 0.8, 0.3), reflectivity=0.1),
        Sphere((1.6, 0.2, 0.8), 0.6, (0.3, 0.4, 0.9), reflectivity=0.4),
        Plane((0, -1.2, 0), (0, 1, 0), (0.7, 0.7, 0.7), reflectivity=0.15),
    ]
    light = (3, 5, -2)
    print("Rendering 80x60 scene...")
    img = render(80, 60, objects, light)
    print("Render complete")
    print("Top-left pixel   :", tuple(round(c, 3) for c in img[0][0]))
    print("Center-ish pixel :", tuple(round(c, 3) for c in img[30][40]))
    # count non-background pixels roughly
    non_bg = sum(1 for row in img for px in row if px[0] > 0.2 or px[1] > 0.2)
    print("Lit pixels       :", non_bg)
    print("Scene has spheres and a reflective floor")
