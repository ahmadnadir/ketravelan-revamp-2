SET session_replication_role = replica;
SET row_security = off;
COPY "public"."profile_views" ("id", "profile_id", "viewer_id", "viewed_at", "ip_address", "user_agent") FROM stdin;
\.
RESET ALL;
