import re
import sys

user_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'
# Using double quotes in table mapping for regex matching
tables_config = {
    'trip_members': {'col': 'user_id'},
    'conversation_participants': {'col': 'user_id'},
    'group_messages': {'col': 'user_id'},
    'direct_messages': {'col': 'sender_id'},
    'messages': {'col': 'sender_id'},
    'join_requests': {'col': 'user_id'},
    'trip_feedback': {'col': 'user_id'}
}

output_file = 'migration_data/restore_d71_chat_trip_from_safe_dump.sql'
dump_file = 'migration_data/data_public_safe.sql'

extracted_data = {table: [] for table in tables_config}
headers = {table: [] for table in tables_config}
indices = {table: -1 for table in tables_config}

current_table = None

with open(dump_file, 'r') as f:
    for line in f:
        # Match COPY "public"."table_name"
        copy_match = re.match(r'COPY "public"."(\w+)" \((.*)\) FROM stdin;', line)
        if copy_match:
            table_name = copy_match.group(1)
            if table_name in tables_config:
                current_table = table_name
                cols = [c.strip().strip('"') for c in copy_match.group(2).split(',')]
                headers[current_table] = cols
                indices[current_table] = cols.index(tables_config[current_table]['col'])
            continue
        
        if line.startswith('\\.'):
            current_table = None
            continue
        
        if current_table:
            parts = line.strip('\n').split('\t')
            idx = indices[current_table]
            if idx < len(parts) and parts[idx] == user_id:
                extracted_data[current_table].append(parts)

with open(output_file, 'w') as f:
    f.write("-- Restore script for user d71d3978-1a6b-483e-a453-30952df2dfcd\n")
    f.write("BEGIN;\n\n")
    
    for table in tables_config:
        col = tables_config[table]['col']
        f.write(f"-- Pre-check counts for {table}\n")
        f.write(f"SELECT count(*) as {table}_before FROM public.{table} WHERE {col} = '{user_id}';\n")
    
    f.write("\n")
    
    for table, rows in extracted_data.items():
        if not rows:
            f.write(f"-- No data found for {table}\n\n")
            continue
        
        cols = headers[table]
        cols_str = ", ".join([f'"{c}"' for c in cols])
        f.write(f"-- Inserting {len(rows)} rows into {table}\n")
        for row in rows:
            vals = []
            for v in row:
                if v == '\\N':
                    vals.append('NULL')
                else:
                    escaped = v.replace("'", "''")
                    vals.append(f"'{escaped}'")
            vals_str = ", ".join(vals)
            f.write(f"INSERT INTO public.{table} ({cols_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;\n")
        f.write("\n")

    for table in tables_config:
        col = tables_config[table]['col']
        f.write(f"-- Post-check counts for {table}\n")
        f.write(f"SELECT count(*) as {table}_after FROM public.{table} WHERE {col} = '{user_id}';\n")
    
    f.write("\nCOMMIT;\n")

print(f"Extraction complete. Results:")
for table, rows in extracted_data.items():
    print(f"{table}: {len(rows)} rows")
