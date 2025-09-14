import httpx

RAW_BASE = "https://raw.githubusercontent.com"

async def fetch_file(owner: str, repo: str, sha: str, path: str) -> str:
    url = f"{RAW_BASE}/{owner}/{repo}/{sha}/{path}"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text
