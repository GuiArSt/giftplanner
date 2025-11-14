import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseForm from '@/components/expenses/ExpenseForm'

export default async function NewExpensePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all users
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  // Get all gifts where user is a contributor (not recipient - privacy)
  const { data: giftsData } = await supabase
    .from('gifts')
    .select(`
      id,
      description,
      amount,
      recipient_id,
      recipient:users!gifts_recipient_id_fkey(id, name)
    `)
    .neq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  // Transform to match Gift interface (recipient is returned as array, take first element)
  const gifts = giftsData?.map((g: any) => ({
    ...g,
    recipient: Array.isArray(g.recipient) ? g.recipient[0] : g.recipient
  })) || []

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">New Expense</h1>
      <div className="max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <ExpenseForm users={users || []} gifts={gifts} currentUserId={user.id} />
      </div>
    </div>
  )
}



