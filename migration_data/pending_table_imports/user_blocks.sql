SET session_replication_role = replica;
SET row_security = off;
COPY "public"."user_blocks" ("id", "blocker_id", "blocked_id", "reason", "created_at") FROM stdin;
\.
RESET ALL;
