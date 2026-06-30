-- Safe Option 3 execution wrapper
-- Purpose: backfill missing auth.users/auth.identities for existing profiles
-- while bypassing profile auto-create trigger that conflicts with existing profiles.

BEGIN;
SET LOCAL statement_timeout = 0;
SET LOCAL lock_timeout = 0;
SET LOCAL session_replication_role = replica;

\i migration_data/option3_recreate_auth_users_body.sql

COMMIT;
