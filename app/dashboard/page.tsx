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
    <div className="relative">
      {/* Decorative floating elements */}
      <div className="absolute top-0 right-0 w-32 h-32 text-6xl animate-float opacity-20 pointer-events-none">
        🎁
      </div>
      <div className="absolute top-20 left-10 w-24 h-24 text-5xl animate-float opacity-10 pointer-events-none" style={{ animationDelay: '1s' }}>
        🎉
      </div>
      <div className="absolute bottom-0 right-20 w-28 h-28 text-5xl animate-float opacity-15 pointer-events-none" style={{ animationDelay: '2s' }}>
        🎈
      </div>

      {/* Hero section */}
      <div className="relative mb-12 overflow-hidden rounded-3xl glass p-8 shadow-xl">
        <div className="relative z-10">
          <h1 className="text-5xl font-bold gradient-text mb-3">
            Welcome back, {profile?.name}! 🎊
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            Manage your family's gift planning and expenses with style
          </p>
        </div>
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-30 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-yellow-200 to-teal-200 rounded-full blur-3xl opacity-30 -ml-20 -mb-20"></div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Link
          href="/dashboard/expenses"
          className="group relative overflow-hidden rounded-2xl glass p-8 card-hover"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Expenses</h3>
              <span className="text-4xl animate-sparkle">💳</span>
            </div>
            <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              {expensesCount}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {isAdmin ? 'Total expenses' : 'Expenses you\'re involved in'}
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/gifts"
          className="group relative overflow-hidden rounded-2xl glass p-8 card-hover"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Pending Gifts</h3>
              <span className="text-4xl animate-sparkle" style={{ animationDelay: '0.5s' }}>🎁</span>
            </div>
            <p className="text-5xl font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
              {pendingGiftsCount}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {isAdmin ? 'All pending gifts' : 'Your pending gifts'}
            </p>
          </div>
        </Link>

        <div className="group relative overflow-hidden rounded-2xl glass p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
              <span className="text-4xl animate-sparkle" style={{ animationDelay: '1s' }}>⚡</span>
            </div>
            <div className="space-y-3">
              <Link
                href="/dashboard/expenses/new"
                className="flex items-center justify-center gap-2 rounded-xl btn-primary px-6 py-3 text-sm font-bold text-white shadow-lg"
              >
                <span>💸</span>
                Add Expense
              </Link>
              <Link
                href="/dashboard/gifts/new"
                className="flex items-center justify-center gap-2 rounded-xl btn-secondary px-6 py-3 text-sm font-bold text-white shadow-lg"
              >
                <span>🎀</span>
                Create Gift
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



