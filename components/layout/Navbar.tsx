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
      ? 'inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
      : 'inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-pink-600 transition-all rounded-xl hover:bg-white/50'
  }

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 justify-between items-center">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 text-2xl font-black gradient-text group"
            >
              <span className="text-3xl group-hover:animate-sparkle">🎁</span>
              <span className="hidden sm:inline">Gift Planner</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                <span className="mr-2">🏠</span>
                Dashboard
              </Link>
              <Link href="/dashboard/expenses" className={linkClass('/dashboard/expenses')}>
                <span className="mr-2">💳</span>
                Expenses
              </Link>
              <Link href="/dashboard/gifts" className={linkClass('/dashboard/gifts')}>
                <span className="mr-2">🎀</span>
                Gifts
              </Link>
              {userRole === 'admin' && (
                <Link href="/admin" className={linkClass('/admin')}>
                  <span className="mr-2">⚙️</span>
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100">
              <span className="text-lg">👤</span>
              <span className="text-sm font-bold text-gray-800">{userName}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-lg transition-all hover:scale-105"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}



