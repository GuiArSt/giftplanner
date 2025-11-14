import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseList from '@/components/expenses/ExpenseList'
import BalanceDisplay from '@/components/expenses/BalanceDisplay'
import Link from 'next/link'
import { type Expense, type Gift } from '@/lib/calculations/balances'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current user's role
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Get all users
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  // Get ALL gifts user is involved in (for balance calculation)
  const { data: allGiftsData } = await supabase
    .from('gifts')
    .select(`
      *,
      contributors:gift_contributors(
        user_id,
        allotment
      )
    `)
    .order('created_at', { ascending: false})

  // Get ALL expenses (linked to gifts)
  const { data: allExpensesData } = await supabase
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
    .order('created_at', { ascending: false })

  // Filter for display: hide expenses where user is recipient (privacy)
  const expenses = allExpensesData?.filter((exp) => exp.recipient_id !== user.id) || []

  // Prepare data for balance calculation
  const giftsForBalance: Gift[] =
    allGiftsData?.map((g) => ({
      id: g.id,
      amount: g.amount,
      contributors: g.contributors.map((c: any) => ({
        user_id: c.user_id,
        allotment: c.allotment,
      })),
    })) || []

  const expensesForBalance: Expense[] =
    allExpensesData?.map((exp) => ({
      id: exp.id,
      gift_id: exp.gift_id,
      amount: exp.amount,
      contributors: exp.contributors.map((c: any) => ({
        user_id: c.user_id,
        amount_paid: c.amount_paid,
      })),
    })) || []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <Link
          href="/dashboard/expenses/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseList initialExpenses={expenses as any} currentUserId={user.id} />
        </div>
        <div>
          <BalanceDisplay
            gifts={giftsForBalance}
            expenses={expensesForBalance}
            users={users || []}
            currentUserId={user.id}
            isAdmin={currentUser?.role === 'admin'}
          />
        </div>
      </div>
    </div>
  )
}
