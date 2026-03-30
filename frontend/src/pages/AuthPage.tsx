import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'

export default function AuthPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + '/home' },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen bg-soft-brown/10 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-soft-brown/20 w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">{t('auth_welcome')}</h1>
          <p className="text-sm text-warm-gray mt-1">{t('auth_subtitle')}</p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">✉️</div>
            <p className="font-medium text-gray-800">{t('auth_check_email')}</p>
            <p className="text-sm text-warm-gray">{t('auth_magic_link_sent', { email })}</p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-sand-green-dark underline"
            >
              {t('auth_try_again')}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 border border-soft-brown/30 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-soft-brown/10 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {t('auth_continue_google')}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-soft-brown/20" />
              <span className="text-xs text-warm-gray">{t('auth_or')}</span>
              <div className="flex-1 h-px bg-soft-brown/20" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                className="input"
                placeholder={t('auth_email_placeholder')}
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? t('auth_sending') : t('auth_send_magic_link')}
              </button>
            </form>

            <p className="text-xs text-center text-warm-gray">{t('auth_no_password')}</p>
          </>
        )}
      </div>
    </div>
  )
}
