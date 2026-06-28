'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'
import { verifyPassport } from '@/app/lib/soroban'
import { PassportQR } from '@/app/components/PassportQR'
import { TraceTimeline, TraceEvent } from '@/app/components/TraceTimeline'
import { VerifyBadge } from '@/app/components/VerifyBadge'
import Link from 'next/link'

export default function PassportDetailPage() {
  const params = useParams()
  const passportId = params.id as string
  const supabase = createClient()

  const [passport, setPassport] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [events, setEvents] = useState<TraceEvent[]>([])
  const [onChainHash, setOnChainHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: pData } = await supabase
        .from('passports')
        .select('*, products(*), companies(name, country)')
        .eq('passport_id', passportId)
        .single()

      if (pData) {
        setPassport(pData)
        setProduct(pData.products)
        setCompany(pData.companies)
      }

      const { data: tData } = await supabase
        .from('traceability_events')
        .select('*')
        .eq('passport_id', passportId)
        .order('created_at', { ascending: true })

      if (tData) {
        setEvents(tData.map((t: any) => ({
          type: t.event_type === 'emitted' ? 'emission' as const : 'transfer' as const,
          from: t.from_address,
          to: t.to_address,
          txHash: t.tx_hash,
          timestamp: t.created_at,
        })))
      }

      setLoading(false)
    }
    load()
  }, [passportId, supabase])

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const result = await verifyPassport(passportId)
      if (result && product) setOnChainHash((result as any).metadata_hash)
    } catch {
      setOnChainHash(null)
    }
    setVerifying(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>
  if (!product) return <div className="flex-1 flex items-center justify-center"><div className="alert alert-error">Pasaporte no encontrado</div></div>

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h1 className="card-title text-2xl">{product.name}</h1>
              {company && <p className="text-sm text-base-content/60">{company.name} · {company.country}</p>}
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div><p className="text-base-content/60">Categoría</p><p className="font-medium capitalize">{product.category}</p></div>
                <div><p className="text-base-content/60">País de origen</p><p className="font-medium">{product.origin_country}</p></div>
                <div><p className="text-base-content/60">Ciudad</p><p className="font-medium">{product.origin_city}</p></div>
                <div><p className="text-base-content/60">Año</p><p className="font-medium">{product.year}</p></div>
              </div>
              {product.description && (
                <div className="mt-4">
                  <p className="text-base-content/60 text-sm">Descripción</p>
                  <p className="text-sm">{product.description}</p>
                </div>
              )}
              {product.materials?.length > 0 && (
                <div className="mt-4">
                  <p className="text-base-content/60 text-sm">Materiales</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.materials.map((m: string, i: number) => (
                      <span key={i} className="badge badge-outline badge-sm">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {product.certifications?.length > 0 && (
                <div className="mt-4">
                  <p className="text-base-content/60 text-sm">Certificaciones</p>
                  {product.certifications.map((c: any, i: number) => (
                    <p key={i} className="text-sm">• {c.name}{c.issuer ? ` — ${c.issuer}` : ''}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {product.images?.length > 0 && (
            <div className="carousel carousel-center gap-4 rounded-box">
              {product.images.map((url: string, i: number) => (
                <div key={i} className="carousel-item">
                  <img src={url} alt={`${product.name} ${i + 1}`} className="h-48 rounded-box object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="font-semibold mb-4">Historial</h3>
              <TraceTimeline events={events} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center text-center">
              <PassportQR passportId={passportId} />
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="font-semibold text-sm mb-2">Verificación on-chain</h3>
              <VerifyBadge onChainHash={onChainHash} offChainHash={product.metadata_hash} loading={verifying} />
              <button onClick={handleVerify} disabled={verifying} className="btn btn-sm btn-outline w-full mt-3">
                {verifying ? <><span className="loading loading-spinner loading-xs" /> Verificando...</> : 'Verificar en Stellar'}
              </button>
              {passport?.tx_hash && (
                <p className="text-xs text-base-content/40 mt-2 break-all">Tx: {passport.tx_hash}</p>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="font-semibold text-sm mb-2">Propietario</h3>
              <p className="text-sm font-mono">{passport?.owner_address}</p>
              <Link href={`/transfer/${passportId}`} className="btn btn-sm btn-primary w-full mt-3">
                Transferir propiedad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}