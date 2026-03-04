# Push Notifications Troubleshooting Guide

This guide explains how push tokens are stored, how native/web registration works, and how to debug when `user_push_tokens` is not updating (especially on iOS).

---

## 1. Architecture Overview

- **Client token sync:**
  - Implemented in `src/lib/pushNotifications.ts` via `syncPushNotifications(userId, enabled)`.
  - Uses Supabase RPCs:
    - `upsert_push_token(p_token, p_platform, p_device_id)`
    - `delete_push_token(p_token)`
- **Database table:**
  - `user_push_tokens` (created in `supabase/migrations/20260212_add_push_tokens_and_chat_push.sql`).
  - Columns: `user_id`, `token`, `platform`, `device_id`, `created_at`, `updated_at`.
- **When sync is called:**
  - From `AuthContext` after profile is loaded:
    - `syncPushNotifications(user.id, profile.push_notifications !== false)`
  - Requires: user is authenticated and profile exists.

### 1.1 Real Environment Snapshot (Dev)

These are the actual non-secret environment values currently used in this project for push notifications:

```bash
# Supabase
VITE_SUPABASE_URL=https://sspvqhleqlycsiniywkg.supabase.co

# Firebase Web Push (Dev)
VITE_FIREBASE_API_KEY=AIzaSyC2SRVs9p_cn7ZYfGzgUOCCKdz3lWV3whI
VITE_FIREBASE_AUTH_DOMAIN=devketravelanapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=devketravelanapp
VITE_FIREBASE_STORAGE_BUCKET=devketravelanapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=597159324842
VITE_FIREBASE_APP_ID=1:597159324842:web:e277e71ba16f05b78af4d3
VITE_FIREBASE_VAPID_KEY=BCWJZyvnwcrMbBX5nL7DwXKM2ACfTcQk3ie8_tbZjTEbosnLrYrHktPB-BhB8AkKC1wLXQnavM4X7S35QniAWAQ

# Chat attachments storage
VITE_CHAT_ATTACHMENTS_BUCKET=chat-attachments
VITE_CHAT_ATTACHMENTS_FOLDER=uploads

# Site origin (set in hosting platform env, not .env file)
SITE_URL=https://ketravelan.xyz   # Production URL used by edge functions
```

Notes:
- Keep **service role** keys (`SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`) only in server-side/edge function config, never in the frontend `.env`.
- For staging/production, duplicate this block with environment-specific values (e.g. different Firebase project ID or Supabase URL) and label the section clearly.

---

## 2. Native (iOS / Android) Flow

1. **Platform detection**
   - Uses `Capacitor.isNativePlatform()` in `pushNotifications.ts`.
   - If native → use Capacitor `PushNotifications` plugin.

2. **Enabling notifications**
   - `syncPushNotifications(userId, true)` path:
     - Sets `activeUserId` (used by RPCs).
     - Reads any stored token from `localStorage` (`ketravelan-push-token`) and calls `upsertToken(existingToken)` to ensure DB is in sync.
     - Checks permission via `PushNotifications.checkPermissions()`; if not granted, calls `PushNotifications.requestPermissions()`.
     - Calls `PushNotifications.register()`.

3. **Registration listener**
   - `PushNotifications.addListener("registration", ...)`:
     - Saves token to `localStorage` under `ketravelan-push-token`.
     - Calls `upsertToken(token.value)`:
       - Calls Supabase RPC `upsert_push_token` with:
         - `p_token = token.value`
         - `p_platform = Capacitor.getPlatform()` (e.g. `"ios"`)
         - `p_device_id = Device.getId().identifier` if available.

4. **Disabling notifications**
   - `syncPushNotifications(userId, false)` path:
     - Calls `delete_push_token` for the stored token.
     - Removes token from `localStorage`.
     - Calls `PushNotifications.unregister()`.

---

## 3. Web Push Flow (PWA / Browser)

1. **Platform detection**
   - If **not** native → web path.

2. **Service worker & token**
   - `ensureWebServiceWorker()` registers `/firebase-messaging-sw.js`.
   - `registerWebPushListeners()` sets up foreground handlers.
   - `getWebPushToken()` retrieves the FCM web token.
   - If token exists → `upsertToken(token)` is called (same RPC as native).

3. **Disabling web push**
   - `syncPushNotifications(userId, false)` on web:
     - Calls `delete_push_token` for stored web token.
     - Calls `clearStoredWebToken()`.

---

## 4. Server-Side: RPC & Table

- Defined in `supabase/migrations/20260212_add_push_tokens_and_chat_push.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION upsert_push_token(
  p_token text,
  p_platform text,
  p_device_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_push_tokens (user_id, token, platform, device_id)
  VALUES (auth.uid(), p_token, p_platform, p_device_id)
  ON CONFLICT (token)
  DO UPDATE SET
    user_id = auth.uid(),
    platform = EXCLUDED.platform,
    device_id = EXCLUDED.device_id,
    updated_at = now();
END;
$$;
```

- Notes:
  - `auth.uid()` must be non-null → user must be logged in.
  - Token is unique; updating the same device for a different user simply moves the row to the new `user_id`.

---

## 5. Common iOS Issues & Fixes

### 5.1. No row in `user_push_tokens`

Checklist:

