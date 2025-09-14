import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import SummarizeRequest, SummarizeResponse
from .github import fetch_file
from .utils import slice_lines
from .summarizer import summarize_code
from .cache import key_for, get as cache_get, set as cache_set

app = FastAPI(title="github-hover-ai")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    if not req.sha:
        # fallback: try to read base SHA from URL is out-of-scope for server
        raise HTTPException(400, "Missing sha; extension should pass a commit SHA")

    cache_key = key_for(sha=req.sha, file=req.file, start=req.range.start, end=req.range.end)
    cached = await cache_get(cache_key)
    if cached:
        return SummarizeResponse(summary=cached, cached=True)

    try:
        text = await fetch_file(req.owner, req.repo, req.sha, req.file)
    except Exception as e:
        raise HTTPException(404, f"Unable to fetch file: {e}")

    segment, s, e = slice_lines(text, req.range.start, req.range.end)
    if not segment.strip():
        raise HTTPException(400, "Empty code slice")

    summary = await summarize_code(req.file, req.sha, req.language or "txt", s, e, segment)
    await cache_set(cache_key, summary)
    return SummarizeResponse(summary=summary, cached=False)
