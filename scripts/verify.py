"""Check document integrity using Python's standard library only."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'terms': 64, 'events': 42, 'sources': 104}
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.assets = []
        self.stack = []
        self.errors = []
        self.counts = Counter()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag in {'script', 'img'} and 'src' in attrs:
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.assets.append(attrs.get('href', ''))
        if 'term-card' in classes:
            self.counts['terms'] += 1
        if 'event' in classes:
            self.counts['events'] += 1
        if tag == 'li' and attrs.get('id', '').startswith('source-'):
            self.counts['sources'] += 1
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'Mismatched closing tag </{tag}> at line {self.getpos()[0]}')
        else:
            self.stack.pop()


def main():
    document = Document()
    document.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
    errors = document.errors
    errors.extend(f'Duplicate id: {key}' for key, count in Counter(document.ids).items() if count > 1)
    ids = set(document.ids)
    for href in document.links:
        if href.startswith('#') and unquote(href[1:]) not in ids:
            errors.append(f'Missing fragment target: {href}')
    for href in document.assets + document.links:
        url = urlsplit(href)
        if not url.scheme and not url.netloc and url.path:
            if not (ROOT / unquote(url.path)).is_file():
                errors.append(f'Missing local file: {url.path}')
    if document.stack:
        errors.append(f'Unclosed tags: {document.stack}')
    for name, expected in EXPECTED.items():
        if document.counts[name] != expected:
            errors.append(f'{name}: expected {expected}, found {document.counts[name]}')
    if errors:
        print('\n'.join(sorted(set(errors))))
        return 1
    print('PASS: HTML nesting, unique IDs, fragment links, local assets; 64 terms / 42 events / 104 sources.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
