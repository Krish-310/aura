import os
from cerebras.cloud.sdk import Cerebras

CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "qwen-3-235b-a22b-instruct-2507")

_client = None
def get_client() -> Cerebras:
    global _client
    if _client is None:
        _client = Cerebras(api_key=os.environ["CEREBRAS_API_KEY"])
    return _client

def stream_summary(messages, max_tokens=800, temperature=0.2, top_p=0.95):
    client = get_client()
    return client.chat.completions.create(
        model=CEREBRAS_MODEL,
        messages=messages,
        stream=True,
        max_completion_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
    )
