# Deployment Guide for Vercel

This guide will help you deploy your Gift Planner app to Vercel. Since you're only sharing with family (max 10 users), the free tiers of both Vercel and Supabase are perfect!

## Prerequisites

1. **Vercel account** (free): https://vercel.com/signup
2. **Supabase account** (free): https://supabase.com/dashboard

## Step 1: Set Up Production Supabase

1. Go to https://supabase.com/dashboard and create a new project
2. Choose a name (e.g., "gift-planner")
3. Set a database password (save it!)
4. Choose a region close to you
5. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Run Database Migrations on Production

1. **Link your local project to production Supabase:**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (You can find your project ref in the Supabase dashboard URL or Settings → General)

2. **Push your migrations to production:**
   ```bash
   npx supabase db push
   ```

   This will apply all your database schema and RLS policies to production.

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. Push your code to GitHub (if not already):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. Go to https://vercel.com/new
3. Import your GitHub repository
4. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon/public key
5. Click "Deploy"

### Option B: Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. Redeploy:
   ```bash
   vercel --prod
   ```

## Step 5: Make Yourself Admin in Production

After deployment, you'll need to make your account admin in the production database:

1. Sign up in your deployed app
2. Go to your Supabase dashboard → **SQL Editor**
3. Run:
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

## Step 6: Invite Family Members

1. Share your Vercel deployment URL with family
2. They can sign up themselves
3. As admin, you can manage their roles in the Admin dashboard

## Free Tier Limits (More Than Enough for 10 Users)

- **Vercel**: 
  - 100GB bandwidth/month
  - Unlimited requests
  - Perfect for family use!

- **Supabase**:
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users
  - More than enough for 10 family members!

## Troubleshooting

### Database connection issues
- Make sure environment variables are set correctly in Vercel
- Check that migrations ran successfully (`npx supabase db push`)

### RLS policies not working
- Verify migrations were applied: Check Supabase dashboard → Database → Migrations

### Can't access admin
- Make sure you updated your role in production database (Step 5)

## Updating After Deployment

When you make changes:

1. Push to GitHub
2. Vercel will automatically redeploy
3. If you change database schema, run `npx supabase db push` again

---

**That's it! Your family gift planner is now live! 🎉**


