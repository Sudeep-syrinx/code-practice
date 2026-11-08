from datetime import datetime, timedelta
from collections import defaultdict
import heapq

class Job:
    def __init__(self, job_id, name, priority=0, duration=1, depends_on=None):
        self.job_id = job_id
        self.name = name
        self.priority = priority
        self.duration = duration
        self.depends_on = set(depends_on or [])
        self.status = "pending"
        self.started_at = None
        self.finished_at = None

    def __lt__(self, other):
        return (self.priority, self.job_id) < (other.priority, other.job_id)

class JobScheduler:
    def __init__(self):
        self.jobs = {}
        self.ready = []
        self.running = {}
        self.completed = []
        self.failed = []
        self.time = 0
        self.dependents = defaultdict(set)

    def add_job(self, job_id, name, priority=0, duration=1, depends_on=None):
        if job_id in self.jobs:
            raise ValueError(f"Job {job_id} already exists")
        job = Job(job_id, name, priority, duration, depends_on)
        self.jobs[job_id] = job
        for dep in job.depends_on:
            self.dependents[dep].add(job_id)
        if not job.depends_on:
            heapq.heappush(self.ready, job)
        return job

    def _can_start(self, job):
        return all(self.jobs[d].status == "completed" for d in job.depends_on)

    def tick(self, workers=2):
        self.time += 1
        finished = []
        for jid, (job, end_time) in list(self.running.items()):
            if self.time >= end_time:
                job.status = "completed"
                job.finished_at = self.time
                self.completed.append(job)
                finished.append(jid)
                del self.running[jid]
                for dep_id in self.dependents[jid]:
                    dep_job = self.jobs[dep_id]
                    if dep_job.status == "pending" and self._can_start(dep_job):
                        heapq.heappush(self.ready, dep_job)

        started = []
        while self.ready and len(self.running) < workers:
            job = heapq.heappop(self.ready)
            if job.status != "pending":
                continue
            if not self._can_start(job):
                continue
            job.status = "running"
            job.started_at = self.time
            self.running[job.job_id] = (job, self.time + job.duration)
            started.append(job.job_id)

        return {"finished": finished, "started": started, "running": list(self.running.keys())}

    def run_until_done(self, workers=2, max_ticks=1000):
        history = []
        for _ in range(max_ticks):
            if not self.ready and not self.running:
                break
            result = self.tick(workers)
            if result["finished"] or result["started"]:
                history.append((self.time, result))
        return history

    def status_report(self):
        counts = defaultdict(int)
        for job in self.jobs.values():
            counts[job.status] += 1
        return dict(counts)

if __name__ == "__main__":
    sched = JobScheduler()
    sched.add_job(1, "download_data", priority=1, duration=3)
    sched.add_job(2, "clean_data", priority=2, duration=2, depends_on=[1])
    sched.add_job(3, "train_model", priority=3, duration=5, depends_on=[2])
    sched.add_job(4, "evaluate", priority=2, duration=2, depends_on=[3])
    sched.add_job(5, "generate_report", priority=1, duration=1, depends_on=[4])
    sched.add_job(6, "backup", priority=0, duration=2)
    sched.add_job(7, "notify", priority=0, duration=1, depends_on=[5, 6])

    print("Jobs registered:", len(sched.jobs))
    history = sched.run_until_done(workers=2)
    print("Simulation ticks used:", sched.time)
    print()
    print("Execution timeline:")
    for t, event in history:
        print(f"  t={t:2}  started={event['started']}  finished={event['finished']}  running={event['running']}")
    print()
    print("Final status:", sched.status_report())
    print("Completed order:", [j.name for j in sched.completed])
    print()
    print("All dependencies respected:")
    ok = True
    for job in sched.completed:
        for dep in job.depends_on:
            dep_job = sched.jobs[dep]
            if dep_job.finished_at > job.started_at:
                ok = False
                print(f"  Violation: {job.name} started before {dep_job.name} finished")
    print("  ", ok)
