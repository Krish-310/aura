from fastapi import Depends, HTTPException
from typing import Dict

# placeholder for auth, queues, db sessions, etc.
def require_auth():
    # TODO: validate short-lived JWT from extension / GitHub App
    return True

# simple in-memory job store for demo purposes
JOBS: Dict[str, Dict] = {}
def jobs_store():
    return JOBS
