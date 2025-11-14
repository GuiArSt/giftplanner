import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Get recent expenses count
  const { count: expensesCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })

  // Get pending gifts count
  const { count: pendingGiftsCount } = await supabase
    .from('gifts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'in_progress'])

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
          <p className="mt-2 text-3xl font-bold text-blue-600">{expensesCount || 0}</p>
          <p className="mt-1 text-sm text-gray-500">Total expenses tracked</p>
        </Link>

        <Link
          href="/dashboard/gifts"
          className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-900">Pending Gifts</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{pendingGiftsCount || 0}</p>
          <p className="mt-1 text-sm text-gray-500">Gifts in progress</p>
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



