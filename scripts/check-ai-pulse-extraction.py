import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('extractor', Path(__file__).with_name('extract-ai-pulse-pack.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


class ExtractionTests(unittest.TestCase):
    def test_table_hyperlink_order_and_source_immutability(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'Daily Content Pack - 2026-10-07.docx'
            xml = '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>Hero Story</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:hyperlink r:id="rId1"><w:r><w:t>Original announcement</w:t></w:r></w:hyperlink></w:p></w:tc></w:tr></w:tbl></w:body></w:document>'''
            rels = '<Relationships><Relationship Id="rId1" Type="x/hyperlink" Target="https://example.com/news" TargetMode="External"/></Relationships>'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', xml)
                archive.writestr('word/_rels/document.xml.rels', rels)
            before = path.read_bytes()
            result = extractor.extract(path)
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual([p['text'] for p in result['paragraphs']], ['Hero Story', 'Original announcement'])
            self.assertEqual(result['sourceUrls'], ['https://example.com/news'])
            self.assertEqual(result['editionDate'], '2026-10-07')

    def test_tracked_deletions_require_review(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'Daily Content Pack - 2026-10-07.docx'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:del/></w:document>')
            with self.assertRaisesRegex(ValueError, 'tracked deletions'):
                extractor.extract(path)


if __name__ == '__main__':
    unittest.main()
