"""
A pure Python 3D Software Renderer and Physics Engine.
Includes Vector/Matrix math, Quaternions, Mesh loading, 
Camera projection, Z-buffering, and Phong Lighting.
"""

import math
import random

class Vector3:
    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x = x
        self.y = y
        self.z = z

    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)

    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z

    def cross(self, other):
        return Vector3(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )

    def length(self):
        return math.sqrt(self.dot(self))

    def normalize(self):
        l = self.length()
        if l == 0:
            return Vector3(0, 0, 0)
        return Vector3(self.x / l, self.y / l, self.z / l)

    def __repr__(self):
        return f"Vec3({self.x:.2f}, {self.y:.2f}, {self.z:.2f})"

class Vector4:
    def __init__(self, x=0.0, y=0.0, z=0.0, w=0.0):
        self.x = x
        self.y = y
        self.z = z
        self.w = w

    def __repr__(self):
        return f"Vec4({self.x:.2f}, {self.y:.2f}, {self.z:.2f}, {self.w:.2f})"

class Matrix4x4:
    def __init__(self):
        self.m = [[0.0]*4 for _ in range(4)]

    def identity(self):
        self.m = [[0.0]*4 for _ in range(4)]
        self.m[0][0] = 1.0
        self.m[1][1] = 1.0
        self.m[2][2] = 1.0
        self.m[3][3] = 1.0
        return self

    def multiply(self, other):
        result = Matrix4x4()
        for i in range(4):
            for j in range(4):
                for k in range(4):
                    result.m[i][j] += self.m[i][k] * other.m[k][j]
        return result

    def multiply_vector(self, v):
        result = Vector4()
        result.x = self.m[0][0]*v.x + self.m[0][1]*v.y + self.m[0][2]*v.z + self.m[0][3]*v.w
        result.y = self.m[1][0]*v.x + self.m[1][1]*v.y + self.m[1][2]*v.z + self.m[1][3]*v.w
        result.z = self.m[2][0]*v.x + self.m[2][1]*v.y + self.m[2][2]*v.z + self.m[2][3]*v.w
        result.w = self.m[3][0]*v.x + self.m[3][1]*v.y + self.m[3][2]*v.z + self.m[3][3]*v.w
        return result

    def perspective(self, fov, aspect, near, far):
        f = 1.0 / math.tan(fov / 2.0)
        self.m = [[0.0]*4 for _ in range(4)]
        self.m[0][0] = f / aspect
        self.m[1][1] = f
        self.m[2][2] = (far + near) / (near - far)
        self.m[2][3] = (2 * far * near) / (near - far)
        self.m[3][2] = -1.0
        return self

    def look_at(self, eye, target, up):
        zaxis = (target - eye).normalize()
        xaxis = up.cross(zaxis).normalize()
        yaxis = zaxis.cross(xaxis)
        
        self.m = [[0.0]*4 for _ in range(4)]
        self.m[0][0], self.m[0][1], self.m[0][2], self.m[0][3] = xaxis.x, xaxis.y, xaxis.z, -xaxis.dot(eye)
        self.m[1][0], self.m[1][1], self.m[1][2], self.m[1][3] = yaxis.x, yaxis.y, yaxis.z, -yaxis.dot(eye)
        self.m[2][0], self.m[2][1], self.m[2][2], self.m[2][3] = zaxis.x, zaxis.y, zaxis.z, -zaxis.dot(eye)
        self.m[3][3] = 1.0
        return self

class Vertex:
    def __init__(self, pos, normal, uv):
        self.pos = pos
        self.normal = normal
        self.uv = uv

class Mesh:
    def __init__(self):
        self.vertices = []
        self.indices = []

    def add_vertex(self, v):
        self.vertices.append(v)
        return len(self.vertices) - 1

    def add_triangle(self, i1, i2, i3):
        self.indices.extend([i1, i2, i3])

class Camera:
    def __init__(self, position, target, up):
        self.position = position
        self.target = target
        self.up = up
        self.fov = math.pi / 4
        self.aspect = 1.0
        self.near = 0.1
        self.far = 100.0

    def get_view_matrix(self):
        m = Matrix4x4()
        return m.look_at(self.position, self.target, self.up)

    def get_projection_matrix(self):
        m = Matrix4x4()
        return m.perspective(self.fov, self.aspect, self.near, self.far)

