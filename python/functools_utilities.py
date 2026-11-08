import time
from functools import wraps

def retry(max_attempts=3, delay=1, backoff=2, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            current_delay = delay
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    attempts += 1
                    if attempts == max_attempts:
                        raise
                    time.sleep(current_delay)
                    current_delay *= backoff
        return wrapper
    return decorator

def memoize(func):
    cache = {}
    @wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper

if __name__ == "__main__":
    calls = 0
    
    @retry(max_attempts=3, delay=0.01)
    def flaky_network_call():
        global calls
        calls += 1
        if calls < 3:
            raise ConnectionError("Network timeout")
        return "Success"

    @memoize
    def slow_fib(n):
        if n < 2: return n
        return slow_fib(n-1) + slow_fib(n-2)

    print("Calling flaky function...")
    print("Result:", flaky_network_call())
    print("Total calls made:", calls)
    
    print("\nTesting memoization:")
    start = time.time()
    print("Fib(30):", slow_fib(30))
    print(f"Time taken: {time.time() - start:.6f}s")
    print("Functions operational:", calls == 3)
