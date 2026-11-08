import time

class Timer:
    def __init__(self, label="Execution"):
        self.label = label

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.end = time.perf_counter()
        self.interval = self.end - self.start
        print(f"{self.label} took {self.interval:.6f} seconds")

if __name__ == "__main__":
    print("Starting timer test...")
    with Timer("Heavy computation"):
        total = sum(i * i for i in range(1000000))
        
    print("Result computed:", total)
    print("Context manager cleaned up correctly.")
