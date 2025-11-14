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
  amount: number
  description: string
  created_by: string
  created_at: string
  updated_at: string
  gift_id?: string | null
  created_by_user: User
  participants: Array<{
    user_id: string
    share_amount: number | null
    user: User
  }>
  payers: Array<{
    user_id: string
    amount_paid: number
    user: User
  }>
}

interface Gift {
  id: string
  description: string | null
  amount: number
  recipient: { id: string; name: string }
  recipient_id?: string
}

interface ExpenseDetailProps {
  expense: Expense
  currentUserId: string
  allUsers: User[]
  gifts: Gift[]
}

export default function ExpenseDetail({
  expense,
  currentUserId,
  allUsers,
  gifts,
}: ExpenseDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [giftId, setGiftId] = useState(expense.gift_id || '')
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount.toString())

  // Participants state
  const [participants, setParticipants] = useState<Array<{ userId: string; shareAmount: string }>>(
    expense.participants.map(p => ({
      userId: p.user_id,
      shareAmount: p.share_amount?.toString() || ''
    }))
  )

  // Payers state
  const [payers, setPayers] = useState<Array<{ userId: string; amountPaid: string }>>(
    expense.payers.map(p => ({
      userId: p.user_id,
      amountPaid: p.amount_paid.toString()
    }))
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Allow creator OR any participant/payer to edit
  const isParticipant = expense.participants.some(p => p.user_id === currentUserId)
  const isPayer = expense.payers.some(p => p.user_id === currentUserId)
  const canEdit = currentUserId === expense.created_by || isParticipant || isPayer

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

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        alert('Please enter a valid amount')
        return
      }

      // Validate participants
      const validParticipants = participants.filter(p => p.userId)
      if (validParticipants.length === 0) {
        alert('Please add at least one participant')
        return
      }

      // Validate payers
      const validPayers = payers.filter(p => p.userId && p.amountPaid)
      if (validPayers.length === 0) {
        alert('Please add at least one payer')
        return
      }

      // Check total paid matches amount
      const totalPaid = validPayers.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0)
      if (Math.abs(totalPaid - amountNum) > 0.01) {
        alert(`Total paid (€${totalPaid.toFixed(2)}) must equal expense amount (€${amountNum.toFixed(2)})`)
        return
      }

      // Update expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          gift_id: giftId || null,
          description,
          amount: amountNum,
        })
        .eq('id', expense.id)

      if (expenseError) throw expenseError

      // Delete old participants
      const { error: deleteParticipantsError } = await supabase
        .from('expense_participants')
        .delete()
        .eq('expense_id', expense.id)

      if (deleteParticipantsError) throw deleteParticipantsError

      // Delete old payers
      const { error: deletePayersError } = await supabase
        .from('expense_payers')
        .delete()
        .eq('expense_id', expense.id)

      if (deletePayersError) throw deletePayersError

      // Add new participants
      const participantInserts = validParticipants.map((p) => ({
        expense_id: expense.id,
        user_id: p.userId,
        share_amount: p.shareAmount ? parseFloat(p.shareAmount) : null,
      }))

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participantInserts)

      if (participantsError) throw participantsError

      // Add new payers
      const payerInserts = validPayers.map((p) => ({
        expense_id: expense.id,
        user_id: p.userId,
        amount_paid: parseFloat(p.amountPaid),
      }))

      const { error: payersError } = await supabase
        .from('expense_payers')
        .insert(payerInserts)

      if (payersError) throw payersError

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
    setGiftId(expense.gift_id || '')
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setParticipants(
      expense.participants.map(p => ({
        userId: p.user_id,
        shareAmount: p.share_amount?.toString() || ''
      }))
    )
    setPayers(
      expense.payers.map(p => ({
        userId: p.user_id,
        amountPaid: p.amount_paid.toString()
      }))
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

      router.push('/dashboard/expenses')
      router.refresh()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Calculate equal split amount
  const customShares = expense.participants
    .filter(p => p.share_amount !== null)
    .reduce((sum, p) => sum + (p.share_amount || 0), 0)
  const equalSplitCount = expense.participants.filter(p => p.share_amount === null).length
  const equalSplitAmount = equalSplitCount > 0
    ? (expense.amount - customShares) / equalSplitCount
    : 0

  const totalPaid = expense.payers.reduce((sum, p) => sum + p.amount_paid, 0)

  return (
    <div className="max-w-4xl rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{expense.description}</h1>
          <p className="mt-4 text-4xl font-bold text-blue-600">€{expense.amount.toFixed(2)}</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="e.g., Dinner at restaurant"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Link to Gift (Optional)</label>
            <select
              value={giftId}
              onChange={(e) => setGiftId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">No gift (just track the expense)</option>
              {gifts.map((gift) => (
                <option key={gift.id} value={gift.id}>
                  {gift.description || `Gift for ${gift.recipient.name}`} - €{gift.amount.toFixed(2)}
                </option>
              ))}
            </select>
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
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select person...</option>
                    {allUsers.map((user) => (
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
                    className="w-40 rounded-md border border-gray-300 px-3 py-2"
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
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select person...</option>
                    {allUsers.map((user) => (
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
                    placeholder="Amount paid"
                    className="w-32 rounded-md border border-gray-300 px-3 py-2"
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
          {expense.gift_id && (
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                🎁 Linked to: {gifts.find(g => g.id === expense.gift_id)?.description || 'Gift'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
              <p className="text-xs text-gray-500 mb-3">Who benefits / shares the cost</p>
              <div className="space-y-2">
                {expense.participants.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                  >
                    <span className="text-gray-900">{p.user.name}</span>
                    <span className="font-semibold text-blue-600">
                      €{(p.share_amount !== null ? p.share_amount : equalSplitAmount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payers</h3>
              <p className="text-xs text-gray-500 mb-3">Who actually paid</p>
              <div className="space-y-2">
                {expense.payers.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center justify-between rounded-md bg-green-50 p-3"
                  >
                    <span className="text-gray-900">{p.user.name}</span>
                    <span className="font-semibold text-green-600">
                      €{p.amount_paid.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t pt-3">
                <span className="font-semibold text-gray-900">Total Paid:</span>
                <span className="font-bold text-green-600">€{totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {totalPaid !== expense.amount && (
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Total paid (€{totalPaid.toFixed(2)}) doesn't match expense amount (€{expense.amount.toFixed(2)})
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-500">Created By</h3>
            <p className="mt-1 text-lg text-gray-900">{expense.created_by_user.name}</p>
          </div>

          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Created: {new Date(expense.created_at).toLocaleString()}</p>
            <p>Last updated: {new Date(expense.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
