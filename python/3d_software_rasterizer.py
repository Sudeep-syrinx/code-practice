import math
from typing import List, Tuple, Optional

# --- Math & Vectors ---
class Vec3:
    def __init__(self, x: float, y: float, z: float, w: float = 1.0):
        self.x, self.y, self.z, self.w = x, y, z, w

    def __add__(self, o): return Vec3(self.x + o.x, self.y + o.y, self.z + o.z, self.w)
    def __sub__(self, o): return Vec3(self.x - o.x, self.y - o.y, self.z - o.z, self.w)
    def __mul__(self, s: float): return Vec3(self.x * s, self.y * s, self.z * s, self.w)
    def __truediv__(self, s: float): return Vec3(self.x / s, self.y / s, self.z / s, self.w)
    
    def dot(self, o) -> float:
        return self.x * o.x + self.y * o.y + self.z * o.z

    def cross(self, o):
        return Vec3(
            self.y * o.z - self.z * o.y,
            self.z * o.x - self.x * o.z,
            self.x * o.y - self.y * o.x
        )

    def normalize(self):
        length = math.sqrt(self.x**2 + self.y**2 + self.z**2)
        if length == 0: return Vec3(0,0,0)
        return Vec3(self.x/length, self.y/length, self.z/length, self.w)

class Mat4:
    def __init__(self, m: List[List[float]] = None):
        self.m = m if m else [[0.0]*4 for _ in range(4)]

    @staticmethod
    def identity():
        return Mat4([[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]])

    def __mul__(self, other):
        if isinstance(other, Vec3):
            v = other
            return Vec3(
                v.x*self.m[0][0] + v.y*self.m[1][0] + v.z*self.m[2][0] + v.w*self.m[3][0],
                v.x*self.m[0][1] + v.y*self.m[1][1] + v.z*self.m[2][1] + v.w*self.m[3][1],
                v.x*self.m[0][2] + v.y*self.m[1][2] + v.z*self.m[2][2] + v.w*self.m[3][2],
                v.x*self.m[0][3] + v.y*self.m[1][3] + v.z*self.m[2][3] + v.w*self.m[3][3]
            )
        else:
            result = Mat4()
            for c in range(4):
                for r in range(4):
                    result.m[r][c] = sum(self.m[r][k] * other.m[k][c] for k in range(4))
            return result

# --- Transformations & Projections ---
class Transform:
    @staticmethod
    def projection(fov_degrees: float, aspect: float, z_near: float, z_far: float) -> Mat4:
        fov_rad = 1.0 / math.tan(fov_degrees * 0.5 / 180.0 * math.pi)
        m = Mat4()
        m.m[0][0] = aspect * fov_rad
        m.m[1][1] = fov_rad
        m.m[2][2] = z_far / (z_far - z_near)
        m.m[3][2] = (-z_far * z_near) / (z_far - z_near)
        m.m[2][3] = 1.0
        m.m[3][3] = 0.0
        return m

    @staticmethod
    def point_at(pos: Vec3, target: Vec3, up: Vec3) -> Mat4:
        forward = (target - pos).normalize()
        a = forward * up.dot(forward)
        new_up = (up - a).normalize()
        right = new_up.cross(forward)
        
        m = Mat4()
        m.m[0][0], m.m[0][1], m.m[0][2] = right.x, right.y, right.z
        m.m[1][0], m.m[1][1], m.m[1][2] = new_up.x, new_up.y, new_up.z
        m.m[2][0], m.m[2][1], m.m[2][2] = forward.x, forward.y, forward.z
        m.m[3][0], m.m[3][1], m.m[3][2] = pos.x, pos.y, pos.z
        m.m[3][3] = 1.0
        return m

    @staticmethod
    def look_at(pos: Vec3, target: Vec3, up: Vec3) -> Mat4:
        point_mat = Transform.point_at(pos, target, up)
        m = Mat4()
        m.m[0][0], m.m[1][0], m.m[2][0] = point_mat.m[0][0], point_mat.m[0][1], point_mat.m[0][2]
        m.m[0][1], m.m[1][1], m.m[2][1] = point_mat.m[1][0], point_mat.m[1][1], point_mat.m[1][2]
        m.m[0][2], m.m[1][2], m.m[2][2] = point_mat.m[2][0], point_mat.m[2][1], point_mat.m[2][2]
        m.m[3][0] = -(point_mat.m[3][0]*m.m[0][0] + point_mat.m[3][1]*m.m[1][0] + point_mat.m[3][2]*m.m[2][0])
        m.m[3][1] = -(point_mat.m[3][0]*m.m[0][1] + point_mat.m[3][1]*m.m[1][1] + point_mat.m[3][2]*m.m[2][1])
        m.m[3][2] = -(point_mat.m[3][0]*m.m[0][2] + point_mat.m[3][1]*m.m[1][2] + point_mat.m[3][2]*m.m[2][2])
        m.m[3][3] = 1.0
        return m

    @staticmethod
    def rotation_z(angle_rad: float) -> Mat4:
        m = Mat4.identity()
        m.m[0][0] = math.cos(angle_rad)
        m.m[0][1] = math.sin(angle_rad)
        m.m[1][0] = -math.sin(angle_rad)
        m.m[1][1] = math.cos(angle_rad)
        return m

    @staticmethod
    def rotation_x(angle_rad: float) -> Mat4:
        m = Mat4.identity()
        m.m[1][1] = math.cos(angle_rad)
        m.m[1][2] = math.sin(angle_rad)
        m.m[2][1] = -math.sin(angle_rad)
        m.m[2][2] = math.cos(angle_rad)
        return m

