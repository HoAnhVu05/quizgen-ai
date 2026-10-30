import os
from typing import List, Dict, Any
import chromadb

class RAGVectorStore:
    def __init__(self, persist_dir: str = "./data/chroma"):
        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="textbook_chunks",
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, document_id: str, chunks: List[Dict[str, Any]]):
        ids = [c["chunk_id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "document_id": c["document_id"],
                "page_number": c["page_number"],
                "chapter": c["chapter"]
            }
            for c in chunks
        ]

        # ChromaDB automatically creates embeddings using default sentence transformer if not specified
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def delete_by_document_id(self, document_id: str) -> int:
        found = self.collection.get(where={"document_id": document_id}, include=[])
        ids = found.get("ids", []) if found else []
        if not ids:
            return 0

        self.collection.delete(ids=ids)
        return len(ids)

    def query_context(
        self, 
        query_text: str, 
        document_id: str = None, 
        chapter: str = None, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        where_filter = {}
        if document_id:
            where_filter["document_id"] = document_id
        if chapter:
            where_filter["chapter"] = chapter

        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where=where_filter if where_filter else None
        )

        formatted_results = []
        if results and results["ids"] and len(results["ids"][0]) > 0:
            for idx in range(len(results["ids"][0])):
                score = 1.0 - (results["distances"][0][idx] if results["distances"] else 0.1)
                formatted_results.append({
                    "chunk_id": results["ids"][0][idx],
                    "text": results["documents"][0][idx],
                    "metadata": results["metadatas"][0][idx],
                    "relevance_score": round(max(0.0, min(score, 1.0)) * 100, 1)
                })

        return formatted_results
