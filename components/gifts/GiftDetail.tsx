'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
}

interface Gift {
  id: string
  recipient_id: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done'
  organizer_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  recipient: User
  organizer: User | null
  contributors: Array<{ user_id: string; user: User }>
  created_by_user: User
}

interface GiftDetailProps {
  gift: Gift
  currentUserId: string
  allUsers: User[]
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
] as const

export default function GiftDetail({ gift, currentUserId, allUsers }: GiftDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(gift.description || '')
  const [status, setStatus] = useState(gift.status)
  const [organizerId, setOrganizerId] = useState(gift.organizer_id || '')
  const [contributorIds, setContributorIds] = useState(
    gift.contributors.map((c) => c.user_id)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const canEdit = currentUserId === gift.created_by || currentUserId === gift.organizer_id

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      // Update gift
      const { error: giftError } = await supabase
        .from('gifts')
        .update({
          description,
          status,
          organizer_id: organizerId || null,
        })
        .eq('id', gift.id)

      if (giftError) throw giftError

      // Delete old contributors
      const { error: deleteError } = await supabase
        .from('gift_contributors')
        .delete()
        .eq('gift_id', gift.id)

      if (deleteError) throw deleteError

      // Add new contributors
      if (contributorIds.length > 0) {
        const { error: contributorsError } = await supabase
          .from('gift_contributors')
          .insert(contributorIds.map((user_id) => ({ gift_id: gift.id, user_id })))

        if (contributorsError) throw contributorsError
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating gift:', error)
      alert('Failed to update gift. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setDescription(gift.description || '')
    setStatus(gift.status)
    setOrganizerId(gift.organizer_id || '')
    setContributorIds(gift.contributors.map((c) => c.user_id))
    setIsEditing(false)
  }

  const currentStatus = statusOptions.find((s) => s.value === status)

  return (
    <div className="max-w-4xl rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {gift.description || `Gift for ${gift.recipient.name}`}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${currentStatus?.color}`}
            >
              {currentStatus?.label}
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            Gift for: <span className="font-semibold">{gift.recipient.name}</span>
          </p>
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Edit
          </button>
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
              placeholder="e.g., Birthday present, Christmas gift..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organizer (Optional)
            </label>
            <select
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">No organizer</option>
              {allUsers
                .filter((u) => u.id !== gift.recipient_id)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Contributors */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contributors</label>
            <div className="mt-2 space-y-2">
              {allUsers
                .filter((u) => u.id !== gift.recipient_id)
                .map((user) => (
                  <label key={user.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contributorIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setContributorIds([...contributorIds, user.id])
                        } else {
                          setContributorIds(contributorIds.filter((id) => id !== user.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{user.name}</span>
                  </label>
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
          {/* Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Organizer</h3>
              <p className="mt-1 text-lg text-gray-900">
                {gift.organizer ? gift.organizer.name : 'No organizer assigned'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Created By</h3>
              <p className="mt-1 text-lg text-gray-900">{gift.created_by_user.name}</p>
            </div>
          </div>

          {/* Contributors */}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Contributors</h3>
            {gift.contributors.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {gift.contributors.map((c) => (
                  <span
                    key={c.user_id}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {c.user.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-gray-600">No contributors yet</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Created: {new Date(gift.created_at).toLocaleString()}</p>
            <p>Last updated: {new Date(gift.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
