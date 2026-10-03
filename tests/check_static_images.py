"""Check exported pages use files shipped with the static site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            values = dict(attrs)
            if values.get('src'):
                self.sources.append(values['src'])
            self.sources.extend(part.strip().split(' ')[0] for part in (values.get('srcset') or '').split(',') if part.strip())


project = Path(__file__).resolve().parents[1]
assert "images: { unoptimized: true }" in (project / 'next.config.mjs').read_text(), 'Next image optimizer requires server runtime'
root = project / 'out'
images = Images()
images.feed((root / 'index.html').read_text())
assert images.sources, 'No exported images found'
for source in images.sources:
    path = unquote(urlsplit(source).path)
    assert path.startswith('/') and (root / path.lstrip('/')).is_file(), f'Image missing from static export: {source}'
print(f'{len(images.sources)} exported image URLs resolve to local files')
