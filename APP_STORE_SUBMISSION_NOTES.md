# App Store Review Notes - Copy & Paste Ready

## For App Store Connect → App Review Information → Notes

Copy the entire text below and paste it into the review notes section when resubmitting:

---

### BEGIN COPY HERE

This submission addresses the following App Store guideline violations from the previous rejection:

**1. TRACKING TRANSPARENCY (Guideline 5.1.2(i))**

We have corrected the App Privacy information in App Store Connect to accurately reflect that tracking is NOT performed by this application. The app does not collect IDFA or other identifiers for cross-app tracking, and does not use any advertising networks or ad-related SDKs.

The app uses Firebase Analytics solely for internal app performance analysis and improvement purposes. This does not constitute "tracking" under App Store guidelines as it is not used for advertising, data brokering, or cross-app behavior profiling.

**2. USER-GENERATED CONTENT (Guideline 2.3.6)**

We have updated the app's age rating metadata to correctly indicate that the application contains user-generated content. The app includes:
- User-created trip posts and stories
- Community discussions and replies
- Comments on stories and discussions  
- User profiles and messaging
- User reviews and recommendations

**3. PARENTAL CONTROLS METADATA**

We have corrected the age rating settings to accurately reflect the application's features:
- Parental Controls: None (not applicable for this app)
- Age Assurance: None (not applicable for this app)

**4. USER-GENERATED CONTENT SAFETY CONTROLS (Guideline 1.2)**

This application provides all three required safety controls for user-generated content:

**a) Report Content Feature**
Users can report inappropriate posts, comments, discussions, or user profiles directly through a reporting interface. Users select the violation reason (spam, harassment, misinformation, inappropriate content, etc.) and can add details. Reports are submitted to our moderation team for review within 24 hours.

**b) Block User Feature**
Users can block other users from their profile pages. When a user is blocked:
- Blocked user's content is immediately hidden from view
- Further interactions between users are prevented
- Moderation team is notified of the block

**c) Terms of Use & Community Guidelines**
Before accessing any user-generated content for the first time, users must accept our Community Guidelines and Terms of Use. The acceptance screen includes detailed information about:
- Community standards (respectful behavior, no harassment)
- Content moderation processes
- User rights (report, block, delete content)
- Account suspension policies

All three controls are fully functional and demonstrable.

**Demo Video**

A screen recording is attached showing:
1. Fresh app launch
2. Terms acceptance modal
3. Navigation to user-generated content area
4. Report feature functionality  
5. Block user feature functionality
6. Confirmation of controls working properly

### END COPY

---

## Application-Specific Details

**App Name**: Ketravelan  
**Target Audience**: Global travelers age 13+  
**Primary UGC**: Trip planning, travel stories, community discussions, user reviews  
**Moderation**: Team reviews all reports within 24 hours  
**Privacy**: No advertising, no cross-app tracking, Firebase Analytics only  

---

## If Apple Asks Follow-Up Questions

### "Where is the moderation dashboard?"
Response: Internal admin panel (not visible to users). Moderators review reports and take action within 24 hours. Contact no-reply@ketravelan.xyz for details.

### "How do you handle blocked users?"
Response: Blocked users cannot see each other's content or interact. The system logs blocks for moderation purposes.

### "What happens to reports?"
Response: All reports go to our moderation team. We review within 24 hours and take appropriate action (warn user, hide content, or suspend account).

### "Can users delete their content?"
Response: Yes. Users can delete their own posts, comments, stories, and discussions anytime through the delete button on each piece of content.

---

## Version Information

- **Code Version**: Current build
- **Database**: Supabase with new `blocked_users` and terms tracking tables
- **Platform**: iOS, Android, Web
- **Build Date**: April 2026
