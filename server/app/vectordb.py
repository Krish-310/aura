import chromadb
from chromadb.utils.embedding_functions import EmbeddingFunction
from typing import List, Dict

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
