'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
}

interface Expense {
  id: string
  recipient_id: string
  amount: number
  description: string
  created_by: string
  created_at: string
  updated_at: string
  recipient: User
  created_by_user: User
  contributors: Array<{
    user_id: string
    amount_paid: number
    user: User
  }>
}

interface ExpenseDetailProps {
  expense: Expense
  currentUserId: string
  allUsers: User[]
  isRecipient: boolean
}

export default function ExpenseDetail({
  expense,
  currentUserId,
  allUsers,
  isRecipient,
}: ExpenseDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount.toString())
  const [contributorAmounts, setContributorAmounts] = useState<Record<string, string>>(
    expense.contributors.reduce(
      (acc, c) => ({ ...acc, [c.user_id]: c.amount_paid.toString() }),
      {}
    )
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const canEdit = currentUserId === expense.created_by

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        alert('Please enter a valid amount')
        return
      }

      // Update expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description,
          amount: amountNum,
        })
        .eq('id', expense.id)

      if (expenseError) throw expenseError

      // Delete old contributors
      const { error: deleteError } = await supabase
        .from('expense_contributors')
        .delete()
        .eq('expense_id', expense.id)

      if (deleteError) throw deleteError

      // Add new contributors
      const contributors = Object.entries(contributorAmounts)
        .filter(([, amt]) => parseFloat(amt) > 0)
        .map(([user_id, amt]) => ({
          expense_id: expense.id,
          user_id,
          amount_paid: parseFloat(amt),
        }))

      if (contributors.length > 0) {
        const { error: contributorsError } = await supabase
          .from('expense_contributors')
          .insert(contributors)

        if (contributorsError) throw contributorsError
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Failed to update expense. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setContributorAmounts(
      expense.contributors.reduce(
        (acc, c) => ({ ...acc, [c.user_id]: c.amount_paid.toString() }),
        {}
      )
    )
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (
      !confirm('Are you sure you want to delete this expense? This action cannot be undone.')
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id)

      if (error) throw error

      // Redirect to expenses page
      router.push('/dashboard/expenses')
      router.refresh()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense. Please try again.')
      setIsSubmitting(false)
    }
  }

  const totalPaid = expense.contributors.reduce((sum, c) => sum + c.amount_paid, 0)

  return (
    <div className="max-w-4xl rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{expense.description}</h1>
          <p className="mt-2 text-gray-600">
            Gift for: <span className="font-semibold">{expense.recipient.name}</span>
          </p>
          {!isRecipient && (
            <p className="mt-4 text-4xl font-bold text-blue-600">€{expense.amount.toFixed(2)}</p>
          )}
          {isRecipient && (
            <div className="mt-4 rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                Amount is hidden because this gift is for you!
              </p>
            </div>
          )}
        </div>
        {canEdit && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="e.g., Birthday cake, Movie tickets..."
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Contributors */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contributors & Amounts Paid
            </label>
            <div className="mt-2 space-y-3">
              {allUsers
                .filter((u) => u.id !== expense.recipient_id)
                .map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-gray-700">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={contributorAmounts[user.id] || '0'}
                        onChange={(e) =>
                          setContributorAmounts({
                            ...contributorAmounts,
                            [user.id]: e.target.value,
                          })
                        }
                        className="w-32 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contributors */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
            <div className="mt-3 space-y-2">
              {expense.contributors.map((c) => (
                <div
                  key={c.user_id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                >
                  <span className="text-gray-900">{c.user.name}</span>
                  <span className="font-semibold text-blue-600">
                    €{c.amount_paid.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t pt-3">
              <span className="font-semibold text-gray-900">Total Paid:</span>
              <span className="font-bold text-blue-600">€{totalPaid.toFixed(2)}</span>
            </div>
            {!isRecipient && totalPaid !== expense.amount && (
              <div className="mt-2 rounded-md bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Total paid (€{totalPaid.toFixed(2)}) doesn't match expense amount (€
                  {expense.amount.toFixed(2)})
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-500">Created By</h3>
            <p className="mt-1 text-lg text-gray-900">{expense.created_by_user.name}</p>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Created: {new Date(expense.created_at).toLocaleString()}</p>
            <p>Last updated: {new Date(expense.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
