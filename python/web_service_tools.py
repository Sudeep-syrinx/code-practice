from collections import deque

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


class Clock:
    def __init__(self):
        self.now = 0.0

    def advance(self, seconds):
        self.now += seconds

    def __call__(self):
        return self.now


class TokenBucket:
    def __init__(self, capacity, refill_rate, clock):
        self.capacity = capacity
        self.rate = refill_rate
        self.clock = clock
        self.tokens = float(capacity)
        self.last = clock()

    def allow(self, cost=1):
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


class SlidingWindow:
    def __init__(self, limit, window, clock):
        self.limit = limit
        self.window = window
        self.clock = clock
        self.events = deque()

    def allow(self):
        now = self.clock()
        while self.events and self.events[0] <= now - self.window:
            self.events.popleft()
        if len(self.events) < self.limit:
            self.events.append(now)
            return True
        return False


class FixedWindow:
    def __init__(self, limit, window, clock):
        self.limit = limit
        self.window = window
        self.clock = clock
        self.bucket = None
        self.count = 0

    def allow(self):
        bucket = int(self.clock() // self.window)
        if bucket != self.bucket:
            self.bucket = bucket
            self.count = 0
        if self.count < self.limit:
            self.count += 1
            return True
        return False


class PerUserLimiter:
    def __init__(self, factory):
        self.factory = factory
        self.users = {}
        self.blocked = {}

    def allow(self, user):
        if user not in self.users:
            self.users[user] = self.factory()
        ok = self.users[user].allow()
        if not ok:
            self.blocked[user] = self.blocked.get(user, 0) + 1
        return ok


def encode62(n):
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))


def decode62(text):
    total = 0
    for ch in text:
        total = total * 62 + ALPHABET.index(ch)
    return total


class UrlShortener:
    def __init__(self, start=100000):
        self.counter = start
        self.by_code = {}
        self.by_url = {}
        self.hits = {}

    def _check(self, url):
        if not url.startswith(("http://", "https://")) or " " in url:
            raise ValueError(f"Invalid URL {url!r}")

    def _store(self, code, url):
        self.by_code[code] = url
        self.by_url.setdefault(url, code)
        self.hits[code] = 0

    def shorten(self, url):
        self._check(url)
        if url in self.by_url:
            return self.by_url[url]
        code = encode62(self.counter)
        self.counter += 1
        self._store(code, url)
        return code

    def custom(self, code, url):
        self._check(url)
        if not code.isalnum():
            raise ValueError("Code must be alphanumeric")
        if code in self.by_code:
            raise ValueError(f"Code {code!r} is already taken")
        self._store(code, url)
        return code

    def resolve(self, code):
        if code not in self.by_code:
            return None
        self.hits[code] += 1
        return self.by_code[code]

    def top(self, n=3):
        ranked = sorted(self.hits.items(), key=lambda kv: (-kv[1], kv[0]))
        return ranked[:n]


if __name__ == "__main__":
    clock = Clock()
    bucket = TokenBucket(5, 1, clock)
    burst = [bucket.allow() for _ in range(8)]
    print("Burst of 8 at t=0  :", burst.count(True), "allowed")
    clock.advance(3)
    print("After 3 seconds    :", [bucket.allow() for _ in range(5)])
    clock.advance(100)
    print("After long pause   :", sum(bucket.allow() for _ in range(10)), "allowed (capacity is 5)")
    print("Costly request     :", TokenBucket(5, 1, Clock()).allow(cost=6))

    print()
    print("Boundary burst: 5 requests at 9.9s then 5 at 10.1s, limit 5 per 10s")
    for name, make in (
        ("fixed", lambda c: FixedWindow(5, 10, c)),
        ("sliding", lambda c: SlidingWindow(5, 10, c)),
    ):
        c = Clock()
        limiter = make(c)
        c.advance(9.9)
        first = sum(limiter.allow() for _ in range(5))
        c.advance(0.2)
        second = sum(limiter.allow() for _ in range(5))
        print(f"  {name:<8} first {first}  second {second}")

    print()
    clock = Clock()
    per_user = PerUserLimiter(lambda: SlidingWindow(3, 10, clock))
    traffic = ["alice"] * 4 + ["bob"] * 2 + ["alice"]
    for user in traffic:
        print(f"  {user:<6} allowed: {per_user.allow(user)}")
    clock.advance(11)
    print("  alice after 11s :", per_user.allow("alice"))
    print("  blocked totals  :", per_user.blocked)

    print()
    short = UrlShortener()
    urls = [
        "https://github.com/Sudeep-syrinx/code-practice",
        "https://docs.python.org/3/library/heapq.html",
        "https://example.com/a/very/long/path?with=query&and=more",
    ]
    codes = [short.shorten(u) for u in urls]
    print("Codes              :", codes)
    print("Same URL, same code:", short.shorten(urls[0]) == codes[0])
    print("Custom code        :", short.custom("mygit", "https://github.com"))
    for bad in (lambda: short.custom("mygit", "https://other.com"),
                lambda: short.custom("bad code!", "https://other.com"),
                lambda: short.shorten("ftp://nope"),
                lambda: short.shorten("https://has space.com")):
        try:
            bad()
        except ValueError as e:
            print("Error              :", e)

    for code in [codes[0], codes[0], codes[0], codes[1], "mygit", "mygit"]:
        short.resolve(code)
    print("Unknown code       :", short.resolve("zzzzzz"))
    print("Top links          :", short.top())
    print("Round trip 62      :", all(decode62(encode62(n)) == n for n in range(0, 200000, 7)))
    print("encode62(0), 61, 62:", encode62(0), encode62(61), encode62(62))
