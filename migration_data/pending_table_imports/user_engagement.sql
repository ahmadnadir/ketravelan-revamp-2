SET session_replication_role = replica;
SET row_security = off;
COPY "public"."user_engagement" ("id", "user_id", "date", "login_count", "trips_viewed", "messages_sent", "trips_created", "trips_joined", "total_session_duration", "created_at") FROM stdin;
\.
RESET ALL;
