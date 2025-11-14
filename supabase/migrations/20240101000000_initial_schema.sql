-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  family_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense_contributors table
CREATE TABLE public.expense_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- Create gifts table
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  organizer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gift_contributors table
CREATE TABLE public.gift_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gift_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_recipient ON public.expenses(recipient_id);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expense_contributors_expense ON public.expense_contributors(expense_id);
CREATE INDEX idx_expense_contributors_user ON public.expense_contributors(user_id);
CREATE INDEX idx_gifts_recipient ON public.gifts(recipient_id);
CREATE INDEX idx_gifts_organizer ON public.gifts(organizer_id);
CREATE INDEX idx_gift_contributors_gift ON public.gift_contributors(gift_id);
CREATE INDEX idx_gift_contributors_user ON public.gift_contributors(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all family members"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for expenses table
-- Key privacy rule: Recipients can't see amounts of gifts TO them
-- But they can see expenses they're contributing TO
CREATE POLICY "Users can view expenses they're involved in"
  ON public.expenses FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Can see if they created it
      created_by = auth.uid() OR
      -- Can see if they're a contributor
      EXISTS (
        SELECT 1 FROM public.expense_contributors
        WHERE expense_id = expenses.id AND user_id = auth.uid()
      ) OR
      -- Can see if they're the recipient (but amount will be hidden in query)
      recipient_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for expense_contributors table
CREATE POLICY "Users can view contributors of expenses they can see"
  ON public.expense_contributors FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_contributors.expense_id AND (
        created_by = auth.uid() OR
        recipient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.expense_contributors ec2
          WHERE ec2.expense_id = expenses.id AND ec2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can add themselves as contributors"
  ON public.expense_contributors FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_contributors.expense_id
    )
  );

-- RLS Policies for gifts table
CREATE POLICY "Users can view all gifts"
  ON public.gifts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create gifts"
  ON public.gifts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update gifts they organize or created"
  ON public.gifts FOR UPDATE
  USING (
    created_by = auth.uid() OR
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for gift_contributors table
CREATE POLICY "Users can view gift contributors"
  ON public.gift_contributors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add themselves as gift contributors"
  ON public.gift_contributors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gifts_updated_at
  BEFORE UPDATE ON public.gifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



