'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'
import { verifyPassport } from '@/app/lib/soroban'
import { VerifyBadge } from '@/app/components/VerifyBadge'
import { TraceTimeline, TraceEvent } from '@/app/components/TraceTimeline'
import { PassportQR } from '@/app/components/PassportQR'

export default function VerifyPage() {
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
  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: pData, error: pErr } = await supabase
        .from('passports')
        .select('*, products(*), companies(name, country, sector)')
        .eq('passport_id', passportId)
        .single()

      if (pErr || !pData) {
        setError('Pasaporte no encontrado')
        setLoading(false)
        return
      }

      setPassport(pData)
      setProduct(pData.products)
      setCompany(pData.companies)

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
    setVerified(false)
    setVerifyError(null)
    try {
      const result = await verifyPassport(passportId)
      const hash = result.metadata_hash
      setOnChainHash(hash)
      if (hash && product?.metadata_hash === hash) setVerified(true)
    } catch (e) {
      setOnChainHash(null)
      setVerifyError(e instanceof Error ? e.message : 'Error al verificar en Stellar. Probá de nuevo más tarde.')
    }
    setVerifying(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>

  if (error) return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-sm max-w-md w-full">
        <div className="card-body text-center">
          <svg className="w-16 h-16 mx-auto text-warning mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <h2 className="card-title justify-center mb-2">Pasaporte no encontrado</h2>
          <p className="text-base-content/60 text-sm">El código QR escaneado no corresponde a ningún pasaporte registrado.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="card bg-linear-to-br from-espresso to-charcoal text-ivory shadow-xl mb-6">
        <div className="card-body text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-6 h-6 text-champagne" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <h1 className="text-xl font-bold">Verificación de producto</h1>
          </div>
          <p className="text-sm text-ivory/70">
            Este pasaporte digital está registrado en Stellar. Verificá su autenticidad al instante.
          </p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{product.name}</h2>
              {company && <p className="text-sm text-base-content/60 mt-1">{company.name} · {company.country} · <span className="capitalize">{company.sector}</span></p>}
              {product.description && <p className="text-base-content/70 mt-2">{product.description}</p>}
            </div>
            <PassportQR passportId={passportId} className="shrink-0" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div><p className="text-base-content/60">Categoría</p><p className="font-medium capitalize">{product.category}</p></div>
            <div><p className="text-base-content/60">País de origen</p><p className="font-medium">{product.origin_country}</p></div>
            <div><p className="text-base-content/60">Ciudad</p><p className="font-medium">{product.origin_city}</p></div>
            <div><p className="text-base-content/60">Año</p><p className="font-medium">{product.year}</p></div>
            <div><p className="text-base-content/60">Fecha de emisión</p><p className="font-medium">{passport?.created_at ? new Date(passport.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p></div>
          </div>

          {product.materials?.length > 0 && (
            <div className="mt-4">
              <p className="text-base-content/60 text-sm">Materiales</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {product.materials.map((m: string, i: number) => (
                  <span key={i} className="badge badge-outline">{m}</span>
                ))}
              </div>
            </div>
          )}

          {product.images?.length > 0 && (
            <div className="carousel carousel-center gap-3 rounded-box mt-4">
              {product.images.map((url: string, i: number) => (
                <div key={i} className="carousel-item">
                  <img src={url} alt={`${product.name} ${i + 1}`} className="h-40 rounded-box object-cover" />
                </div>
              ))}
            </div>
          )}

          {product.certifications?.length > 0 && (
            <div className="mt-4">
              <p className="text-base-content/60 text-sm mb-1">Certificaciones</p>
              {product.certifications.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span>{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Verificación en Stellar</h3>
              <p className="text-xs text-base-content/60">Consultá el registro on-chain del pasaporte</p>
            </div>
            <button
              onClick={handleVerify}
              disabled={verifying || verified}
              className={`btn ${verified ? 'btn-success' : 'btn-primary'} gap-2`}
            >
              {verifying ? (
                <><span className="loading loading-spinner loading-xs" /> Verificando</>
              ) : verified ? (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Verificado</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> Verificar en Stellar</>
              )}
            </button>
          </div>
          <div className="mt-3">
            <VerifyBadge onChainHash={onChainHash} offChainHash={product?.metadata_hash} loading={verifying} />
          </div>
          {verifyError && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{verifyError}</div>
          )}
          {onChainHash && (
            <div className="mt-3 text-xs space-y-1">
              <p className="text-base-content/60">Hash on-chain:</p>
              <p className="font-mono break-all bg-base-200 p-2 rounded">{onChainHash}</p>
              {product?.metadata_hash && (
                <>
                  <p className="text-base-content/60 mt-2">Hash off-chain:</p>
                  <p className="font-mono break-all bg-base-200 p-2 rounded">{product.metadata_hash}</p>
                  <p className={`mt-2 font-medium ${onChainHash === product.metadata_hash ? 'text-success' : 'text-error'}`}>
                    {onChainHash === product.metadata_hash
                      ? '✓ Los hashes coinciden — el pasaporte es auténtico'
                      : '✗ Los hashes no coinciden — el pasaporte fue alterado'}
                  </p>
                </>
              )}
            </div>
          )}
          {passport?.tx_hash && (
            <p className="text-xs text-base-content/40 mt-3">
              Tx: <span className="font-mono">{passport.tx_hash}</span>
            </p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="font-semibold mb-4">Historial del producto</h3>
          <TraceTimeline events={events} />
        </div>
      </div>
    </div>
  )
}