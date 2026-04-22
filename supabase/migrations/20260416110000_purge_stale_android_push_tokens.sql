-- Purge all Android push tokens after package name migration from
-- dev.ketravelan.app -> com.ketravelan.app.
-- FCM tokens are scoped to the Firebase app registration (package name).
-- Old tokens issued for dev.ketravelan.app will fail on the new registration.
-- Users will receive a fresh FCM token automatically on first app launch.
DELETE FROM user_push_tokens WHERE platform = 'android';
