'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  name: string
}

interface GiftFormProps {
  users: User[]
  currentUserId: string
  giftId?: string
  initialData?: {
    recipient_id: string
    description: string
    status: string
    organizer_id: string | null
    contributors: string[]
  }
}

export default function GiftForm({ users, currentUserId, giftId, initialData }: GiftFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recipientId, setRecipientId] = useState(initialData?.recipient_id || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [status, setStatus] = useState(initialData?.status || 'pending')
  const [organizerId, setOrganizerId] = useState(initialData?.organizer_id || currentUserId)
  const [contributorIds, setContributorIds] = useState<string[]>(initialData?.contributors || [currentUserId])

  const toggleContributor = (userId: string) => {
    if (contributorIds.includes(userId)) {
      setContributorIds(contributorIds.filter((id) => id !== userId))
    } else {
      setContributorIds([...contributorIds, userId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!recipientId) {
        throw new Error('Please select a recipient')
      }

      if (giftId) {
        // Update existing gift
        const { error: updateError } = await supabase
          .from('gifts')
          .update({
            recipient_id: recipientId,
            description,
            status,
            organizer_id: organizerId || null,
          })
          .eq('id', giftId)

        if (updateError) throw updateError

        // Update contributors
        // First, remove all existing contributors
        await supabase.from('gift_contributors').delete().eq('gift_id', giftId)

        // Then add new ones
        if (contributorIds.length > 0) {
          const { error: contributorsError } = await supabase
            .from('gift_contributors')
            .insert(contributorIds.map((userId) => ({ gift_id: giftId, user_id: userId })))

          if (contributorsError) throw contributorsError
        }
      } else {
        // Create new gift
        const { data: gift, error: createError } = await supabase
          .from('gifts')
          .insert({
            recipient_id: recipientId,
            description,
            status,
            organizer_id: organizerId || null,
            created_by: currentUserId,
          })
          .select()
          .single()

        if (createError) throw createError

        // Add contributors
        if (contributorIds.length > 0) {
          const { error: contributorsError } = await supabase
            .from('gift_contributors')
            .insert(contributorIds.map((userId) => ({ gift_id: gift.id, user_id: userId })))

          if (contributorsError) throw contributorsError
        }
      }

      router.push('/dashboard/gifts')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Failed to save gift')
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
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
          Gift Recipient
        </label>
        <select
          id="recipient"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="">Select recipient...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="What gift are you planning?"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div>
        <label htmlFor="organizer" className="block text-sm font-medium text-gray-700">
          Organizer
        </label>
        <select
          id="organizer"
          value={organizerId}
          onChange={(e) => setOrganizerId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="">No organizer</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Contributors</label>
        <div className="mt-2 space-y-2">
          {users.map((user) => (
            <label key={user.id} className="flex items-center">
              <input
                type="checkbox"
                checked={contributorIds.includes(user.id)}
                onChange={() => toggleContributor(user.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{user.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : giftId ? 'Update Gift' : 'Create Gift'}
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



