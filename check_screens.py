with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'id="(screen-history|scr-history|screen-settings|scr-settings)"', text)]
for idx in matches:
    line_no = text[:idx].count('\n') + 1
    print(f'Line {line_no}: {text[idx:idx+40]}')
