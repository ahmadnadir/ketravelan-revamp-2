SET session_replication_role = replica;
SET row_security = off;
COPY "public"."review_helpful" ("id", "review_id", "user_id", "created_at") FROM stdin;
\.
RESET ALL;
