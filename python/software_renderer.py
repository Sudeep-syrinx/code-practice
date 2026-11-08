import math

def mat_mul(a, b):
    return [
        [
            a[0][0]*b[0][0] + a[0][1]*b[1][0] + a[0][2]*b[2][0] + a[0][3]*b[3][0],
            a[0][0]*b[0][1] + a[0][1]*b[1][1] + a[0][2]*b[2][1] + a[0][3]*b[3][1],
            a[0][0]*b[0][2] + a[0][1]*b[1][2] + a[0][2]*b[2][2] + a[0][3]*b[3][2],
            a[0][0]*b[0][3] + a[0][1]*b[1][3] + a[0][2]*b[2][3] + a[0][3]*b[3][3],
        ],
        [
            a[1][0]*b[0][0] + a[1][1]*b[1][0] + a[1][2]*b[2][0] + a[1][3]*b[3][0],
            a[1][0]*b[0][1] + a[1][1]*b[1][1] + a[1][2]*b[2][1] + a[1][3]*b[3][1],
            a[1][0]*b[0][2] + a[1][1]*b[1][2] + a[1][2]*b[2][2] + a[1][3]*b[3][2],
            a[1][0]*b[0][3] + a[1][1]*b[1][3] + a[1][2]*b[2][3] + a[1][3]*b[3][3],
        ],
        [
            a[2][0]*b[0][0] + a[2][1]*b[1][0] + a[2][2]*b[2][0] + a[2][3]*b[3][0],
            a[2][0]*b[0][1] + a[2][1]*b[1][1] + a[2][2]*b[2][1] + a[2][3]*b[3][1],
            a[2][0]*b[0][2] + a[2][1]*b[1][2] + a[2][2]*b[2][2] + a[2][3]*b[3][2],
            a[2][0]*b[0][3] + a[2][1]*b[1][3] + a[2][2]*b[2][3] + a[2][3]*b[3][3],
        ],
        [
            a[3][0]*b[0][0] + a[3][1]*b[1][0] + a[3][2]*b[2][0] + a[3][3]*b[3][0],
            a[3][0]*b[0][1] + a[3][1]*b[1][1] + a[3][2]*b[2][1] + a[3][3]*b[3][1],
            a[3][0]*b[0][2] + a[3][1]*b[1][2] + a[3][2]*b[2][2] + a[3][3]*b[3][2],
            a[3][0]*b[0][3] + a[3][1]*b[1][3] + a[3][2]*b[2][3] + a[3][3]*b[3][3],
        ],
    ]

def identity():
    return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]

def translate(x, y, z):
    m = identity()
    m[0][3], m[1][3], m[2][3] = x, y, z
    return m

def scale(sx, sy, sz):
    m = identity()
    m[0][0], m[1][1], m[2][2] = sx, sy, sz
    return m

def rotate_x(angle):
    c, s = math.cos(angle), math.sin(angle)
    m = identity()
    m[1][1], m[1][2] = c, -s
    m[2][1], m[2][2] = s, c
    return m

def rotate_y(angle):
    c, s = math.cos(angle), math.sin(angle)
    m = identity()
    m[0][0], m[0][2] = c, s
    m[2][0], m[2][2] = -s, c
    return m

def rotate_z(angle):
    c, s = math.cos(angle), math.sin(angle)
    m = identity()
    m[0][0], m[0][1] = c, -s
    m[1][0], m[1][1] = s, c
    return m

def transform_point(m, p):
    x = m[0][0]*p[0] + m[0][1]*p[1] + m[0][2]*p[2] + m[0][3]
    y = m[1][0]*p[0] + m[1][1]*p[1] + m[1][2]*p[2] + m[1][3]
    z = m[2][0]*p[0] + m[2][1]*p[1] + m[2][2]*p[2] + m[2][3]
    w = m[3][0]*p[0] + m[3][1]*p[1] + m[3][2]*p[2] + m[3][3]
    if abs(w) > 1e-8:
        return (x/w, y/w, z/w)
    return (x, y, z)

def perspective(fovy, aspect, near, far):
    f = 1 / math.tan(fovy / 2)
    m = [[0]*4 for _ in range(4)]
    m[0][0] = f / aspect
    m[1][1] = f
    m[2][2] = (far + near) / (near - far)
    m[2][3] = (2 * far * near) / (near - far)
    m[3][2] = -1
    return m

