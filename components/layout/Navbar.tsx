'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavbarProps {
  userName?: string
  userRole?: string
}

export default function Navbar({ userName, userRole }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(path)
  }

  const linkClass = (path: string) => {
    return isActive(path)
      ? 'inline-flex items-center border-b-2 border-blue-500 px-1 pt-1 text-sm font-medium text-gray-900'
      : 'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700'
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Gift Planner
              </Link>
            </div>
            <div className="ml-6 flex space-x-8">
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                Dashboard
              </Link>
              <Link href="/dashboard/expenses" className={linkClass('/dashboard/expenses')}>
                Expenses
              </Link>
              <Link href="/dashboard/gifts" className={linkClass('/dashboard/gifts')}>
                Gifts
              </Link>
              {userRole === 'admin' && (
                <Link href="/admin" className={linkClass('/admin')}>
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <span className="mr-4 text-sm text-gray-700">{userName}</span>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}



