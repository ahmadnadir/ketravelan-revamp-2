SET session_replication_role = replica;
SET row_security = off;
COPY "public"."reviews" ("id", "trip_id", "reviewer_id", "agent_id", "rating", "comment", "photos", "is_verified_booking", "created_at", "updated_at") FROM stdin;
\.
RESET ALL;