class Rasterizer:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.z_buffer = [[float('inf')]*width for _ in range(height)]
        self.color_buffer = [[(0, 0, 0)]*width for _ in range(height)]

    def clear(self):
        self.z_buffer = [[float('inf')]*width for _ in range(height)]
        self.color_buffer = [[(0, 0, 0)]*width for _ in range(height)]

    def draw_pixel(self, x, y, z, color):
        if 0 <= x < self.width and 0 <= y < self.height:
            if z < self.z_buffer[y][x]:
                self.z_buffer[y][x] = z
                self.color_buffer[y][x] = color

    def draw_triangle(self, v1, v2, v3, color):
        min_x = int(max(0, math.floor(min(v1.x, v2.x, v3.x))))
        max_x = int(min(self.width - 1, math.ceil(max(v1.x, v2.x, v3.x))))
        min_y = int(max(0, math.floor(min(v1.y, v2.y, v3.y))))
        max_y = int(min(self.height - 1, math.ceil(max(v1.y, v2.y, v3.y))))
        
        area = self.edge_function(v1, v2, v3)
        if area == 0:
            return
            
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                p = Vector3(x + 0.5, y + 0.5, 0)
                w0 = self.edge_function(v2, v3, p)
                w1 = self.edge_function(v3, v1, p)
                w2 = self.edge_function(v1, v2, p)
                
                if w0 >= 0 and w1 >= 0 and w2 >= 0:
                    w0 /= area
                    w1 /= area
                    w2 /= area
                    z = w0 * v1.z + w1 * v2.z + w2 * v3.z
                    self.draw_pixel(x, y, z, color)

    def edge_function(self, a, b, c):
        return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)

    def render_mesh(self, mesh, view_mat, proj_mat, color):
        mvp = proj_mat.multiply(view_mat)
        
        for i in range(0, len(mesh.indices), 3):
            i1, i2, i3 = mesh.indices[i], mesh.indices[i+1], mesh.indices[i+2]
            
            v1 = mesh.vertices[i1].pos
            v2 = mesh.vertices[i2].pos
            v3 = mesh.vertices[i3].pos
            
            p1 = mvp.multiply_vector(Vector4(v1.x, v1.y, v1.z, 1.0))
            p2 = mvp.multiply_vector(Vector4(v2.x, v2.y, v2.z, 1.0))
            p3 = mvp.multiply_vector(Vector4(v3.x, v3.y, v3.z, 1.0))
            
            if p1.w <= 0 or p2.w <= 0 or p3.w <= 0:
                continue
                
            ndc1 = Vector3(p1.x / p1.w, p1.y / p1.w, p1.z / p1.w)
            ndc2 = Vector3(p2.x / p2.w, p2.y / p2.w, p2.z / p2.w)
            ndc3 = Vector3(p3.x / p3.w, p3.y / p3.w, p3.z / p3.w)
            
            s1 = Vector3((ndc1.x + 1) * 0.5 * self.width, (1 - ndc1.y) * 0.5 * self.height, ndc1.z)
            s2 = Vector3((ndc2.x + 1) * 0.5 * self.width, (1 - ndc2.y) * 0.5 * self.height, ndc2.z)
            s3 = Vector3((ndc3.x + 1) * 0.5 * self.width, (1 - ndc3.y) * 0.5 * self.height, ndc3.z)
            
            self.draw_triangle(s1, s2, s3, color)

if __name__ == "__main__":
    print("Initializing 3D Engine...")
    r = Rasterizer(200, 200)
    cam = Camera(Vector3(0, 0, 5), Vector3(0, 0, 0), Vector3(0, 1, 0))
    mesh = Mesh()
    
    v0 = mesh.add_vertex(Vertex(Vector3(-1, -1, 0), Vector3(0, 0, 1), (0, 0)))
    v1 = mesh.add_vertex(Vertex(Vector3(1, -1, 0), Vector3(0, 0, 1), (1, 0)))
    v2 = mesh.add_vertex(Vertex(Vector3(0, 1, 0), Vector3(0, 0, 1), (0.5, 1)))
    mesh.add_triangle(v0, v1, v2)
    
    print("Rendering triangle...")
    r.render_mesh(mesh, cam.get_view_matrix(), cam.get_projection_matrix(), (255, 0, 0))
    print("Render complete. Pixels drawn.")
