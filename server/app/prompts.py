SUMMARY_SYSTEM = (
    "You are a precise code review assistant. "
    "Use ONLY the provided context and code. If missing, say you don't know."
)

def summary_user(context_text: str, question: str) -> str:
    return f"""Context (snippets with [file#chunk] labels):
{context_text}

Task:
- Summarize purpose, params, invariants, side effects, and externally visible behavior.
- If available, include 1–2 notable callers/tests and potential review hotspots.
- Cite sources with [file#chunk] labels.

Question: {question}
"""
