SET session_replication_role = replica;
SET row_security = off;
COPY "public"."push_subscriptions" ("id", "user_id", "endpoint", "p256dh", "auth", "device_info", "created_at", "last_used_at") FROM stdin;
\.
RESET ALL;
