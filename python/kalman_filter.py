import math


class Kalman1D:
    def __init__(self, process_var, measure_var, estimate=0.0, error=1.0):
        self.q = process_var
        self.r = measure_var
        self.x = estimate
        self.p = error

    def update(self, measurement):
        # prediction
        self.p = self.p + self.q
        # update
        k = self.p / (self.p + self.r)
        self.x = self.x + k * (measurement - self.x)
        self.p = (1 - k) * self.p
        return self.x


class Kalman2D:
    """Constant velocity model in 2D."""

    def __init__(self, dt=1.0, process_noise=1e-2, measure_noise=1.0):
        self.dt = dt
        # state: [x, y, vx, vy]
        self.x = [0.0, 0.0, 0.0, 0.0]
        self.P = [[100.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
        self.Q = [[process_noise if i == j else 0.0 for j in range(4)] for i in range(4)]
        self.R = [[measure_noise if i == j else 0.0 for j in range(2)] for i in range(2)]

    def predict(self):
        dt = self.dt
        F = [
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ]
        new_x = [sum(F[i][j] * self.x[j] for j in range(4)) for i in range(4)]
        # P = F P F^T + Q
        FP = [[sum(F[i][k] * self.P[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
        new_P = [[sum(FP[i][k] * F[j][k] for k in range(4)) + self.Q[i][j] for j in range(4)] for i in range(4)]
        self.x = new_x
        self.P = new_P
        return self.x[:2]

    def update(self, zx, zy):
        # H maps state to measurement (position only)
        H = [[1, 0, 0, 0], [0, 1, 0, 0]]
        z = [zx, zy]
        # y = z - Hx
        y = [z[i] - sum(H[i][j] * self.x[j] for j in range(4)) for i in range(2)]
        # S = H P H^T + R
        HP = [[sum(H[i][k] * self.P[k][j] for k in range(4)) for j in range(4)] for i in range(2)]
        S = [[sum(HP[i][k] * H[j][k] for k in range(4)) + self.R[i][j] for j in range(2)] for i in range(2)]
        # K = P H^T S^-1
        det = S[0][0] * S[1][1] - S[0][1] * S[1][0]
        invS = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]]
        PHt = [[sum(self.P[i][k] * H[j][k] for k in range(4)) for j in range(2)] for i in range(4)]
        K = [[sum(PHt[i][k] * invS[k][j] for k in range(2)) for j in range(2)] for i in range(4)]
        # x = x + K y
        self.x = [self.x[i] + sum(K[i][j] * y[j] for j in range(2)) for i in range(4)]
        # P = (I - K H) P
        KH = [[sum(K[i][k] * H[k][j] for k in range(2)) for j in range(4)] for i in range(4)]
        IKH = [[(1 if i == j else 0) - KH[i][j] for j in range(4)] for i in range(4)]
        self.P = [[sum(IKH[i][k] * self.P[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
        return self.x[:2]


if __name__ == "__main__":
    import random
    rng = random.Random(3)

    # 1D tracking of a noisy constant
    true = 42.0
    kf = Kalman1D(process_var=0.01, measure_var=4.0, estimate=0.0)
    estimates = []
    for _ in range(40):
        z = true + rng.gauss(0, 2)
        estimates.append(kf.update(z))
    print("1D final estimate    :", round(estimates[-1], 3))
    print("Close to 42          :", abs(estimates[-1] - 42) < 1.5)

    # 2D constant velocity
    kf2 = Kalman2D(dt=1.0, process_noise=0.1, measure_noise=2.0)
    traj = []
    x = y = 0.0
    vx, vy = 1.5, 0.8
    for t in range(30):
        x += vx
        y += vy
        zx = x + rng.gauss(0, 1.5)
        zy = y + rng.gauss(0, 1.5)
        kf2.predict()
        est = kf2.update(zx, zy)
        traj.append((est[0], est[1], x, y))

    final_err = math.hypot(traj[-1][0] - traj[-1][2], traj[-1][1] - traj[-1][3])
    print()
    print("2D final error       :", round(final_err, 3))
    print("Error under 3        :", final_err < 3.0)
    print("Last estimate        :", tuple(round(v, 2) for v in traj[-1][:2]))
    print("Last true            :", tuple(round(v, 2) for v in traj[-1][2:]))
