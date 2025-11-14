import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ExpenseDetail from '@/components/expenses/ExpenseDetail'
import Link from 'next/link'

export default async function ExpenseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get expense data with all relationships
  const { data: expense } = await supabase
    .from('expenses')
    .select(`
      *,
      recipient:users!expenses_recipient_id_fkey(id, name),
      created_by_user:users!expenses_created_by_fkey(id, name),
      contributors:expense_contributors(
        user_id,
        amount_paid,
        user:users(id, name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!expense) {
    notFound()
  }

  // Check if user is recipient (for privacy)
  const isRecipient = expense.recipient_id === user.id

  // Recipients shouldn't see their gift expenses
  if (isRecipient) {
    return (
      <div className="max-w-4xl rounded-lg bg-yellow-50 p-8">
        <h1 className="text-2xl font-bold text-yellow-900">Access Restricted</h1>
        <p className="mt-4 text-yellow-800">
          This expense is for a gift to you! We're keeping the details a surprise. 🎁
        </p>
        <Link
          href="/dashboard/expenses"
          className="mt-6 inline-block rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
        >
          ← Back to Expenses
        </Link>
      </div>
    )
  }

  // Get all users for editing (excluding recipient for privacy)
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .neq('id', expense.recipient_id)
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/expenses"
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          ← Back to Expenses
        </Link>
      </div>
      <ExpenseDetail
        expense={expense as any}
        currentUserId={user.id}
        allUsers={users || []}
        isRecipient={isRecipient}
      />
    </div>
  )
}
