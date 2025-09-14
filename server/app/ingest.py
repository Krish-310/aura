import asyncio
from typing import Dict, List
from .github import list_tree, fetch_file
from .utils import should_index, naive_chunk_file
from .summarizer import embed_texts
from .vectordb import get_or_create_collection, collection_name

class _OpenAIEmbedFn:
    """Minimal adapter so Chroma can call our embed endpoint when needed (we pre-embed anyway)."""
    def __call__(self, texts: List[str]) -> List[List[float]]:
        import anyio
        return anyio.run(embed_texts, texts)  # type: ignore

async def ingest_repo(owner: str, repo: str, sha: str) -> Dict:
    tree = await list_tree(owner, repo, sha)
    candidate_files = [t for t in tree if should_index(t.get("path", ""), t.get("size", 0))]
    chunks: List[Dict] = []
    # Fetch + chunk concurrently (limit concurrency to be polite)
    sem = asyncio.Semaphore(8)
    async def _fetch_and_chunk(path: str):
        async with sem:
            code = await fetch_file(owner, repo, sha, path)
            for ch in naive_chunk_file(path, code):
                chunks.append({"path": path, **ch})
    await asyncio.gather(*[_fetch_and_chunk(f["path"]) for f in candidate_files])

    # Prepare embeddings
    texts = [c["code"] for c in chunks]
    embs = await embed_texts(texts)

    # Upsert into Chroma
    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
    coll = get_or_create_collection(collection_name(owner, repo, sha), embed_fn=DefaultEmbeddingFunction())

    ids = [f"{owner}/{repo}:{sha}:{c['path']}:{c['start']}-{c['end']}:{i}" for i,c in enumerate(chunks)]
    metadatas = [{
        "repo": f"{owner}/{repo}",
        "sha": sha,
        "file": c["path"],
        "start": c["start"],
        "end": c["end"],
        "lang": c["lang"],
    } for c in chunks]
    coll.add(ids=ids, embeddings=embs, metadatas=metadatas, documents=texts)
    return {"files": len(candidate_files), "chunks": len(chunks)}

async def top_k_related(owner: str, repo: str, sha: str, query_text: str, k: int = 6) -> List[Dict]:
    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
    coll = get_or_create_collection(collection_name(owner, repo, sha), embed_fn=DefaultEmbeddingFunction())
    if coll.count() == 0:
        return []
    # embed query
    q_emb = (await embed_texts([query_text]))[0]
    res = coll.query(query_embeddings=[q_emb], n_results=k)
    out = []
    for i in range(len(res["ids"][0])):
        out.append({
            "id": res["ids"][0][i],
            "code": res["documents"][0][i],
            **res["metadatas"][0][i],
        })
    return out
