import uuid
from fastapi import FastAPI, Depends, HTTPException
from dotenv import load_dotenv
from app.schemas import IngestReq, HoverReq, HoverResp, SelectReq, SelectResp, CloneReq, CloneResp
# from app.deps import require_auth, jobs_store
from app import vectordb as retrieval
from app import cerebras_client as cb
from app import prompt

# Load environment variables from .env file
load_dotenv()

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


@app.post("/select", response_model=SelectResp)
def select_code(req: SelectReq):
    try:
        
        # we might be able to pass the context in here!
        messages = prompt.build_messages(
            repo=f"{req.owner}/{req.repo}",
            file=req.file,
            lang=req.language,
            selected=req.selected_text,
            # related_snips=req.related_snippets
        )

        # Call Cerebras inference (streaming)
        stream = cb.stream_summary(messages, max_tokens=1000, temperature=0.3)
        
        # Collect the streaming response
        explanation_parts = []
        for chunk in stream:
            piece = chunk.choices[0].delta.content or ""
            if piece:
                explanation_parts.append(piece)
        
        explanation = "".join(explanation_parts).strip()
        
        # Return the response
        return SelectResp(
            explanation=explanation,
            related_code=None  # Could be enhanced to include related code from ChromaDB
        )
        
    except Exception as e:
        # Fallback explanation if Cerebras fails
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