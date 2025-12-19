"""
Rate limiting middleware based on user's subscription plan tier.
Applies different rate limits for Free, Pro, Business, and Enterprise plans.
"""
import time
from typing import Optional, Dict, Callable
from functools import wraps
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.db.redis import get_redis_client


# Rate limits per plan (requests per minute)
PLAN_RATE_LIMITS: Dict[str, int] = {
    "free": settings.RATE_LIMIT_FREE,
    "pro": settings.RATE_LIMIT_PRO,
    "business": settings.RATE_LIMIT_BUSINESS,
    "enterprise": settings.RATE_LIMIT_ENTERPRISE,
}

# Burst multiplier for short-term spikes
BURST_MULTIPLIER = 2

# Window sizes in seconds
RATE_LIMIT_WINDOW = 60  # 1 minute
BURST_WINDOW = 10  # 10 seconds for burst


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded."""
    def __init__(self, retry_after: int, limit: int, remaining: int):
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining
        super().__init__(f"Rate limit exceeded. Retry after {retry_after} seconds.")


async def get_user_plan_from_request(request: Request) -> str:
    """
    Extract user's plan tier from request.
    Returns 'free' if user is not authenticated or plan cannot be determined.
    """
    # Try to get user from request state (set by auth middleware)
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "subscription"):
        return user.subscription.plan_tier if user.subscription else "free"
    
    # Check for plan in JWT token claims
    token_data = getattr(request.state, "token_data", None)
    if token_data and "plan" in token_data:
        return token_data["plan"]
    
    return "free"


def get_client_identifier(request: Request) -> str:
    """
    Get a unique identifier for the client.
    Uses user_id if authenticated, otherwise falls back to IP address.
    """
    # Try user ID first
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"
    
    token_data = getattr(request.state, "token_data", None)
    if token_data and "sub" in token_data:
        return f"user:{token_data['sub']}"
    
    # Fall back to IP address
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    
    return f"ip:{request.client.host if request.client else 'unknown'}"


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter using Redis.
    Provides more accurate rate limiting than fixed windows.
    """
    
    def __init__(self):
        self.redis = None
    
    async def _get_redis(self):
        if self.redis is None:
            self.redis = await get_redis_client()
        return self.redis
    
    async def is_allowed(
        self, 
        identifier: str, 
        limit: int, 
        window: int = RATE_LIMIT_WINDOW
    ) -> tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.
        
        Returns:
            tuple: (is_allowed, remaining_requests, retry_after_seconds)
        """
        redis = await self._get_redis()
        if redis is None:
            # If Redis is unavailable, allow the request
            return True, limit, 0
        
        now = time.time()
        key = f"ratelimit:{identifier}:{window}"
        
        try:
            # Use pipeline for atomic operations
            pipe = redis.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, now - window)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiry on the key
            pipe.expire(key, window + 1)
            
            results = await pipe.execute()
            current_count = results[1]
            
            if current_count >= limit:
                # Get oldest request timestamp to calculate retry_after
                oldest = await redis.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1] + window - now) + 1
                else:
                    retry_after = window
                
                # Remove the request we just added since it's not allowed
                await redis.zrem(key, str(now))
                
                return False, 0, retry_after
            
            remaining = limit - current_count - 1
            return True, max(0, remaining), 0
            
        except Exception as e:
            # Log error but allow request on Redis failure
            print(f"Rate limiter error: {e}")
            return True, limit, 0
    
    async def get_usage(self, identifier: str, window: int = RATE_LIMIT_WINDOW) -> Dict:
        """Get current rate limit usage for an identifier."""
        redis = await self._get_redis()
        if redis is None:
            return {"error": "Redis unavailable"}
        
        now = time.time()
        key = f"ratelimit:{identifier}:{window}"
        
        try:
            # Clean old entries first
            await redis.zremrangebyscore(key, 0, now - window)
            count = await redis.zcard(key)
            
            return {
                "current_requests": count,
                "window_seconds": window,
                "window_start": now - window,
            }
        except Exception as e:
            return {"error": str(e)}


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for rate limiting based on user's subscription plan.
    """
    
    # Paths that should be excluded from rate limiting
    EXCLUDED_PATHS = {
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/webhooks/paystack",
        "/api/v1/webhooks/coinbase",
    }
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        
        # Skip rate limiting for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client identifier and plan
        identifier = get_client_identifier(request)
        plan = await get_user_plan_from_request(request)
        
        # Get rate limit for plan
        limit = PLAN_RATE_LIMITS.get(plan, PLAN_RATE_LIMITS["free"])
        
        # Check rate limit
        is_allowed, remaining, retry_after = await rate_limiter.is_allowed(
            identifier=identifier,
            limit=limit,
            window=RATE_LIMIT_WINDOW
        )
        
        if not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. You are on the {plan} plan with {limit} requests/minute.",
                    "retry_after": retry_after,
                    "limit": limit,
                    "upgrade_url": "/pricing" if plan != "enterprise" else None
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    "Retry-After": str(retry_after),
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + RATE_LIMIT_WINDOW)
        response.headers["X-RateLimit-Plan"] = plan
        
        return response


def rate_limit(
    requests_per_minute: Optional[int] = None,
    burst_size: Optional[int] = None
):
    """
    Decorator for applying custom rate limits to specific endpoints.
    
    Usage:
        @rate_limit(requests_per_minute=10)
        async def my_endpoint():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            identifier = get_client_identifier(request)
            
            # Use custom limit or fall back to plan-based limit
            if requests_per_minute:
                limit = requests_per_minute
            else:
                plan = await get_user_plan_from_request(request)
                limit = PLAN_RATE_LIMITS.get(plan, PLAN_RATE_LIMITS["free"])
            
            # Apply burst limit if specified
            if burst_size:
                burst_allowed, _, _ = await rate_limiter.is_allowed(
                    identifier=f"{identifier}:burst",
                    limit=burst_size,
                    window=BURST_WINDOW
                )
                if not burst_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Burst rate limit exceeded. Please slow down."
                    )
            
            # Check main rate limit
            is_allowed, remaining, retry_after = await rate_limiter.is_allowed(
                identifier=identifier,
                limit=limit,
                window=RATE_LIMIT_WINDOW
            )
            
            if not is_allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)}
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


# Specific rate limiters for different endpoint types
def api_rate_limit(func: Callable):
    """Standard API rate limiting based on user's plan."""
    return rate_limit()(func)


def auth_rate_limit(func: Callable):
    """Stricter rate limiting for authentication endpoints."""
    return rate_limit(requests_per_minute=5, burst_size=3)(func)


def webhook_rate_limit(func: Callable):
    """Rate limiting for webhook endpoints."""
    return rate_limit(requests_per_minute=100)(func)


def export_rate_limit(func: Callable):
    """Rate limiting for data export endpoints."""
    return rate_limit(requests_per_minute=2, burst_size=1)(func)
