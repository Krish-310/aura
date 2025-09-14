import uuid
import logging
from fastapi import FastAPI, Depends, HTTPException, Request
from dotenv import load_dotenv
from app.schemas import IngestReq, HoverReq, HoverResp, SelectReq, SelectResp, CloneReq, CloneResp
# from app.deps import require_auth, jobs_store
from app import vectordb as retrieval
from app import prompt
from fastapi.responses import StreamingResponse
from app import stream
import json
from app.ingest import ingest_repo

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Load environment variables from .env file (project root)
load_dotenv(dotenv_path="../.env")

app = FastAPI()

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


@app.post("/select")
async def select_code(req: SelectReq, request: Request):
    try:
        # Fetch related context from ChromaDB
        related_snippets = []
        try:
            # Generate collection name based on repo info
            coll_name = retrieval.collection_name(f"{req.owner}/{req.repo}", 1, "main")
            
            # Search for similar code snippets using the selected text as query
            search_results = retrieval.search_similar_code(
                collection_name=coll_name,
                query=req.selected_text,
                n_results=5
            )
            
            if search_results and 'documents' in search_results:
                # Format search results for the prompt
                for i in range(len(search_results['documents'])):
                    if i < len(search_results['documents']):
                        snippet = {
                            'documents': [search_results['documents'][i]],
                            'metadatas': [search_results['metadatas'][i]] if search_results.get('metadatas') and i < len(search_results['metadatas']) else [{}]
                        }
                        related_snippets.append(snippet)
                        
            logging.info(f"Found {len(related_snippets)} related code snippets for context")
            
        except Exception as e:
            logging.warning(f"Failed to fetch context from ChromaDB: {e}")
            # Continue without context if vector search fails
        
        # Build messages with context
        messages = prompt.build_messages(
            repo=f"{req.owner}/{req.repo}",
            file=req.file,
            lang=req.language,
            selected=req.selected_text,
            related_snips=related_snippets if related_snippets else None
        )

        # 3) return streaming response
        async def gen():
            try:
                # Stream model responses and wrap in NDJSON
                async for chunk in stream.stream_model(messages, temperature=0.2, max_tokens=700):
                    # chunk is already bytes from stream_model
                    piece = chunk.decode("utf-8", errors="ignore") if isinstance(chunk, bytes) else str(chunk)
                    line = json.dumps({"delta": piece}) + "\n"
                    yield line.encode("utf-8")

                    # Cooperative cancellation if client disconnects
                    if await request.is_disconnected():
                        break

                # Emit an explicit done sentinel
                yield (json.dumps({"done": True}) + "\n").encode("utf-8")

            except Exception as e:
                # Send error as NDJSON so the client can handle it uniformly
                err_line = json.dumps({"error": str(e)}) + "\n"
                yield err_line.encode("utf-8")

        # >>> CHANGED: use NDJSON + anti-buffering headers
        headers = {
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache, no-transform",
        }
        return StreamingResponse(
            gen(),
            media_type="application/x-ndjson; charset=utf-8",
            headers=headers,
        )
        
    except Exception as e:
        # Fallback explanation if Cerebras stream model fails
        fallback_explanation = f"""**Code Analysis for {req.file}**

**Selected Code:**
```{req.language or 'text'}
{req.selected_text}
```

**Repository:** {req.owner}/{req.repo}

**Note:** Unable to generate AI explanation due to error: {str(e)}

This appears to be code from the {req.owner}/{req.repo} repository. 
Please review the selected code manually for its functionality and purpose.
"""
        
        return SelectResp(
            explanation=fallback_explanation,
            related_code=None
        )

@app.post("/clone", response_model=CloneResp)
def clone_repository(req: CloneReq):
    """Clone a GitHub repository to the server - updated"""
    try:
        import subprocess
        import os
        import shutil
        from pathlib import Path
        
        # Use ~/.aura directory (works both locally and in Docker)
        home_dir = Path.home()
        repos_dir = home_dir / ".aura"
        repos_dir.mkdir(exist_ok=True)
        
        # Construct repository path
        repo_path = repos_dir / f"{req.owner}_{req.repo}"
        
        # Remove existing directory if it exists
        if repo_path.exists():
            shutil.rmtree(repo_path)
        
        # Clone the repository
        clone_url = f"https://github.com/{req.owner}/{req.repo}.git"
        
        # Use git from PATH (works in Docker container)
        git_path = shutil.which("git")
        if not git_path:
            raise Exception("Git executable not found. Please ensure git is installed and in PATH.")
        
        result = subprocess.run(
            ["git", "clone", clone_url, str(repo_path)],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            cwd=str(repos_dir.parent)  # Set working directory to home
        )
        
        if result.returncode != 0:
            raise Exception(f"Git clone failed: {result.stderr}")
        
        print(f"Repository cloned to {repo_path}")
        # Extract owner and repo from the request for proper collection naming
        success = ingest_repo(
            repo_path=str(repo_path),
            repo_name=f"{req.owner}/{req.repo}",
            pr_number=1,  # Default PR number for initial clone
            commit="main"  # Default commit
        )
        
        if not success:
            raise Exception("Failed to ingest repository into vector database")
        print(f"Repository ingested successfully")
        
        return CloneResp(
            success=True,
            message=f"Repository {req.owner}/{req.repo} cloned successfully",
            local_path=str(repo_path)
        )
        
    except subprocess.TimeoutExpired:
        return CloneResp(
            success=False,
            message="Repository cloning timed out (5 minutes)",
            local_path=None
        )
    except Exception as e:
        return CloneResp(
            success=False,
            message=f"Failed to clone repository: {str(e)}",
            local_path=None
        )

# Add CORS middleware for extension
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)