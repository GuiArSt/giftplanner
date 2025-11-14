import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GiftForm from '@/components/gifts/GiftForm'
import { notFound } from 'next/navigation'

export default async function EditGiftPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get gift data
  const { data: gift } = await supabase
    .from('gifts')
    .select(`
      *,
      contributors:gift_contributors(user_id)
    `)
    .eq('id', params.id)
    .single()

  if (!gift) {
    notFound()
  }

  // Get all users
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  const initialData = {
    recipient_id: gift.recipient_id,
    description: gift.description || '',
    status: gift.status,
    organizer_id: gift.organizer_id,
    contributors: gift.contributors.map((c: any) => c.user_id),
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Edit Gift</h1>
      <div className="max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <GiftForm
          users={users || []}
          currentUserId={user.id}
          giftId={params.id}
          initialData={initialData}
        />
      </div>
    </div>
  )
}



