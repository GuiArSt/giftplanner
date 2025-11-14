/**
 * Script to make a user an admin
 * 
 * Usage: npx tsx scripts/make-admin.ts <user-email>
 * 
 * Example: npx tsx scripts/make-admin.ts user@example.com
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseKey || supabaseKey === 'your-publishable-key-here') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file')
  process.exit(1)
}

const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.log('Usage: npx tsx scripts/make-admin.ts <user-email>')
  process.exit(1)
}

async function makeAdmin() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // First, get the user by email from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Error fetching users:', authError.message)
    console.log('\n💡 Tip: You might need to use the service_role key for admin operations.')
    console.log('   Try using Supabase Studio instead (npx supabase studio)')
    process.exit(1)
  }

  const user = authUsers.users.find(u => u.email === email)

  if (!user) {
    console.error(`❌ User with email "${email}" not found`)
    console.log('\nAvailable users:')
    authUsers.users.forEach(u => console.log(`  - ${u.email}`))
    process.exit(1)
  }

  // Update the role in the users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (updateError) {
    console.error('❌ Error updating user role:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ Successfully made ${email} an admin!`)
  console.log(`   User ID: ${user.id}`)
}

makeAdmin()