def look_at(eye, target, up):
    def sub(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])
    def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
    def norm(v):
        l = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
        return (v[0]/l, v[1]/l, v[2]/l) if l else (0,0,0)
    z = norm(sub(eye, target))
    x = norm(cross(up, z))
    y = cross(z, x)
    m = identity()
    m[0][0], m[0][1], m[0][2] = x[0], x[1], x[2]
    m[1][0], m[1][1], m[1][2] = y[0], y[1], y[2]
    m[2][0], m[2][1], m[2][2] = z[0], z[1], z[2]
    m[0][3] = - (x[0]*eye[0] + x[1]*eye[1] + x[2]*eye[2])
    m[1][3] = - (y[0]*eye[0] + y[1]*eye[1] + y[2]*eye[2])
    m[2][3] = - (z[0]*eye[0] + z[1]*eye[1] + z[2]*eye[2])
    return m

class Mesh:
    def __init__(self, vertices, edges):
        self.vertices = vertices
        self.edges = edges

def make_cube(size=1.0):
    s = size / 2
    verts = [
        (-s,-s,-s), (s,-s,-s), (s,s,-s), (-s,s,-s),
        (-s,-s,s), (s,-s,s), (s,s,s), (-s,s,s),
    ]
    edges = [
        (0,1),(1,2),(2,3),(3,0),
        (4,5),(5,6),(6,7),(7,4),
        (0,4),(1,5),(2,6),(3,7),
    ]
    return Mesh(verts, edges)

def make_pyramid(size=1.0):
    s = size / 2
    verts = [
        (-s,-s,-s), (s,-s,-s), (s,-s,s), (-s,-s,s), (0,s,0),
    ]
    edges = [(0,1),(1,2),(2,3),(3,0),(0,4),(1,4),(2,4),(3,4)]
    return Mesh(verts, edges)

class Renderer:
    def __init__(self, width=80, height=40):
        self.width = width
        self.height = height
        self.zbuffer = None
        self.framebuffer = None

    def clear(self):
        self.framebuffer = [[" " for _ in range(self.width)] for _ in range(self.height)]
        self.zbuffer = [[float("inf") for _ in range(self.width)] for _ in range(self.height)]

    def project(self, point, mvp):
        x, y, z = transform_point(mvp, point)
        sx = int((x + 1) * 0.5 * (self.width - 1))
        sy = int((1 - (y + 1) * 0.5) * (self.height - 1))
        return sx, sy, z

    def draw_line(self, x0, y0, z0, x1, y1, z1, char="*"):
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        steps = max(dx, dy, 1)
        dz = (z1 - z0) / steps
        z = z0
        x, y = x0, y0
        for _ in range(steps + 1):
            if 0 <= x < self.width and 0 <= y < self.height:
                if z < self.zbuffer[y][x]:
                    self.zbuffer[y][x] = z
                    self.framebuffer[y][x] = char
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
            z += dz

    def render_mesh(self, mesh, mvp, char="*"):
        projected = [self.project(v, mvp) for v in mesh.vertices]
        for i, j in mesh.edges:
            x0, y0, z0 = projected[i]
            x1, y1, z1 = projected[j]
            self.draw_line(x0, y0, z0, x1, y1, z1, char)

    def show(self):
        for row in self.framebuffer:
            print("".join(row))

if __name__ == "__main__":
    cube = make_cube(1.6)
    pyramid = make_pyramid(1.4)
    renderer = Renderer(90, 35)
    eye = (3.5, 2.5, 4.5)
    target = (0, 0, 0)
    up = (0, 1, 0)
    view = look_at(eye, target, up)
    proj = perspective(math.radians(50), 90/35, 0.1, 100)

    print("Cube wireframe")
    model = mat_mul(rotate_y(math.radians(35)), rotate_x(math.radians(20)))
    mvp = mat_mul(proj, mat_mul(view, model))
    renderer.clear()
    renderer.render_mesh(cube, mvp, "*")
    renderer.show()
    print()

    print("Pyramid wireframe")
    model2 = mat_mul(translate(0, -0.3, 0), rotate_y(math.radians(-25)))
    mvp2 = mat_mul(proj, mat_mul(view, model2))
    renderer.clear()
    renderer.render_mesh(pyramid, mvp2, "#")
    renderer.show()
    print()

    print("Both together")
    renderer.clear()
    renderer.render_mesh(cube, mvp, "*")
    renderer.render_mesh(pyramid, mvp2, "o")
    renderer.show()
