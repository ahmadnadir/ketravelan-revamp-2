#!/usr/bin/env python3
import re
from pathlib import Path

SRC = Path('migration_data/data_public_safe.sql')
DST = Path('migration_data/data_public_safe_compatible.sql')

# Table -> columns to drop from COPY block if missing in target schema
DROP_COLUMNS = {
    'profiles': {'travel_style'},
}

copy_re = re.compile(r'^COPY "public"\."([^"]+)" \((.+)\) FROM stdin;$')

lines = SRC.read_text(errors='ignore').splitlines()
out = []

in_copy = False
active_table = None
keep_indices = None
removed = {}

for line in lines:
    if not in_copy:
        m = copy_re.match(line)
        if not m:
            out.append(line)
            continue

        table = m.group(1)
        cols = [c.strip().strip('"') for c in m.group(2).split(',')]
        drop = DROP_COLUMNS.get(table, set())

        if drop:
            keep_indices = [i for i, c in enumerate(cols) if c not in drop]
            new_cols = [cols[i] for i in keep_indices]
            removed[table] = [c for c in cols if c in drop]
            out.append(f'COPY "public"."{table}" ("' + '", "'.join(new_cols) + '") FROM stdin;')
        else:
            keep_indices = None
            out.append(line)

        in_copy = True
        active_table = table
        continue

    # inside COPY block
    if line == '\\.':
        out.append(line)
        in_copy = False
        active_table = None
        keep_indices = None
        continue

    if keep_indices is None:
        out.append(line)
        continue

    fields = line.split('\t')
    projected = [fields[i] if i < len(fields) else '' for i in keep_indices]
    out.append('\t'.join(projected))

DST.write_text('\n'.join(out) + '\n')
print(f'Wrote {DST}')
for t, cols in removed.items():
    print(f'Adjusted {t}: removed columns {", ".join(cols)}')
