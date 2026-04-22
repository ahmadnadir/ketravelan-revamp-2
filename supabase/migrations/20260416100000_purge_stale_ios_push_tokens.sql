-- Purge all iOS push tokens after bundle ID migration from
-- dev.ketravelan.app -> com.ketravelan.app.
-- APNs device tokens are scoped to the original bundle ID they were
-- issued for; they will fail with DeviceTokenNotForTopic on the new ID.
-- Users will receive a fresh token automatically when they open the
-- updated app and push registration runs again.
DELETE FROM user_push_tokens WHERE platform = 'ios';
