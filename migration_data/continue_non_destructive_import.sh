#!/bin/bash
set -u

cd /Users/apple/Documents/GitHub/ketravelan-revamp-2

SRC_SQL="migration_data/data_public_safe_compatible.sql"
WORK_DIR="migration_data/pending_table_imports"
LOG_FILE="migration_data/non_destructive_import.log"
SUCCESS_FILE="migration_data/non_destructive_import_success.txt"
FAILED_FILE="migration_data/non_destructive_import_failed.txt"

# Approved strategy: continue from remaining tables only.
PENDING_TABLES=(
  profile_views
  push_subscriptions
  trip_reviews
  review_helpful
  review_reports
  reviews
  saved_trips
  system_settings
  tip_settings
  tips
  trip_analytics
  trip_announcements
  trip_categories
  trip_feedback
  trip_members
  trip_notes
  trip_payment_methods
  trip_photos
  user_blocks
  user_destinations
  user_engagement
  user_follows
  user_inspirations
)

mkdir -p "$WORK_DIR"
: > "$LOG_FILE"
: > "$SUCCESS_FILE"
: > "$FAILED_FILE"

python3 - <<'PY'
import re
from pathlib import Path

src = Path('migration_data/data_public_safe_compatible.sql').read_text(errors='ignore').splitlines()
out_dir = Path('migration_data/pending_table_imports')
out_dir.mkdir(parents=True, exist_ok=True)

pending = {
    'profile_views','push_subscriptions','trip_reviews','review_helpful','review_reports','reviews',
    'saved_trips','system_settings','tip_settings','tips','trip_analytics','trip_announcements',
    'trip_categories','trip_feedback','trip_members','trip_notes','trip_payment_methods','trip_photos',
    'user_blocks','user_destinations','user_engagement','user_follows','user_inspirations'
}

copy_re = re.compile(r'^COPY "public"\."([^"]+)" \((.+)\) FROM stdin;$')

i = 0
while i < len(src):
    m = copy_re.match(src[i])
    if not m:
        i += 1
        continue

    table = m.group(1)
    start = i
    i += 1
    while i < len(src) and src[i] != '\\.':
        i += 1
    if i < len(src):
        end = i
        i += 1
    else:
        end = len(src) - 1

    if table in pending:
        block = src[start:end+1]
        payload = [
            'SET session_replication_role = replica;',
            'SET row_security = off;',
            *block,
            'RESET ALL;'
        ]
        Path(out_dir / f'{table}.sql').write_text('\n'.join(payload) + '\n')
PY

DB_CONN="host=aws-1-ap-southeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.sspvqhleqlycsiniywkg sslmode=require"
PSQL_BIN="/usr/local/Cellar/libpq/18.3/bin/psql"

for table in "${PENDING_TABLES[@]}"; do
  sql_file="$WORK_DIR/$table.sql"
  if [[ ! -f "$sql_file" ]]; then
    echo "[SKIP] $table (no SQL block found)" | tee -a "$LOG_FILE"
    echo "$table" >> "$FAILED_FILE"
    continue
  fi

  echo "[RUN] $table" | tee -a "$LOG_FILE"
  if PGPASSWORD='xAvXCeIgI2ooZ4Z3' "$PSQL_BIN" "$DB_CONN" -v ON_ERROR_STOP=1 -f "$sql_file" >> "$LOG_FILE" 2>&1; then
    echo "[OK] $table" | tee -a "$LOG_FILE"
    echo "$table" >> "$SUCCESS_FILE"
  else
    echo "[FAIL] $table (conflict/constraint; skipped non-destructively)" | tee -a "$LOG_FILE"
    echo "$table" >> "$FAILED_FILE"
  fi

done

echo ""
echo "=== Non-destructive continuation summary ==="
echo "Succeeded: $(wc -l < "$SUCCESS_FILE" | tr -d ' ')"
echo "Failed/skipped: $(wc -l < "$FAILED_FILE" | tr -d ' ')"
echo "Success list: $SUCCESS_FILE"
echo "Failed list:  $FAILED_FILE"
echo "Detailed log: $LOG_FILE"
