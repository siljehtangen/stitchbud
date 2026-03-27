'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z
  .object({
    name: z.string().min(2, 'Navn må ha minst 2 tegn'),
    email: z.string().email('Ugyldig e-postadresse'),
    password: z.string().min(8, 'Passord må ha minst 8 tegn'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passordene stemmer ikke overens',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Noe gikk galt')
        setLoading(false)
        return
      }
      await signIn('credentials', { email: data.email, password: data.password, callbackUrl: '/dashboard' })
    } catch {
      setError('Noe gikk galt, prøv igjen')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-medium text-sand-900 mb-2">Opprett konto</h1>
        <p className="text-sand-500 text-sm">Gratis for alltid · Ingen kredittkort</p>
      </div>

      {/* Google */}
      <button
        onClick={() => { setGoogleLoading(true); signIn('google', { callbackUrl: '/dashboard' }) }}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-white border border-sand-300 hover:bg-sand-50 hover:border-sand-400 text-sand-700 font-medium py-3 rounded-xl transition-all text-sm mb-6 shadow-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Kobler til…' : 'Fortsett med Google'}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-sand-200" />
        <span className="text-sand-400 text-xs uppercase tracking-wider">eller</span>
        <div className="flex-1 h-px bg-sand-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label-earthy">Navn</label>
          <input {...register('name')} type="text" placeholder="Ola Nordmann" className="input-earthy" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label-earthy">E-post</label>
          <input {...register('email')} type="email" placeholder="deg@eksempel.no" className="input-earthy" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label-earthy">Passord</label>
          <input {...register('password')} type="password" placeholder="Minst 8 tegn" className="input-earthy" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label-earthy">Bekreft passord</label>
          <input {...register('confirmPassword')} type="password" placeholder="Gjenta passord" className="input-earthy" />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sage-500 hover:bg-sage-600 active:bg-sage-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm hover:shadow mt-2"
        >
          {loading ? 'Oppretter konto…' : 'Opprett konto gratis'}
        </button>
      </form>

      <p className="text-center text-sand-500 text-sm mt-8">
        Har du allerede en konto?{' '}
        <Link href="/login" className="text-sage-600 hover:text-sage-700 font-semibold transition-colors">
          Logg inn
        </Link>
      </p>
    </div>
  )
}