# --- Framebuffer & Rasterization ---
class Triangle:
    def __init__(self, p1: Vec3, p2: Vec3, p3: Vec3, color: str = "@", lum: float = 1.0):
        self.p = [p1, p2, p3]
        self.color = color
        self.lum = max(0.1, min(lum, 1.0))

class Framebuffer:
    def __init__(self, width: int, height: int):
        self.w = width
        self.h = height
        self.pixels = [[" " for _ in range(width)] for _ in range(height)]
        self.z_buffer = [[float('inf') for _ in range(width)] for _ in range(height)]
        self.shades = ".:-=+*#%@"

    def clear(self):
        for y in range(self.h):
            for x in range(self.w):
                self.pixels[y][x] = " "
                self.z_buffer[y][x] = float('inf')

    def draw_triangle(self, tri: Triangle):
        # Sort points by Y coordinate
        p = sorted(tri.p, key=lambda v: v.y)
        
        # Calculate bounding box
        min_x = max(0, int(min(v.x for v in p)))
        max_x = min(self.w - 1, int(max(v.x for v in p)))
        min_y = max(0, int(p[0].y))
        max_y = min(self.h - 1, int(p[2].y))

        # Determine char based on luminance
        char_idx = int(tri.lum * (len(self.shades) - 1))
        char = self.shades[char_idx]

        def edge_function(a, b, c):
            return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)

        area = edge_function(p[0], p[1], p[2])
        if area == 0: return

        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                pt = Vec3(x + 0.5, y + 0.5, 0)
                
                w0 = edge_function(p[1], p[2], pt)
                w1 = edge_function(p[2], p[0], pt)
                w2 = edge_function(p[0], p[1], pt)

                if w0 >= 0 and w1 >= 0 and w2 >= 0:
                    w0 /= area
                    w1 /= area
                    w2 /= area

                    z = w0 * p[0].z + w1 * p[1].z + w2 * p[2].z
                    
                    if z < self.z_buffer[y][x]:
                        self.z_buffer[y][x] = z
                        self.pixels[y][x] = char

    def render_to_console(self):
        print("\033[H", end="") # Move cursor home
        lines = []
        for row in self.pixels:
            lines.append("".join(row))
        print("\n".join(lines))

