'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setCheckingSession(false)
    })
  }, [router])

  if (checkingSession) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de autenticación')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleAuth = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error con Google Sign In')
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      alert('Revisá tu correo para confirmar el registro')
      setIsRegistering(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de registro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-linear-to-br from-espresso via-espresso to-charcoal relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-champagne blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-ivory tracking-tight">
            Passport <span className="text-champagne">LATAM</span>
          </Link>
        </div>

        <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border border-champagne/20">
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold text-espresso">
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </h1>
            <p className="text-xs text-espresso/50 mt-1">
              {isRegistering ? 'Registrate como empresa emisora' : 'Accedé a tu panel de emisión'}
            </p>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={submitting}
            className="btn btn-sm w-full gap-2 bg-white hover:bg-espresso-50 text-espresso border border-espresso-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {submitting ? 'Procesando...' : 'Continuar con Google'}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-espresso-100" />
            <span className="text-xs text-espresso/40 font-medium">o con email</span>
            <div className="flex-1 h-px bg-espresso-100" />
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleEmailAuth} className="flex flex-col gap-4">
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Correo electrónico</span>
              <input type="email" className="input input-sm bg-white border-espresso-100 focus:border-champagne text-espresso placeholder:text-espresso-200" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </label>
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Contraseña</span>
              <input type="password" className="input input-sm bg-white border-espresso-100 focus:border-champagne text-espresso placeholder:text-espresso-200" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </label>
            <button type="submit" disabled={submitting} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none mt-1">
              {submitting ? <><span className="loading loading-spinner loading-xs" /> Procesando...</> : isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

          <p className="text-center text-xs text-espresso/50 mt-5">
            {isRegistering ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
            <button onClick={() => { setIsRegistering(!isRegistering); setError(null) }} className="font-medium text-champagne hover:text-champagne/80 underline underline-offset-2">
              {isRegistering ? 'Iniciá sesión' : 'Registrate'}
            </button>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-ivory/40 hover:text-ivory/60 transition-colors">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}