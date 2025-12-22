# Quickstart Guide: Repo Radar

**Version**: 0.1.0
**Time to Complete**: 15 minutes

## Prerequisites

- Node.js 20+ and npm installed
- GitHub account with starred repositories
- Supabase account (free tier is sufficient)
- Git installed

## Setup Instructions

### 1. Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/repo-radar.git
cd repo-radar

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Configure Supabase (5 minutes)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to Settings → API
3. Copy your project URL and anon key to `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Run database migrations:

```bash
npm run db:migrate
```

### 3. Setup GitHub OAuth (5 minutes)

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Repo Radar Dev
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:5173/api/auth/callback

4. Copy the Client ID and Client Secret to `.env.local`:

```env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 4. Start Development Server (1 minute)

```bash
# Start the frontend
npm run dev

# In a new terminal, start serverless functions locally
npm run functions:dev
```

Visit http://localhost:5173 in your browser.

### 5. First-Time User Flow (2 minutes)

1. **Login**: Click "Sign in with GitHub" on the landing page
2. **Authorize**: Grant the app access to your public data
3. **Dashboard Loads**: See all your starred repositories
4. **View Metrics**: Repositories with recent activity show growth indicators
5. **Follow Repository**: Click the star icon to follow specific repos
6. **View Details**: Click any repository to see detailed metrics and charts

## Verification Checklist

Run through these scenarios to verify the setup:

### ✅ Authentication Flow
```
1. Sign out (user menu → Sign Out)
2. Sign in again with GitHub
3. Verify dashboard loads with your starred repos
```

### ✅ Repository Display
```
1. Confirm starred repositories appear in the list
2. Verify star counts are displayed
3. Check that repository descriptions are visible
```

### ✅ Follow/Unfollow Feature
```
1. Click the follow toggle on any repository
2. Refresh the page
3. Verify the preference persisted
4. Toggle it back
```

### ✅ Trending Detection
```
1. Look for repositories marked with a 🔥 icon
2. These have ≥100 stars AND grown ≥25% in 24 hours AND gained ≥50 stars in that period
3. Verify they appear at the top when sorting by "Trending"
```

### ✅ Detail View
```
1. Click "View Details" on any repository
2. Verify the chart loads with historical data
3. Check that releases are listed (if any)
4. Confirm issue metrics are displayed
```

### ✅ Data Refresh
```
1. Click the refresh button in the header
2. Verify the loading spinner appears
3. Check that "Last updated" timestamp changes
```

### ✅ Responsive Design
```
1. Resize browser to mobile width (<640px)
2. Verify the layout adapts properly
3. Check that all features remain accessible
```

## Testing the Application

### Run Unit Tests
```bash
npm run test
# Covers utilities, services, and key components
# Target: >80% coverage on critical paths
```

### Run Integration Tests
```bash
npm run test:integration
# Tests API endpoints and database operations
```

### Run E2E Tests
```bash
# Start the app first
npm run dev

# In another terminal
npm run test:e2e
# Tests main user flows: auth, dashboard, follow/unfollow
```

## Common Issues & Solutions

### Issue: "GitHub OAuth Error"
**Solution**: Verify your OAuth callback URL matches exactly in GitHub settings

### Issue: "Supabase Connection Failed"
**Solution**: Check your Supabase URL and anon key in `.env.local`

### Issue: "No repositories showing"
**Solution**:
1. Verify you have starred repositories on GitHub
2. Click the manual refresh button
3. Check browser console for errors

### Issue: "Charts not loading"
**Solution**: Clear browser cache and localStorage, then refresh

## Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Deploy to Netlify

```bash
# Build the application
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

## Next Steps

1. **Customize Tracking**: Adjust the follow/unfollow preferences
2. **Set Notifications**: Enable alerts for rapid growth (coming soon)
3. **Export Data**: Download your metrics as CSV (coming soon)
4. **Share Insights**: Generate reports of trending repositories (coming soon)

## Support

- **Documentation**: [/docs](./docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/repo-radar/issues)
- **Discord**: [Join our community](https://discord.gg/repor-radar)

## Quick Commands Reference

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run test          # Run tests
npm run lint          # Lint code
npm run format        # Format code
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed sample data
```

---

**Congratulations!** You've successfully set up Repo Radar. Start tracking your GitHub repository momentum and never miss a trending project again! 🚀