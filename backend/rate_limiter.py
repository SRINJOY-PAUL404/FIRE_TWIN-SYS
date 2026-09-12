import time
from typing import Dict, List
from fastapi import HTTPException, status

class LoginRateLimiter:
    """
    Sliding window rate limiter for login attempts.
    Allows a maximum of `max_attempts` failed attempts per `window_seconds` per IP / email key.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 900):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.failed_attempts: Dict[str, List[float]] = {}

    def _get_key(self, ip: str, email: str) -> str:
        clean_ip = ip.strip() if ip else "unknown_ip"
        clean_email = email.strip().lower() if email else "unknown_email"
        return f"{clean_ip}:{clean_email}"

    def _cleanup_old_attempts(self, key: str, now: float):
        if key in self.failed_attempts:
            valid_timestamps = [t for t in self.failed_attempts[key] if now - t < self.window_seconds]
            if valid_timestamps:
                self.failed_attempts[key] = valid_timestamps
            else:
                del self.failed_attempts[key]

    def check_rate_limit(self, ip: str, email: str):
        now = time.time()
        key = self._get_key(ip, email)
        self._cleanup_old_attempts(key, now)

        attempts = self.failed_attempts.get(key, [])
        if len(attempts) >= self.max_attempts:
            oldest_attempt = attempts[0]
            remaining_seconds = int(self.window_seconds - (now - oldest_attempt))
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again after {remaining_minutes} minute(s)."
            )

    def record_failure(self, ip: str, email: str):
        now = time.time()
        key = self._get_key(ip, email)
        self._cleanup_old_attempts(key, now)

        if key not in self.failed_attempts:
            self.failed_attempts[key] = []
        self.failed_attempts[key].append(now)

    def record_success(self, ip: str, email: str):
        key = self._get_key(ip, email)
        if key in self.failed_attempts:
            del self.failed_attempts[key]

# Singleton instance for login endpoint
login_limiter = LoginRateLimiter(max_attempts=5, window_seconds=900)
