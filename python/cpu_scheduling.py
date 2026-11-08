import random
from collections import deque


class Proc:
    def __init__(self, pid, arrival, burst, priority=0):
        self.pid = pid
        self.arrival = arrival
        self.burst = burst
        self.priority = priority


def fcfs(procs):
    time = 0
    completion = {}
    order = []
    for p in sorted(procs, key=lambda p: (p.arrival, p.pid)):
        time = max(time, p.arrival)
        order.append((p.pid, time, time + p.burst))
        time += p.burst
        completion[p.pid] = time
    return completion, order


def non_preemptive(procs, key):
    remaining = sorted(procs, key=lambda p: (p.arrival, p.pid))
    time = 0
    completion = {}
    order = []
    while remaining:
        ready = [p for p in remaining if p.arrival <= time]
        if not ready:
            time = remaining[0].arrival
            continue
        p = min(ready, key=key)
        remaining.remove(p)
        order.append((p.pid, time, time + p.burst))
        time += p.burst
        completion[p.pid] = time
    return completion, order


def sjf_key(p):
    return (p.burst, p.arrival, p.pid)


def priority_key(p):
    return (p.priority, p.arrival, p.pid)


def srtf(procs):
    left = {p.pid: p.burst for p in procs}
    arrival = {p.pid: p.arrival for p in procs}
    time = 0
    completion = {}
    timeline = []
    while len(completion) < len(procs):
        ready = [pid for pid in left if left[pid] > 0 and arrival[pid] <= time]
        if not ready:
            timeline.append(None)
            time += 1
            continue
        pid = min(ready, key=lambda q: (left[q], arrival[q], q))
        timeline.append(pid)
        left[pid] -= 1
        time += 1
        if left[pid] == 0:
            completion[pid] = time
    return completion, timeline


def round_robin(procs, quantum):
    pending = sorted(procs, key=lambda p: (p.arrival, p.pid))
    left = {p.pid: p.burst for p in procs}
    queue = deque()
    completion = {}
    timeline = []
    time = 0
    i = 0

    def admit():
        nonlocal i
        while i < len(pending) and pending[i].arrival <= time:
            queue.append(pending[i].pid)
            i += 1

    admit()
    while len(completion) < len(procs):
        if not queue:
            timeline.append(None)
            time += 1
            admit()
            continue
        pid = queue.popleft()
        run = min(quantum, left[pid])
        for _ in range(run):
            timeline.append(pid)
        time += run
        left[pid] -= run
        admit()
        if left[pid] > 0:
            queue.append(pid)
        else:
            completion[pid] = time
    return completion, timeline


def segments(timeline):
    result = []
    for t, pid in enumerate(timeline):
        if result and result[-1][0] == pid and result[-1][2] == t:
            result[-1][2] = t + 1
        else:
            result.append([pid, t, t + 1])
    return [tuple(s) for s in result]


def stats(procs, completion):
    by_pid = {p.pid: p for p in procs}
    rows = []
    for pid in sorted(completion):
        p = by_pid[pid]
        c = completion[pid]
        turnaround = c - p.arrival
        rows.append((pid, c, turnaround, turnaround - p.burst))
    n = len(rows)
    avg_t = round(sum(r[2] for r in rows) / n, 2)
    avg_w = round(sum(r[3] for r in rows) / n, 2)
    return rows, avg_t, avg_w


def mean_wait(procs, completion):
    return sum(completion[p.pid] - p.arrival - p.burst for p in procs) / len(procs)


def show(name, procs, completion, gantt):
    rows, avg_t, avg_w = stats(procs, completion)
    print(name)
    print(f"  {'PID':<5}{'Done':>6}{'Turnaround':>12}{'Waiting':>9}")
    for pid, c, t, w in rows:
        print(f"  P{pid:<4}{c:>6}{t:>12}{w:>9}")
    print(f"  average turnaround {avg_t}, average waiting {avg_w}")
    chart = " ".join(
        f"{'idle' if pid is None else 'P' + str(pid)}[{s}-{e}]" for pid, s, e in gantt
    )
    print("  gantt:", chart)
    print()
    return avg_w


def random_workload(rng, n):
    return [
        Proc(i + 1, rng.randint(0, 20), rng.randint(1, 10), rng.randint(1, 5))
        for i in range(n)
    ]


if __name__ == "__main__":
    procs = [Proc(1, 0, 8, 3), Proc(2, 1, 4, 1), Proc(3, 2, 9, 4), Proc(4, 3, 5, 2)]

    c, order = fcfs(procs)
    w_fcfs = show("First come first served", procs, c, order)
    c, order = non_preemptive(procs, sjf_key)
    w_sjf = show("Shortest job first", procs, c, order)
    c, timeline = srtf(procs)
    w_srtf = show("Shortest remaining time first", procs, c, segments(timeline))
    c, order = non_preemptive(procs, priority_key)
    show("Priority (lower number wins)", procs, c, order)
    c, timeline = round_robin(procs, 3)
    show("Round robin, quantum 3", procs, c, segments(timeline))

    print("FCFS average wait is 8.75 :", w_fcfs == 8.75)
    print("SJF average wait is 7.75  :", w_sjf == 7.75)
    print("SRTF average wait is 6.5  :", w_srtf == 6.5)
    print("Huge quantum equals FCFS  :", round_robin(procs, 1000)[0] == fcfs(procs)[0])

    all_valid = True
    srtf_best = True
    busy_ok = True
    for seed in range(200):
        rng = random.Random(seed)
        work = random_workload(rng, rng.randint(2, 8))
        total = sum(p.burst for p in work)
        srtf_c, srtf_t = srtf(work)
        rr_c, rr_t = round_robin(work, 3)
        results = {
            "fcfs": fcfs(work)[0],
            "sjf": non_preemptive(work, sjf_key)[0],
            "priority": non_preemptive(work, priority_key)[0],
            "srtf": srtf_c,
            "rr": rr_c,
        }
        for name, completion in results.items():
            if len(completion) != len(work):
                all_valid = False
            for p in work:
                if completion[p.pid] < p.arrival + p.burst:
                    all_valid = False
        best = mean_wait(work, results["srtf"])
        for name, completion in results.items():
            if mean_wait(work, completion) < best - 1e-9:
                srtf_best = False
        if sum(1 for x in srtf_t if x is not None) != total:
            busy_ok = False
        if sum(1 for x in rr_t if x is not None) != total:
            busy_ok = False

    print()
    print("200 random workloads")
    print("  Every process finishes, never early :", all_valid)
    print("  SRTF has the lowest average wait    :", srtf_best)
    print("  Busy time equals total burst        :", busy_ok)
