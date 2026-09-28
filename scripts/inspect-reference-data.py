"""Read source spreadsheets/PDF without modifying them; save audit intermediates."""
import json, zipfile, collections, hashlib
from pathlib import Path
import xml.etree.ElementTree as ET
import openpyxl
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp' / 'reference-review'
OUT.mkdir(parents=True, exist_ok=True)
base = Path(r'C:\Users\M M PRATEEK\Desktop\searchfix notes')
xlsx = base / 'fwsearchfixcompletion' / 'Consolidated SearchFix Report.xlsx'
ods = base / '28th sept monday' / 'SearchFix - Report - September Day Shift.ods'
pdf = base / '28th sept monday' / 'data.pdf'
books = []
wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
for ws in wb:
    rows = [{'row': i, 'cells': [str(c) if c is not None else '' for c in row]} for i, row in enumerate(ws.iter_rows(values_only=True), 1) if any(c is not None for c in row)]
    books.append({'file': xlsx.name, 'sheet': ws.title, 'rows': rows})
wb.close()
ns = {'t': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'x': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'}
with zipfile.ZipFile(ods) as archive:
    root = ET.fromstring(archive.read('content.xml'))
    for table in root.findall('.//t:table', ns):
        rows = []; rownum = 1
        for row in table.findall('t:table-row', ns):
            vals = []
            for cell in row:
                val = '\n'.join(''.join(p.itertext()) for p in cell.findall('x:p', ns))
                repeat = int(cell.get('{%s}number-columns-repeated' % ns['t'], '1'))
                if repeat < 1000: vals.extend([val] * repeat)
            repeat = int(row.get('{%s}number-rows-repeated' % ns['t'], '1'))
            if any(vals):
                for offset in range(min(repeat,10000)): rows.append({'row': rownum+offset, 'cells': vals})
            rownum += repeat
        books.append({'file': ods.name, 'sheet': table.get('{%s}name' % ns['t']), 'rows': rows})
(OUT/'workbooks.json').write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding='utf8')
reader = PdfReader(pdf)
pages = [{'page': i, 'text': p.extract_text() or ''} for i,p in enumerate(reader.pages,1)]
(OUT/'mail.json').write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf8')
for book in books:
    print(json.dumps({'file':book['file'], 'sheet':book['sheet'], 'nonemptyRows':len(book['rows']), 'firstRows':book['rows'][:3]}, ensure_ascii=True))
print('PDF PAGES', len(pages))
for page in pages: print('PAGE', page['page'], page['text'])
