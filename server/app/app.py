import uuid
from fastapi import FastAPI, Depends, HTTPException
from app.schemas import IngestReq, HoverReq, HoverResp
from app.deps import require_auth, jobs_store
from app import vectordb as retrieval, prompts, cerebras_client as cb

app = FastAPI()

@app.post("/ingest")
def ingest(req: IngestReq, _=Depends(require_auth)):
    job_id = str(uuid.uuid4())
    jobs = jobs_store()
    jobs[job_id] = {
        "status": "queued",
        "repo": req.repo,
        "prNumber": req.prNumber,
        "head_sha": req.head_sha,
        "base_sha": req.base_sha,
    }
    # In real deploy: push to Redis/BullMQ/RQ; worker consumes job_id.
    # For demo, we pretend it’s queued and ask the worker CLI to process.
    return {"ok": True, "jobId": job_id}

@app.get("/status")
def status(repo: str, prNumber: int, commit: str):
    # In a real system, check DB state for (repo, prNumber, commit).
    # Here we assume the worker marks the collection presence as “ready”.
    try:
        _ = retrieval.get_or_create_collection(
            retrieval.collection_name(repo, prNumber, commit)
        )
        return {"status": "ready"}
    except Exception:
        return {"status": "indexing"}

@app.post("/hover", response_model=HoverResp)
def hover(req: HoverReq, _=Depends(require_auth)):
    # 1) (optional) resolve symbol using file/range if you already stored symbol ranges.
    # 2) Vector search: question = local code context + intent
    question = (
        f"Explain the selected code block in {req.file} "
        f"covering lines/bytes {req.range}. "
        f"Focus on purpose, params, invariants, side effects."
    )

    top = retrieval.knn(
        repo=req.repo,
        pr_num=req.prNumber,
        commit=req.commit,
        query=req.codeContext + "\n\n" + question,
        n_results=8,
    )

    context = retrieval.format_context(top)
    messages = [
        {"role": "system", "content": prompts.SUMMARY_SYSTEM},
        {"role": "user", "content": prompts.summary_user(context, question)},
    ]

    # 3) Call Cerebras (streaming)
    stream = cb.stream_summary(messages, max_tokens=800, temperature=0.2)

    text = []
    for chunk in stream:
        piece = chunk.choices[0].delta.content or ""
        if piece:
            text.append(piece)
    answer = "".join(text).strip()

    # 4) Return Aura-shaped response (summary bullets + actions)
    bullets = [b.strip("- ").strip() for b in answer.split("\n") if b.strip()][:6]
    resp = HoverResp(
        summary=bullets or [answer],
        highlights=[],
        actions=[{"type": "show_definition", "symbolId": "TODO"}],
    )
    return resp
