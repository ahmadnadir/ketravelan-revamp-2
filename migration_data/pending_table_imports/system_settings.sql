SET session_replication_role = replica;
SET row_security = off;
COPY "public"."system_settings" ("id", "key", "value", "created_at", "updated_at") FROM stdin;
79d75593-7f0e-4516-9ce0-4fab235be124	platform_fee	{"minimum": 1, "currency": "USD", "percentage": 5}	2025-07-02 03:56:14.494166+00	2025-07-02 03:56:14.494166+00
dc5dd5e9-42cd-4ec2-bcb4-6524e5b2a019	agent_commission	{"default": 15, "maximum": 30, "minimum": 10}	2025-07-02 03:56:14.494166+00	2025-07-02 03:56:14.494166+00
e1fe5a13-2873-40d5-914f-4c7f175e83e4	booking_policies	{"refund_percentage": {"0_24": 0, "24_48": 50, "48_plus": 100}, "cancellation_period": 48}	2025-07-02 03:56:14.494166+00	2025-07-02 03:56:14.494166+00
721e3ea6-0dbe-41ce-811b-9da98e90b0ed	supported_currencies	["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "MYR", "THB", "IDR"]	2025-07-02 03:56:14.494166+00	2025-07-02 03:56:14.494166+00
fe977387-c7aa-4329-bda8-141a25d5e91e	supported_languages	["en", "es", "fr", "de", "ja", "zh", "ko", "ar", "hi", "pt"]	2025-07-02 03:56:14.494166+00	2025-07-02 03:56:14.494166+00
\.
RESET ALL;
