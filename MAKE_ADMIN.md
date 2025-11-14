# How to Make a User Admin

## Method 1: Via Browser (Easiest)

1. **Open Supabase Studio in your browser:**
   - Go to: http://127.0.0.1:54323
   - This is the Studio URL shown when you run `npx supabase start`

2. **In Supabase Studio:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"
   - Paste this SQL (replace with your email):
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```
   - Click "Run" (or press Cmd+Enter)
   - You should see "Success"

3. **Verify:**
   - Go to "Table Editor" → `users` table
   - Find your user and check that `role` = `admin`

## Method 2: Via Command Line

Run this command (replace the email):

```bash
npx supabase db execute "UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';"
```

## Method 3: Direct Database Connection

If you have `psql` installed:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';"
```

---

**After updating, refresh your app and you should see the "Admin" link in the navbar!**


