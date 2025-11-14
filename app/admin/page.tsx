import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UserManagement from '@/components/admin/UserManagement'

export default async function AdminPage() {
  const supabase = await createClient()

  // Get stats
  const { count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: expensesCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })

  const { count: giftsCount } = await supabase
    .from('gifts')
    .select('*', { count: 'exact', head: true })

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">Manage users and view system statistics</p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{usersCount || 0}</p>
          <p className="mt-1 text-sm text-gray-500">Total users</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{expensesCount || 0}</p>
          <p className="mt-1 text-sm text-gray-500">Total expenses</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Gifts</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{giftsCount || 0}</p>
          <p className="mt-1 text-sm text-gray-500">Total gifts</p>
        </div>
      </div>

      <div className="mt-8">
        <UserManagement />
      </div>
    </div>
  )
}


