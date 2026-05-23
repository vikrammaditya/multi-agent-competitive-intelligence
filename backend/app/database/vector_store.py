import json
import sqlite3
import contextlib
import numpy as np
from datetime import datetime
from pathlib import Path
from app.config import SQLITE_DB_PATH

class SQLiteVectorStore:
    def __init__(self, db_path: str = str(SQLITE_DB_PATH)):
        self.db_path = db_path
        self._init_db()

    @contextlib.contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS facts (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    competitor TEXT,
                    category TEXT,
                    source_url TEXT,
                    timestamp TEXT,
                    confidence REAL,
                    embedding TEXT
                )
            """)
            conn.commit()

    def add_fact(self, id: str, content: str, competitor: str, category: str, 
                 source_url: str, confidence: float, embedding: list[float]):
        """Adds or replaces a fact with its metadata and embedding vector."""
        embedding_json = json.dumps(embedding)
        timestamp = datetime.now().isoformat()
        
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO facts 
                (id, content, competitor, category, source_url, timestamp, confidence, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (id, content, competitor, category, source_url, timestamp, confidence, embedding_json))
            conn.commit()

    def get_all_facts(self) -> list[dict]:
        """Retrieves all stored facts with metadata."""
        with self._connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, content, competitor, category, source_url, timestamp, confidence FROM facts ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def clear_database(self):
        """Clears all entries in the database."""
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM facts")
            conn.commit()

    def search_similar(self, query_embedding: list[float], limit: int = 5, threshold: float = 0.0) -> list[dict]:
        """
        Computes cosine similarity between the query embedding and all stored embeddings.
        Returns matching records sorted by similarity score.
        """
        if not query_embedding:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []

        results = []
        with self._connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, content, competitor, category, source_url, timestamp, confidence, embedding FROM facts")
            rows = cursor.fetchall()

            for row in rows:
                row_dict = dict(row)
                if not row_dict["embedding"]:
                    continue
                
                try:
                    db_vec = np.array(json.loads(row_dict["embedding"]), dtype=np.float32)
                    db_norm = np.linalg.norm(db_vec)
                    
                    if db_norm == 0:
                        continue
                    
                    # Cosine Similarity = (A . B) / (||A|| * ||B||)
                    similarity = float(np.dot(q_vec, db_vec) / (q_norm * db_norm))
                    
                    if similarity >= threshold:
                        # Remove full embedding string before returning to keep payload light
                        del row_dict["embedding"]
                        row_dict["similarity"] = round(similarity, 4)
                        results.append(row_dict)
                except Exception as e:
                    print(f"Error calculating similarity for fact {row_dict['id']}: {e}")
                    continue

        # Sort descending by similarity score
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
