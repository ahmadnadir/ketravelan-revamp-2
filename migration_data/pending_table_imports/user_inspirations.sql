SET session_replication_role = replica;
SET row_security = off;
COPY "public"."user_inspirations" ("id", "user_id", "name", "country", "image", "description", "long_description", "rating", "popular_activities", "best_time_to_visit", "featured", "continent", "climate", "language", "currency", "time_zone", "top_attractions", "local_cuisine", "travel_tips", "photos", "is_user_generated", "status", "moderation_notes", "created_at", "updated_at", "approved_at", "approved_by") FROM stdin;
\.
RESET ALL;
