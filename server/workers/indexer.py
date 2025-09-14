import os, glob, hashlib, uuid, subprocess, shutil, json
from pathlib import Path
from typing import List, Tuple
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()

REPO = os.getenv("REPO")          # e.g. "owner/name"
PR_NUM = int(os.getenv("PR_NUM", "1"))
COMMIT = os.getenv("COMMIT")      # head sha
GIT_URL = os.getenv("GIT_URL")    # e.g. https://github.com/owner/name.git
WORKDIR = Path(os.getenv("WORKDIR", "/tmp/aura-index"))
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma")
EMBED_MODEL = os.getenv("EMBED_MODEL", "mixedbread-ai/mxbai-embed-large-v1")
GLOB_PATTERNS = json.loads(os.getenv("INDEX_GLOBS", '["**/*.ts","**/*.tsx","**/*.js","**/*.py"]'))

# init chroma
client = chromadb.PersistentClient(path=CHROMA_PATH)
embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)

def collection_name(repo: str, pr_num: int, commit: str) -> str:
    return f"aura::{repo}::pr{pr_num}::{commit}"

def sha256(s: bytes) -> str:
    return hashlib.sha256(s).hexdigest()

def chunk_text(s: str, size: int = 1400, overlap: int = 200):
    i = 0
    while i < len(s):
        yield s[i:i+size]
        i += size - overlap

def run():
    # 1) clone/checkout ephemeral
    if WORKDIR.exists():
        shutil.rmtree(WORKDIR)
    WORKDIR.mkdir(parents=True, exist_ok=True)

    subprocess.run(["git", "clone", "--depth", "1", GIT_URL, str(WORKDIR)], check=True)
    if COMMIT:
        subprocess.run(["git", "fetch", "origin", COMMIT], cwd=WORKDIR, check=True)
        subprocess.run(["git", "checkout", COMMIT], cwd=WORKDIR, check=True)

    # 2) language filter via glob; Tree-sitter symbols can replace this block-by-block chunking later
    files: List[Path] = []
    for pat in GLOB_PATTERNS:
        files += list(WORKDIR.glob(pat))

    col = client.get_or_create_collection(
        name=collection_name(REPO, PR_NUM, COMMIT),
        embedding_function=embedder
    )

    ids, docs, metas = [], [], []
    for f in files:
        try:
            txt = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        content_sha = sha256(txt.encode("utf-8"))
        # 3) symbol-first (TODO: replace with Tree-sitter); fallback: logical blocks by size
        for i, ch in enumerate(chunk_text(txt)):
            ids.append(f"sym:{content_sha}:{i}:{uuid.uuid4().hex[:8]}")
            docs.append(ch)
            metas.append({
                "repo": REPO,
                "commit": COMMIT,
                "file": str(f.relative_to(WORKDIR)),
                "lang": f.suffix.lstrip("."),
                "chunk": i,
                "content_sha": content_sha
            })

        # Optional: skip re-embedding unchanged content by checking a KV store of content_sha

    if ids:
        col.add(ids=ids, documents=docs, metadatas=metas)
        print(f"Upserted {len(ids)} chunks.")
    else:
        print("No files matched patterns; nothing indexed.")

if __name__ == "__main__":
    assert REPO and COMMIT and GIT_URL, "Set REPO, COMMIT, GIT_URL env vars"
    run()
