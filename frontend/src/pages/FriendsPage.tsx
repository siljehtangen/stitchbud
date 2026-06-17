import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiX, FiRefreshCw, FiUserPlus, FiClock } from 'react-icons/fi'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { useToast } from '../context/ToastContext'
import { friendsApi } from '../api'
import type { Friend, FriendRequest, SentFriendRequest } from '../types'
import { UserAvatar } from '../components/UserAvatar'

const FRIEND_ERROR_KEYS: Record<string, string> = {
  'You cannot add yourself as a friend.': 'friend_err_self',
  'No user found with that email.': 'friend_err_no_user',
  'No Stitchbud account found with that email.': 'friend_err_no_user',
  'You are already friends.': 'friend_err_already_friends',
  'You have already sent a friend request to this person.': 'friend_err_already_sent',
  'Profile not found. Please try again.': 'friend_err_profile',
}

type FriendsOverviewProps = {
  friendsCount: number
  sentCount: number
  incomingCount: number
}

function FriendsOverview({ friendsCount, sentCount, incomingCount }: FriendsOverviewProps) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-3 gap-2.5 md:gap-3">
      <div className="rounded-xl border border-[rgb(var(--border-light))] bg-cream/50 px-3.5 py-3 md:py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-green/20 text-sand-green-dark text-lg mb-1.5">
          <LiaUserFriendsSolid />
        </div>
        <p className="font-serif text-2xl md:text-3xl leading-none text-ink tabular-nums">{friendsCount}</p>
        <p className="text-[11px] md:text-xs text-warm-gray mt-1 leading-tight">{t('dashboard_friends_count')}</p>
      </div>
      <div className="rounded-xl border border-[rgb(var(--border-light))] bg-cream/50 px-3.5 py-3 md:py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-green/20 text-sand-green-dark text-lg mb-1.5">
          <FiUserPlus />
        </div>
        <p className="font-serif text-2xl md:text-3xl leading-none text-ink tabular-nums">{sentCount}</p>
        <p className="text-[11px] md:text-xs text-warm-gray mt-1 leading-tight">{t('dashboard_sent_requests_count')}</p>
      </div>
      <div className="rounded-xl border border-[rgb(var(--border-light))] bg-cream/50 px-3.5 py-3 md:py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-green/20 text-sand-green-dark text-lg mb-1.5">
          <FiClock />
        </div>
        <p className="font-serif text-2xl md:text-3xl leading-none text-ink tabular-nums">{incomingCount}</p>
        <p className="text-[11px] md:text-xs text-warm-gray mt-1 leading-tight">{t('friends_incoming_count')}</p>
      </div>
    </div>
  )
}

