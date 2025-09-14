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

class SelectReq(BaseModel):
    owner: str
    repo: str
    sha: str
    file: str
    selected_text: str
    language: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class SelectResp(BaseModel):
    explanation: str
    related_code: Optional[List[Dict[str, Any]]] = None

class CloneReq(BaseModel):
    owner: str
    repo: str
    url: str

class CloneResp(BaseModel):
    success: bool
    message: str
    local_path: Optional[str] = None

class IngestRepoReq(BaseModel):
    owner: str
    repo: str

class IngestRepoResp(BaseModel):
    success: bool
    message: str
    collection_name: Optional[str] = None

class IngestStatusResp(BaseModel):
    status: str  # 'not_started', 'starting', 'in_progress', 'completed', 'failed'
    stage: Optional[str] = None
    progress_percent: int = 0
    total_files: Optional[int] = None
    processed_files: Optional[int] = None
    total_chunks: Optional[int] = None
    processed_chunks: Optional[int] = None
    current_file: Optional[str] = None
    collection_name: Optional[str] = None
    duration: Optional[float] = None
    error: Optional[str] = None