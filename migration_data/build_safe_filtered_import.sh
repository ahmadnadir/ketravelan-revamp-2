#!/bin/bash
set -euo pipefail

cd /Users/apple/Documents/GitHub/ketravelan-revamp-2

awk '
BEGIN {
  in_copy=0;
  include_copy=0;
}
/^SET session_replication_role = replica;$/ { print; next }
/^SET statement_timeout = / { print; next }
/^SET lock_timeout = / { print; next }
/^SET idle_in_transaction_session_timeout = / { print; next }
/^SET transaction_timeout = / { print; next }
/^SET client_encoding = / { print; next }
/^SET standard_conforming_strings = / { print; next }
/^SELECT pg_catalog\.set_config\(/ { print; next }
/^SET check_function_bodies = / { print; next }
/^SET xmloption = / { print; next }
/^SET client_min_messages = / { print; next }
/^SET row_security = / { print; next }

/^COPY / {
  in_copy=1;
  include_copy = ($0 ~ /^COPY "public"\./);
  if (include_copy) print;
  next;
}

in_copy {
  if (include_copy) print;
  if ($0 == "\\.") {
    in_copy=0;
    include_copy=0;
  }
  next;
}

/^SELECT pg_catalog\.setval\(/ {
  if ($0 ~ /"public"\./) print;
  next;
}

/^RESET ALL;$/ { print; next }
' migration_data/data.sql > migration_data/data_public_safe.sql

grep -nE '^COPY "public"\.' migration_data/data_public_safe.sql \
  | sed -E 's/.*COPY "public"\."([^"]+)".*/\1/' \
  | sort -u > migration_data/data_public_safe_tables.txt

echo "Generated migration_data/data_public_safe.sql"
echo "Generated migration_data/data_public_safe_tables.txt"
wc -l migration_data/data_public_safe.sql
ls -lh migration_data/data_public_safe.sql migration_data/data_public_safe_tables.txt
