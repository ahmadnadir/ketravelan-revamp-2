SET session_replication_role = replica;
SET row_security = off;
COPY "public"."tip_settings" ("id", "user_id", "trip_id", "is_enabled", "suggested_amounts", "custom_message", "stripe_account_id", "created_at", "updated_at") FROM stdin;
\.
RESET ALL;
