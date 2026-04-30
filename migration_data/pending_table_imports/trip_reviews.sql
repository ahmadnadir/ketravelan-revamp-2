SET session_replication_role = replica;
SET row_security = off;
COPY "public"."trip_reviews" ("id", "trip_id", "user_id", "rating", "title", "comment", "pros", "cons", "photos", "is_verified_booking", "trip_date", "helpful_count", "created_at", "updated_at") FROM stdin;
\.
RESET ALL;
