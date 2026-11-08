import random

def fcfs(requests, head):
    order = list(requests)
    movement = 0
    pos = head
    for r in order:
        movement += abs(pos - r)
        pos = r
    return order, movement

def sstf(requests, head):
    pending = list(requests)
    order = []
    pos = head
    movement = 0
    while pending:
        nearest = min(pending, key=lambda x: abs(x - pos))
        movement += abs(pos - nearest)
        pos = nearest
        order.append(nearest)
        pending.remove(nearest)
    return order, movement

def scan(requests, head, direction="up", max_cyl=199):
    pending = sorted(requests)
    order = []
    pos = head
    movement = 0
    if direction == "up":
        right = [r for r in pending if r >= head]
        left = [r for r in pending if r < head]
        for r in right:
            movement += abs(pos - r)
            pos = r
            order.append(r)
        if left:
            movement += abs(pos - max_cyl)
            pos = max_cyl
            for r in reversed(left):
                movement += abs(pos - r)
                pos = r
                order.append(r)
    else:
        left = [r for r in pending if r <= head]
        right = [r for r in pending if r > head]
        for r in reversed(left):
            movement += abs(pos - r)
            pos = r
            order.append(r)
        if right:
            movement += abs(pos - 0)
            pos = 0
            for r in right:
                movement += abs(pos - r)
                pos = r
                order.append(r)
    return order, movement

def cscan(requests, head, max_cyl=199):
    pending = sorted(requests)
    order = []
    pos = head
    movement = 0
    right = [r for r in pending if r >= head]
    left = [r for r in pending if r < head]
    for r in right:
        movement += abs(pos - r)
        pos = r
        order.append(r)
    if left:
        movement += abs(pos - max_cyl)
        movement += max_cyl  # jump to 0
        pos = 0
        for r in left:
            movement += abs(pos - r)
            pos = r
            order.append(r)
    return order, movement

def look(requests, head, direction="up"):
    pending = sorted(requests)
    order = []
    pos = head
    movement = 0
    if direction == "up":
        right = [r for r in pending if r >= head]
        left = [r for r in pending if r < head]
        for r in right:
            movement += abs(pos - r)
            pos = r
            order.append(r)
        for r in reversed(left):
            movement += abs(pos - r)
            pos = r
            order.append(r)
    else:
        left = [r for r in pending if r <= head]
        right = [r for r in pending if r > head]
        for r in reversed(left):
            movement += abs(pos - r)
            pos = r
            order.append(r)
        for r in right:
            movement += abs(pos - r)
            pos = r
            order.append(r)
    return order, movement

def clook(requests, head):
    pending = sorted(requests)
    order = []
    pos = head
    movement = 0
    right = [r for r in pending if r >= head]
    left = [r for r in pending if r < head]
    for r in right:
        movement += abs(pos - r)
        pos = r
        order.append(r)
    if left:
        movement += abs(pos - left[0])
        pos = left[0]
        for r in left:
            movement += abs(pos - r)
            pos = r
            order.append(r)
    return order, movement

if __name__ == "__main__":
    requests = [98, 183, 37, 122, 14, 124, 65, 67]
    head = 53
    print("Requests :", requests)
    print("Head     :", head)
    print()
    algorithms = [
        ("FCFS", lambda: fcfs(requests, head)),
        ("SSTF", lambda: sstf(requests, head)),
        ("SCAN", lambda: scan(requests, head, "up")),
        ("C-SCAN", lambda: cscan(requests, head)),
        ("LOOK", lambda: look(requests, head, "up")),
        ("C-LOOK", lambda: clook(requests, head)),
    ]
    for name, fn in algorithms:
        order, movement = fn()
        print(f"{name:<8} order={order}")
        print(f"         total head movement = {movement}")
        print()

    # random comparison
    random.seed(7)
    req2 = [random.randint(0, 199) for _ in range(20)]
    head2 = 100
    print("Random 20 requests, head=100")
    for name, fn in [
        ("FCFS", lambda: fcfs(req2, head2)),
        ("SSTF", lambda: sstf(req2, head2)),
        ("SCAN", lambda: scan(req2, head2)),
        ("C-SCAN", lambda: cscan(req2, head2)),
        ("LOOK", lambda: look(req2, head2)),
        ("C-LOOK", lambda: clook(req2, head2)),
    ]:
        _, mov = fn()
        print(f"  {name:<8} movement={mov}")
