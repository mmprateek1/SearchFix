"""Read only the supplied consolidated XLSX; never modify the source workbook."""
import collections
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp' / 'reference-review'
OUT.mkdir(parents=True, exist_ok=True)
source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'C:\Users\M M PRATEEK\Desktop\searchfix notes\29th sept tuesday\Consolidated SearchFix Report.xlsx')
books = []
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
for sheet in workbook:
    rows = [{'row': i, 'cells': [str(cell) if cell is not None else '' for cell in values]}
            for i, values in enumerate(sheet.iter_rows(values_only=True), 1) if any(cell is not None for cell in values)]
    books.append({'file': source.name, 'sheet': sheet.title, 'rows': rows})
workbook.close()
(OUT / 'workbooks.json').write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding='utf8')
(OUT / 'source.json').write_text(json.dumps({'file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}, indent=2), encoding='utf8')
for book in books:
    print(book['sheet'], 'populated rows:', len(book['rows']))
    if book['sheet'] != 'Consolidated SearchFix':
        print(json.dumps(book['rows'], ensure_ascii=True))
        continue
    categories = {}
    for row in book['rows'][1:]:
        cells = row['cells']
        if not cells[0].strip():
            continue
        category = cells[4].strip()
        item = categories.setdefault(category, {'outcomes': collections.Counter(), 'wanted': collections.Counter(), 'examples': []})
        item['outcomes'][cells[3].strip()] += 1
        item['wanted'][cells[7].strip()] += 1
        if len(item['examples']) < 3:
            item['examples'].append({'row': row['row'], 'comment': cells[1], 'resolution': cells[2], 'status': cells[3]})
    (OUT / 'category-analysis.json').write_text(json.dumps(categories, ensure_ascii=False, indent=2), encoding='utf8')
    for category, item in sorted(categories.items()):
        print(json.dumps({'category': category, 'outcomes': item['outcomes'], 'wanted': item['wanted']}, ensure_ascii=True))
