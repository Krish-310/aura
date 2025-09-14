from typing import Tuple

def slice_lines(text: str, start: int, end: int) -> Tuple[str, int, int]:
    lines = text.splitlines()
    s = max(1, start)
    e = min(len(lines), end)
    segment = "\n".join(lines[s-1:e])
    return segment, s, e
