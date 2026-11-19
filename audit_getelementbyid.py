import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

matches = list(re.finditer(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)\.addEventListener", text))
print('Total direct document.getElementById(\'id\').addEventListener calls:', len(matches))

errors = []
for m in matches:
    el_id = m.group(1)
    line_no = text[:m.start()].count('\n') + 1
    has_el = f'id="{el_id}"' in text
    print(f'Line {line_no}: document.getElementById(\'{el_id}\').addEventListener -> exists: {has_el}')
    if not has_el:
        errors.append((line_no, el_id))

if errors:
    print('FATAL ERRORS FOUND IN getElementById:', errors)
else:
    print('ALL document.getElementById addEventListener calls are safe!')
