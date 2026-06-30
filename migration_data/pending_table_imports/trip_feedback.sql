SET session_replication_role = replica;
SET row_security = off;
COPY "public"."trip_feedback" ("id", "trip_id", "user_id", "rating", "feedback", "highlights", "improvements", "would_recommend", "created_at", "updated_at") FROM stdin;
3e583087-b96f-42f4-8c85-d371e5f875c8	c5a8ee45-1bff-4378-bc56-52eb819eb0df	d71d3978-1a6b-483e-a453-30952df2dfcd	5		{}	{}	t	2025-09-11 15:32:50.845339+00	2025-09-11 15:32:46.646+00
633e7024-72e1-4804-9f91-8a00976225d9	e4a68065-8b7f-4549-aa53-1b5f20ac3d7f	888578f3-5d1e-442f-b82f-16df7de70965	5	Fantastic line up	{"Kunto Aji"}	{}	t	2025-10-12 23:49:20.593931+00	2025-10-12 23:49:20.49+00
637cb848-eb47-4bfb-95fe-1be390259f19	bdc854f1-c7e7-41e5-803e-296350e696ff	d71d3978-1a6b-483e-a453-30952df2dfcd	5		{}	{}	t	2025-11-19 13:10:58.380427+00	2025-11-19 13:10:58.327+00
\.
RESET ALL;
