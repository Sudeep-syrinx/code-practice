import random


class Request:
    def __init__(self, rid, time, start, dest):
        if start == dest:
            raise ValueError("Start and destination must differ")
        self.rid = rid
        self.time = time
        self.start = start
        self.dest = dest
        self.pickup_time = None
        self.dropoff_time = None


class Elevator:
    def __init__(self, capacity):
        self.capacity = capacity
        self.floor = 0
        self.direction = 0
        self.passengers = []
        self.travelled = 0
        self.stops_made = 0


def make_requests(count, floors, seed):
    rng = random.Random(seed)
    requests = []
    for rid in range(1, count + 1):
        start = rng.randrange(floors)
        dest = rng.randrange(floors)
        while dest == start:
            dest = rng.randrange(floors)
        requests.append(Request(rid, rng.randint(0, 40), start, dest))
    return requests


def simulate(requests, capacity, max_ticks=5000):
    pending = sorted(requests, key=lambda r: (r.time, r.rid))
    waiting = []
    finished = []
    log = []
    car = Elevator(capacity)
    t = 0
    while t < max_ticks:
        while pending and pending[0].time <= t:
            waiting.append(pending.pop(0))

        acted = False
        for p in [p for p in car.passengers if p.dest == car.floor]:
            car.passengers.remove(p)
            p.dropoff_time = t
            finished.append(p)
            log.append((t, car.floor, f"drop request {p.rid}"))
            acted = True
        for w in [w for w in waiting if w.start == car.floor]:
            if len(car.passengers) >= car.capacity:
                break
            waiting.remove(w)
            w.pickup_time = t
            car.passengers.append(w)
            log.append((t, car.floor, f"pick request {w.rid} for floor {w.dest}"))
            acted = True
        if acted:
            car.stops_made += 1

        if not pending and not waiting and not car.passengers:
            break

        stops = [p.dest for p in car.passengers] + [w.start for w in waiting]
        ahead = [s for s in stops if (s - car.floor) * car.direction > 0]
        if not ahead:
            others = [s for s in stops if s != car.floor]
            if others:
                nearest = min(others, key=lambda s: (abs(s - car.floor), s))
                car.direction = 1 if nearest > car.floor else -1
            else:
                car.direction = 0
        car.floor += car.direction
        car.travelled += abs(car.direction)
        t += 1
    return finished, car, log, t


def summarize(finished):
    waits = [r.pickup_time - r.time for r in finished]
    rides = [r.dropoff_time - r.pickup_time for r in finished]
    return {
        "delivered": len(finished),
        "avg_wait": round(sum(waits) / len(waits), 2),
        "max_wait": max(waits),
        "avg_ride": round(sum(rides) / len(rides), 2),
    }


if __name__ == "__main__":
    requests = make_requests(15, 10, 4)
    print("Requests (id: time, from -> to)")
    for r in requests:
        print(f"  {r.rid:>2}: t={r.time:>2}  {r.start} -> {r.dest}")

    finished, car, log, ticks = simulate(requests, 4)
    print()
    print("First events")
    for t, floor, event in log[:14]:
        print(f"  t={t:>3}  floor {floor}  {event}")

    print()
    stats = summarize(finished)
    for key, value in stats.items():
        print(f"{key:<10}: {value}")
    print("Finished at tick :", ticks)
    print("Floors travelled :", car.travelled)
    print("Stops made       :", car.stops_made)
    print("All delivered    :", len(finished) == len(requests))
    print("Pickup before drop:", all(r.pickup_time <= r.dropoff_time for r in finished))

    print()
    print("Effect of capacity with 30 requests")
    for capacity in (1, 2, 4, 8):
        reqs = make_requests(30, 10, 9)
        done, car, _, ticks = simulate(reqs, capacity)
        s = summarize(done)
        print(
            f"  capacity {capacity:<2} delivered {s['delivered']:>2}  ticks {ticks:>4}  "
            f"floors {car.travelled:>4}  avg wait {s['avg_wait']:>6}  max wait {s['max_wait']:>4}"
        )

    try:
        Request(1, 0, 3, 3)
    except ValueError as e:
        print()
        print("Error:", e)
