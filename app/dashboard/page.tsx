import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Disable caching to prevent stale data
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Get expenses where user is involved (participant, payer, or creator)
  // Admins see all expenses
  const { data: userExpenses } = await supabase
    .from('expenses')
    .select(`
      id,
      created_by,
      participants:expense_participants(user_id),
      payers:expense_payers(user_id)
    `)

  // Filter expenses: admins see all, regular users see only their own
  const expensesCount = isAdmin
    ? (userExpenses?.length || 0)
    : (userExpenses?.filter(exp => {
        const isParticipant = exp.participants?.some((p: any) => p.user_id === user.id)
        const isPayer = exp.payers?.some((p: any) => p.user_id === user.id)
        const isCreator = exp.created_by === user.id
        return isParticipant || isPayer || isCreator
      }).length || 0)

  // Get gifts where user is involved (creator, organizer, or contributor)
  // Admins see all gifts
  const { data: userGifts } = await supabase
    .from('gifts')
    .select(`
      id,
      status,
      created_by,
      organizer_id,
      contributors:gift_contributors(user_id)
    `)
    .in('status', ['pending', 'in_progress'])

  // Filter gifts: admins see all, regular users see only their own
  const pendingGiftsCount = isAdmin
    ? (userGifts?.length || 0)
    : (userGifts?.filter(gift => {
        const isContributor = gift.contributors?.some((c: any) => c.user_id === user.id)
        const isCreator = gift.created_by === user.id
        const isOrganizer = gift.organizer_id === user.id
        return isContributor || isCreator || isOrganizer
      }).length || 0)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        Welcome back, {profile?.name}!
      </h1>
      <p className="mt-2 text-gray-600">
        Manage your family's gift planning and expenses
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/expenses"
          className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{expensesCount}</p>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Total expenses' : 'Expenses you're involved in'}
          </p>
        </Link>

        <Link
          href="/dashboard/gifts"
          className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-900">Pending Gifts</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{pendingGiftsCount}</p>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'All pending gifts' : 'Your pending gifts'}
          </p>
        </Link>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="mt-4 space-y-2">
            <Link
              href="/dashboard/expenses/new"
              className="block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Expense
            </Link>
            <Link
              href="/dashboard/gifts/new"
              className="block rounded-md bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-700"
            >
              Create Gift
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}



