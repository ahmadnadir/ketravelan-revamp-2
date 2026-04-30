#!/bin/bash
set -euo pipefail

SUPABASE_URL="https://sspvqhleqlycsiniywkg.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQwNTg2MSwiZXhwIjoyMDgyOTgxODYxfQ._aQ0NJwTzraFwjj5yz9D0B1w1osDMlwEfeivy7NXF8M"
BACKUP_DIR="$(dirname "$0")/storage"

BUCKETS=(
  "expense-receipts"
  "payment-methods"
  "avatars"
  "trip-images"
  "profile-covers"
  "chat-attachments"
  "story-covers"
  "trip-cover-photos"
  "trip-gallery"
  "trip-qr-codes"
  "trip-documents"
)

download_files_in_folder() {
  local bucket="$1"
  local prefix="$2"
  local offset=0
  local limit=1000

  while true; do
    local body="{\"prefix\":\"$prefix\",\"limit\":$limit,\"offset\":$offset,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}"
    local response
    response=$(curl -s -X POST "$SUPABASE_URL/storage/v1/object/list/$bucket" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "apikey: $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "$body")

    local count
    count=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")

    if [[ "$count" == "0" ]]; then
      break
    fi

    # Process each item
    while IFS= read -r item; do
      local name id metadata_mimetype
      name=$(echo "$item" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name',''))" 2>/dev/null)
      id=$(echo "$item" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

      if [[ -z "$name" || "$name" == "None" ]]; then
        continue
      fi

      local full_path
      if [[ -z "$prefix" ]]; then
        full_path="$name"
      else
        full_path="$prefix/$name"
      fi

      # Check if it's a folder (no id) or file (has id)
      if [[ -z "$id" || "$id" == "None" ]]; then
        # It's a folder — recurse
        download_files_in_folder "$bucket" "$full_path"
      else
        # It's a file — download it
        local local_path="$BACKUP_DIR/$bucket/$full_path"
        local local_dir
        local_dir=$(dirname "$local_path")
        mkdir -p "$local_dir"

        if [[ -f "$local_path" ]]; then
          echo "  SKIP (exists): $bucket/$full_path"
        else
          echo "  Downloading: $bucket/$full_path"
          curl -s -o "$local_path" \
            "$SUPABASE_URL/storage/v1/object/public/$bucket/$full_path" \
            -H "Authorization: Bearer $SERVICE_KEY" \
            -H "apikey: $SERVICE_KEY"
        fi
      fi
    done < <(echo "$response" | python3 -c "
import sys, json
items = json.load(sys.stdin)
for item in items:
    print(json.dumps(item))
" 2>/dev/null)

    if [[ "$count" -lt "$limit" ]]; then
      break
    fi
    offset=$((offset + limit))
  done
}

total_files=0
total_size=0

for bucket in "${BUCKETS[@]}"; do
  echo ""
  echo "=== Bucket: $bucket ==="
  mkdir -p "$BACKUP_DIR/$bucket"
  download_files_in_folder "$bucket" ""
done

echo ""
echo "=== Storage backup complete ==="
echo "Saved to: $BACKUP_DIR"
du -sh "$BACKUP_DIR" 2>/dev/null || true
find "$BACKUP_DIR" -type f | wc -l | xargs -I{} echo "Total files: {}"
