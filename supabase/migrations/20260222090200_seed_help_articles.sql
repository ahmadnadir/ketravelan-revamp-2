-- Seed help articles with initial content
INSERT INTO help_articles (slug, category, title, content_html, excerpt, search_keywords) VALUES

-- Getting Started
('getting-started', 'Getting Started', 'How to Get Started with Ketravelan', 
'<p>Welcome to Ketravelan! Here''s how to get started:</p>
<p></p>
<h3>Create Your Account</h3>
<p>Sign up with your email or Google account. You''ll need to set a unique username during onboarding.</p>
<p></p>
<h3>Explore Trips</h3>
<p>Browse public trips in the Explore page. Filter by destination, dates, and travel styles to find trips that match your interests.</p>
<p></p>
<h3>Create a Trip</h3>
<p>Click "Create Trip" to start planning. You can make it public (anyone can join) or private (invitation only).</p>
<p></p>
<h3>Join a Trip</h3>
<p>Request to join public trips or accept invitations to private trips. Once approved, you''re part of the group!</p>',
'Learn how to set up your account, explore trips, and start your travel journey.',
'getting started, sign up, create account, first time'),

('create-diy-trip', 'Trips', 'Creating Your First DIY Trip', 
'<p>Creating a DIY trip is simple:</p>
<p></p>
<h3>Step 1: Choose Visibility</h3>
<p>Decide if your trip is <strong>Public</strong> (anyone can request to join) or <strong>Private</strong> (invitation only).</p>
<p></p>
<h3>Step 2: Add Trip Details</h3>
<p>Fill in destination, dates, group size, budget range, and travel styles. Add a cover photo to make it stand out!</p>
<p></p>
<h3>Step 3: Create Itinerary</h3>
<p>Choose between day-by-day planning or flexible notes. You can always update this later with your group.</p>
<p></p>
<h3>Step 4: Publish</h3>
<p>Review everything and publish. Your trip is now live!</p>',
'Step-by-step guide to creating and publishing your first DIY trip.',
'create trip, new trip, publish trip, DIY trip'),

('join-trip', 'Trips', 'How to Join a Trip', 
'<p>Joining trips on Ketravelan is easy:</p>
<p></p>
<h3>Public Trips</h3>
<p>Browse the Explore page, find a trip you like, and click "Request to Join". The trip creator will review and approve your request.</p>
<p></p>
<h3>Private Trips</h3>
<p>You need an invitation link from the trip creator. Click the link and accept the invitation to join.</p>
<p></p>
<h3>After Joining</h3>
<p>Once approved, you can access the trip hub with chat, expenses, and itinerary planning.</p>',
'Learn how to find and join trips on Ketravelan.',
'join trip, request to join, trip invitation'),

-- Expenses
('expense-tracking', 'Expenses', 'How Expense Tracking Works', 
'<p>Ketravelan automatically tracks and splits group expenses:</p>
<p></p>
<h3>Adding Expenses</h3>
<p>Any trip member can log an expense. Enter description, amount, who paid, and who participated. The system splits it automatically.</p>
<p></p>
<h3>Split Methods</h3>
<p><strong>Equal split</strong> - Divide evenly among participants</p>
<p><strong>Custom amounts</strong> - Specify exact amounts per person</p>
<p><strong>Percentages</strong> - Split by percentage</p>
<p></p>
<h3>Real-time Balances</h3>
<p>See who owes what at any time. The Expenses tab shows all transactions and current balances.</p>',
'Understand how to track and split expenses with your travel group.',
'expenses, split bill, track spending, share costs'),

('settlement', 'Expenses', 'Settling Up After the Trip', 
'<p>Settlement is simplified with Ketravelan:</p>
<p></p>
<h3>Automatic Calculation</h3>
<p>We calculate the net amounts - who owes whom and how much. No need to settle each expense individually.</p>
<p></p>
<h3>Payment Methods</h3>
<p>Upload your QR code (DuitNow, PayNow, etc.) so others can pay you easily. Scan QR codes to pay others.</p>
<p></p>
<h3>Track Payments</h3>
<p>Mark payments as complete once settled. Everyone can see the settlement progress.</p>
<p></p>
<h3>Reminders</h3>
<p>Send friendly payment reminders via push notification, chat, or email directly from the app.</p>',
'Learn how to settle expenses and complete payments after your trip.',
'settle up, pay back, settlement, QR code payment'),

