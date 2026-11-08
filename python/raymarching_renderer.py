import math

class RaymarchingRenderer:
    """A pure ASCII 3D Raymarching Engine using Signed Distance Fields (SDF)."""
    def __init__(self, width: int = 80, height: int = 40):
        self.width = width
        self.height = height
        self.shades = " .:-=+*#%@"

    def _sphere_sdf(self, px, py, pz, sx, sy, sz, r):
        return math.sqrt((px-sx)**2 + (py-sy)**2 + (pz-sz)**2) - r

    def _box_sdf(self, px, py, pz, bx, by, bz, b_size):
        dx = abs(px - bx) - b_size
        dy = abs(py - by) - b_size
        dz = abs(pz - bz) - b_size
        return math.sqrt(max(dx,0)**2 + max(dy,0)**2 + max(dz,0)**2) + min(max(dx,max(dy,dz)), 0.0)

    def scene_sdf(self, x, y, z):
        # Combine a sphere and a box
        s = self._sphere_sdf(x, y, z, 0.0, 0.0, 5.0, 1.5)
        b = self._box_sdf(x, y, z, 2.0, -0.5, 6.0, 1.0)
        return min(s, b)

    def render_frame(self, rot_angle: float) -> str:
        output = []
        camera_pos = (0.0, 0.0, -2.0)
        
        # Light source direction
        lx, ly, lz = 0.58, 0.58, -0.58

        for h in range(self.height):
            row = []
            for w in range(self.width):
                # Normalized screen coordinates [-1, 1]
                uv_x = (w / self.width - 0.5) * 2.0 * (self.width / self.height)
                uv_y = (h / self.height - 0.5) * 2.0

                # Ray direction
                rd_x, rd_y, rd_z = uv_x, uv_y, 1.0
                # Normalize ray dir
                rd_len = math.sqrt(rd_x**2 + rd_y**2 + rd_z**2)
                rd_x, rd_y, rd_z = rd_x/rd_len, rd_y/rd_len, rd_z/rd_len

                # Raymarching loop
                dist_traveled = 0.0
                max_dist = 20.0
                hit = False
                steps = 0

                curr_x, curr_y, curr_z = camera_pos
                while dist_traveled < max_dist and steps < 32:
                    d = self.scene_sdf(curr_x, curr_y, curr_z)
                    if d < 0.001:
                        hit = True
                        break
                    dist_traveled += d
                    curr_x = camera_pos[0] + rd_x * dist_traveled
                    curr_y = camera_pos[1] + rd_y * dist_traveled
                    curr_z = camera_pos[2] + rd_z * dist_traveled
                    steps += 1

                if hit:
                    # Estimate normal for shading
                    eps = 0.01
                    nx = self.scene_sdf(curr_x+eps, curr_y, curr_z) - self.scene_sdf(curr_x-eps, curr_y, curr_z)
                    ny = self.scene_sdf(curr_x, curr_y+eps, curr_z) - self.scene_sdf(curr_x, curr_y-eps, curr_z)
                    nz = self.scene_sdf(curr_x, curr_y, curr_z+eps) - self.scene_sdf(curr_x, curr_y, curr_z-eps)
                    n_len = math.sqrt(nx**2 + ny**2 + nz**2)
                    if n_len > 0: nx, ny, nz = nx/n_len, ny/n_len, nz/n_len

                    # Diffuse lighting
                    diffuse = max(0.0, nx*lx + ny*ly + nz*lz)
                    char_idx = int(diffuse * (len(self.shades) - 1))
                    row.append(self.shades[char_idx])
                else:
                    row.append(" ")
            output.append("".join(row))
        return "\n".join(output)

if __name__ == "__main__":
    print("--- 3D RAYMARCHING SDF GRAPHICS RENDERER ---")
    renderer = RaymarchingRenderer(width=60, height=25)
    frame_preview = renderer.render_frame(0.0)
    print(frame_preview)
