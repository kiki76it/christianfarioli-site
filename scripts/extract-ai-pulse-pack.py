"""Read a Daily Content Pack without modifying it or executing document content."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

MAX_BYTES = 20_000_000
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def extract(path):
    path = Path(path)
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES:
        raise ValueError('Pack exceeds the 20 MB input limit')
    match = re.fullmatch(r'Daily Content Pack - (\d{4}-\d{2}-\d{2})(?: [A-Za-z0-9 -]+)?\.(docx|md)', path.name, re.I)
    if not match:
        raise ValueError('Unexpected pack filename')
    links = []
    paragraphs = []
    if path.suffix.lower() == '.docx':
        with zipfile.ZipFile(path) as archive:
            def read_xml(name):
                entry = archive.getinfo(name)
                if entry.file_size > MAX_BYTES:
                    raise ValueError('Document XML exceeds the 20 MB limit')
                return ET.fromstring(archive.read(name))
            doc = read_xml('word/document.xml')
            relationships = {}
            if 'word/_rels/document.xml.rels' in archive.namelist():
                for rel in read_xml('word/_rels/document.xml.rels'):
                    target = rel.get('Target', '')
                    if rel.get('Type', '').endswith('/hyperlink') and target.startswith(('https://', 'http://')):
                        relationships[rel.get('Id')] = target
            if any(True for _ in doc.iter(W + 'del')):
                raise ValueError('Unresolved tracked deletions require editorial review')
            for p in doc.iter(W + 'p'):
                text = ''.join(n.text or '' if n.tag == W + 't' else '\n' if n.tag == W + 'br' else '\t'
                               for n in p.iter() if n.tag in (W + 't', W + 'br', W + 'tab'))
                paragraph_links = []
                for link in p.iter(W + 'hyperlink'):
                    target = relationships.get(link.get(R + 'id'))
                    if target:
                        paragraph_links.append(target)
                for n in p.iter():
                    instruction = n.text if n.tag == W + 'instrText' else n.get(W + 'instr', '')
                    for target in re.findall(r'HYPERLINK\s+"(https?://[^"]+)"', instruction or ''):
                        paragraph_links.append(target)
                paragraphs.append({'text': text, 'links': list(dict.fromkeys(paragraph_links))})
                links.extend(paragraph_links)
    else:
        paragraphs = [{'text': line, 'links': []} for line in raw.decode('utf-8-sig').splitlines()]
    for p in paragraphs:
        links.extend(re.findall(r'https?://[^\s<>"\u201c\u201d]+', p['text']))
    return {'fileName': path.name, 'editionDate': match[1], 'sha256': hashlib.sha256(raw).hexdigest(),
            'paragraphs': paragraphs, 'sourceUrls': list(dict.fromkeys(u.rstrip('.,;)]}') for u in links))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pack')
    args = parser.parse_args()
    print(json.dumps(extract(args.pack), ensure_ascii=True))