('multi-currency', 'Expenses', 'Multi-Currency Expenses', 
'<p>Traveling across countries? We handle multiple currencies:</p>
<p></p>
<h3>Home Currency</h3>
<p>Set your trip''s home currency. All settlements use this currency.</p>
<p></p>
<h3>Foreign Expenses</h3>
<p>Add expenses in any currency. Enter the amount and exchange rate, and we convert it automatically.</p>
<p></p>
<h3>View Preferences</h3>
<p>Toggle between "Original Currency" (as logged) or "Home Currency" (converted) view in the expenses tab.</p>',
'How to manage expenses in multiple currencies during international trips.',
'currency, exchange rate, foreign currency, multi currency'),

-- Account
('update-profile', 'Account', 'Updating Your Profile', 
'<p>Keep your profile up to date:</p>
<p></p>
<h3>Personal Information</h3>
<p>Go to Profile → Edit Profile to update your name, bio, and profile photo.</p>
<p></p>
<h3>Username</h3>
<p>Your username is unique. Change it anytime in Edit Profile (we check availability in real-time).</p>
<p></p>
<h3>Travel Preferences</h3>
<p>Add your travel styles and countries visited to help others find you for trips.</p>
<p></p>
<h3>Cover Photo</h3>
<p>Make your profile stand out with a custom cover photo.</p>',
'Learn how to edit and personalize your Ketravelan profile.',
'profile, edit profile, username, update account'),

('notifications', 'Account', 'Managing Notifications', 
'<p>Control what notifications you receive:</p>
<p></p>
<h3>Push Notifications</h3>
<p>Get instant updates on your device when someone joins your trip, sends a message, or adds an expense.</p>
<p></p>
<h3>Email Notifications</h3>
<p>Receive email summaries for important events like trip invitations and payment reminders.</p>
<p></p>
<h3>Trip Reminders</h3>
<p>Get reminders 7, 3, and 1 day before your trip starts, plus notifications when trips end.</p>
<p></p>
<h3>Settings</h3>
<p>Toggle each notification type on/off in Settings → Notifications.</p>',
'Customize your notification preferences for push, email, and trip reminders.',
'notifications, push notifications, email, reminders, settings'),

('change-password', 'Account', 'Changing Your Password', 
'<p>Keep your account secure:</p>
<p></p>
<h3>From Settings</h3>
<p>Go to Settings → Account → Change Password.</p>
<p></p>
<h3>Requirements</h3>
<p>Enter your current password</p>
<p>New password must be at least 6 characters</p>
<p>Confirm new password must match</p>
<p></p>
<h3>Security</h3>
<p>We verify your current password before allowing changes. Choose a strong, unique password.</p>',
'How to update your account password for better security.',
'password, change password, security, account security'),

-- Privacy
('privacy-settings', 'Privacy', 'Privacy and Visibility Settings', 
'<p>Control who sees your information:</p>
<p></p>
<h3>Profile Visibility</h3>
<p>Make your profile public (visible to all) or private (only to trip members).</p>
<p></p>
<h3>Show Trips Publicly</h3>
<p>Choose whether your trips appear on your public profile.</p>
<p></p>
<h3>Data Protection</h3>
<p>We never share your personal data with third parties. Read our Privacy Policy for details.</p>',
'Understand and manage your privacy settings on Ketravelan.',
'privacy, visibility, public profile, data protection'),

-- Troubleshooting
('payment-issues', 'Troubleshooting', 'Payment and Settlement Issues', 
'<p>Having trouble with payments?</p>
<p></p>
<h3>QR Code Not Working</h3>
<p>Make sure you uploaded a valid DuitNow/PayNow QR code. The image should be clear and unedited.</p>
<p></p>
<h3>Wrong Balance</h3>
<p>Check if all expenses are logged correctly. Edit any expense to fix amounts or participants.</p>
<p></p>
<h3>Payment Not Marked</h3>
<p>Only the person receiving payment can mark it as complete. Ask them to update the status.</p>',
'Solutions to common payment and settlement problems.',
'payment issues, settlement problems, QR code, balance wrong'),

('chat-not-working', 'Troubleshooting', 'Chat and Messaging Issues', 
'<p>Fix common chat problems:</p>
<p></p>
<h3>Messages Not Sending</h3>
<p>Check your internet connection. Refresh the page or app. If it persists, try logging out and back in.</p>
<p></p>
<h3>Not Receiving Notifications</h3>
<p>Enable push notifications in Settings. Check your device notification permissions for Ketravelan.</p>
<p></p>
<h3>Can''t See Messages</h3>
<p>Make sure you''re a member of the trip. Only trip members can access the trip chat.</p>',
'Troubleshoot messaging and chat-related problems.',
'chat issues, messages not sending, notifications not working')

ON CONFLICT (slug) DO UPDATE SET
	category = EXCLUDED.category,
	title = EXCLUDED.title,
	content_html = EXCLUDED.content_html,
	excerpt = EXCLUDED.excerpt,
	search_keywords = EXCLUDED.search_keywords,
	updated_at = now();
