from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple

class IngestReq(BaseModel):
    repo: str
    prNumber: int
    head_sha: Optional[str] = None
    base_sha: Optional[str] = None

class HoverReq(BaseModel):
    repo: str
    prNumber: int
    file: str
    commit: str
    range: Tuple[int, int]  # byte or line range as you prefer
    codeContext: str

class HoverResp(BaseModel):
    summary: List[str]
    highlights: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []
