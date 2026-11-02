import os
from collections import defaultdict
from typing import List, Dict, Any, Optional
import chromadb

class RAGVectorStore:
    """
    Hệ thống lưu trữ và truy vấn Vector ChromaDB (Persistent Store):
    - Quản lý collection: `textbook_chunks` với không gian khoảng cách Cosine và chỉ mục HNSW.
    - Hỗ trợ lọc theo document_id và lọc đa chương mục ($and, $or).
    - Quy đổi khoảng cách Cosine sang điểm phần trăm tương đồng Relevance Score (%).
    - Tự động nạp vector mẫu nếu kho rỗng để hệ thống luôn sẵn sàng phục vụ.
    """

    def __init__(self, persist_dir: str = "./data/chroma", collection_name: str = "textbook_chunks"):
        os.makedirs(persist_dir, exist_ok=True)
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        self._seed_default_chunks()

    def _seed_default_chunks(self):
        """Tự động nạp vector giáo trình mẫu nếu collection hoàn toàn trống"""
        try:
            if self.collection.count() == 0:
                self.collection.add(
                    ids=["chunk-1", "chunk-2", "chunk-3"],
                    documents=[
                        "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.",
                        "Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi.",
                        "Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều (Elastic demand), việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp."
                    ],
                    metadatas=[
                        {"document_id": "tb-001", "page_number": 42, "chapter": "Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường"},
                        {"document_id": "tb-001", "page_number": 45, "chapter": "Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường"},
                        {"document_id": "tb-001", "page_number": 48, "chapter": "Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường"}
                    ]
                )
        except Exception:
            pass

    def add_chunks(self, document_id: str, chunks: List[Dict[str, Any]], replace_existing: bool = False) -> int:
        """
        Nạp hoặc cập nhật (upsert) danh sách chunks vào ChromaDB.
        Nếu replace_existing = True, xóa các vector cũ của document_id trước khi nạp mới.
        """
        if replace_existing:
            self.delete_by_document_id(document_id)

        prepared = []
        for c in chunks:
            text = c.get("text") or c.get("text_snippet") or ""
            chunk_id = c.get("chunk_id") or c.get("id") or ""
            if not chunk_id or not text.strip():
                continue
            prepared.append({
                "chunk_id": chunk_id,
                "text": text.strip(),
                "page_number": int(c.get("page_number") or c.get("pageNumber") or 1),
                "chapter": c.get("chapter") or "Chương 1: Tổng quan"
            })

        if not prepared:
            return 0

        ids = [c["chunk_id"] for c in prepared]
        documents = [c["text"] for c in prepared]
        metadatas = [
            {
                "document_id": document_id,
                "page_number": c["page_number"],
                "chapter": c["chapter"]
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
        """Xóa toàn bộ các vector thuộc về một document_id"""
        found = self.collection.get(where={"document_id": document_id}, include=[])
        ids = found.get("ids", []) if found else []
        if not ids:
            return 0

        self.collection.delete(ids=ids)
        return len(ids)

    def count_by_document_id(self, document_id: str) -> int:
        """Đếm số lượng vector thuộc về một tài liệu"""
        found = self.collection.get(where={"document_id": document_id}, include=[])
        ids = found.get("ids", []) if found else []
        return len(ids)

    def get_chunks_by_document(self, document_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Lấy danh sách các chunk của một tài liệu để phục vụ modal thanh tra RAG chunks"""
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
            rows.append({
                "chunkId": chunk_id,
                "chunk_id": chunk_id,
                "pageNumber": metadata.get("page_number", 1),
                "page_number": metadata.get("page_number", 1),
                "chapter": metadata.get("chapter", "Không rõ chương"),
                "text": documents[idx] if idx < len(documents) else "",
                "textSnippet": documents[idx] if idx < len(documents) else "",
                "metadata": metadata,
            })
        return rows

    def get_chunk_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Lấy chi tiết văn bản chunk theo ID làm minh chứng đối soát ở Review Workspace"""
        res = self.collection.get(ids=[chunk_id], include=["documents", "metadatas"])
        if res and res["ids"] and len(res["ids"]) > 0:
            meta = res["metadatas"][0] if res["metadatas"] else {}
            text = res["documents"][0] if res["documents"] else ""
            return {
                "id": chunk_id,
                "chunkId": chunk_id,
                "pageNumber": meta.get("page_number", 1),
                "chapter": meta.get("chapter", ""),
                "textSnippet": text,
                "text": text,
                "documentId": meta.get("document_id", ""),
                "relevanceScore": 98.0
            }
        return None

    def query_context(
        self,
        query_text: str,
        document_id: Optional[str] = None,
        chapter: Optional[str] = None,
        chapters: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Truy vấn tương đồng ngữ nghĩa:
        - Xây dựng bộ lọc where đa tầng tuân thủ cú pháp $and / $or của ChromaDB.
        - Trả về danh sách Top-K chunks kèm điểm số tương đồng chuẩn hóa Relevance Score (0-100%).
        """
        if top_k < 1:
            return []

        # Xây dựng bộ lọc where an toàn
        conditions = []
        if document_id:
            conditions.append({"document_id": document_id})

        # Hỗ trợ lọc theo 1 chương hoặc danh sách nhiều chương
        target_chapters = []
        if chapters and len(chapters) > 0:
            target_chapters = [ch.strip() for ch in chapters if ch.strip()]
        elif chapter and chapter.strip():
            target_chapters = [chapter.strip()]

        if len(target_chapters) == 1:
            conditions.append({"chapter": target_chapters[0]})
        elif len(target_chapters) > 1:
            conditions.append({"$or": [{"chapter": ch} for ch in target_chapters]})

        where_filter = None
        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        # Thực hiện truy vấn ChromaDB
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where=where_filter
        )

        formatted_results: List[Dict[str, Any]] = []
        ids = results.get("ids", []) if results else []
        documents = results.get("documents", []) if results else []
        metadatas = results.get("metadatas", []) if results else []
        distances = results.get("distances", []) if results else []

        if ids and len(ids[0]) > 0:
            for idx in range(len(ids[0])):
                distance = distances[0][idx] if distances and len(distances[0]) > idx else 0.1
                # Khoảng cách cosine: 0 là trùng khớp tuyệt đối, 1 là vuông góc (không liên quan)
                similarity = max(0.0, 1.0 - distance)
                relevance_score = round(similarity * 100, 2)

                metadata = metadatas[0][idx] if metadatas and len(metadatas[0]) > idx else {}
                chunk_text = documents[0][idx] if documents and len(documents[0]) > idx else ""

                formatted_results.append({
                    "chunkId": ids[0][idx],
                    "chunk_id": ids[0][idx],
                    "pageNumber": metadata.get("page_number", 1),
                    "page_number": metadata.get("page_number", 1),
                    "chapter": metadata.get("chapter", "Không rõ chương"),
                    "textSnippet": chunk_text,
                    "text": chunk_text,
                    "relevanceScore": relevance_score,
                    "relevance_score": relevance_score,
                    "metadata": metadata
                })

        return formatted_results

    def get_collection_stats(self) -> Dict[str, Any]:
        """Thống kê tổng số vector, số giáo trình và phân bổ theo chương"""
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
