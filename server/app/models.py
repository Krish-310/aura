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
