import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiX, FiLogOut, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { accountApi } from '../api'
import { UserAvatar } from '../components/UserAvatar'

function DangerAction({
  title,
  description,
  warning,
  triggerLabel,
  confirmLabel,
  pendingLabel,
  onConfirm,
  tone,
}: {
  title: string
  description: string
  warning: string
  triggerLabel: string
  confirmLabel: string
  pendingLabel: string
  onConfirm: () => Promise<void>
  tone: 'orange' | 'red'
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const colors =
    tone === 'orange'
      ? {
          border: 'border-orange-100',
          warning: 'text-orange-600',
          bg: 'bg-orange-500 hover:bg-orange-600',
          trigger: 'border-orange-200 text-orange-500 hover:bg-orange-50',
        }
      : {
          border: 'border-red-100',
          warning: 'text-red-600',
          bg: 'bg-red-500 hover:bg-red-600',
          trigger: 'border-red-200 text-red-500 hover:bg-red-50',
        }

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setConfirming(false)
    } catch {
      showToast(t('action_failed'), 'info')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={`card border ${colors.border} space-y-3`}>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-warm-gray mt-0.5">{description}</p>
      </div>
      {confirming ? (
        <div className="space-y-2">
          <p className={`text-xs font-medium ${colors.warning}`}>{warning}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="px-4 py-2 rounded-xl border border-soft-brown/30 text-warm-gray text-sm hover:bg-soft-brown/10 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <FiX className="text-base" />
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={pending}
              className={`py-2 px-4 rounded-xl text-white font-medium text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 ${colors.bg}`}
            >
              <FiCheck className="text-base" />
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className={`py-2 px-4 rounded-xl border font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5 ${colors.trigger}`}
        >
          {tone === 'orange' ? <FiRefreshCw className="text-base" /> : <FiTrash2 className="text-base" />}
          {triggerLabel}
        </button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const email = user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-serif text-3xl text-ink">{t('profile_heading')}</h1>

      <div className="card flex items-center gap-4">
        <UserAvatar name={displayName} email={email} avatarUrl={avatarUrl} size="lg" />
        <div className="min-w-0">
          {displayName && <p className="font-semibold text-ink truncate">{displayName}</p>}
          <p className="text-sm text-warm-gray truncate">{email}</p>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="btn-secondary py-3 text-sm inline-flex items-center justify-center gap-1.5"
      >
        <FiLogOut className="text-base" />
        {t('profile_sign_out')}
      </button>

      <DangerAction
        tone="orange"
        title={t('reset_data_heading')}
        description={t('reset_data_description')}
        warning={t('reset_data_confirm_warning')}
        triggerLabel={t('reset_data_btn')}
        confirmLabel={t('reset_data_confirm_btn')}
        pendingLabel={t('resetting')}
        onConfirm={async () => {
          await accountApi.resetData()
          showToast(t('data_reset_toast'))
        }}
      />

      <DangerAction
        tone="red"
        title={t('delete_account_heading')}
        description={t('delete_account_description')}
        warning={t('delete_account_confirm_warning')}
        triggerLabel={t('delete_account_btn')}
        confirmLabel={t('delete_account_confirm_btn')}
        pendingLabel={t('deleting')}
        onConfirm={async () => {
          await accountApi.deleteAccount()
          await signOut()
          navigate('/', { replace: true })
        }}
      />
    </div>
  )
}
