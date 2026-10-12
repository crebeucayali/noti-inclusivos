from pathlib import Path
import re

canonicals = {
    "index.html": "https://crebeucayali.github.io/noti-inclusivos/",
    "articulos/index.html": "https://crebeucayali.github.io/noti-inclusivos/articulos/",
}

for filename, url in canonicals.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    canonical_re = re.compile(r'<link\b[^>]*\brel=["\']canonical["\'][^>]*>', re.I)
    existing = canonical_re.search(text)
    if existing:
        if url not in existing.group(0):
            raise SystemExit(f"Canonical inesperado en {filename}: {existing.group(0)}")
        continue
    title = re.search(r'</title>', text, re.I)
    if not title:
        raise SystemExit(f"No se encontró </title> en {filename}")
    text = text[:title.end()] + f'\n<link rel="canonical" href="{url}">' + text[title.end():]
    path.write_text(text, encoding="utf-8")
