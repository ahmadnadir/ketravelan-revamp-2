SET session_replication_role = replica;
SET row_security = off;
COPY "public"."review_reports" ("id", "review_id", "reporter_id", "reason", "description", "status", "reviewed_by", "reviewed_at", "created_at") FROM stdin;
\.
RESET ALL;
