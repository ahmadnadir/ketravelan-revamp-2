# Ketravelan Email Inventory

This document lists all email-related Supabase edge functions in this repo, including purpose, recipients, subject patterns, and notable rules (such as preference checks).

## Trip and Invite Emails

### create-trip-invite
- Purpose: Send invite email to a specific user for a trip and create a notification record.
- Recipient: Invitee email (auth.users matched by email).
- Subject: "You are invited: <trip title>".
- Trigger: Called by the trip creator when inviting a user.
- Preference checks: Respects invitee profile `email_notifications`.
- Notes: Includes cover image, approvals link, and trip link.

### send-trip-created-email
- Purpose: Tell the trip creator their trip is live.
- Recipient: Trip creator.
- Subject: "Your trip "<title>" is now live!" (emoji in code).
- Trigger: First time a trip is published.
- Preference checks: Respects creator `email_notifications`.

### send-trip-reminder-email
- Purpose: Remind the trip creator that a trip start date is coming up.
- Recipient: Trip creator.
- Subject: "Get ready! Your trip to <destination> starts <date>" (emoji in code).
- Trigger: Scheduled reminders (7, 3, 1 days before start).
- Preference checks: Respects `trip_reminders` and `email_notifications`.

### send-trip-ended
- Purpose: Notify the creator that the trip ended.
- Recipient: Trip creator.
- Subject: "Trip wrapped: <title>".
- Trigger: Scheduled reminder on trip end date.
- Preference checks: Respects `trip_reminders` and `email_notifications`.

### send-trip-ended-expenses-complete
- Purpose: Notify the creator that the trip ended and expenses are settled.
- Recipient: Trip creator.
- Subject: "Trip complete: <title>".
- Trigger: Scheduled reminder on trip end date when expenses are fully settled.
- Preference checks: Respects `trip_reminders` and `email_notifications`.

### send-trip-participant-joined
- Purpose: Notify the trip creator that a participant joined.
- Recipient: Trip creator.
- Subject: "Fresh energy on your trip: <title>".
- Trigger: When a participant joins the trip.
- Preference checks: Respects creator `email_notifications`.
- Notes: Includes cover image.

### send-trip-invite-accepted
- Purpose: Notify the trip creator that an invite was accepted.
- Recipient: Trip creator.
- Subject: "Invite accepted: <title>".
- Trigger: When invitee accepts.
- Preference checks: Respects creator `email_notifications`.

### send-trip-join-notification
- Purpose: Notify the trip creator that someone requested to join.
- Recipient: Trip creator.
- Subject: "Join request for <title>".
- Trigger: When a user requests to join a trip.
- Preference checks: Respects creator `email_notifications`.
- Notes: Includes approvals link.

### send-join-status-notification
- Purpose: Notify a requester that their join request was approved or declined.
- Recipient: Requester (user who asked to join).
- Subject: "Your join request was approved" or "Your join request was declined".
- Trigger: When the organizer updates a join request.
- Preference checks: Respects requester `email_notifications`.

### send-trip-cancelled
- Purpose: Notify trip members that a trip was cancelled.
- Recipient: Trip members (excluding the creator).
- Subject: "Trip cancelled: <title>".
- Trigger: When the trip is cancelled.
- Preference checks: Respects member `email_notifications`.
- Notes: Includes cover image, optional reason.

## Expense Emails

### send-expense-added
- Purpose: Notify participants and payer about a new expense.
- Recipients:
  - Participants who owe money.
  - The payer (summary that they are owed).
- Subject:
  - "New expense added  you owe <currency> <amount>".
  - "Expense added  you are owed <currency> <amount>".
- Trigger: When an expense is created.
- Preference checks: Respects each recipient `email_notifications`.

### send-expense-updated
- Purpose: Notify all involved users that an expense changed.
- Recipients: Payer and participants.
- Subject: "Expense updated  <description>".
- Trigger: When an expense is updated.
- Preference checks: Respects each recipient `email_notifications`.

### send-expense-deleted
- Purpose: Notify all involved users that an expense was deleted.
- Recipients: Payer and participants.
- Subject: "Expense deleted  <description>".
- Trigger: When an expense is deleted.
- Preference checks: Respects each recipient `email_notifications`.

### send-expense-payment-marked
- Purpose: Notify payer and participant when a payment is marked as paid.
- Recipients:
  - Payer: "Payment marked as paid  <currency> <amount>".
  - Participant: "Payment recorded  <description>".
- Trigger: When participant marks their payment as paid.
- Preference checks: Respects each recipient `email_notifications`.

### send-expense-overdue-reminder
- Purpose: Remind participants with unpaid balances.
- Recipients: Unpaid participants (optionally filtered by member).
- Subject: "Payment reminder  action needed" or "Payment reminder  <days> days overdue".
- Trigger: Reminder flow for overdue expenses.
- Preference checks: Respects each recipient `email_notifications`.

### send-payment-reminder
- Purpose: Send payment reminder emails for a specific expense.
- Recipients: Unpaid participants for the expense (or a specific member if provided).
- Subject: "Payment Reminder: <expense> - <trip>".
- Trigger: Explicit invocation (manual or scheduled by caller).
- Preference checks: No `email_notifications` check in this function; it only checks for email presence.

### send-settlement-reminder
- Purpose: Send a payment reminder to a specific user and optionally via chat/notification too.
- Recipients: One recipient (email), optional notification and direct chat.
- Subject: "Payment reminder - <trip>".
- Trigger: Explicit invocation with `channels` array (default includes notification, chat, email).
- Preference checks: No `email_notifications` check in this function.

## Auth and Onboarding Emails

### send-signup-confirmation
- Purpose: Email verification for new accounts.
- Recipient: User email provided in the request.
- Subject: "Welcome onboard to Ketravelan" (overrideable).
- Trigger: Signup flow.
- Notes: Supports Resend template or raw HTML fallback; generates Supabase invite/confirm link.

### send-password-reset
- Purpose: Password recovery email.
- Recipient: User email provided in the request.
- Subject: "Reset your Ketravelan password" (overrideable).
- Trigger: Password reset flow.
- Notes: Uses Supabase recovery link and Resend template if configured.

### send-welcome-email
- Purpose: Welcome email after onboarding.
- Recipient: User email provided in the request.
- Subject: "Thank you for onboarding with Ketravelan".
- Trigger: Post-onboarding flow.

## Generic Notification Email

### send-notification-email
- Purpose: Simple notification email with title and message.
- Recipient: Email passed in the request.
- Subject: Uses `notificationTitle` from the request.
- Trigger: Generic notification flow.
- Notes: Uses a basic HTML template with optional action URL. Does not check email preferences.

### send-notification-email-v2
- Purpose: Folder exists but no handler file is present.
- Recipient: None (no implementation found).
- Subject: None (no implementation found).

## Scheduler Integration

### send-scheduled-reminders
- Purpose: Daily job that sends scheduled reminders for trips.
- Emails triggered:
  - send-trip-reminder-email for start-date reminders.
  - send-trip-ended or send-trip-ended-expenses-complete for end-date reminders.
- Notes: End-date routing depends on whether all expenses are settled.
