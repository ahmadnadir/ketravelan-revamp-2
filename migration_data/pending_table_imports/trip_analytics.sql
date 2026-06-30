SET session_replication_role = replica;
SET row_security = off;
COPY "public"."trip_analytics" ("id", "trip_id", "date", "views", "unique_visitors", "join_requests", "conversions", "shares", "saves", "created_at", "updated_at") FROM stdin;
\.
RESET ALL;