# --- Engine ---
class Engine3D:
    def __init__(self, w=80, h=40):
        self.fb = Framebuffer(w, h)
        self.mesh: List[Triangle] = []
        self.proj_mat = Transform.projection(90.0, h/w, 0.1, 1000.0)
        self.camera = Vec3(0, 0, 0)
        self.light_dir = Vec3(0, 0, -1).normalize()

    def build_cube(self):
        # South
        self.mesh.append(Triangle(Vec3(0,0,0), Vec3(0,1,0), Vec3(1,1,0)))
        self.mesh.append(Triangle(Vec3(0,0,0), Vec3(1,1,0), Vec3(1,0,0)))
        # East
        self.mesh.append(Triangle(Vec3(1,0,0), Vec3(1,1,0), Vec3(1,1,1)))
        self.mesh.append(Triangle(Vec3(1,0,0), Vec3(1,1,1), Vec3(1,0,1)))
        # North
        self.mesh.append(Triangle(Vec3(1,0,1), Vec3(1,1,1), Vec3(0,1,1)))
        self.mesh.append(Triangle(Vec3(1,0,1), Vec3(0,1,1), Vec3(0,0,1)))
        # West
        self.mesh.append(Triangle(Vec3(0,0,1), Vec3(0,1,1), Vec3(0,1,0)))
        self.mesh.append(Triangle(Vec3(0,0,1), Vec3(0,1,0), Vec3(0,0,0)))
        # Top
        self.mesh.append(Triangle(Vec3(0,1,0), Vec3(0,1,1), Vec3(1,1,1)))
        self.mesh.append(Triangle(Vec3(0,1,0), Vec3(1,1,1), Vec3(1,1,0)))
        # Bottom
        self.mesh.append(Triangle(Vec3(1,0,1), Vec3(0,0,1), Vec3(0,0,0)))
        self.mesh.append(Triangle(Vec3(1,0,1), Vec3(0,0,0), Vec3(1,0,0)))

    def render_frame(self, time_step: float):
        self.fb.clear()
        
        rot_z = Transform.rotation_z(time_step)
        rot_x = Transform.rotation_x(time_step * 0.5)
        
        target = Vec3(0, 0, 1)
        up = Vec3(0, 1, 0)
        view_mat = Transform.look_at(self.camera, target, up)

        triangles_to_raster = []

        for tri in self.mesh:
            # Transform
            t_tri = Triangle(
                tri.p[0] * rot_z * rot_x,
                tri.p[1] * rot_z * rot_x,
                tri.p[2] * rot_z * rot_x
            )

            # Offset into screen
            t_tri.p[0].z += 3.0
            t_tri.p[1].z += 3.0
            t_tri.p[2].z += 3.0

            # Compute normal
            line1 = t_tri.p[1] - t_tri.p[0]
            line2 = t_tri.p[2] - t_tri.p[0]
            normal = line1.cross(line2).normalize()

            # Backface culling
            if normal.dot(t_tri.p[0] - self.camera) < 0:
                
                # Illumination
                lum = normal.dot(self.light_dir)
                t_tri.lum = lum
                
                # View Transform
                v_tri = Triangle(
                    t_tri.p[0] * view_mat,
                    t_tri.p[1] * view_mat,
                    t_tri.p[2] * view_mat,
                    lum=lum
                )

                # Project
                p_tri = Triangle(
                    v_tri.p[0] * self.proj_mat,
                    v_tri.p[1] * self.proj_mat,
                    v_tri.p[2] * self.proj_mat,
                    lum=lum
                )

                # Perspective divide
                p_tri.p[0] = p_tri.p[0] / p_tri.p[0].w
                p_tri.p[1] = p_tri.p[1] / p_tri.p[1].w
                p_tri.p[2] = p_tri.p[2] / p_tri.p[2].w

                # Scale to Viewport
                offset_view = Vec3(1, 1, 0)
                p_tri.p[0] = (p_tri.p[0] + offset_view) * 0.5 * Vec3(self.fb.w, self.fb.h, 1)
                p_tri.p[1] = (p_tri.p[1] + offset_view) * 0.5 * Vec3(self.fb.w, self.fb.h, 1)
                p_tri.p[2] = (p_tri.p[2] + offset_view) * 0.5 * Vec3(self.fb.w, self.fb.h, 1)

                triangles_to_raster.append(p_tri)

        # Sort by depth (Painter's algorithm as fallback/combo with Z-buffer)
        triangles_to_raster.sort(key=lambda t: (t.p[0].z + t.p[1].z + t.p[2].z) / 3.0, reverse=True)

        for t in triangles_to_raster:
            self.fb.draw_triangle(t)

        self.fb.render_to_console()

if __name__ == "__main__":
    import time
    print("--- 3D SOFTWARE RASTERIZER ---")
    engine = Engine3D(w=60, h=30)
    engine.build_cube()
    
    for i in range(10): # Run for 10 frames to avoid infinite loop in automation
        engine.render_frame(i * 0.2)
        print(f"Frame {i+1}/10 rendered.")
        time.sleep(0.1)
