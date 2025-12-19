"""
Redis connection and utilities.
"""
import json
from datetime import timedelta
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import settings

# Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True
)


async def get_redis() -> redis.Redis:
    """Get Redis connection."""
    return redis.Redis(connection_pool=redis_pool)


class RedisService:
    """Redis service for caching and session management."""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        self.redis = redis.Redis(connection_pool=redis_pool)
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
    
    async def set(
        self,
        key: str,
        value: Any,
        expire: Optional[timedelta] = None
    ) -> bool:
        """Set a key-value pair with optional expiration."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        
        if expire:
            return await self.redis.setex(key, expire, value)
        return await self.redis.set(key, value)
    
    async def get(self, key: str) -> Optional[str]:
        """Get a value by key."""
        return await self.redis.get(key)
    
    async def get_json(self, key: str) -> Optional[Any]:
        """Get a JSON value by key."""
        value = await self.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def delete(self, key: str) -> bool:
        """Delete a key."""
        return await self.redis.delete(key) > 0
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        return await self.redis.exists(key) > 0
    
    async def incr(self, key: str) -> int:
        """Increment a key."""
        return await self.redis.incr(key)
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on a key."""
        return await self.redis.expire(key, seconds)
    
    # Rate limiting helpers
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded.
        Returns (is_allowed, current_count).
        """
        current = await self.incr(key)
        
        if current == 1:
            await self.expire(key, window_seconds)
        
        return current <= limit, current
    
    # Session management
    async def store_session(
        self,
        session_id: str,
        user_id: str,
        data: dict,
        expire: timedelta
    ) -> bool:
        """Store a session."""
        key = f"session:{session_id}"
        session_data = {"user_id": user_id, **data}
        return await self.set(key, session_data, expire)
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get a session."""
        key = f"session:{session_id}"
        return await self.get_json(key)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        key = f"session:{session_id}"
        return await self.delete(key)
    
    # Verification tokens
    async def store_verification_token(
        self,
        token: str,
        user_id: str,
        expire_minutes: int
    ) -> bool:
        """Store email verification token."""
        key = f"verification:{token}"
        return await self.set(
            key,
            {"user_id": user_id, "used": False},
            timedelta(minutes=expire_minutes)
        )
    
    async def get_verification_token(self, token: str) -> Optional[dict]:
        """Get verification token data."""
        key = f"verification:{token}"
        return await self.get_json(key)
    
    async def mark_verification_used(self, token: str) -> bool:
        """Mark verification token as used."""
        key = f"verification:{token}"
        data = await self.get_json(key)
        if data:
            data["used"] = True
            ttl = await self.redis.ttl(key)
            if ttl > 0:
                return await self.set(key, data, timedelta(seconds=ttl))
        return False
    
    # Failed login tracking
    async def record_failed_login(
        self,
        identifier: str,
        max_attempts: int,
        lockout_minutes: int
    ) -> tuple[int, bool]:
        """
        Record a failed login attempt.
        Returns (attempt_count, is_locked).
        """
        key = f"failed_login:{identifier}"
        count = await self.incr(key)
        
        if count == 1:
            await self.expire(key, lockout_minutes * 60)
        
        is_locked = count >= max_attempts
        return count, is_locked
    
    async def clear_failed_logins(self, identifier: str) -> bool:
        """Clear failed login attempts after successful login."""
        key = f"failed_login:{identifier}"
        return await self.delete(key)
    
    async def is_account_locked(self, identifier: str, max_attempts: int) -> bool:
        """Check if account is locked."""
        key = f"failed_login:{identifier}"
        count = await self.get(key)
        if count:
            return int(count) >= max_attempts
        return False


redis_service = RedisService()
