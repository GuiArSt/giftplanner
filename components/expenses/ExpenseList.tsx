'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Expense {
  id: string
  amount: number
  description: string
  created_at: string
  created_by_user: { name: string }
  participants: Array<{ user_id: string; share_amount: number | null; user: { name: string } }>
  payers: Array<{ user_id: string; amount_paid: number; user: { name: string } }>
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
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data } = await supabase
      .from('expenses')
      .select(`
        *,
        created_by_user:users!expenses_created_by_fkey(name),
        participants:expense_participants(
          user_id,
          share_amount,
          user:users(name)
        ),
        payers:expense_payers(
          user_id,
          amount_paid,
          user:users(name)
        )
      `)
      .order('created_at', { ascending: false })

    if (data) {
      // Filter to only expenses user is involved in
      const filtered = data.filter((exp: any) => {
        const isParticipant = exp.participants.some((p: any) => p.user_id === userData.user!.id)
        const isPayer = exp.payers.some((p: any) => p.user_id === userData.user!.id)
        const isCreator = exp.created_by === userData.user!.id
        return isParticipant || isPayer || isCreator
      })
      setExpenses(filtered as Expense[])
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
        expenses.map((expense) => {
          // Calculate total for equal split participants
          const customShares = expense.participants
            .filter(p => p.share_amount !== null)
            .reduce((sum, p) => sum + (p.share_amount || 0), 0)
          const equalSplitCount = expense.participants.filter(p => p.share_amount === null).length
          const equalSplitAmount = equalSplitCount > 0
            ? (expense.amount - customShares) / equalSplitCount
            : 0

          return (
            <Link
              key={expense.id}
              href={`/dashboard/expenses/${expense.id}`}
              className="block rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Created by {expense.created_by_user.name} •{' '}
                    {new Date(expense.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">€{expense.amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Participants:</p>
                  <div className="mt-2 space-y-1">
                    {expense.participants.map((participant) => (
                      <div key={participant.user_id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{participant.user.name}</span>
                        <span className="font-medium text-gray-900">
                          €{(participant.share_amount !== null ? participant.share_amount : equalSplitAmount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Paid by:</p>
                  <div className="mt-2 space-y-1">
                    {expense.payers.map((payer) => (
                      <div key={payer.user_id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{payer.user.name}</span>
                        <span className="font-medium text-gray-900">
                          €{payer.amount_paid.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}
