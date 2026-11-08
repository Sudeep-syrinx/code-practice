"""
Advanced Concurrency and Networking: Custom Thread Pool, 
Task Queue, and a simulated Async Event Loop.
"""

import threading
import queue
import time
import random
import socket
import json

class ThreadPool:
    def __init__(self, num_threads):
        self.tasks = queue.Queue()
        self.threads = []
        self.running = True
        for _ in range(num_threads):
            t = threading.Thread(target=self.worker)
            t.daemon = True
            t.start()
            self.threads.append(t)

    def worker(self):
        while self.running:
            try:
                func, args, kwargs = self.tasks.get(timeout=0.1)
                func(*args, **kwargs)
                self.tasks.task_done()
            except queue.Empty:
                continue

    def submit(self, func, *args, **kwargs):
        self.tasks.put((func, args, kwargs))

    def shutdown(self):
        self.running = False
        for _ in self.threads:
            self.tasks.put((None, None, None))
        for t in self.threads:
            t.join()

class AsyncTask:
    def __init__(self, func, *args, **kwargs):
        self.func = func
        self.args = args
        self.kwargs = kwargs
        self.result = None
        self.error = None
        self.done = False

    def execute(self):
        try:
            self.result = self.func(*self.args, **self.kwargs)
        except Exception as e:
            self.error = e
        finally:
            self.done = True

class EventLoop:
    def __init__(self):
        self.tasks = []
        self.running = False

    def add_task(self, task):
        self.tasks.append(task)

    def run_until_complete(self):
        self.running = True
        while self.tasks:
            task = self.tasks.pop(0)
            task.execute()
            if task.error:
                print(f"Task error: {task.error}")
            else:
                print(f"Task completed with result: {task.result}")
        self.running = False

def fake_network_request(url):
    time.sleep(random.uniform(0.1, 0.5))
    return f"Response from {url}"

def process_data(data):
    time.sleep(0.1)
    return data.upper()

class EchoServer:
    def __init__(self, host="127.0.0.1", port=8081):
        self.host = host
        self.port = port
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    def start(self):
        self.server.bind((self.host, self.port))
        self.server.listen(5)
        print(f"Echo server listening on {self.host}:{self.port}")
        try:
            while True:
                client, addr = self.server.accept()
                threading.Thread(target=self.handle_client, args=(client,)).start()
        except KeyboardInterrupt:
            print("Server shutting down.")
        finally:
            self.server.close()

    def handle_client(self, client):
        with client:
            while True:
                data = client.recv(1024)
                if not data:
                    break
                client.sendall(data)

if __name__ == "__main__":
    print("Testing Thread Pool...")
    pool = ThreadPool(3)
    for i in range(5):
        pool.submit(process_data, f"data_{i}")
    pool.shutdown()
    
    print("Testing Event Loop...")
    loop = EventLoop()
    loop.add_task(AsyncTask(fake_network_request, "https://api.example.com"))
    loop.add_task(AsyncTask(fake_network_request, "https://api.test.com"))
    loop.run_until_complete()
