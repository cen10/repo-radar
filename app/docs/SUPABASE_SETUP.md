# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `repo-radar` (or your preferred name)
   - Database password: (generate a strong password)
   - Region: (choose closest to your users)
   - Click "Create Project"

## Step 2: Get Your Project Credentials

Once your project is created:

1. Go to Settings → API
2. Copy these values to your `.env.local`:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Step 3: Configure GitHub OAuth

### In GitHub:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Repo Radar
   - **Homepage URL**: http://localhost:5173 (for development)
   - **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - Get YOUR_PROJECT_REF from your Supabase project URL
     - Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### In Supabase:

1. Go to Authentication → Providers
2. Enable "GitHub" provider
3. Enter:
   - **Client ID**: (from GitHub OAuth App)
   - **Client Secret**: (from GitHub OAuth App)
   - **Redirect URL**: This is auto-filled, use this URL in your GitHub OAuth App
4. Click "Save"

## Step 4: Verify Setup

Your `.env.local` should now have:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Test Authentication (after T009-T011)

Once the auth code is implemented, you can test by:
1. Running `npm run dev`
2. Navigating to the login page
3. Clicking "Sign in with GitHub"
4. Authorizing the app
5. Being redirected back to your app

## Notes

- The anon key is safe to use in frontend code - it's designed to be public
- Row Level Security (RLS) will protect your data
- For production, update the GitHub OAuth callback URL to your production domain