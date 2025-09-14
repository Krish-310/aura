from pydantic import BaseModel

class Range(BaseModel):
    start: int
    end: int

class SummarizeRequest(BaseModel):
    owner: str
    repo: str
    pr: int
    sha: str | None = None
    file: str
    range: Range
    language: str | None = None

class SummarizeResponse(BaseModel):
    summary: str
    cached: bool = False

class SelectRequest(BaseModel):
    owner: str
    repo: str
    sha: str
    file: str
    selected_text: str
    language: str | None = None
    context: dict | None = None  # Additional context like line numbers, surrounding code

class SelectResponse(BaseModel):
    explanation: str
    related_code: list[dict] | None = None