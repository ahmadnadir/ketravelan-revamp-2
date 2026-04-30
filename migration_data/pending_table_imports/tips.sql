SET session_replication_role = replica;
SET row_security = off;
COPY "public"."tips" ("id", "trip_id", "from_user_id", "to_user_id", "amount", "currency", "message", "payment_intent_id", "payment_status", "created_at", "completed_at") FROM stdin;
\.
RESET ALL;
