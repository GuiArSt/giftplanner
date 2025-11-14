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
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
}

export default function GiftBoard({ initialGifts }: GiftBoardProps) {
  const [gifts, setGifts] = useState(initialGifts)
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
      .order('created_at', { ascending: false })

    if (data) {
      setGifts(data as Gift[])
    }
  }

  const giftsByStatus = {
    pending: gifts.filter((g) => g.status === 'pending'),
    in_progress: gifts.filter((g) => g.status === 'in_progress'),
    done: gifts.filter((g) => g.status === 'done'),
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {(['pending', 'in_progress', 'done'] as const).map((status) => (
        <div key={status} className="rounded-lg bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize text-gray-900">{status.replace('_', ' ')}</h2>
            <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
              {giftsByStatus[status].length}
            </span>
          </div>
          <div className="space-y-3">
            {giftsByStatus[status].length === 0 ? (
              <p className="text-sm text-gray-500">No gifts in this status</p>
            ) : (
              giftsByStatus[status].map((gift) => (
                <Link
                  key={gift.id}
                  href={`/dashboard/gifts/${gift.id}`}
                  className="block rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {gift.description || `Gift for ${gift.recipient.name}`}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        For: <span className="font-medium">{gift.recipient.name}</span>
                      </p>
                      {gift.organizer && (
                        <p className="mt-1 text-xs text-gray-500">
                          Organized by: {gift.organizer.name}
                        </p>
                      )}
                      {gift.contributors.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Contributors: {gift.contributors.map((c) => c.user.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${statusColors[status]}`}
                    >
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


