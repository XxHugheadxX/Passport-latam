'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import { useWallet } from '@/app/hooks/useWallet'
import { usePassportContract } from '@/app/hooks/usePassportContract'
import { TxStatus } from '@/app/components/TxStatus'
import Link from 'next/link'

const EVENT_TYPES = [
  { value: 'produced', label: 'Producido' },
  { value: 'certified', label: 'Certificado' },
  { value: 'exported', label: 'Exportado' },
  { value: 'customs', label: 'Aduana' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'quality', label: 'Control de calidad' },
]

export default function EventsPage() {
  const params = useParams()
  const passportId = params.id as string
  const router = useRouter()
  const { user, supabase, loading: authLoading } = useSupabaseAuth()
  const wallet = useWallet()
  const contract = usePassportContract()

  const [passport, setPassport] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [eventType, setEventType] = useState('')
  const [notes, setNotes] = useState('')
  const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    const load = async () => {
      const { data: pData } = await supabase
        .from('passports')
        .select('*, products(name)')
        .eq('passport_id', passportId)
        .single()
      if (pData) { setPassport(pData); setProduct(pData.products) }

      const { data: tData } = await supabase
        .from('traceability_events')
        .select('*')
        .eq('passport_id', passportId)
        .order('created_at', { ascending: false })
      if (tData) setEvents(tData)

      setLoading(false)
    }
    load()
  }, [passportId, supabase])

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.isConnected || !wallet.address) {
      setError('Conectá tu wallet primero')
      return
    }
    setError(null)
    setTxStatus('building')

    try {
      setTxStatus('signing')
      await contract.transfer({
        owner: wallet.address,
        passportId,
        newOwner: wallet.address,
      }, async (xdr: string) => {
        setTxStatus('signing')
        return wallet.sign(xdr, contract.networkPassphrase)
      })

      setTxStatus('submitting')

      const { error: insErr } = await supabase.from('traceability_events').insert({
        passport_id: passportId,
        event_type: eventType,
        from_address: wallet.address,
        to_address: wallet.address,
        tx_hash: contract.txHash,
        notes,
      })
      if (insErr) throw new Error(insErr.message)

      const { data: tData } = await supabase
        .from('traceability_events')
        .select('*')
        .eq('passport_id', passportId)
        .order('created_at', { ascending: false })
      if (tData) setEvents(tData)

      setTxStatus('success')
      setEventType('')
      setNotes('')
    } catch (e) {
      setTxStatus('error')
      setError(e instanceof Error ? e.message : 'Error al agregar evento')
    }
  }

  if (authLoading || loading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>
  if (!product) return <div className="flex-1 flex items-center justify-center p-4"><div className="text-xs text-red-600">Pasaporte no encontrado</div></div>

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-lg font-bold text-espresso">Trazabilidad</h1>
        <p className="text-xs text-espresso/50 mt-0.5">{product?.name} · {passportId?.slice(0, 12)}...</p>
      </div>

      {/* Existing events */}
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
        <h2 className="text-sm font-semibold text-espresso mb-4">Eventos registrados</h2>
        {events.length === 0 ? (
          <p className="text-xs text-espresso/40">Aún no hay eventos de trazabilidad</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-espresso/30 mt-1 shrink-0" />
                <div>
                  <p className="font-medium text-espresso capitalize">{ev.event_type}</p>
                  {ev.notes && <p className="text-espresso/50 mt-0.5">{ev.notes}</p>}
                  <p className="text-[10px] text-espresso/30 mt-0.5">{new Date(ev.created_at).toLocaleString('es-ES')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add event form */}
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
        <h2 className="text-sm font-semibold text-espresso mb-4">Agregar evento</h2>
        <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
          <label className="form-control">
            <span className="text-xs font-medium text-espresso/60 mb-1">Tipo de evento *</span>
            <select className="select select-sm bg-white border text-espresso" value={eventType} onChange={e => setEventType(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="text-xs font-medium text-espresso/60 mb-1">Notas</span>
            <input type="text" className="input input-sm bg-white border text-espresso" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descripción del evento..." />
          </label>
          <div className="flex items-center justify-between">
            <Link href={`/passport/${passportId}`} className="text-xs text-espresso/50 hover:text-espresso">← Volver al pasaporte</Link>
            <button type="submit" disabled={!eventType || !wallet.isConnected || txStatus === 'success'} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">
              {txStatus === 'signing' ? <><span className="loading loading-spinner loading-xs" /> Firmando...</> : 'Agregar evento'}
            </button>
          </div>
        </form>
        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
        {(txStatus !== 'idle' || error) && (
          <div className="mt-4">
            <TxStatus status={txStatus} txHash={contract.txHash} error={error || contract.error} />
          </div>
        )}
      </div>
    </div>
  )
}
