SET session_replication_role = replica;
SET row_security = off;
COPY "public"."trip_announcements" ("id", "trip_id", "user_id", "message", "emote", "is_pinned", "created_at") FROM stdin;
\.
RESET ALL;