export default function FriendsPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  async function reloadFriends() {
    const [f, r, s] = await Promise.all([
      friendsApi.getFriends(),
      friendsApi.getPendingRequests(),
      friendsApi.getSentRequests(),
    ])
    setFriends(f)
    setRequests(r)
    setSentRequests(s)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    reloadFriends()
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  async function handleSendRequest() {
    const email = emailInput.trim()
    if (!email) return
    setSending(true)
    setSendError('')
    try {
      const result = await friendsApi.sendRequest(email)
      showToast(result.status === 'ACCEPTED' ? t('friends_accepted') : t('friends_request_sent'))
      setEmailInput('')
      await reloadFriends()
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : ''
      const key = FRIEND_ERROR_KEYS[raw]
      setSendError(key ? t(key as 'friend_err_self') : t('friends_request_failed'))
    } finally {
      setSending(false)
    }
  }

  async function handleAccept(req: FriendRequest) {
    try {
      const newFriend = await friendsApi.acceptRequest(req.friendshipId)
      setRequests(r => r.filter(r => r.friendshipId !== req.friendshipId))
      setFriends(f => [...f, newFriend])
      showToast(t('friends_accepted'))
    } catch {
      showToast(t('friends_action_failed'), 'info')
    }
  }

  async function handleDecline(req: FriendRequest) {
    try {
      await friendsApi.remove(req.friendshipId)
      setRequests(r => r.filter(r => r.friendshipId !== req.friendshipId))
      showToast(t('friends_declined_toast'))
    } catch {
      showToast(t('friends_action_failed'), 'info')
    }
  }

  async function handleCancelSent(req: SentFriendRequest) {
    try {
      await friendsApi.remove(req.friendshipId)
      setSentRequests(s => s.filter(r => r.friendshipId !== req.friendshipId))
      showToast(t('friends_cancelled_toast'))
    } catch {
      showToast(t('friends_action_failed'), 'info')
    }
  }

  async function handleRemove(friend: Friend) {
    try {
      await friendsApi.remove(friend.friendshipId)
      setFriends(f => f.filter(f => f.friendshipId !== friend.friendshipId))
      showToast(t('friends_removed_toast'))
    } catch {
      showToast(t('friends_action_failed'), 'info')
    }
  }

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>
  if (loadError)
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-warm-gray">{t('load_failed')}</p>
        <button
          onClick={() => setReloadKey(k => k + 1)}
          className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5"
        >
          <FiRefreshCw className="text-base" />
          {t('retry')}
        </button>
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-ink">{t('nav_friends')}</h1>

      <FriendsOverview friendsCount={friends.length} sentCount={sentRequests.length} incomingCount={requests.length} />

      <div className="card space-y-3">
        <p className="text-sm font-medium text-ink">{t('friends_add_heading')}</p>
        <p className="text-xs text-warm-gray">{t('friends_add_hint')}</p>
        <div className="flex gap-2">
          <input
            className="input flex-1 min-w-0 max-w-md"
            type="email"
            placeholder={t('friends_email_placeholder')}
            value={emailInput}
            onChange={e => {
              setEmailInput(e.target.value)
              setSendError('')
            }}
            onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
          />
          <button
            onClick={handleSendRequest}
            disabled={sending || !emailInput.trim()}
            className="btn-primary px-4 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <FiUserPlus className="text-base" />
            {sending ? t('friends_sending') : t('friends_send_btn')}
          </button>
        </div>
        {sendError && <p className="text-xs text-red-500">{sendError}</p>}
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">
            {t('friends_requests_heading')} ({requests.length})
          </p>
          {requests.map(req => (
            <div key={req.friendshipId} className="card flex items-center gap-3">
              <UserAvatar name={req.requesterDisplayName} email={req.requesterEmail} />
              <div className="flex-1 min-w-0">
                {req.requesterDisplayName && (
                  <p className="text-sm font-medium text-ink truncate">{req.requesterDisplayName}</p>
                )}
                <p className="text-xs text-warm-gray truncate">{req.requesterEmail}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  className="min-h-[44px] px-4 rounded-[14px] bg-sand-green-dark text-ink text-sm font-medium hover:brightness-95 transition-all inline-flex items-center gap-1.5"
                >
                  <FiCheck className="text-base" />
                  {t('friends_accept')}
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  className="min-h-[44px] px-4 rounded-[14px] border border-[rgb(var(--border-light))] text-warm-gray text-sm hover:bg-soft-brown/10 transition-colors inline-flex items-center gap-1.5"
                >
                  <FiX className="text-base" />
                  {t('friends_decline')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sentRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">
            {t('friends_sent_heading')} ({sentRequests.length})
          </p>
          {sentRequests.map(req => (
            <div key={req.friendshipId} className="card flex items-center gap-3">
              <UserAvatar name={req.recipientDisplayName} email={req.recipientEmail} color="blue" />
              <div className="flex-1 min-w-0">
                {req.recipientDisplayName && (
                  <p className="text-sm font-medium text-ink truncate">{req.recipientDisplayName}</p>
                )}
                <p className="text-xs text-warm-gray truncate">{req.recipientEmail}</p>
                <p className="text-[11px] text-warm-gray/80 mt-0.5">{t('friends_sent_pending')}</p>
              </div>
              <button
                onClick={() => handleCancelSent(req)}
                className="min-h-[44px] px-4 rounded-[14px] border border-[rgb(var(--border-light))] text-warm-gray text-sm hover:bg-soft-brown/10 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
              >
                <FiX className="text-base" />
                {t('friends_cancel_request')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">
          {t('friends_list_heading')} ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="text-sm text-warm-gray">{t('friends_empty')}</p>
        ) : (
          friends.map(friend => (
            <div key={friend.friendshipId} className="card flex items-center gap-3">
              <UserAvatar name={friend.displayName} email={friend.email} color="blue" />
              <div className="flex-1 min-w-0">
                {friend.displayName && <p className="text-sm font-medium text-ink truncate">{friend.displayName}</p>}
                <p className="text-xs text-warm-gray truncate">{friend.email}</p>
              </div>
              <button
                onClick={() => handleRemove(friend)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                title={t('friends_remove')}
                aria-label={t('friends_remove')}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
