#!/usr/bin/env python3
"""Attach captured screenshots to roadmap walkthrough steps.

Reads a JSON plan:

    [{"slug": "...", "step": "<exact step text>", "name": "<png basename>",
      "alt": "...", "caption": "..."}, ...]

and rewrites app/lib/roadmap.ts so the matching step carries a `shot` object,
reading the real pixel dimensions off the PNG rather than trusting the plan.

Editing generated TypeScript by regex is usually a bad idea; it is acceptable
here because the target is a single, very regular literal (`{ step: "...",
detail: "..." },`) and because every mutation is verified: the step must be
found exactly once inside its own entry, the PNG must exist, and the file must
still typecheck afterwards. Anything ambiguous is skipped and reported rather
than guessed at.
"""
import json
import pathlib
import re
import struct
import sys

ROADMAP = pathlib.Path("app/lib/roadmap.ts")
SHOTS = pathlib.Path("public/roadmap/shots")


def png_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    w, h = struct.unpack(">II", data[16:24])
    return w, h


def esc(s: str) -> str:
    """Escape for a TS double-quoted string, and refuse an em dash outright."""
    if "—" in s:
        raise ValueError(f"em dash in copy, which this project forbids: {s[:60]}")
    return s.replace("\\", "\\\\").replace('"', '\\"')


def entry_span(text: str, slug: str) -> tuple[int, int]:
    i = text.index(f'slug: "{slug}"')
    j = text.find('slug: "', i + 10)
    return i, (j if j > 0 else len(text))


def main() -> int:
    plan = json.loads(pathlib.Path(sys.argv[1]).read_text())
    text = ROADMAP.read_text()
    done, skipped = 0, []

    for item in plan:
        slug, step, name = item["slug"], item["step"], item["name"]
        png = SHOTS / f"{name}.png"
        if not png.exists():
            skipped.append(f"{slug}/{name}: png missing")
            continue

        try:
            start, end = entry_span(text, slug)
        except ValueError:
            skipped.append(f"{slug}: entry not found")
            continue
        seg = text[start:end]

        # The step literal, in the one-line form the un-illustrated entries use.
        pat = re.compile(
            r'\{ step: "' + re.escape(step) + r'", detail: "((?:[^"\\]|\\.)*)" \},'
        )
        hits = list(pat.finditer(seg))
        if len(hits) != 1:
            skipped.append(f"{slug}/{step!r}: matched {len(hits)} times, expected 1")
            continue

        w, h = png_size(png)
        detail = hits[0].group(1)
        block = (
            "{\n"
            f'        step: "{esc(step)}",\n'
            f'        detail: "{detail}",\n'
            "        shot: {\n"
            f'          src: "/roadmap/shots/{name}.png",\n'
            f'          alt: "{esc(item["alt"])}",\n'
            f'          caption: "{esc(item["caption"])}",\n'
            f"          width: {w},\n"
            f"          height: {h},\n"
            "        },\n"
            "      },"
        )
        seg = seg[: hits[0].start()] + block + seg[hits[0].end():]
        text = text[:start] + seg + text[end:]
        done += 1

    ROADMAP.write_text(text)
    print(f"attached {done} shots")
    for s in skipped:
        print(f"  SKIPPED {s}")
    return 1 if skipped else 0


if __name__ == "__main__":
    sys.exit(main())
