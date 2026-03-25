## Firebase Push Notification System - Integration Guide

This document outlines all 13 implemented notification events and where/how to invoke them.

---

## ✅ Completed Events Summary

### **Event #1: New Group Chat Message**
- **Status:** ✅ Already implemented
- **Function:** `send-chat-push` (existing)
- **Trigger:** Chat message creation (Realtime listener or webhook)
- **Batching:** 3–5 minutes (suppresses duplicates if user in chat view)

### **Event #2: Join Request Received (Leader)**
- **Status:** ✅ Wired
- **Function:** `send-trip-join-notification`
- **Trigger:** Trip join request created via approval flow
- **Push Type:** `"trip_join_request"` | Priority: `high` | Action: `/approvals`

### **Event #3: Join Request Approved**
- **Status:** ✅ Wired
- **Function:** `send-join-status-notification`
- **Trigger:** Approval status updated to accepted
- **Push Type:** `"trip_join_approved"` | Priority: `high` | Action: `/trip/{id}`

### **Event #4: Join Request Rejected**
- **Status:** ✅ Wired
- **Function:** `send-join-status-notification`
- **Trigger:** Approval status updated to rejected
- **Push Type:** `"trip_join_rejected"` | Priority: `normal` | Action: `/explore`

### **Event #5: Expense Added (User Included)**
- **Status:** ✅ Wired
- **Function:** `send-expense-added`
- **Trigger:** Expense created with participants
- **Push Type:** `"new_expense"` | Priority: `high` | Action: `/trip/{slug}?tab=expenses`
- **Body Template:** `"{Title} - You owe {Currency} {Amount}"`

### **Event #6: Payment Marked as Paid**
- **Status:** ✅ Wired
- **Function:** `send-expense-payment-marked`
- **Trigger:** Expense participant marks payment as paid
- **Push Type:** `"expense_paid"` | Priority: `high` | Action: `/trip/{slug}?tab=expenses`
- **Body Template:** `"{ParticipantName} marked {Currency} {Amount} as paid"`

### **Event #7: Trip Starting Tomorrow**
- **Status:** ✅ Wired
- **Function:** `send-trip-reminder-email`
- **Trigger:** Scheduled reminder 24 hours before trip start
- **Push Type:** `"trip_starting_soon"` | Priority: `high` | Action: `/trip/{slug}`
- **Body Template:** `"Your trip to {destination} starts {dateStr}"`

### **Event #8: Someone Joined Your Trip**
- **Status:** ✅ Wired
- **Function:** `send-trip-participant-joined`
- **Trigger:** Trip participant confirmed/accepted
- **Push Type:** `"member_joined"` | Priority: `normal` | Action: `/trip/{slug}?tab=participants`
- **Body Template:** `"{ParticipantName} joined {TripTitle}"`

### **Event #9: Trip Details Updated**
- **Status:** ✅ Function Created
- **Function:** `send-trip-updated` (NEW)
- **Trigger:** Trip details changed (title, dates, itinerary, etc.)
- **Push Type:** `"trip_updated"` | Priority: `normal` | Action: `/trip/{slug}`
- **Recipients:** All trip participants except editor
- **Integration Point:**
  ```typescript
  // Call in trip update endpoint/function
  await admin.functions.invoke("send-trip-updated", {
    body: {
      tripId: trip.id,
      updatedFields: ["title", "start_date"], // Fields that changed
    },
  });
  ```

### **Event #10: Mentioned in Chat**
- **Status:** ✅ Function Created
- **Function:** `send-chat-mention` (NEW)
- **Trigger:** User tagged with @username in chat message
- **Push Type:** `"message_mention"` | Priority: `high` | Action: `/chat/{tripId}?messageId={id}`
- **Recipients:** All @mentioned users
- **Integration Point:**
  ```typescript
  // Call when processing chat message with mentions
  const mentionedIds = parseMessageMentions(messageContent);
  if (mentionedIds.length > 0) {
    await admin.functions.invoke("send-chat-mention", {
      body: {
        tripId: trip.id,
        messageId: message.id,
        senderId: message.sender_id,
        senderName: senderProfile.full_name,
        messageContent: message.content,
        mentionedUserIds: mentionedIds,
      },
    });
  }
  ```

