SET session_replication_role = replica;
SET row_security = off;
COPY "public"."trip_categories" ("id", "name", "description", "icon", "created_at") FROM stdin;
d976333d-317e-47cb-9f66-885a0bacd717	Adventure	Outdoor activities and thrilling experiences	mountain	2025-07-02 03:56:14.494166+00
52f3b294-dde2-4f86-9308-594fd3573206	Cultural	Explore local traditions, history, and heritage	building	2025-07-02 03:56:14.494166+00
26b71b90-749e-40b5-84a0-89df23ccb0c7	Beach	Relaxing beach vacations and water activities	umbrella	2025-07-02 03:56:14.494166+00
f0852352-8534-4040-a9f4-a5872ebd2905	City Tour	Urban exploration and city experiences	city	2025-07-02 03:56:14.494166+00
ad3eb695-e780-4b9e-b93b-bcebff82ad22	Nature	Wildlife, hiking, and natural wonders	tree	2025-07-02 03:56:14.494166+00
ce0a666a-c20d-401b-9fa4-bb32f0318502	Food & Wine	Culinary experiences and wine tasting	utensils	2025-07-02 03:56:14.494166+00
25c49572-7e69-44c6-8901-13097f031086	Wellness	Yoga retreats, spa, and wellness experiences	spa	2025-07-02 03:56:14.494166+00
62d917a0-a6ca-4ded-aa89-5cab3e0dee49	Photography	Photography tours and workshops	camera	2025-07-02 03:56:14.494166+00
\.
RESET ALL;
