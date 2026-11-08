from collections import deque
from enum import Enum, auto
import random

class ProcessState(Enum):
    NEW = auto()
    READY = auto()
    RUNNING = auto()
    WAITING = auto()
    TERMINATED = auto()

class Process:
    def __init__(self, pid: int, arrival_time: int, burst_time: int, mem_required: int):
        self.pid = pid
        self.arrival_time = arrival_time
        self.burst_time = burst_time
        self.remaining_time = burst_time
        self.mem_required = mem_required # in pages
        self.state = ProcessState.NEW
        self.page_table = {} # Virtual Page -> Physical Frame
        
        # Stats
        self.start_time = -1
        self.completion_time = -1
        
    def __repr__(self): return f"P{self.pid}"

class MemoryManager:
    def __init__(self, total_frames: int):
        self.total_frames = total_frames
        self.free_frames = list(range(total_frames))
        self.tlb = {} # TLB Cache mapping (PID, Virtual Page) -> Frame
        self.tlb_hits = 0
        self.tlb_misses = 0
        self.page_faults = 0

    def allocate(self, process: Process) -> bool:
        if len(self.free_frames) < process.mem_required:
            return False # Not enough memory
            
        for v_page in range(process.mem_required):
            frame = self.free_frames.pop(0)
            process.page_table[v_page] = frame
        return True

    def deallocate(self, process: Process):
        for frame in process.page_table.values():
            self.free_frames.append(frame)
        process.page_table.clear()
        
        # Flush TLB for this process
        keys_to_remove = [k for k in self.tlb if k[0] == process.pid]
        for k in keys_to_remove: del self.tlb[k]

    def access_memory(self, process: Process, v_page: int):
        tlb_key = (process.pid, v_page)
        if tlb_key in self.tlb:
            self.tlb_hits += 1
            return self.tlb[tlb_key]
        else:
            self.tlb_misses += 1
            if v_page in process.page_table:
                frame = process.page_table[v_page]
                # LRU TLB Simulation (Max 16 entries)
                if len(self.tlb) >= 16:
                    self.tlb.pop(next(iter(self.tlb)))
                self.tlb[tlb_key] = frame
                return frame
            else:
                self.page_faults += 1
                raise Exception(f"SegFault: P{process.pid} accessed invalid page {v_page}")

class MultilevelFeedbackQueue:
    def __init__(self):
        self.q1 = deque() # High priority, RR Q=2
        self.q2 = deque() # Medium priority, RR Q=4
        self.q3 = deque() # Low priority, FCFS
        
    def add_process(self, p: Process):
        self.q1.append(p)

    def get_next(self) -> (Process, int, int):
        """Returns (Process, Time Quantum, Queue Level)"""
        if self.q1: return self.q1.popleft(), 2, 1
        if self.q2: return self.q2.popleft(), 4, 2
        if self.q3: return self.q3.popleft(), 9999, 3
        return None, 0, 0

    def demote(self, p: Process, level: int):
        if level == 1: self.q2.append(p)
        else: self.q3.append(p)

class OSKernel:
    def __init__(self):
        self.clock = 0
        self.memory = MemoryManager(total_frames=128)
        self.scheduler = MultilevelFeedbackQueue()
        self.processes = []
        self.terminated = []

    def load_processes(self, processes: List[Process]):
        self.processes = sorted(processes, key=lambda x: x.arrival_time)

    def run(self):
        running_p = None
        quantum_left = 0
        q_level = 0
        
        while self.processes or running_p or \
              self.scheduler.q1 or self.scheduler.q2 or self.scheduler.q3:
            
            # 1. Admit new processes
            arrived = [p for p in self.processes if p.arrival_time <= self.clock]
            for p in arrived:
                if self.memory.allocate(p):
                    p.state = ProcessState.READY
                    self.scheduler.add_process(p)
                    self.processes.remove(p)
                    print(f"[{self.clock}] Loaded {p} into memory.")
                else:
                    # Stays in NEW state, waits for memory
                    pass
                    
            # 2. CPU Execution
            if running_p is None:
                running_p, quantum_left, q_level = self.scheduler.get_next()
                if running_p:
                    if running_p.start_time == -1:
                        running_p.start_time = self.clock
                    running_p.state = ProcessState.RUNNING
                    print(f"[{self.clock}] Dispatching {running_p} from Q{q_level}")
                    
            if running_p:
                # Simulate memory access (random page)
                try:
                    target_page = random.randint(0, running_p.mem_required - 1)
                    self.memory.access_memory(running_p, target_page)
                except Exception as e:
                    print(f"[{self.clock}] KILLED {running_p}: {e}")
                    self.memory.deallocate(running_p)
                    running_p.state = ProcessState.TERMINATED
                    running_p = None
                    continue

                running_p.remaining_time -= 1
                quantum_left -= 1
                
                if running_p.remaining_time <= 0:
                    running_p.state = ProcessState.TERMINATED
                    running_p.completion_time = self.clock + 1
                    self.memory.deallocate(running_p)
                    self.terminated.append(running_p)
                    print(f"[{self.clock+1}] {running_p} TERMINATED.")
                    running_p = None
                elif quantum_left == 0:
                    running_p.state = ProcessState.READY
                    self.scheduler.demote(running_p, q_level)
                    running_p = None
                    
            self.clock += 1

if __name__ == "__main__":
    print("--- ADVANCED OS KERNEL SIMULATOR ---")
    kernel = OSKernel()
    
    # PID, Arrival, Burst, Pages Required
    job_queue = [
        Process(1, 0, 8, 10),
        Process(2, 1, 4, 20),
        Process(3, 2, 12, 15),
        Process(4, 5, 2, 50),
        Process(5, 6, 15, 60) # Memory heavy, will block until others finish
    ]
    
    kernel.load_processes(job_queue)
    kernel.run()
    
    print("\n--- Simulation Stats ---")
    print(f"Total Clock Cycles: {kernel.clock}")
    print(f"TLB Hits: {kernel.memory.tlb_hits}")
    print(f"TLB Misses: {kernel.memory.tlb_misses}")
    print("\nProcess Metrics:")
    for p in sorted(kernel.terminated, key=lambda x: x.pid):
        turnaround = p.completion_time - p.arrival_time
        waiting = turnaround - p.burst_time
        print(f"{p} | Turnaround: {turnaround:2} | Waiting: {waiting:2}")
