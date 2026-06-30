SET session_replication_role = replica;
SET row_security = off;
COPY "public"."user_follows" ("id", "follower_id", "following_id", "created_at") FROM stdin;
\.
RESET ALL;
