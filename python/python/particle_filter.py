import math
import random


class Particle:
    def __init__(self, x, y, weight=1.0):
        self.x = x
        self.y = y
        self.weight = weight


class ParticleFilter:
    def __init__(self, n_particles, bounds, motion_noise=0.5, sensor_noise=1.0):
        self.n = n_particles
        self.bounds = bounds  # (min_x, max_x, min_y, max_y)
        self.motion_noise = motion_noise
        self.sensor_noise = sensor_noise
        self.particles = [
            Particle(
                random.uniform(bounds[0], bounds[1]),
                random.uniform(bounds[2], bounds[3]),
            )
            for _ in range(n_particles)
        ]

    def predict(self, dx, dy):
        for p in self.particles:
            p.x += dx + random.gauss(0, self.motion_noise)
            p.y += dy + random.gauss(0, self.motion_noise)
            p.x = max(self.bounds[0], min(self.bounds[1], p.x))
            p.y = max(self.bounds[2], min(self.bounds[3], p.y))

    def update(self, landmarks, observations):
        # observations: list of distances to landmarks
        for p in self.particles:
            likelihood = 1.0
            for (lx, ly), obs in zip(landmarks, observations):
                expected = math.hypot(p.x - lx, p.y - ly)
                likelihood *= math.exp(-((obs - expected) ** 2) / (2 * self.sensor_noise ** 2))
            p.weight = likelihood + 1e-300

        total = sum(p.weight for p in self.particles)
        for p in self.particles:
            p.weight /= total

    def resample(self):
        weights = [p.weight for p in self.particles]
        indices = random.choices(range(self.n), weights=weights, k=self.n)
        self.particles = [
            Particle(self.particles[i].x, self.particles[i].y, 1.0 / self.n)
            for i in indices
        ]

    def estimate(self):
        x = sum(p.x * p.weight for p in self.particles)
        y = sum(p.y * p.weight for p in self.particles)
        return x, y

    def step(self, dx, dy, landmarks, observations):
        self.predict(dx, dy)
        self.update(landmarks, observations)
        self.resample()
        return self.estimate()


if __name__ == "__main__":
    random.seed(42)
    bounds = (0, 100, 0, 100)
    landmarks = [(20, 20), (80, 20), (20, 80), (80, 80)]
    pf = ParticleFilter(500, bounds, motion_noise=0.8, sensor_noise=2.0)

    true_x, true_y = 50.0, 50.0
    errors = []
    for t in range(25):
        dx, dy = random.uniform(-3, 3), random.uniform(-3, 3)
        true_x = max(0, min(100, true_x + dx))
        true_y = max(0, min(100, true_y + dy))
        obs = [math.hypot(true_x - lx, true_y - ly) + random.gauss(0, 1.5) for lx, ly in landmarks]
        est = pf.step(dx, dy, landmarks, obs)
        err = math.hypot(est[0] - true_x, est[1] - true_y)
        errors.append(err)

    print("Final true position  :", round(true_x, 2), round(true_y, 2))
    print("Final estimate       :", round(est[0], 2), round(est[1], 2))
    print("Final error          :", round(errors[-1], 2))
    print("Mean error last 10   :", round(sum(errors[-10:]) / 10, 2))
    print("Filter improved      :", errors[-1] < errors[0] or errors[-1] < 8)

    # empty observations still runs
    pf2 = ParticleFilter(50, bounds)
    pf2.predict(1, 1)
    print("Predict only works   :", len(pf2.particles) == 50)
