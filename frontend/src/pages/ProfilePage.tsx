import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiX, FiLogOut, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { accountApi, projectsApi, libraryApi, friendsApi } from '../api'
import { UserAvatar } from '../components/UserAvatar'
import { ThemeColorPicker, LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAsyncData } from '../hooks/useAsyncData'

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
          row: 'bg-[#fdf6f1] border-[#ecd4c4]',
          title: 'text-[#b06a4f]',
          warning: 'text-[#b06a4f]',
          bg: 'bg-[#c8956b] hover:brightness-95',
          trigger: 'border-[#e2b79b] text-[#b06a4f] hover:bg-[#f7e8dd]',
        }
      : {
          row: 'bg-[#fdf3f1] border-[#ecc9c4]',
          title: 'text-[#c0705f]',
          warning: 'text-[#c0705f]',
          bg: 'bg-[#c0705f] hover:brightness-95',
          trigger: 'border-[#e2b0a8] text-[#c0705f] hover:bg-[#f8e6e2]',
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
    <div className={`rounded-[16px] border p-4 space-y-3 ${colors.row}`}>
      <div>
        <p className={`text-sm font-semibold ${colors.title}`}>{title}</p>
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

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-5 px-2">
      <span className="font-serif text-3xl leading-none text-ink">{value}</span>
      <span className="text-xs text-warm-gray mt-1.5">{label}</span>
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

  const { data: projects } = useAsyncData(() => projectsApi.getAll(), [])
  const { data: materials } = useAsyncData(() => libraryApi.getAll(), [])
  const { data: friends } = useAsyncData(() => friendsApi.getFriends(), [])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-6">
      <h1 className="font-serif text-3xl text-ink">{t('profile_heading')}</h1>

      {/* Header card */}
      <div
        className="relative overflow-hidden rounded-[22px] p-6 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--secondary-light)), rgb(var(--accent-light)))',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 w-44 h-44 rounded-full opacity-50 blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.8), transparent 70%)' }}
        />
        <div className="relative rounded-full ring-[3px] ring-white shadow-warm">
          <UserAvatar name={displayName} email={email} avatarUrl={avatarUrl} size="lg" />
        </div>
        <div className="relative min-w-0">
          {displayName && <p className="font-serif text-2xl leading-tight text-ink truncate">{displayName}</p>}
          <p className="text-sm text-warm-gray truncate">{email}</p>
          <p className="text-xs text-warm-gray/90 mt-1 italic">{t('profile_tagline')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile value={projects.length} label={t('profile_stat_projects')} />
        <StatTile value={materials.length} label={t('profile_stat_materials')} />
        <StatTile value={friends.length} label={t('profile_stat_friends')} />
      </div>

      {/* Preferences */}
      <div className="card divide-y divide-[rgb(var(--border-light))] p-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="text-sm font-medium text-ink">{t('profile_theme')}</span>
          <ThemeColorPicker />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="text-sm font-medium text-ink">{t('profile_language')}</span>
          <LanguageSwitcher />
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="btn-secondary w-full py-3 text-sm inline-flex items-center justify-center gap-1.5"
      >
        <FiLogOut className="text-base" />
        {t('profile_sign_out')}
      </button>

      {/* Danger zone */}
      <div className="space-y-3 pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#b06a4f]">{t('profile_danger_zone')}</p>
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
    </div>
  )
}
