import threading
import time
import queue

class WorkerPool:
    def __init__(self, num_workers):
        self.tasks = queue.Queue()
        self.workers = []
        self.running = True
        for _ in range(num_workers):
            t = threading.Thread(target=self._worker_loop)
            t.daemon = True
            t.start()
            self.workers.append(t)

    def _worker_loop(self):
        while self.running:
            try:
                task = self.tasks.get(timeout=0.1)
                if task is None: break
                func, args = task
                func(*args)
                self.tasks.task_done()
            except queue.Empty:
                continue

    def submit(self, func, *args):
        self.tasks.put((func, args))

    def shutdown(self):
        self.running = False
        for _ in self.workers:
            self.tasks.put(None)
        for w in self.workers:
            w.join()

results = []
def process_task(n):
    time.sleep(0.01)
    results.append(n * 2)

if __name__ == "__main__":
    pool = WorkerPool(4)
    for i in range(10):
        pool.submit(process_task, i)
    pool.shutdown()
    print("Processed Results:", sorted(results))
    print("Thread pool completed:", len(results) == 10)
