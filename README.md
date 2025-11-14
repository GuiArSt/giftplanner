# Gift Planner

A privacy-aware gift planning and expense tracking app for families. Organize group gifts, track expenses with privacy (recipients can't see their gift prices), and manage gift status all in one place.

## Features

- **Privacy-Aware Expense Tracking**: Track group gift expenses where recipients can't see the prices of gifts made to them
- **Automatic Balance Calculation**: Automatically calculates who owes what to whom
- **Gift Status Management**: Track gifts as pending, in progress, or done
- **Role-Based Access**: Member and admin roles with appropriate permissions
- **Real-time Updates**: Live updates when expenses or gifts change

## Tech Stack

- **Frontend**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Local Development**: Supabase CLI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`npm install -g supabase`)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Supabase locally**:
   ```bash
   npx supabase start
   ```

   This will start all Supabase services locally and output connection details. You'll need the `anon key` and `API URL` for the next step.

3. **Create environment file**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-start>
   ```

   The anon key will be displayed when you run `supabase start`.

4. **Run database migrations**:
   ```bash
   npx supabase db reset
   ```

   This will apply all migrations and set up the database schema.

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### First User Setup

1. Go to the signup page and create your first account
2. The first user will be created as a "member" by default
3. To make yourself an admin, you can either:
   - Use the Supabase Studio (http://127.0.0.1:54323) to update your role in the `users` table
   - Or modify the migration to set the first user as admin

## Project Structure

```
/app
  /(auth)          # Login and signup pages
  /dashboard       # Main application pages
    /expenses      # Expense tracking
    /gifts         # Gift management
  /admin           # Admin dashboard
/components
  /expenses        # Expense-related components
  /gifts           # Gift-related components
  /admin           # Admin components
  /layout          # Layout components (Navbar, etc.)
/lib
  /supabase        # Supabase client utilities
  /calculations    # Balance calculation logic
/supabase
  /migrations      # Database migrations
```

## Key Features Explained

### Privacy-Aware Expenses

The app implements Row Level Security (RLS) policies that ensure:
- Recipients cannot see the amount of gifts made TO them
- Recipients can still see expenses for gifts they're contributing TO
- All contributors can see the full expense details

### Balance Calculation

The balance calculation algorithm:
1. Splits each expense equally among contributors
2. Tracks net balance (amount paid - amount owed) for each user
3. Generates settlement suggestions to minimize transactions

### Gift Status Tracking

Gifts can have three statuses:
- **Pending**: Gift is planned but not started
- **In Progress**: Gift is being organized/purchased
- **Done**: Gift is complete

## Development

### Running Supabase Studio

To access the Supabase Studio (database management UI):
```bash
npx supabase studio
```

Then open http://127.0.0.1:54323 in your browser.

### Database Migrations

To create a new migration:
```bash
npx supabase migration new <migration_name>
```

To apply migrations:
```bash
npx supabase db reset
```

### Stopping Supabase

To stop the local Supabase instance:
```bash
npx supabase stop
```

## Production Deployment

When deploying to production:

1. Set up a Supabase project at https://supabase.com
2. Update your environment variables with production Supabase credentials
3. Run migrations against your production database:
   ```bash
   npx supabase db push
   ```

## License

MIT
