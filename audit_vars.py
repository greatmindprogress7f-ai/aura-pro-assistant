import re

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

errors = []
for i, line in enumerate(lines):
    # Pattern: var/const xxx = $('yyy') or document.getElementById('yyy')
    m = re.search(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\$|document\.getElementById)\([\'"]([^\'"]+)[\'"]\)', line)
    if m:
        var_name = m.group(1)
        el_id = m.group(2)
        has_el = any(f'id="{el_id}"' in l for l in lines)
        if not has_el:
            print(f'Line {i+1}: Var "{var_name}" assigned to non-existent ID "{el_id}"')
            # Check if this variable is accessed without a null check in the next 20 lines
            for j in range(i+1, min(i+25, len(lines))):
                sub = lines[j]
                if re.search(r'\b' + var_name + r'\.(?:addEventListener|style|classList|value)\b', sub):
                    if not re.search(r'if\s*\(\s*' + var_name + r'\s*\)', lines[j-1]) and not re.search(r'if\s*\(\s*' + var_name + r'\s*\)', sub):
                        print(f'  -> UNSAFE ACCESS at line {j+1}: {sub.strip()}')
                        errors.append((j+1, var_name, el_id, sub.strip()))

if errors:
    print('UNSAFE ELEMENT ACCESSES FOUND:', len(errors))
else:
    print('No unsafe variable element accesses found.')
