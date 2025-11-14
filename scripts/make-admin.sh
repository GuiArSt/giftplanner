#!/bin/bash
# Make a user admin via SQL
# Usage: ./scripts/make-admin.sh your-email@example.com

EMAIL="$1"

if [ -z "$EMAIL" ]; then
  echo "❌ Please provide an email address"
  echo "Usage: ./scripts/make-admin.sh your-email@example.com"
  exit 1
fi

npx supabase db execute "
UPDATE public.users
SET role = 'admin'
WHERE email = '$EMAIL';
"

echo "✅ Updated role for $EMAIL to admin"
