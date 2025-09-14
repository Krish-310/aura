import uuid
from fastapi import FastAPI, Depends, HTTPException
from app.schemas import IngestReq, HoverReq, HoverResp, SelectReq, SelectResp
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
    # For demo, we pretend it's queued and ask the worker CLI to process.
    return {"ok": True, "jobId": job_id}

@app.get("/status")
def status(repo: str, prNumber: int, commit: str):
    # In a real system, check DB state for (repo, prNumber, commit).
    # Here we assume the worker marks the collection presence as "ready".
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

@app.post("/select", response_model=SelectResp)
def select_code(req: SelectReq):
    """Explain selected code using repository context from ChromaDB"""
    try:
        # Try to get all code from the repository using ChromaDB
        try:
            # Create a collection name based on the repo info
            collection_name = f"{req.owner}/{req.repo}@{req.sha}".lower()
            collection = retrieval.get_or_create_collection(collection_name)
            
            # Get all documents from the collection
            all_docs = collection.get()
            
            if all_docs and all_docs.get('documents'):
                # Build the full codebase context
                codebase_context = []
                codebase_context.append(f"# Full Codebase Context for {req.owner}/{req.repo}")
                codebase_context.append(f"# Selected Code from: {req.file}")
                codebase_context.append("")
                codebase_context.append("## Selected Code:")
                codebase_context.append(f"```{req.language or 'text'}")
                codebase_context.append(req.selected_text)
                codebase_context.append("```")
                codebase_context.append("")
                codebase_context.append("## Repository Files:")
                
                # Group by file for better organization
                files = {}
                for i, doc in enumerate(all_docs['documents']):
                    metadata = all_docs['metadatas'][i] if all_docs.get('metadatas') else {}
                    file_path = metadata.get('file', f'file_{i}')
                    
                    if file_path not in files:
                        files[file_path] = []
                    files[file_path].append({
                        'code': doc,
                        'metadata': metadata
                    })
                
                # Add each file's content
                for file_path, chunks in files.items():
                    codebase_context.append(f"### {file_path}")
                    for chunk in chunks:
                        start_line = chunk['metadata'].get('start', '?')
                        end_line = chunk['metadata'].get('end', '?')
                        lang = chunk['metadata'].get('lang', 'text')
                        codebase_context.append(f"```{lang}")
                        codebase_context.append(f"// Lines {start_line}-{end_line}")
                        codebase_context.append(chunk['code'])
                        codebase_context.append("```")
                        codebase_context.append("")
                
                full_context = "\n".join(codebase_context)
                
                # Create explanation with full context
                explanation = f"**Selected Code Analysis:**\n\n"
                explanation += f"**File:** `{req.file}`\n"
                explanation += f"**Language:** {req.language or 'text'}\n\n"
                explanation += f"**Selected Code:**\n```{req.language or 'text'}\n{req.selected_text}\n```\n\n"
                explanation += f"**Repository Context:** This code is part of the {req.owner}/{req.repo} repository. "
                explanation += f"The repository contains {len(files)} files with {len(all_docs['documents'])} code chunks. "
                explanation += "The full codebase context is available below for reference.\n\n"
                explanation += "---\n\n"
                explanation += full_context
                
                return SelectResp(
                    explanation=explanation,
                    related_code=all_docs['documents'][:10]  # Return first 10 chunks as related code
                )
            else:
                # No ingested data found
                explanation = f"**Selected Code Analysis:**\n\n"
                explanation += f"**File:** `{req.file}`\n"
                explanation += f"**Language:** {req.language or 'text'}\n\n"
                explanation += f"**Selected Code:**\n```{req.language or 'text'}\n{req.selected_text}\n```\n\n"
                explanation += f"**Repository:** {req.owner}/{req.repo}\n\n"
                explanation += "**Note:** This repository hasn't been ingested yet. To get full codebase context, "
                explanation += "please ingest the repository first using the `/ingest` endpoint.\n\n"
                explanation += "**To ingest this repository, run:**\n"
                explanation += f"```bash\ncurl -X POST 'http://localhost:8787/ingest' \\\n"
                explanation += f"  -H 'Content-Type: application/json' \\\n"
                explanation += f"  -d '{{\"repo\": \"{req.owner}/{req.repo}\", \"prNumber\": 1, \"head_sha\": \"{req.sha}\"}}'\n```"
                
                return SelectResp(
                    explanation=explanation,
                    related_code=None
                )
                
        except Exception as e:
            # Fallback if ChromaDB query fails
            explanation = f"**Selected Code Analysis:**\n\n"
            explanation += f"**File:** `{req.file}`\n"
            explanation += f"**Language:** {req.language or 'text'}\n\n"
            explanation += f"**Selected Code:**\n```{req.language or 'text'}\n{req.selected_text}\n```\n\n"
            explanation += f"**Repository:** {req.owner}/{req.repo}\n\n"
            explanation += f"**Error:** Could not retrieve repository context: {str(e)}\n\n"
            explanation += "**To ingest this repository, run:**\n"
            explanation += f"```bash\ncurl -X POST 'http://localhost:8787/ingest' \\\n"
            explanation += f"  -H 'Content-Type: application/json' \\\n"
            explanation += f"  -d '{{\"repo\": \"{req.owner}/{req.repo}\", \"prNumber\": 1, \"head_sha\": \"{req.sha}\"}}'\n```"
            
            return SelectResp(
                explanation=explanation,
                related_code=None
            )
        
    except Exception as e:
        raise HTTPException(500, f"Error explaining code: {e}")

# Add CORS middleware for extension
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)