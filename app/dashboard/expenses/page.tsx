import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseList from '@/components/expenses/ExpenseList'
import BalanceDisplay from '@/components/expenses/BalanceDisplay'
import Link from 'next/link'
import { calculateBalances, type Expense } from '@/lib/calculations/balances'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all users
  const { data: users } = await supabase.from('users').select('id, name').order('name')

  // Get expenses with privacy filtering
  // Completely hide expenses where user is the recipient (privacy)
  const { data: expensesData } = await supabase
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
    .neq('recipient_id', user.id) // Hide gifts TO the current user
    .order('created_at', { ascending: false })

  const expenses = expensesData || []

  // Prepare expenses for balance calculation
  const expensesForBalance: Expense[] =
    expensesData?.map((exp) => ({
      id: exp.id,
      recipient_id: exp.recipient_id,
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
            expenses={expensesForBalance}
            users={users || []}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}



