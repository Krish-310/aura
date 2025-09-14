import os
import chromadb
from chromadb.utils import embedding_functions
from chromadb.utils.embedding_functions import EmbeddingFunction
from typing import List, Dict

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma")
EMBED_MODEL = os.getenv("EMBED_MODEL", "mixedbread-ai/mxbai-embed-large-v1")
TOP_K = int(os.getenv("TOP_K", "8"))

_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBED_MODEL
)

_client = None

def client_once():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=".chroma")
    return _client

def collection_name(owner: str, repo: str, sha: str) -> str:
    return f"{owner}/{repo}@{sha}".lower()

def get_or_create_collection(name: str, embed_fn: EmbeddingFunction):
    return client_once().get_or_create_collection(name=name, embedding_function=embed_fn)

def collection_name(repo: str, pr_num: int, commit: str) -> str:
    # Namespaced per-repo/PR/commit as recommended
    return f"aura::{repo}::pr{pr_num}::{commit}"

def get_or_create_collection(name: str):
    return _client.get_or_create_collection(name=name, embedding_function=_embedder)

def knn(repo: str, pr_num: int, commit: str, query: str, n_results: int = TOP_K):
    col = get_or_create_collection(collection_name(repo, pr_num, commit))
    hits = col.query(query_texts=[query], n_results=n_results)
    docs = hits.get("documents", [[]])[0]
    metas = hits.get("metadatas", [[]])[0]
    return list(zip(docs, metas))

def format_context(chunks_with_meta):
    blocks = []
    for c, m in chunks_with_meta:
        src = f"{m.get('file','unknown')}#chunk-{m.get('chunk',0)}"
        blocks.append(f"[{src}]\n{c}")
    return "\n\n-----\n\n".join(blocks)
