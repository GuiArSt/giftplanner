'use client'

import { calculateBalances, type Expense } from '@/lib/calculations/balances'

interface BalanceDisplayProps {
  expenses: Expense[]
  users: Array<{ id: string; name: string }>
  currentUserId: string
  isAdmin?: boolean
}

export default function BalanceDisplay({ expenses, users, currentUserId, isAdmin = false }: BalanceDisplayProps) {
  const balances = calculateBalances(expenses)

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || 'Unknown'
  }

  const userBalances = balances.filter(
    (b) => b.from_user_id === currentUserId || b.to_user_id === currentUserId
  )

  if (balances.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Balances</h2>
        <p className="mt-2 text-sm text-gray-500">No outstanding balances</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Your Balances</h2>
      <div className="mt-4 space-y-3">
        {userBalances.length === 0 ? (
          <p className="text-sm text-gray-500">You're all settled up!</p>
        ) : (
          userBalances.map((balance, index) => {
            if (balance.from_user_id === currentUserId) {
              return (
                <div key={index} className="flex items-center justify-between rounded-md bg-red-50 p-3">
                  <span className="text-sm text-gray-700">
                    You owe <span className="font-medium">{getUserName(balance.to_user_id)}</span>
                  </span>
                  <span className="font-semibold text-red-600">€{balance.amount.toFixed(2)}</span>
                </div>
              )
            } else {
              return (
                <div key={index} className="flex items-center justify-between rounded-md bg-green-50 p-3">
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">{getUserName(balance.from_user_id)}</span> owes you
                  </span>
                  <span className="font-semibold text-green-600">€{balance.amount.toFixed(2)}</span>
                </div>
              )
            }
          })
        )}
      </div>

      {isAdmin && balances.length > userBalances.length && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700">All Family Balances (Admin View)</h3>
          <div className="mt-2 space-y-2">
            {balances.map((balance, index) => (
              <div key={index} className="flex justify-between text-sm text-gray-600">
                <span>
                  {getUserName(balance.from_user_id)} → {getUserName(balance.to_user_id)}
                </span>
                <span className="font-medium">€{balance.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



