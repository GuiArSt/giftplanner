import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GiftBoard from '@/components/gifts/GiftBoard'
import Link from 'next/link'

export default async function GiftsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all gifts
  const { data: gifts } = await supabase
    .from('gifts')
    .select(`
      *,
      recipient:users!gifts_recipient_id_fkey(name),
      organizer:users!gifts_organizer_id_fkey(name),
      contributors:gift_contributors(
        user_id,
        user:users(name)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gifts</h1>
        <Link
          href="/dashboard/gifts/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create Gift
        </Link>
      </div>

      <GiftBoard initialGifts={gifts || []} />
    </div>
  )
}


