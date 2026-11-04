"""
QuizGen AI - Central Redis Cache & Broker Client
Implements Specification Section 5 of DATABASE_SPECIFICATION.md:
1. JWT Blacklist:    jwt:revoked:{token_hash}                (TTL: 24h)
2. Tiến trình Upload: task:upload:progress:{document_id}       (Hash, TTL: 2h)
3. Cache RAG Chunks: rag:cache:{document_id}:{target_hash}   (List/JSON, TTL: 6h)
4. AI Rate Limiter:  ratelimit:{action}:{user_id}            (Counter, TTL: 1m)
5. Cache Purge:      Xóa sạch toàn bộ cache khi xóa giáo trình

Graceful Fallback:
If Redis is unreachable or redis-py is not installed, seamlessly falls back to
an in-memory thread-safe cache with TTL expiration.
"""

import os
import json
import time
import hashlib
import logging
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger("quizgen.cache")

class RedisCacheClient:
    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "localhost")
        self.port = int(os.getenv("REDIS_PORT", "6379"))
        self.password = os.getenv("REDIS_PASSWORD", None)
        self.redis_url = os.getenv("REDIS_URL", f"redis://{self.host}:{self.port}/0")
        
        self.client = None
        self.is_connected = False
        self._memory_store: Dict[str, Tuple[Any, float]] = {}

        self._init_client()

    def _init_client(self):
        try:
            import redis
            self.client = redis.from_url(
                self.redis_url,
                password=self.password,
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=2.0
            )
            self.client.ping()
            self.is_connected = True
            logger.info(f"[CACHE] Connected to Redis at {self.host}:{self.port}")
        except Exception as e:
            self.client = None
            self.is_connected = False
            logger.info(f"[CACHE] Redis offline or not installed ({e}). Operating in in-memory fallback mode.")

    # -------------------------------------------------------------
    # Memory fallback primitives
    # -------------------------------------------------------------
    def _mem_set(self, key: str, value: Any, ttl: int = 0):
        expiry = time.time() + ttl if ttl > 0 else 0
        self._memory_store[key] = (value, expiry)

    def _mem_get(self, key: str) -> Optional[Any]:
        if key not in self._memory_store:
            return None
        val, exp = self._memory_store[key]
        if exp > 0 and time.time() > exp:
            del self._memory_store[key]
            return None
        return val

    def _mem_exists(self, key: str) -> bool:
        return self._mem_get(key) is not None

    def _mem_incr(self, key: str, ttl: int = 60) -> int:
        val = self._mem_get(key)
        current = int(val) if val is not None else 0
        new_val = current + 1
        self._mem_set(key, new_val, ttl)
        return new_val

    # -------------------------------------------------------------
    # 1. JWT Blacklist (jwt:revoked:{token_hash}) - TTL 24h
    # -------------------------------------------------------------
    def revoke_token(self, token_hash: str, ttl: int = 86400) -> bool:
        key = f"jwt:revoked:{token_hash}"
        try:
            if self.is_connected and self.client:
                self.client.set(key, "1", ex=ttl)
                return True
        except Exception as e:
            logger.warning(f"[CACHE] Redis set error: {e}")
        self._mem_set(key, "1", ttl=ttl)
        return True

    def is_token_revoked(self, token_hash: str) -> bool:
        key = f"jwt:revoked:{token_hash}"
        try:
            if self.is_connected and self.client:
                return bool(self.client.exists(key))
        except Exception as e:
            logger.warning(f"[CACHE] Redis exists error: {e}")
        return self._mem_exists(key)

    # -------------------------------------------------------------
    # 2. Upload Progress (task:upload:progress:{document_id}) - TTL 2h
    # -------------------------------------------------------------
    def set_upload_progress(
        self,
        document_id: str,
        progress: int,
        status: str = "extracting",
        stage: str = "",
        total_pages: int = 0,
        ttl: int = 7200
    ) -> bool:
        key = f"task:upload:progress:{document_id}"
        data = {
            "document_id": document_id,
            "progress": str(progress),
            "status": status,
            "stage": stage,
            "total_pages": str(total_pages),
            "updated_at": str(time.time())
        }
        try:
            if self.is_connected and self.client:
                self.client.hset(key, mapping=data)
                self.client.expire(key, ttl)
                return True
        except Exception as e:
            logger.warning(f"[CACHE] Redis hset error: {e}")
        self._mem_set(key, data, ttl=ttl)
        return True

    def get_upload_progress(self, document_id: str) -> Optional[Dict[str, Any]]:
        key = f"task:upload:progress:{document_id}"
        try:
            if self.is_connected and self.client:
                res = self.client.hgetall(key)
                if res:
                    return {
                        "document_id": res.get("document_id", document_id),
                        "progress": int(res.get("progress", 0)),
                        "status": res.get("status", "unknown"),
                        "stage": res.get("stage", ""),
                        "total_pages": int(res.get("total_pages", 0)),
                        "updated_at": float(res.get("updated_at", 0))
                    }
        except Exception as e:
            logger.warning(f"[CACHE] Redis hgetall error: {e}")
        
        mem_data = self._mem_get(key)
        if isinstance(mem_data, dict):
            return {
                "document_id": mem_data.get("document_id", document_id),
                "progress": int(mem_data.get("progress", 0)),
                "status": mem_data.get("status", "unknown"),
                "stage": mem_data.get("stage", ""),
                "total_pages": int(mem_data.get("total_pages", 0)),
                "updated_at": float(mem_data.get("updated_at", 0))
            }
        return None

    # -------------------------------------------------------------
    # 3. RAG Chunks Cache (rag:cache:{document_id}:{target_hash}) - TTL 6h
    # -------------------------------------------------------------
    def cache_rag_chunks(
        self,
        document_id: str,
        target: str,
        chunks: List[dict],
        ttl: int = 21600
    ) -> bool:
        target_hash = hashlib.md5(target.strip().lower().encode("utf-8")).hexdigest()[:12]
        key = f"rag:cache:{document_id}:{target_hash}"
        try:
            json_val = json.dumps(chunks, ensure_ascii=False)
            if self.is_connected and self.client:
                self.client.set(key, json_val, ex=ttl)
                return True
        except Exception as e:
            logger.warning(f"[CACHE] Redis set rag chunk error: {e}")
        self._mem_set(key, chunks, ttl=ttl)
        return True

    def get_cached_rag_chunks(self, document_id: str, target: str) -> Optional[List[dict]]:
        target_hash = hashlib.md5(target.strip().lower().encode("utf-8")).hexdigest()[:12]
        key = f"rag:cache:{document_id}:{target_hash}"
        try:
            if self.is_connected and self.client:
                cached = self.client.get(key)
                if cached:
                    return json.loads(cached)
        except Exception as e:
            logger.warning(f"[CACHE] Redis get rag chunk error: {e}")
        
        mem_data = self._mem_get(key)
        if isinstance(mem_data, list):
            return mem_data
        return None

    # -------------------------------------------------------------
    # 4. Cache Cleanup: Làm sạch cache khi xóa tài liệu
    # -------------------------------------------------------------
    def clear_document_cache(self, document_id: str) -> int:
        """
        Làm sạch toàn bộ cache liên quan đến tài liệu (ChromaDB & Redis):
        - rag:cache:{document_id}:*
        - rag:query:{document_id}:*
        - task:upload:progress:{document_id}
        """
        cleared_count = 0
        patterns = [
            f"rag:cache:{document_id}:*",
            f"rag:query:{document_id}:*",
            f"task:upload:progress:{document_id}"
        ]
        try:
            if self.is_connected and self.client:
                for pat in patterns:
                    keys = list(self.client.scan_iter(match=pat, count=100))
                    if keys:
                        deleted = self.client.delete(*keys)
                        cleared_count += deleted if isinstance(deleted, int) else len(keys)
                progress_key = f"task:upload:progress:{document_id}"
                if self.client.exists(progress_key):
                    if self.client.delete(progress_key):
                        cleared_count += 1
        except Exception as e:
            logger.warning(f"[CACHE] Redis clear_document_cache error: {e}")

        # Xóa trong in-memory store
        to_del = [
            k for k in list(self._memory_store.keys())
            if k.startswith(f"rag:cache:{document_id}:")
            or k.startswith(f"rag:query:{document_id}:")
            or k == f"task:upload:progress:{document_id}"
        ]
        for k in to_del:
            self._memory_store.pop(k, None)
            cleared_count += 1

        return cleared_count

    # -------------------------------------------------------------
    # 5. Rate Limiter (ratelimit:{action}:{user_id}) - TTL 1m
    # -------------------------------------------------------------
    def check_rate_limit(
        self,
        user_id: str,
        limit: int = 60,
        window_seconds: int = 60,
        action: str = "document:upload"
    ) -> Tuple[bool, int]:
        """
        Kiểm tra giới hạn tần suất gọi API theo user_id.
        Trả về (allowed, remaining_calls)
        """
        key = f"ratelimit:{action}:{user_id}"
        try:
            if self.is_connected and self.client:
                count = self.client.incr(key)
                if count == 1:
                    self.client.expire(key, window_seconds)
                allowed = count <= limit
                remaining = max(0, limit - count)
                return allowed, remaining
        except Exception as e:
            logger.warning(f"[CACHE] Redis rate limit error: {e}")
        
        count = self._mem_incr(key, ttl=window_seconds)
        allowed = count <= limit
        remaining = max(0, limit - count)
        return allowed, remaining

# Singleton instance
cache = RedisCacheClient()
