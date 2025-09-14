import os

PROMPT = '''
Annotate the following code for a GitHub PR reviewer.
Provide 2–4 concise, factual bullet points.

File: {file} (commit: {sha})
Lines: {start}-{end}
Language: {lang}

Code:
"""
{code}
"""

Bullets:
- Purpose: ...
- Inputs/Outputs: ...
- Edge cases/Side effects: ...
- Impact of changes: ...
'''

# Stub LLM (replace with OpenAI/Anthropic call)
async def summarize_code(file: str, sha: str, lang: str, start: int, end: int, code: str) -> str:
    # Minimal deterministic placeholder for MVP
    summary = [
        f"Analyzes `{file}` lines {start}-{end} ({lang}).",
        "Describes the main purpose of the hovered block.",
        "Lists inputs/outputs and potential edge conditions.",
        "Notes likely impact on callers or tests."
    ]
    return "\n".join(f"- {s}" for s in summary)
