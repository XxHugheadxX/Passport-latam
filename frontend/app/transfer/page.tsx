'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TransferRootPage() {
  const router = useRouter()
  const [passportId, setPassportId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = passportId.trim()
    if (!id) {
      setError('Ingresá el ID del pasaporte')
      return
    }
    router.push(`/transfer/${id}`)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-linear-to-br from-espresso via-espresso to-charcoal relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-champagne blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-ivory tracking-tight">
            Passport <span className="text-champagne">LATAM</span>
          </Link>
          <p className="text-ivory/50 text-sm mt-2">Transferí la propiedad de un pasaporte digital</p>
        </div>

        <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border border-champagne/20">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">ID del pasaporte</span>
              <input
                type="text"
                className="input input-sm bg-white border-espresso-100 focus:border-champagne text-espresso placeholder:text-espresso-200 font-mono"
                value={passportId}
                onChange={e => { setPassportId(e.target.value); setError(null) }}
                placeholder="Ej: ABC123"
                required
              />
              <span className="label-text-alt text-xs text-espresso/40 mt-1">
                El ID está en el código QR del producto
              </span>
            </label>

            <button type="submit" className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              Continuar
            </button>
          </form>

          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-ivory/40 hover:text-ivory/60 transition-colors">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
