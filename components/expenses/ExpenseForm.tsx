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
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  // Participants: who benefits/shares the cost
  const [participants, setParticipants] = useState<Array<{ userId: string; shareAmount: string }>>([
    { userId: currentUserId, shareAmount: '' }, // Empty means equal split
  ])

  // Payers: who actually paid
  const [payers, setPayers] = useState<Array<{ userId: string; amountPaid: string }>>([
    { userId: currentUserId, amountPaid: '' },
  ])

  const addParticipant = () => {
    setParticipants([...participants, { userId: '', shareAmount: '' }])
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, field: 'userId' | 'shareAmount', value: string) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], [field]: value }
    setParticipants(updated)
  }

  const addPayer = () => {
    setPayers([...payers, { userId: '', amountPaid: '' }])
  }

  const removePayer = (index: number) => {
    setPayers(payers.filter((_, i) => i !== index))
  }

  const updatePayer = (index: number, field: 'userId' | 'amountPaid', value: string) => {
    const updated = [...payers]
    updated[index] = { ...updated[index], [field]: value }
    setPayers(updated)
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

      // Validate participants
      const validParticipants = participants.filter(p => p.userId)
      if (validParticipants.length === 0) {
        throw new Error('Please add at least one participant')
      }

      // Validate payers
      const validPayers = payers.filter(p => p.userId && p.amountPaid)
      if (validPayers.length === 0) {
        throw new Error('Please add at least one payer')
      }

      // Calculate total paid
      const totalPaid = validPayers.reduce((sum, p) => {
        const paid = parseFloat(p.amountPaid) || 0
        return sum + paid
      }, 0)

      if (Math.abs(totalPaid - totalAmount) > 0.01) {
        throw new Error(`Total paid (€${totalPaid.toFixed(2)}) must equal expense amount (€${totalAmount.toFixed(2)})`)
      }

      // Calculate total shares (for custom shares)
      const totalCustomShares = validParticipants.reduce((sum, p) => {
        if (p.shareAmount) {
          return sum + parseFloat(p.shareAmount)
        }
        return sum
      }, 0)

      const participantsWithoutCustom = validParticipants.filter(p => !p.shareAmount).length
      const remainingAmount = totalAmount - totalCustomShares

      if (participantsWithoutCustom > 0 && remainingAmount < 0) {
        throw new Error('Custom shares exceed total amount')
      }

      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          gift_id: giftId || null, // Optional: tag with gift for organization
          amount: totalAmount,
          description,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // Add participants (who benefits/shares cost)
      const participantInserts = validParticipants.map((p) => ({
        expense_id: expense.id,
        user_id: p.userId,
        share_amount: p.shareAmount ? parseFloat(p.shareAmount) : null, // null = equal split
      }))

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participantInserts)

      if (participantsError) throw participantsError

      // Add payers (who actually paid)
      const payerInserts = validPayers.map((p) => ({
        expense_id: expense.id,
        user_id: p.userId,
        amount_paid: parseFloat(p.amountPaid),
      }))

      const { error: payersError } = await supabase
        .from('expense_payers')
        .insert(payerInserts)

      if (payersError) throw payersError

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
          placeholder="Dinner at restaurant"
        />
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
        <label htmlFor="gift" className="block text-sm font-medium text-gray-700">
          Link to Gift (Optional)
        </label>
        <select
          id="gift"
          value={giftId}
          onChange={(e) => setGiftId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="">No gift (just track the expense)</option>
          {gifts.map((gift) => (
            <option key={gift.id} value={gift.id}>
              {gift.description || `Gift for ${gift.recipient.name}`} - €{gift.amount.toFixed(2)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Optional: Tag this expense with a gift for organizational purposes
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Participants (who benefits/shares the cost)
          </label>
          <button
            type="button"
            onClick={addParticipant}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            + Add Participant
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {participants.map((participant, index) => (
            <div key={index} className="flex gap-3">
              <select
                value={participant.userId}
                onChange={(e) => updateParticipant(index, 'userId', e.target.value)}
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
                value={participant.shareAmount}
                onChange={(e) => updateParticipant(index, 'shareAmount', e.target.value)}
                placeholder="Share (empty = equal)"
                className="w-40 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParticipant(index)}
                  className="rounded-md bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Leave share empty for equal split. Example: €60 split equally among 3 people = €20 each
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Payers (who actually paid)
          </label>
          <button
            type="button"
            onClick={addPayer}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            + Add Payer
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {payers.map((payer, index) => (
            <div key={index} className="flex gap-3">
              <select
                value={payer.userId}
                onChange={(e) => updatePayer(index, 'userId', e.target.value)}
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
                min="0.01"
                value={payer.amountPaid}
                onChange={(e) => updatePayer(index, 'amountPaid', e.target.value)}
                required
                placeholder="Amount paid"
                className="w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              {payers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePayer(index)}
                  className="rounded-md bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Total paid: €{payers.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0).toFixed(2)}
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
