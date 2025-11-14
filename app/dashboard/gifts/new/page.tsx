import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GiftForm from '@/components/gifts/GiftForm'

export default async function NewGiftPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all users
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Create Gift</h1>
      <div className="max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <GiftForm users={users || []} currentUserId={user.id} />
      </div>
    </div>
  )
}


