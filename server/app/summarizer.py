import os

PROMPT = (
    "You annotate code inline for a GitHub PR reviewer.\n"
    "Return 2–4 bullets. Be concise and factual.\n\n"
    "FILE: {file} at {sha}\nLINES: {start}-{end}\nLANG: {lang}\n\nCODE:\n"""\n{code}\n"""\n\nOUTPUT:\n- What it does: ...\n- Key inputs/outputs: ...\n- Edge cases & side effects: ...\n- Change impact (if any): ...\n"
)

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
