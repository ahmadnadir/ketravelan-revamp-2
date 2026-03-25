# Google Authentication Setup Guide

Google sign-in is fully implemented in your app with authenticated profile fetching. Follow these steps to complete the configuration:

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in App name: "Ketravelan"
   - Add your email as support email
   - Add your domain (optional for testing)
   - Save and continue through the remaining steps

6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Ketravelan Web Client"
   - Authorized redirect URIs: Add this exact URL:
     ```
     https://sspvqhleqlycsiniywkg.supabase.co/auth/v1/callback
     ```
   - Click **Create**

7. Copy the **Client ID** and **Client Secret** (you'll need these for Step 2)

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `sspvqhleqlycsiniywkg`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Enable the Google provider toggle
6. Paste your Google **Client ID**
7. Paste your Google **Client Secret**
8. Click **Save**

## Step 3: Configure Site URL and Redirect URLs (REQUIRED FOR PRODUCTION)

**CRITICAL:** If you skip this step, Google login will redirect to localhost:3000 instead of your website!

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set your **Site URL**:
   - For local development: `http://localhost:5173`
   - For production: `https://your-actual-domain.com`
3. Add **Redirect URLs** (one per line or comma-separated):
   - `http://localhost:5173/**` (for development)
   - `https://your-actual-domain.com/**` (for production)
   - Replace `your-actual-domain.com` with your actual deployed website URL
4. Click **Save**

**Example for production:**
- Site URL: `https://ketravelan.xyz`
- Redirect URLs: `http://localhost:5173/**, https://ketravelan.xyz/**`

## Step 4: Test Google Sign-In

1. Open your app at `/auth`
2. Click "Continue with Google"
3. You should be redirected to Google's login page
4. After signing in, you'll be redirected to `/auth/callback` for processing
5. Then redirected to the home page
6. Your profile will be automatically created in the database
7. Navigate to `/profile` to see your authenticated user data

## Troubleshooting

### Google redirects to localhost:3000 instead of my website
**This is the most common issue!**
- Go to Supabase Dashboard → **Authentication** → **URL Configuration**
- Add your production website URL to the **Redirect URLs** list
- Format: `https://your-domain.com/**` (with the `/**` wildcard)
- Click **Save** and test again
- The code already uses your actual domain dynamically - this is purely a Supabase whitelist configuration

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://sspvqhleqlycsiniywkg.supabase.co/auth/v1/callback`

### "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration
- Add your test email to the test users list if using "External" type

### "Provider not found" error
- Verify Google provider is enabled in Supabase Dashboard
- Check that Client ID and Client Secret are correctly entered

## User Role Selection

When users sign up with Google for the first time:
- They will be automatically redirected to your app
- The profile will be created with role "traveler" by default
- To allow role selection with Google OAuth, you'll need to implement a post-signup flow

Currently, role selection (traveler vs agent) only works with email/password signup.

## Profile Page Features

The Profile page now:
- Fetches authenticated user data from the backend using the JWT session
- Displays real profile information (name, avatar, bio, location, etc.)
- Shows a loading spinner while fetching data
- Displays error states if profile cannot be loaded
- Includes a functional logout button that clears the session
- Uses fallback avatar if no profile picture is set
- Conditionally displays profile fields (only shows bio if it exists, etc.)
