import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GiftDetail from '@/components/gifts/GiftDetail'
import Link from 'next/link'

export default async function GiftDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get gift data with all relationships
  const { data: gift } = await supabase
    .from('gifts')
    .select(`
      *,
      recipient:users!gifts_recipient_id_fkey(id, name),
      organizer:users!gifts_organizer_id_fkey(id, name),
      created_by_user:users!gifts_created_by_fkey(id, name),
      contributors:gift_contributors(
        user_id,
        user:users(id, name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!gift) {
    notFound()
  }

  // Get all users for editing
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  // Get all expenses linked to this gift
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      created_by_user:users!expenses_created_by_fkey(id, name),
      contributors:expense_contributors(
        user_id,
        amount_paid,
        user:users(id, name)
      )
    `)
    .eq('gift_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/gifts"
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          ← Back to Gifts
        </Link>
      </div>
      <GiftDetail
        gift={gift as any}
        currentUserId={user.id}
        allUsers={users || []}
        expenses={expenses || []}
      />
    </div>
  )
}
