'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  name: string
}

interface Gift {
  id: string
  description: string | null
  amount: number
  recipient: { id: string; name: string }
  recipient_id?: string
}

interface ExpenseFormProps {
  users: User[]
  gifts: Gift[]
  currentUserId: string
}

export default function ExpenseForm({ users, gifts, currentUserId }: ExpenseFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [giftId, setGiftId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [contributors, setContributors] = useState<Array<{ userId: string; amountPaid: string }>>([
    { userId: currentUserId, amountPaid: '' },
  ])

  const addContributor = () => {
    setContributors([...contributors, { userId: '', amountPaid: '' }])
  }

  const removeContributor = (index: number) => {
    setContributors(contributors.filter((_, i) => i !== index))
  }

  const updateContributor = (index: number, field: 'userId' | 'amountPaid', value: string) => {
    const updated = [...contributors]
    updated[index] = { ...updated[index], [field]: value }
    setContributors(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const totalAmount = parseFloat(amount)
      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      if (!recipientId) {
        throw new Error('Please select a recipient')
      }

      if (!giftId) {
        throw new Error('Please select which gift this expense is for')
      }

      // Calculate total paid
      const totalPaid = contributors.reduce((sum, c) => {
        const paid = parseFloat(c.amountPaid) || 0
        return sum + paid
      }, 0)

      if (Math.abs(totalPaid - totalAmount) > 0.01) {
        throw new Error(`Total paid (${totalPaid.toFixed(2)}) must equal expense amount (${totalAmount.toFixed(2)})`)
      }

      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          gift_id: giftId,
          recipient_id: recipientId,
          amount: totalAmount,
          description,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // Add contributors
      const contributorInserts = contributors
        .filter((c) => c.userId && c.amountPaid)
        .map((c) => ({
          expense_id: expense.id,
          user_id: c.userId,
          amount_paid: parseFloat(c.amountPaid),
        }))

      if (contributorInserts.length > 0) {
        const { error: contributorsError } = await supabase
          .from('expense_contributors')
          .insert(contributorInserts)

        if (contributorsError) throw contributorsError
      }

      router.push('/dashboard/expenses')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="gift" className="block text-sm font-medium text-gray-700">
          Which Gift is this expense for?
        </label>
        <select
          id="gift"
          value={giftId}
          onChange={(e) => {
            const selectedGift = gifts.find(g => g.id === e.target.value)
            setGiftId(e.target.value)
            if (selectedGift) {
              // Auto-populate recipient from gift
              setRecipientId(selectedGift.recipient_id || selectedGift.recipient.id)
            }
          }}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="">Select a gift...</option>
          {gifts.map((gift) => (
            <option key={gift.id} value={gift.id}>
              {gift.description || `Gift for ${gift.recipient.name}`} - €{gift.amount.toFixed(2)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Expenses must be linked to a specific gift to track contributions properly
        </p>
      </div>

      <div>
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
          Gift Recipient
        </label>
        <select
          id="recipient"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          required
          disabled
          className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm"
        >
          <option value="">Select gift first...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Recipient is automatically set based on the gift selected
        </p>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Total Amount (€)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="100.00"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Christmas gift for..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Contributors
          </label>
          <button
            type="button"
            onClick={addContributor}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            + Add Contributor
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {contributors.map((contributor, index) => (
            <div key={index} className="flex gap-3">
              <select
                value={contributor.userId}
                onChange={(e) => updateContributor(index, 'userId', e.target.value)}
                required
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="">Select person...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={contributor.amountPaid}
                onChange={(e) => updateContributor(index, 'amountPaid', e.target.value)}
                required
                placeholder="Amount paid"
                className="w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              {contributors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContributor(index)}
                  className="rounded-md bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Total paid: €{contributors.reduce((sum, c) => sum + (parseFloat(c.amountPaid) || 0), 0).toFixed(2)}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Expense'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}



