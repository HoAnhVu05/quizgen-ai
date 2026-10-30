import os
from collections import defaultdict
from typing import List, Dict, Any, Optional
import chromadb


class RAGVectorStore:
    def __init__(self, persist_dir: str = "./data/chroma", collection_name: str = "textbook_chunks"):
        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, document_id: str, chunks: List[Dict[str, Any]], replace_existing: bool = False) -> int:
        if replace_existing:
            self.delete_by_document_id(document_id)

        prepared = []
        for c in chunks:
            if not c.get("chunk_id") or not c.get("text"):
                continue
            prepared.append(c)

        if not prepared:
            return 0

        ids = [c["chunk_id"] for c in prepared]
        documents = [c["text"] for c in prepared]
        metadatas = [
            {
                "document_id": c.get("document_id") or document_id,
                "page_number": int(c.get("page_number") or 0),
                "chapter": c.get("chapter") or "Unknown"
            }
            for c in prepared
        ]

        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        return len(prepared)

    def delete_by_document_id(self, document_id: str) -> int:
        found = self.collection.get(where={"document_id": document_id}, include=[])
        ids = found.get("ids", []) if found else []
        if not ids:
            return 0

        self.collection.delete(ids=ids)
        return len(ids)

    def get_chunks_by_document(self, document_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        if limit < 1:
            return []

        found = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
            limit=limit,
        )
        ids = found.get("ids", []) if found else []
        documents = found.get("documents", []) if found else []
        metadatas = found.get("metadatas", []) if found else []

        rows = []
        for idx, chunk_id in enumerate(ids):
            metadata = metadatas[idx] if idx < len(metadatas) else {}
            rows.append(
                {
                    "chunk_id": chunk_id,
                    "text": documents[idx] if idx < len(documents) else "",
                    "metadata": metadata,
                }
            )
        return rows

    def get_collection_stats(self) -> Dict[str, Any]:
        found = self.collection.get(include=["metadatas"])
        ids = found.get("ids", []) if found else []
        metadatas = found.get("metadatas", []) if found else []

        chapter_counts: Dict[str, int] = defaultdict(int)
        documents_index: Dict[str, int] = defaultdict(int)
        for metadata in metadatas:
            document_id = metadata.get("document_id", "unknown")
            chapter = metadata.get("chapter", "Unknown")
            documents_index[document_id] += 1
            chapter_counts[chapter] += 1

        return {
            "total_chunks": len(ids),
            "total_documents": len(documents_index),
            "documents": [
                {"document_id": doc_id, "chunks_count": count}
                for doc_id, count in sorted(documents_index.items())
            ],
            "top_chapters": [
                {"chapter": chapter, "chunks_count": count}
                for chapter, count in sorted(chapter_counts.items(), key=lambda item: item[1], reverse=True)[:10]
            ],
        }

    def query_context(
        self, 
        query_text: str, 
        document_id: Optional[str] = None, 
        chapter: Optional[str] = None, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        if top_k < 1:
            return []

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

        formatted_results: List[Dict[str, Any]] = []
        ids = results.get("ids", []) if results else []
        documents = results.get("documents", []) if results else []
        metadatas = results.get("metadatas", []) if results else []
        distances = results.get("distances", []) if results else []

        if ids and len(ids[0]) > 0:
            for idx in range(len(ids[0])):
                distance = distances[0][idx] if distances and len(distances[0]) > idx else 0.1
                score = 1.0 - distance
                metadata = metadatas[0][idx] if metadatas and len(metadatas[0]) > idx else {}
                formatted_results.append({
                    "chunk_id": ids[0][idx],
                    "text": documents[0][idx] if documents and len(documents[0]) > idx else "",
                    "metadata": metadata,
                    "page_number": metadata.get("page_number"),
                    "chapter": metadata.get("chapter"),
                    "relevance_score": round(max(0.0, min(score, 1.0)) * 100, 1)
                })

        return formatted_results