1. **User authentication**
   - Confirm the user is logged in on the device.
   - In Supabase SQL editor:
     ```sql
     select auth.uid();
     ```
     should return the user id for authenticated calls.

2. **Profile loaded & push enabled**
   - `profile.push_notifications !== false` is required.
   - In Supabase `profiles` table, ensure `push_notifications` is `true` or `NULL` for that user.

3. **iOS notification permission**
   - On the device: Settings → your app → Notifications ON.
   - If user previously denied, `requestPermissions()` will not show again until they change system setting.

4. **Console logs** (debug build)
   - Connect Safari Web Inspector to the app.
   - Look for:
     - `Push registration error`
     - `Failed to upsert push token`
     - `Failed to upsert existing push token`
   - Any of these indicate registration or RPC issues.

5. **RPC direct test**
   - In Supabase SQL editor, run as the authenticated user (via REST or client):
     ```sql
     select upsert_push_token('TEST_TOKEN', 'ios', null);
     ```
   - Then:
     ```sql
     select * from user_push_tokens where token = 'TEST_TOKEN';
     ```
   - If this fails, check RLS and function grants.

### 5.2. Token exists but not used by functions

- Ensure `send-chat-push` and other notification edge functions are reading `user_push_tokens` correctly and filtering by `user_id`.
- If you rotated Firebase keys, confirm the server side is using the same project as the client.

---

## 6. How to Manually Reset Tokens

If push stops working for a user on one device:

1. **Delete existing token row**
   ```sql
   delete from user_push_tokens where user_id = '<USER_ID>';
   ```

2. **Clear app token cache**
   - Ask the user to sign out and sign back in.
   - Or manually call `clearPushToken()` in the app.

3. **Re-enable notifications**
   - Ensure `profile.push_notifications` is `true`.
   - Open the app so `syncPushNotifications` runs; it will:
     - Re-register for push.
     - Upsert the new token.

---

## 7. Quick Debug Flow (iOS)

1. Confirm the user is logged in.
2. Confirm `profiles.push_notifications` is not `false`.
3. Delete the user’s rows from `user_push_tokens`.
4. On device:
   - Kill the app.
   - Relaunch it and keep it on the home/explore screen for a few seconds.
5. In Supabase, query:
   ```sql
   select * from user_push_tokens where user_id = '<USER_ID>' order by created_at desc;
   ```
6. If no row appears:
   - Check console logs for push registration / RPC errors.
   - Test `upsert_push_token` manually from the SQL editor.

If you still see nothing after these steps, the logs from step 6 will usually point to the exact problem (permissions, environment variables, or RLS).

---

## 6. Xcode / iOS Configuration Checklist

Use this as a quick reference when native iOS push is not working even though tokens look correct in the database.

### 6.1. Apple Developer Portal

- **APNs key configured**
  - In Apple Developer → *Certificates, Identifiers & Profiles* → *Keys*:
    - Create (or reuse) an APNs key with **Apple Push Notifications service (APNs)** enabled.
    - Download the `.p8` file and note:
      - Key ID (from Apple Developer)
      - Team ID (from Apple Developer)
      - Bundle ID used by the app → **dev.ketravelan.app**
- Make sure the key is linked to the **same Apple account** used for the app’s provisioning profiles.

### 6.2. Xcode Target Settings

For the main iOS app target in Xcode:

1. **Bundle Identifier**
   - `TARGETS → App → General → Bundle Identifier` must match:
     - The bundle ID registered in Apple Developer.
     - The bundle ID configured in Firebase for iOS (in the Firebase console).

2. **Signing & Capabilities**
   - Add capabilities:
     - `Push Notifications`
     - `Background Modes` → enable **Remote notifications**.
   - Ensure the correct **Team** and **Provisioning Profile** are selected and valid.

3. **Entitlements**
   - Xcode will generate an `AppName.entitlements` file when you add Push Notifications.
   - Verify that the file is included in the app target and source control.

### 6.3. Firebase / GoogleService-Info.plist

- Ensure `GoogleService-Info.plist` in the Xcode project is:
  - The latest file downloaded from Firebase for **this** iOS bundle ID.
  - Included in the main app target (check the *Target Membership* box in Xcode).
- In Firebase Console → *Project Settings → Cloud Messaging*:
  - APNs authentication key uploaded (the `.p8` from Apple Developer).
  - Team ID, Key ID, and Bundle ID all match the ones configured in Xcode.

### 6.4. Build & Device Checks

- Use a **real device** (APNs does not work on iOS simulators).
- For Debug builds:
  - Confirm the device is logged into an Apple ID and connected to the internet.
  - After installing the app, accept the system notification permission prompt.
- If you changed push/entitlement settings:
  - Clean build folder in Xcode (`Shift + Cmd + K`).
  - Delete the app from the device and reinstall.

### 6.5. Quick Sanity Test

1. Build & run the app from Xcode on a physical iPhone.
2. Approve the notification prompt.
3. In Supabase, confirm a `user_push_tokens` row appears with `platform = 'ios'`.
4. Manually call a simple test function (or reuse an existing one like `send-trip-updated` with `dryRun: false`) targeting that user.
5. If the function reports success but the device receives nothing:
   - Re-check APNs key configuration in Firebase and Apple Developer.
   - Ensure there is no mismatch between **prod vs dev** bundle identifiers or Firebase projects.