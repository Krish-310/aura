import os, hashlib, asyncio
from typing import Optional

_cache: dict[str, str] = {}

def key_for(**kwargs) -> str:
    h = hashlib.sha1("|".join(f"{k}={v}" for k,v in sorted(kwargs.items())).encode()).hexdigest()
    return h

async def get(key: str) -> Optional[str]:
    return _cache.get(key)

async def set(key: str, value: str):
    _cache[key] = value
