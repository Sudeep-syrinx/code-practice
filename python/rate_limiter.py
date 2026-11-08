import time
from collections import deque


class TokenBucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def allow_request(self, tokens=1):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


class SlidingWindowLog:
    def __init__(self, window_size, max_requests):
        self.window_size = window_size
        self.max_requests = max_requests
        self.requests = deque()

    def allow_request(self):
        now = time.monotonic()
        while self.requests and self.requests[0] < now - self.window_size:
            self.requests.popleft()
            
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False


class LeakyBucket:
    def __init__(self, capacity, leak_rate):
        self.capacity = capacity
        self.leak_rate = leak_rate
        self.water = 0
        self.last_leak = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        leaked = (now - self.last_leak) * self.leak_rate
        self.water = max(0, self.water - leaked)
        self.last_leak = now
        
        if self.water < self.capacity:
            self.water += 1
            return True
        return False


if __name__ == "__main__":
    print("Testing Token Bucket (2 req/sec, burst 3):")
    tb = TokenBucket(rate=2, capacity=3)
    results = []
    for i in range(6):
        results.append(tb.allow_request())
        time.sleep(0.2)
    print(f"  Results: {results}")
    
    print("\nTesting Sliding Window (2 req / 1 sec):")
    sw = SlidingWindowLog(window_size=1.0, max_requests=2)
    results = []
    for i in range(5):
        results.append(sw.allow_request())
        time.sleep(0.1)
    print(f"  Results: {results}")
    
    print("\nTesting Leaky Bucket (capacity 2, leak 1/sec):")
    lb = LeakyBucket(capacity=2, leak_rate=1)
    results = []
    for i in range(4):
        results.append(lb.allow_request())
        time.sleep(0.2)
    print(f"  Results: {results}")
