SET session_replication_role = replica;
SET row_security = off;
COPY "public"."saved_trips" ("id", "user_id", "trip_id", "created_at") FROM stdin;
c7aebbc4-fa06-4c55-9a56-c1a248b14fea	b50cadb0-d84c-472b-9413-e1b7f7ec9932	6ad4d73c-55dc-4bb1-a9c5-1b61f8b2247f	2025-09-18 18:16:17.770251+00
5d0a2364-d70e-43f9-8d4c-b2878a6149c6	3c1dd886-6662-4c1a-81db-924aa9c4d713	bdaf6b85-c21c-4912-ae17-fb4e80fb394f	2025-10-17 19:08:04.013459+00
\.
RESET ALL;
