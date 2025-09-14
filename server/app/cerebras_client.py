import os
from cerebras.cloud.sdk import Cerebras

# CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "gpt-oss-120b")

_client = None
def get_client() -> Cerebras:
    global _client
    if _client is None:
        api_key = os.environ.get("CEREBRAS_API_KEY")
        if not api_key:
            raise ValueError("CEREBRAS_API_KEY environment variable is not set")
        _client = Cerebras(api_key=api_key)
    return _client

def stream_summary(messages, max_tokens=800, temperature=0.2, top_p=0.95):
    try:
        client = get_client()
        model = os.environ.get("CEREBRAS_MODEL", "qwen-3-235b-a22b-instruct-2507")
        return client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_completion_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
        )
    except Exception as e:
        print(f"Cerebras API Error: {e}")
        print(f"Model: {model}")
        print(f"API Key present: {bool(os.environ.get('CEREBRAS_API_KEY'))}")
        raise
