import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { accountApi } from '../api'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const email = user?.email ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url ?? null
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await signOut()
    navigate('/auth', { replace: true })
  }

  async function handleResetData() {
    setResetting(true)
    try {
      await accountApi.resetData()
    } finally {
      setResetting(false)
      setConfirmReset(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await accountApi.deleteAccount()
      await signOut()
      navigate('/auth', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('profile_heading')}</h2>

      {/* Avatar + name */}
      <div className="card flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName ?? email}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-sand-green flex items-center justify-center text-xl font-semibold text-white flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          {displayName && (
            <p className="font-semibold text-gray-800 truncate">{displayName}</p>
          )}
          <p className="text-sm text-warm-gray truncate">{email}</p>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="btn-secondary w-full py-3 text-sm"
      >
        {t('profile_sign_out')}
      </button>

      {/* Reset data */}
      <div className="card border border-orange-100 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{t('reset_data_heading')}</p>
          <p className="text-xs text-warm-gray mt-0.5">{t('reset_data_description')}</p>
        </div>
        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-xs text-orange-600 font-medium">{t('reset_data_confirm_warning')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleResetData}
                disabled={resetting}
                className="flex-1 py-2 rounded-xl bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {resetting ? t('resetting') : t('reset_data_confirm_btn')}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl border border-soft-brown/30 text-warm-gray text-sm hover:bg-soft-brown/10 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-2 rounded-xl border border-orange-200 text-orange-500 font-medium text-sm hover:bg-orange-50 transition-colors"
          >
            {t('reset_data_btn')}
          </button>
        )}
      </div>

      {/* Delete account */}
      <div className="card border border-red-100 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{t('delete_account_heading')}</p>
          <p className="text-xs text-warm-gray mt-0.5">{t('delete_account_description')}</p>
        </div>
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-xs text-red-600 font-medium">{t('delete_account_confirm_warning')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? t('deleting') : t('delete_account_confirm_btn')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-soft-brown/30 text-warm-gray text-sm hover:bg-soft-brown/10 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 rounded-xl border border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors"
          >
            {t('delete_account_btn')}
          </button>
        )}
      </div>
    </div>
  )
}
