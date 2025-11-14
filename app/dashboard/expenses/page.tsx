import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseList from '@/components/expenses/ExpenseList'
import BalanceDisplay from '@/components/expenses/BalanceDisplay'
import Link from 'next/link'
import { type Expense } from '@/lib/calculations/balances'

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

  // Get ALL expenses with participants and payers
  const { data: allExpensesData } = await supabase
    .from('expenses')
    .select(`
      *,
      created_by_user:users!expenses_created_by_fkey(id, name),
      participants:expense_participants(
        user_id,
        share_amount,
        user:users(id, name)
      ),
      payers:expense_payers(
        user_id,
        amount_paid,
        user:users(id, name)
      )
    `)
    .order('created_at', { ascending: false })

  // Filter for display: hide expenses where user is NOT involved (privacy)
  const expenses = allExpensesData?.filter((exp) => {
    const isParticipant = exp.participants.some((p: any) => p.user_id === user.id)
    const isPayer = exp.payers.some((p: any) => p.user_id === user.id)
    const isCreator = exp.created_by === user.id
    const isAdmin = currentUser?.role === 'admin'

    return isParticipant || isPayer || isCreator || isAdmin
  }) || []

  // Prepare data for balance calculation (Tricount-style)
  const expensesForBalance: Expense[] =
    allExpensesData?.map((exp) => ({
      id: exp.id,
      amount: exp.amount,
      participants: exp.participants.map((p: any) => ({
        user_id: p.user_id,
        share_amount: p.share_amount,
      })),
      payers: exp.payers.map((p: any) => ({
        user_id: p.user_id,
        amount_paid: p.amount_paid,
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
            isAdmin={currentUser?.role === 'admin'}
          />
        </div>
      </div>
    </div>
  )
}