### **Event #11: Expense Overdue Reminder**
- **Status:** ✅ Wired
- **Function:** `send-expense-overdue-reminder`
- **Trigger:** Scheduled reminder for overdue expenses (once per day max)
- **Push Type:** `"expense_reminder"` | Priority: `normal` | Action: `/trip/{slug}?tab=expenses`
- **Body Template:** `"You still owe {Currency} {Amount} for {Title}"`

### **Event #12: Trip Is Full**
- **Status:** ✅ Function Created
- **Function:** `send-trip-full` (NEW)
- **Trigger:** Participant count reaches max capacity
- **Push Type:** `"trip_full"` | Priority: `normal` | Action: `/trip/{slug}`
- **Recipients:** Trip creator
- **Integration Point:**
  ```typescript
  // Call after adding a participant who makes trip full
  const { count } = await admin
    .from("trip_participants")
    .select("id", { count: "exact" })
    .eq("trip_id", tripId)
    .eq("is_active", true);
    
  if ((count || 0) + 1 >= trip.max_participants) {
    await admin.functions.invoke("send-trip-full", {
      body: { tripId: trip.id },
    });
  }
  ```

### **Event #13: New Trip Matching Interest**
- **Status:** ✅ Function Created
- **Function:** `send-trip-recommendation` (NEW)
- **Trigger:** New trip created matching user interests/travel style
- **Push Type:** `"trip_recommendation"` | Priority: `low` | Action: `/explore?trip={slug}`
- **Recipients:** Users with matching interests (batched daily)
- **Integration Point:**
  ```typescript
  // Call after new trip created
  await admin.functions.invoke("send-trip-recommendation", {
    body: {
      tripId: newTrip.id,
      limit: 100, // Max users to notify
    },
  });
  ```

---

## 🔧 Integration Points

### **Client-Side (Web & Mobile)**

1. **Service Worker Registration** (`src/lib/webPush.ts`)
   - Automatically registers `/firebase-messaging-sw.js`
   - Initializes FCM listeners for foreground notifications
   - Suppresses duplicate notifications if user viewing chat

2. **Push Token Sync** (`syncPushNotifications()`)
   ```typescript
   // In app initialization or on auth change
   import { syncPushNotifications } from "@/lib/pushNotifications";
   
   await syncPushNotifications(userId, true); // Handles native + web
   ```

3. **Chat Mention Detection** (Client-side, before sending message)
   ```typescript
   //  Parse @mentions in client before posting
   const mentionedUsers = extractMentions(messageContent);
   // Post message, then notify
   await notifyMentionedUsers(mentionedUsers);
   ```

### **Server-Side (Edge Functions)**

1. **Trip Updates Trigger**
   - Hook into trip update endpoint
   - Extract changed fields and pass to `send-trip-updated`

2. **Chat Mentions Detection**
   - Parse `@username` patterns in `send-chat-push`
   - Call `send-chat-mention` for mentioned users

3. **Trip Full Check**
   - Hook into trip participant add operation
   - Count participants and call `send-trip-full` if at capacity

4. **Trip Recommendations**
   - Call from `send-trip-created-email` function
   - Or set up daily cron job to scan recent trips

---

## 📊 Database Schema

### **notifications** table
```sql
id UUID
type VARCHAR -- trip_join_request, expense_paid, etc.
title VARCHAR 255
message TEXT
action_url VARCHAR
read BOOLEAN DEFAULT false
user_id UUID (FK → auth.users.id)
created_at TIMESTAMP
metadata JSONB
```

### **user_push_tokens** table
```sql
id UUID PRIMARY KEY
user_id UUID (FK → auth.users.id)
token VARCHAR (255) NOT NULL
platform VARCHAR (50) -- 'ios', 'android', 'web'
device_name VARCHAR (255)
created_at TIMESTAMP DEFAULT now()
updated_at TIMESTAMP DEFAULT now()
```

### **profiles** table
Ensure these columns exist:
```sql
push_notifications BOOLEAN DEFAULT true
email_notifications BOOLEAN DEFAULT true
trip_reminders BOOLEAN DEFAULT true
```

