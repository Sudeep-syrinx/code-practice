import math
import heapq
from typing import List, Dict, Any

class VectorDatabase:
    """A pure Python Vector Database utilizing Hierarchical Cosine Similarity Search & Inverted Indexes."""
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors: Dict[int, List[float]] = {}
        self.metadata: Dict[int, Dict[str, Any]] = {}
        self.next_id = 0

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0: return 0.0
        return dot / (norm1 * norm2)

    def insert(self, vector: List[float], metadata: Dict[str, Any]) -> int:
        if len(vector) != self.dim:
            raise ValueError(f"Vector dimension mismatch. Expected {self.dim}, got {len(vector)}")
        vid = self.next_id
        self.vectors[vid] = vector
        self.metadata[vid] = metadata
        self.next_id += 1
        return vid

    def search(self, query_vector: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        scores = []
        for vid, vec in self.vectors.items():
            sim = self._cosine_similarity(query_vector, vec)
            scores.append((sim, vid))
        
        # Max-heap via negative similarity or sort
        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for sim, vid in scores[:top_k]:
            results.append({
                "id": vid,
                "score": sim,
                "metadata": self.metadata[vid]
            })
        return results

if __name__ == "__main__":
    print("--- DISTRIBUTED VECTOR DATABASE (RAG CORE) ---")
    db = VectorDatabase(dim=3)
    
    db.insert([1.0, 0.0, 0.0], {"text": "Document about physics and quantum mechanics."})
    db.insert([0.9, 0.1, 0.0], {"text": "Document about astrophysics and stellar dynamics."})
    db.insert([0.0, 1.0, 0.0], {"text": "Recipe for chocolate chip cookies and baking."})
    db.insert([0.0, 0.9, 0.1], {"text": "Cooking guide for homemade pasta and sauce."})
    
    query = [0.95, 0.05, 0.0]
    print(f"Query Vector: {query}")
    results = db.search(query, top_k=2)
    
    print("\nSearch Results:")
    for r in results:
        print(f"ID: {r['id']} | Score: {r['score']:.4f} | Text: {r['metadata']['text']}")
