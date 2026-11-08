import threading
import queue
import time
from collections import defaultdict
from typing import List, Dict, Callable, Any

class MapReduceEngine:
    def __init__(self, num_workers: int = 4):
        self.num_workers = num_workers
        self.map_queue = queue.Queue()
        self.reduce_queue = queue.Queue()
        self.map_results = []
        self.final_results = {}
        self.lock = threading.Lock()

    def _worker_thread(self, map_func, reduce_func):
        # Phase 1: Map
        while True:
            try:
                task = self.map_queue.get_nowait()
                if task is None: break
                
                key, value = task
                mapped = map_func(key, value)
                
                with self.lock:
                    self.map_results.extend(mapped)
                    
                self.map_queue.task_done()
            except queue.Empty:
                break
                
        # Wait for map phase to complete globally before starting reduce
        
    def _reduce_worker_thread(self, reduce_func):
        # Phase 2: Reduce
        while True:
            try:
                task = self.reduce_queue.get_nowait()
                if task is None: break
                
                key, values = task
                reduced = reduce_func(key, values)
                
                with self.lock:
                    self.final_results[key] = reduced
                    
                self.reduce_queue.task_done()
            except queue.Empty:
                break

    def execute(self, input_data: Dict[Any, Any], map_func: Callable, reduce_func: Callable):
        print(f"Starting MapReduce with {self.num_workers} workers...")
        start_time = time.time()
        
        # 1. Populate Map Queue
        for k, v in input_data.items():
            self.map_queue.put((k, v))
            
        # 2. Launch Map Workers
        threads = []
        for _ in range(self.num_workers):
            t = threading.Thread(target=self._worker_thread, args=(map_func, reduce_func))
            t.start()
            threads.append(t)
            
        for t in threads:
            t.join()
            
        print(f"Map Phase Complete. Generated {len(self.map_results)} intermediate pairs.")
            
        # 3. Shuffle / Group By Key
        shuffled = defaultdict(list)
        for k, v in self.map_results:
            shuffled[k].append(v)
            
        print(f"Shuffle Phase Complete. Grouped into {len(shuffled)} unique keys.")
            
        # 4. Populate Reduce Queue
        for k, values in shuffled.items():
            self.reduce_queue.put((k, values))
            
        # 5. Launch Reduce Workers
        threads = []
        for _ in range(self.num_workers):
            t = threading.Thread(target=self._reduce_worker_thread, args=(reduce_func,))
            t.start()
            threads.append(t)
            
        for t in threads:
            t.join()
            
        end_time = time.time()
        print(f"Reduce Phase Complete in {end_time - start_time:.4f} seconds.")
        return self.final_results

# --- Example Applications ---
def word_count_map(doc_id: str, text: str) -> List[tuple]:
    """Map function: splits text into words and yields (word, 1)"""
    results = []
    for word in text.lower().split():
        word = ''.join(e for e in word if e.isalnum())
        if word:
            results.append((word, 1))
    return results

def word_count_reduce(key: str, values: List[int]) -> int:
    """Reduce function: sums up the counts for a word"""
    return sum(values)

def inverted_index_map(doc_id: str, text: str) -> List[tuple]:
    """Map function: maps word to document ID"""
    results = []
    for word in set(text.lower().split()):
        word = ''.join(e for e in word if e.isalnum())
        if word:
            results.append((word, doc_id))
    return results

def inverted_index_reduce(key: str, values: List[str]) -> List[str]:
    """Reduce function: sorts document IDs"""
    return sorted(list(set(values)))

if __name__ == "__main__":
    print("--- DISTRIBUTED MAP-REDUCE FRAMEWORK ---")
    
    # Generate some dummy large corpus
    documents = {
        "doc1.txt": "the quick brown fox jumps over the lazy dog",
        "doc2.txt": "the lazy dog slept in the sun",
        "doc3.txt": "the quick brown fox is very quick",
        "doc4.txt": "python programming is fun and programming is powerful"
    }
    
    engine = MapReduceEngine(num_workers=3)
    
    print("\n[JOB 1: Word Count]")
    wc_results = engine.execute(documents, word_count_map, word_count_reduce)
    for k, v in sorted(wc_results.items(), key=lambda item: item[1], reverse=True)[:5]:
        print(f"'{k}': {v}")
        
    print("\n[JOB 2: Inverted Index]")
    idx_results = engine.execute(documents, inverted_index_map, inverted_index_reduce)
    print(f"Documents containing 'the': {idx_results.get('the')}")
    print(f"Documents containing 'quick': {idx_results.get('quick')}")
    print(f"Documents containing 'programming': {idx_results.get('programming')}")
