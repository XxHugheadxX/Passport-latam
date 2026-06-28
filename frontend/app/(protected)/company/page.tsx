'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'

const CATEGORIES = ['textile', 'coffee', 'ceramic', 'cosmetic', 'food', 'art', 'other']

export default function CompanyPage() {
  const router = useRouter()
  const { user, supabase, getCompany, loading: authLoading } = useSupabaseAuth()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', country: '', sector: '', description: '', stellar_address: '' })

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    getCompany().then(c => {
      if (c) { setCompany(c); setForm({ name: c.name, country: c.country, sector: c.sector, description: c.description || '', stellar_address: c.stellar_address || '' }) }
      setLoading(false)
    })
  }, [user, getCompany])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      if (company) {
        const { error: upErr } = await supabase.from('companies').update({
          name: form.name, country: form.country, sector: form.sector, description: form.description, stellar_address: form.stellar_address || null,
        }).eq('id', company.id)
        if (upErr) throw new Error(upErr.message)
      } else {
        const { error: insErr } = await supabase.from('companies').insert({
          user_id: user!.id, name: form.name, country: form.country, sector: form.sector, description: form.description, stellar_address: form.stellar_address || null,
        })
        if (insErr) throw new Error(insErr.message)
      }
      setSaved(true)
      const updated = await getCompany()
      setCompany(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  if (authLoading || loading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>

  const canSubmit = form.name.trim() && form.country.trim() && form.sector.trim()

  return (
    <div className="flex-1 flex items-start justify-center p-4 md:p-8 pt-12">
      <div className="w-full max-w-md">
        <h1 className="text-lg font-bold text-espresso mb-1">Perfil de empresa</h1>
        <p className="text-xs text-espresso/50 mb-6">Actualizá los datos de tu empresa</p>

        <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Nombre *</span>
              <input type="text" className="input input-sm bg-white border text-espresso" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">País *</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="BO" required />
              </label>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Sector *</span>
                <select className="select select-sm bg-white border text-espresso" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} required>
                  <option value="">Seleccionar</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Descripción</span>
              <input type="text" className="input input-sm bg-white border text-espresso" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Contanos sobre tu empresa..." />
            </label>
            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Dirección Stellar</span>
              <input type="text" className="input input-sm bg-white border text-espresso font-mono text-xs" value={form.stellar_address} onChange={e => setForm(f => ({ ...f, stellar_address: e.target.value }))} placeholder="G..." />
            </label>
            <button type="submit" disabled={!canSubmit || saving} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none mt-1">
              {saving ? <><span className="loading loading-spinner loading-xs" /> Guardando...</> : 'Guardar cambios'}
            </button>
          </form>
          {saved && <p className="text-xs text-emerald-600 mt-3 text-center">✓ Datos guardados</p>}
          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  )
}
