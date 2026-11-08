"""
A Distributed MapReduce Framework Simulator.
Includes Job Tracking, Map and Reduce tasks, and Fault Tolerance.
"""

import time
import random
import collections

class MapReduceTask:
    def __init__(self, task_id, task_type, data, mapper=None, reducer=None):
        self.task_id = task_id
        self.task_type = task_type
        self.data = data
        self.mapper = mapper
        self.reducer = reducer
        self.status = "PENDING"
        self.result = None
        self.attempts = 0

class WorkerNode:
    def __init__(self, node_id):
        self.node_id = node_id
        self.is_alive = True

    def execute_task(self, task):
        if not self.is_alive:
            return False
        if random.random() < 0.1:
            task.attempts += 1
            return False
            
        if task.task_type == "MAP":
            task.result = task.mapper(task.data)
        elif task.task_type == "REDUCE":
            task.result = task.reducer(task.data)
            
        task.status = "COMPLETED"
        return True

class MapReduceJob:
    def __init__(self, job_id, input_data, mapper, reducer, num_mappers=3, num_reducers=2):
        self.job_id = job_id
        self.input_data = input_data
        self.mapper = mapper
        self.reducer = reducer
        self.num_mappers = num_mappers
        self.num_reducers = num_reducers
        self.map_tasks = []
        self.reduce_tasks = []
        self.setup_tasks()

    def setup_tasks(self):
        chunk_size = max(1, len(self.input_data) // self.num_mappers)
        for i in range(self.num_mappers):
            chunk = self.input_data[i * chunk_size:(i + 1) * chunk_size]
            self.map_tasks.append(MapReduceTask(i, "MAP", chunk, mapper=self.mapper))
            
        for i in range(self.num_reducers):
            self.reduce_tasks.append(MapReduceTask(i, "REDUCE", None, reducer=self.reducer))

class MasterNode:
    def __init__(self):
        self.workers = []
        self.jobs = []

    def add_worker(self, worker):
        self.workers.append(worker)

    def submit_job(self, job):
        self.jobs.append(job)

    def run_jobs(self):
        for job in self.jobs:
            print(f"Starting Job {job.job_id}...")
            self.run_map_phase(job)
            self.run_reduce_phase(job)
            print(f"Job {job.job_id} completed.")

    def run_map_phase(self, job):
        pending = list(job.map_tasks)
        while pending:
            for worker in self.workers:
                if not worker.is_alive:
                    continue
                if not pending:
                    break
                task = pending[0]
                if worker.execute_task(task):
                    pending.pop(0)
                else:
                    if task.attempts > 2:
                        pending.pop(0)
                        print(f"  Task {task.task_id} failed permanently.")
                    else:
                        print(f"  Task {task.task_id} failed, retrying...")

    def run_reduce_phase(self, job):
        mapped_data = collections.defaultdict(list)
        for task in job.map_tasks:
            if task.result:
                for key, value in task.result:
                    mapped_data[key].append(value)
                    
        for i, task in enumerate(job.reduce_tasks):
            task.data = list(mapped_data.items())
            
        pending = list(job.reduce_tasks)
        while pending:
            for worker in self.workers:
                if not worker.is_alive:
                    continue
                if not pending:
                    break
                task = pending[0]
                if worker.execute_task(task):
                    pending.pop(0)
                else:
                    if task.attempts > 2:
                        pending.pop(0)

if __name__ == "__main__":
    print("Testing MapReduce Framework...")
    
    def word_mapper(text):
        words = text.split()
        return [(word, 1) for word in words]
        
    def count_reducer(items):
        total = sum(count for key, count in items)
        return total

    master = MasterNode()
    master.add_worker(WorkerNode(1))
    master.add_worker(WorkerNode(2))
    
    text_data = "hello world hello map reduce hello world"
    job = MapReduceJob(1, text_data.split(), word_mapper, count_reducer)
    master.submit_job(job)
    master.run_jobs()
    
    print("MapReduce simulation complete.")