---

## 🔐 Environment Variables (Required)

```bash
# Firebase Web Push
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=... # Web-specific, from Firebase Console

# Edge Functions (Supabase)
SUPABASE_SERVICE_ROLE_KEY
SERVICE_ROLE_KEY (alias)

# Resend (Email)
RESEND_API_KEY
RESEND_FROM

# Site
SITE_URL=https://ketravelan.xyz (or localhost)
```

---

## 🚀 Deployment Checklist

- [ ] Set all `VITE_FIREBASE_*` environment variables in `.env.production`
- [ ] Verify Firebase project has web push enabled in Console
- [ ] Confirm VAPID key pair generated in Firebase Console
- [ ] Deploy updated `send-trip-participant-joined` & `send-trip-reminder-email` (push calls added)
- [ ] Deploy 4 new functions: `send-trip-updated`, `send-chat-mention`, `send-trip-full`, `send-trip-recommendation`
- [ ] Test web push in browser (requires HTTPS in production)
- [ ] Test native push on iOS/Android devices
- [ ] Verify suppression logic: chat notifications don't show while in chat tab

---

## 📝 Testing

### **Dry-Run Mode**
All new functions support `dryRun: true` to preview without sending:

```bash
curl -X POST http://localhost:54321/functions/v1/send-trip-updated \
  -H "Authorization: Bearer $(supabase status | grep 'Service role key')" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"abc123","updatedFields":["title"],"dryRun":true}'
```

### **Local Testing**
```typescript
// In browser console or test file
import { syncPushNotifications } from "@/lib/pushNotifications";

// Sync tokens and register listeners
await syncPushNotifications(userId, true);

// Manually test by calling Edge function
const response = await fetch(
  `${SITE_ORIGIN}/functions/v1/send-trip-updated`,
  {
    method: "POST",
    body: JSON.stringify({
      tripId: "test-trip-id",
      updatedFields: ["title"],
      dryRun: true,
    }),
  }
);
console.log(await response.json());
```

---

## 🔄 Batching Strategy

Events with **3-minute batching** (to avoid notification spam):
- Chat messages (#1)
- Expense additions (#5)
- Mentions (#10)

Events with **daily batching**:
- Trip recommendations (#13)  grouped as daily digest

Other events send **immediately**.

---

## 📱 Platform Matrix

| Event | Native (iOS/Android) | Web Browser | Email |
|-------|---------------------|-----------|-------|
| #1 Chat Message | ✅ | ✅ | ❌ |
| #2–6 Approvals/Expenses | ✅ | ✅ | ✅ |
| #7 Trip Reminder | ✅ | ✅ | ✅ |
| #8 Member Joined | ✅ | ✅ | ✅ |
| #9 Trip Updated | ✅ | ✅ | ❌ |
| #10 Mentioned | ✅ | ✅ | ❌ |
| #11 Expense Overdue | ✅ | ✅ | ✅ |
| #12 Trip Full | ✅ | ✅ | ❌ |
| #13 Recommendation | ✅ | ✅ | ❌ |

---

## 🐛 Troubleshooting

### **Web Push Not Showing**
1. Confirm service worker registered: Open DevTools → Application → Service Workers
2. Check Firebase config posted to service worker: `window.__firebaseConfig`
3. Verify VAPID key matches Firebase Console
4. Ensure HTTPS in production (HTTP only works on localhost)

### **Native Push Not Showing**
1. Check device token stored: `LocalStorage → CapacitorPush_TOKEN`
2. Verify app has notification permissions granted
3. Check `user_push_tokens` table for platform-specific entries

### **Tokens Not Syncing to DB**
1. Verify `push_notifications` is true in user profile
2. Check Supabase logs for upsert errors: `user_push_tokens`
3. Ensure SERVICE_ROLE_KEY is valid and has write access

---

## 📚 References

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/v5/plugins/push-notifications)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Supabase Realtime + Triggers](https://supabase.com/docs/guides/realtime)

---

**Last Updated:** February 17, 2026  
**Status:** 13/13 events implemented ✅
