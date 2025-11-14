'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Expense {
  id: string
  recipient_id: string
  amount: number
  description: string
  created_at: string
  recipient: { name: string }
  created_by_user: { name: string }
  contributors: Array<{ user_id: string; amount_paid: number; user: { name: string } }>
}

interface ExpenseListProps {
  initialExpenses: Expense[]
  currentUserId: string
}

export default function ExpenseList({ initialExpenses, currentUserId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        () => {
          // Refresh expenses
          fetchExpenses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select(`
        *,
        recipient:users!expenses_recipient_id_fkey(name),
        created_by_user:users!expenses_created_by_fkey(name),
        contributors:expense_contributors(
          user_id,
          amount_paid,
          user:users(name)
        )
      `)
      .neq('recipient_id', currentUserId) // Hide gifts TO current user (privacy)
      .order('created_at', { ascending: false })

    if (data) {
      setExpenses(data as Expense[])
    }
  }

  return (
    <div className="space-y-4">
      {expenses.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No expenses yet. Create your first expense!</p>
          <Link
            href="/dashboard/expenses/new"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Add Expense
          </Link>
        </div>
      ) : (
        expenses.map((expense) => (
          <Link
            key={expense.id}
            href={`/dashboard/expenses/${expense.id}`}
            className="block rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Gift for <span className="font-medium">{expense.recipient.name}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Created by {expense.created_by_user.name} •{' '}
                  {new Date(expense.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">€{expense.amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-medium text-gray-700">Contributors:</p>
              <div className="mt-2 space-y-1">
                {expense.contributors.map((contributor) => (
                  <div key={contributor.user_id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{contributor.user.name}</span>
                    <span className="font-medium text-gray-900">
                      €{contributor.amount_paid.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}



