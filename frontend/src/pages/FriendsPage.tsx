import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { friendsApi } from '../api'
import type { Friend, FriendRequest } from '../types'

export default function FriendsPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    Promise.all([friendsApi.getFriends(), friendsApi.getPendingRequests()])
      .then(([f, r]) => { setFriends(f); setRequests(r) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSendRequest() {
    if (!emailInput.trim()) return
    setSending(true)
    setSendError('')
    try {
      await friendsApi.sendRequest(emailInput.trim())
      showToast(t('friend_request_sent'))
      setEmailInput('')
      // Refresh lists
      const [f, r] = await Promise.all([friendsApi.getFriends(), friendsApi.getPendingRequests()])
      setFriends(f); setRequests(r)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSendError(msg || t('friend_request_failed'))
    } finally {
      setSending(false)
    }
  }

  async function handleAccept(req: FriendRequest) {
    try {
      const newFriend = await friendsApi.acceptRequest(req.friendshipId)
      setRequests(r => r.filter(r => r.friendshipId !== req.friendshipId))
      setFriends(f => [...f, newFriend])
      showToast(t('friend_accepted'))
    } catch {
      showToast(t('friend_action_failed'), 'info')
    }
  }

  async function handleDecline(req: FriendRequest) {
    try {
      await friendsApi.remove(req.friendshipId)
      setRequests(r => r.filter(r => r.friendshipId !== req.friendshipId))
    } catch {
      showToast(t('friend_action_failed'), 'info')
    }
  }

  async function handleRemove(friend: Friend) {
    try {
      await friendsApi.remove(friend.friendshipId)
      setFriends(f => f.filter(f => f.friendshipId !== friend.friendshipId))
    } catch {
      showToast(t('friend_action_failed'), 'info')
    }
  }

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('nav_friends')}</h2>

      {/* Add friend */}
      <div className="card space-y-3">
        <p className="text-sm font-medium text-gray-800">{t('friends_add_heading')}</p>
        <p className="text-xs text-warm-gray">{t('friends_add_hint')}</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder={t('friends_email_placeholder')}
            value={emailInput}
            onChange={e => { setEmailInput(e.target.value); setSendError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
          />
          <button
            onClick={handleSendRequest}
            disabled={sending || !emailInput.trim()}
            className="btn-primary px-4 text-sm disabled:opacity-50"
          >
            {sending ? t('friends_sending') : t('friends_send_btn')}
          </button>
        </div>
        {sendError && <p className="text-xs text-red-500">{sendError}</p>}
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-800">{t('friends_requests_heading')} ({requests.length})</p>
          {requests.map(req => (
            <div key={req.friendshipId} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sand-green flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(req.requesterDisplayName ?? req.requesterEmail).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {req.requesterDisplayName && (
                  <p className="text-sm font-medium text-gray-800 truncate">{req.requesterDisplayName}</p>
                )}
                <p className="text-xs text-warm-gray truncate">{req.requesterEmail}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  className="px-3 py-1.5 rounded-lg bg-sand-green text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  {t('friends_accept')}
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  className="px-3 py-1.5 rounded-lg border border-soft-brown/30 text-warm-gray text-xs hover:bg-soft-brown/10 transition-colors"
                >
                  {t('friends_decline')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">{t('friends_list_heading')} ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="text-sm text-warm-gray">{t('friends_empty')}</p>
        ) : (
          friends.map(friend => (
            <div key={friend.friendshipId} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sand-blue flex items-center justify-center text-gray-700 font-semibold text-sm flex-shrink-0">
                {(friend.displayName ?? friend.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {friend.displayName && (
                  <p className="text-sm font-medium text-gray-800 truncate">{friend.displayName}</p>
                )}
                <p className="text-xs text-warm-gray truncate">{friend.email}</p>
              </div>
              <button
                onClick={() => handleRemove(friend)}
                className="text-xs text-red-400 hover:text-red-600 px-1 flex-shrink-0"
                title={t('friends_remove')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
