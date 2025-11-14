'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Gift {
  id: string
  recipient_id: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done'
  created_at: string
  recipient: { name: string }
  organizer: { name: string } | null
  contributors: Array<{ user_id: string; user: { name: string } }>
}

interface GiftBoardProps {
  initialGifts: Gift[]
  currentUserId: string
}

const statusConfig = {
  pending: {
    label: 'Pending',
    gradient: 'from-amber-50 to-yellow-50',
    cardGradient: 'from-amber-100 to-yellow-100',
    textColor: 'text-amber-900',
    badgeColor: 'bg-amber-200 text-amber-900',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    icon: '⏳',
  },
  in_progress: {
    label: 'In Progress',
    gradient: 'from-blue-50 to-indigo-50',
    cardGradient: 'from-blue-100 to-indigo-100',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-200 text-blue-900',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    icon: '🎨',
  },
  done: {
    label: 'Done',
    gradient: 'from-emerald-50 to-green-50',
    cardGradient: 'from-emerald-100 to-green-100',
    textColor: 'text-emerald-900',
    badgeColor: 'bg-emerald-200 text-emerald-900',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    icon: '🎁',
  },
}

export default function GiftBoard({ initialGifts, currentUserId }: GiftBoardProps) {
  const [gifts, setGifts] = useState(initialGifts)
  const [draggedGift, setDraggedGift] = useState<Gift | null>(null)
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('gifts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gifts',
        },
        () => {
          fetchGifts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchGifts = async () => {
    const { data } = await supabase
      .from('gifts')
      .select(`
        *,
        recipient:users!gifts_recipient_id_fkey(name),
        organizer:users!gifts_organizer_id_fkey(name),
        contributors:gift_contributors(
          user_id,
          user:users(name)
        )
      `)
      .neq('recipient_id', currentUserId) // Hide gifts TO current user (privacy)
      .order('created_at', { ascending: false })

    if (data) {
      setGifts(data as Gift[])
    }
  }

  const handleDragStart = (gift: Gift) => {
    setDraggedGift(gift)
  }

  const handleDragEnd = () => {
    setDraggedGift(null)
    setDraggedOverStatus(null)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDraggedOverStatus(status)
  }

  const handleDragLeave = () => {
    setDraggedOverStatus(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: 'pending' | 'in_progress' | 'done') => {
    e.preventDefault()
    setDraggedOverStatus(null)

    if (!draggedGift || draggedGift.status === newStatus) {
      return
    }

    // Optimistic update
    setGifts((prev) =>
      prev.map((g) => (g.id === draggedGift.id ? { ...g, status: newStatus } : g))
    )

    // Update in database
    const { error } = await supabase
      .from('gifts')
      .update({ status: newStatus })
      .eq('id', draggedGift.id)

    if (error) {
      console.error('Error updating gift status:', error)
      // Revert on error
      fetchGifts()
    }
  }

  const giftsByStatus = {
    pending: gifts.filter((g) => g.status === 'pending'),
    in_progress: gifts.filter((g) => g.status === 'in_progress'),
    done: gifts.filter((g) => g.status === 'done'),
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {(['pending', 'in_progress', 'done'] as const).map((status) => {
        const config = statusConfig[status]
        const isOver = draggedOverStatus === status

        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            className={`relative rounded-2xl bg-gradient-to-br ${config.gradient} p-6 transition-all ${
              isOver ? 'ring-4 ring-blue-400 ring-opacity-50 scale-105' : ''
            }`}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <h2 className={`text-xl font-bold ${config.textColor}`}>
                    {config.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {giftsByStatus[status].length} {giftsByStatus[status].length === 1 ? 'gift' : 'gifts'}
                  </p>
                </div>
              </div>
              <span className={`rounded-full ${config.badgeColor} px-3 py-1.5 text-sm font-bold`}>
                {giftsByStatus[status].length}
              </span>
            </div>

            {/* Drop zone indicator */}
            {isOver && draggedGift?.status !== status && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-blue-500 bg-opacity-20 backdrop-blur-sm">
                <div className="rounded-xl bg-white px-6 py-3 text-lg font-bold text-blue-600 shadow-lg">
                  Drop here to update
                </div>
              </div>
            )}

            {/* Gift cards */}
            <div className="space-y-4">
              {giftsByStatus[status].length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white bg-opacity-50 p-8 text-center">
                  <p className="text-sm text-gray-500">No gifts here yet</p>
                  <p className="mt-1 text-xs text-gray-400">Drag cards here to update</p>
                </div>
              ) : (
                giftsByStatus[status].map((gift) => (
                  <div
                    key={gift.id}
                    draggable
                    onDragStart={() => handleDragStart(gift)}
                    onDragEnd={handleDragEnd}
                    className={`group relative cursor-move rounded-xl border-2 ${config.borderColor} bg-white p-5 shadow-md transition-all hover:scale-105 hover:shadow-xl ${
                      draggedGift?.id === gift.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-col gap-0.5">
                        <div className="h-0.5 w-5 rounded bg-gray-400"></div>
                        <div className="h-0.5 w-5 rounded bg-gray-400"></div>
                        <div className="h-0.5 w-5 rounded bg-gray-400"></div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/gifts/${gift.id}`}
                      className="block"
                      onClick={(e) => {
                        if (draggedGift) e.preventDefault()
                      }}
                    >
                      {/* Gift title */}
                      <h3 className={`mb-3 text-lg font-bold ${config.textColor} pr-8`}>
                        {gift.description || `Gift for ${gift.recipient.name}`}
                      </h3>

                      {/* Recipient */}
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-2xl">🎀</span>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Recipient
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {gift.recipient.name}
                          </p>
                        </div>
                      </div>

                      {/* Organizer */}
                      {gift.organizer && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xl">👤</span>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Organizer
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {gift.organizer.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Contributors */}
                      {gift.contributors.length > 0 && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                            Contributors ({gift.contributors.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {gift.contributors.map((c, idx) => (
                              <span
                                key={idx}
                                className={`rounded-full ${config.badgeColor} px-3 py-1 text-xs font-medium`}
                              >
                                {c.user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <div className="mt-4 text-xs text-gray-400">
                        Created {new Date(gift.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
