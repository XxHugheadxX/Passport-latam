'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import { useWallet } from '@/app/hooks/useWallet'
import { usePassportContract } from '@/app/hooks/usePassportContract'
import { useQR } from '@/app/hooks/useQR'
import { computeMetadataHash } from '@/app/lib/hash'
import { isCertifiedIssuer } from '@/app/lib/soroban'
import { WalletButton } from '@/app/components/WalletButton'
import { PassportQR } from '@/app/components/PassportQR'
import { TxStatus } from '@/app/components/TxStatus'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const CATEGORIES = ['textile', 'coffee', 'ceramic', 'cosmetic', 'food', 'art', 'other']

export default function EmitPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>}>
      <EmitForm />
    </Suspense>
  )
}

function EmitForm() {
  const router = useRouter()
  const { user, supabase, getCompany, loading: authLoading } = useSupabaseAuth()
  const wallet = useWallet()
  const contract = usePassportContract()
  const qr = useQR()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  const searchParams = useSearchParams()
  const editProductId = searchParams.get('productId')

  const [step, setStep] = useState<'loading' | 'company' | 'form' | 'result'>('loading')
  const [company, setCompany] = useState<any>(null)
  const [companyForm, setCompanyForm] = useState({ name: '', country: '', sector: '', description: '', stellar_address: '' })
  const [submittingCompany, setSubmittingCompany] = useState(false)
  const [companySuccess, setCompanySuccess] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    materials: '',
    originCity: '',
    originCountry: '',
    category: '',
    year: new Date().getFullYear(),
    certifications: '[]',
  })
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error'>('idle')
  const [txMessage, setTxMessage] = useState<string | null>(null)
  const [passportId, setPassportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isIssuer, setIsIssuer] = useState<boolean | null>(null)

  useEffect(() => {
    if (user) getCompany().then(c => { setCompany(c); setStep(c ? 'form' : 'company') })
  }, [user, getCompany])

  useEffect(() => {
    if (!editProductId || !supabase) return
    supabase.from('products').select('*').eq('id', editProductId).single().then(({ data, error }) => {
      if (data && !error) {
        setForm({
          name: data.name,
          description: data.description || '',
          materials: Array.isArray(data.materials) ? data.materials.join(', ') : '',
          originCity: data.origin_city || '',
          originCountry: data.origin_country || '',
          category: data.category || '',
          year: data.year || new Date().getFullYear(),
          certifications: JSON.stringify(data.certifications || []),
        })
        if (data.images?.length) setExistingImages(data.images)
      }
    })
  }, [editProductId, supabase])

  useEffect(() => {
    if (companySuccess) {
      const t = setTimeout(() => { setStep('form'); setCompanySuccess(false) }, 1200)
      return () => clearTimeout(t)
    }
  }, [companySuccess])

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      isCertifiedIssuer(wallet.address).then(setIsIssuer).catch(() => setIsIssuer(null))
    } else {
      setIsIssuer(null)
    }
  }, [wallet.isConnected, wallet.address])

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingCompany(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('companies').insert({
        user_id: user!.id,
        name: companyForm.name,
        country: companyForm.country,
        sector: companyForm.sector,
        description: companyForm.description,
        stellar_address: companyForm.stellar_address || null,
      }).select().single()

      if (error) throw new Error(error.message)
      setCompany(data)
      setCompanySuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating company')
    }
    setSubmittingCompany(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    if (!e.target.files) return
    const oversized = Array.from(e.target.files).filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setFileError(`"${oversized[0].name}" supera el límite de 5 MB`)
      e.target.value = ''
      return
    }
    setImages(Array.from(e.target.files))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFileError(null)

    if (!wallet.isConnected) {
      setError('Conectá tu wallet Stellar primero')
      return
    }
    if (isIssuer === false) {
      setError('Tu wallet no está certificada como issuer. Contactá al admin del contrato.')
      return
    }

    setTxStatus('building')
    setTxMessage('Preparando datos del producto...')

    try {
      // 1. Upload images (new ones)
      const imageUrls: string[] = [...existingImages]
      if (images.length > 0) {
        setTxMessage('Subiendo imágenes...')
        for (const img of images) {
          const path = `${company.id}/${Date.now()}-${img.name}`
          const { error: upErr } = await supabase.storage.from('product-images').upload(path, img)
          if (upErr) {
            if (upErr.message.includes('row-level security')) {
              throw new Error('No tenés permiso para subir imágenes. Verificá que hayas iniciado sesión.')
            }
            if (upErr.message.includes('Request too large') || upErr.message.includes('Payload too large')) {
              throw new Error('La imagen es demasiado grande. El máximo es 5 MB por archivo.')
            }
            throw new Error('Error al subir imagen: ' + upErr.message)
          }
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
          imageUrls.push(publicUrl)
        }
      }

      let certifications: any[] = []
      try { certifications = JSON.parse(form.certifications) } catch {}

      // 2. Compute metadata hash
      const productData = {
        name: form.name,
        description: form.description,
        materials: form.materials.split(',').map(m => m.trim()).filter(Boolean),
        origin_city: form.originCity,
        origin_country: form.originCountry,
        category: form.category,
        certifications,
        year: form.year,
      }
      const metadataHash = computeMetadataHash(productData)

      // 3. Save or update product
      let productId: string
      if (editProductId) {
        setTxMessage('Actualizando producto...')
        const imageUpdate: any = {}
        if (imageUrls.length > 0) imageUpdate.images = imageUrls
        const { error: updErr } = await supabase
          .from('products')
          .update({
            name: form.name,
            description: form.description,
            materials: form.materials.split(',').map(m => m.trim()).filter(Boolean),
            origin_city: form.originCity,
            origin_country: form.originCountry,
            category: form.category,
            certifications,
            year: form.year,
            metadata_hash: metadataHash,
            ...imageUpdate,
          })
          .eq('id', editProductId)
        if (updErr) throw new Error('Error al actualizar producto: ' + updErr.message)
        productId = editProductId
      } else {
        setTxMessage('Guardando producto...')
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .insert({
            company_id: company.id,
            name: form.name,
            description: form.description,
            materials: form.materials.split(',').map(m => m.trim()).filter(Boolean),
            origin_city: form.originCity,
            origin_country: form.originCountry,
            category: form.category,
            certifications,
            year: form.year,
            images: imageUrls,
            metadata_hash: metadataHash,
          })
          .select('id')
          .single()
        if (prodErr) throw new Error('Error al guardar producto: ' + prodErr.message)
        productId = product.id
      }

      // 4. Check for existing passport with same product name
      if (!editProductId) {
        setTxMessage('Verificando si el producto ya tiene pasaporte...')
        const { data: sameNameProducts } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', company.id)
          .eq('name', form.name)
        if (sameNameProducts && sameNameProducts.length > 0) {
          const { data: existingPassports } = await supabase
            .from('passports')
            .select('passport_id')
            .in('product_id', sameNameProducts.map(p => p.id))
            .limit(1)
          if (existingPassports && existingPassports.length > 0) {
            throw new Error('Este producto ya tiene un pasaporte emitido. Revisá tu dashboard.')
          }
        }
      }

      // 5. Emit on-chain
      setTxStatus('signing')
      setTxMessage('Firmá la transacción en tu wallet...')

      const result = await contract.emit({
        issuer: wallet.address!,
        productId,
        metadataHash,
        owner: wallet.address!,
        category: form.category,
        originCountry: form.originCountry,
      }, async (xdr: string) => {
        setTxStatus('signing')
        return wallet.sign(xdr, contract.networkPassphrase)
      })

      setTxStatus('submitting')
      setTxMessage('Guardando pasaporte...')

      const pid = result.result as string
      setPassportId(pid)

      // 5. Save passport
      const { error: passErr } = await supabase
        .from('passports')
        .insert({
          product_id: productId,
          company_id: company.id,
          passport_id: pid,
          metadata_hash: metadataHash,
          issuer_address: wallet.address,
          owner_address: wallet.address,
          tx_hash: result.hash,
          qr_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${pid}`,
        })

      if (passErr) throw new Error('Error al guardar pasaporte: ' + passErr.message)

      // 6. Traceability event
      await supabase.from('traceability_events').insert({
        passport_id: pid,
        event_type: 'emitted',
        to_address: wallet.address,
        tx_hash: result.hash,
      })

      setTxStatus('success')
      setTxMessage('¡Pasaporte emitido exitosamente!')
      setStep('result')
    } catch (e) {
      setTxStatus('error')
      const msg = e instanceof Error ? e.message : 'Error al emitir pasaporte'
      if (msg.includes('Contract, #4')) {
        setError('Tu wallet no está autorizada para emitir pasaportes. El admin del contrato debe certificarla como issuer.')
      } else if (msg.includes('HostError') || msg.includes('ContractError')) {
        setError('El contrato rechazó la transacción. Revisá que tu wallet esté certificada como issuer.')
      } else {
        setError(msg)
      }
    }
  }

  // --- Loading ---
  if (step === 'loading') return (
    <div className="flex-1 flex items-center justify-center bg-linear-to-br from-espresso via-espresso to-charcoal">
      <span className="loading loading-spinner loading-sm text-champagne" />
    </div>
  )

  // --- Company success ---
  if (companySuccess) return (
    <div className="flex-1 flex items-center justify-center p-4 bg-linear-to-br from-espresso via-espresso to-charcoal">
      <div className="text-center animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-ivory/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-champagne" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-lg font-bold text-ivory">Perfil creado</h2>
        <p className="text-xs text-ivory/50 mt-1">Redirigiendo al formulario de emisión...</p>
      </div>
    </div>
  )

  // --- Company form ---
  if (step === 'company') {
    const canSubmit = companyForm.name.trim() && companyForm.country.trim() && companyForm.sector.trim()

    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-linear-to-br from-espresso via-espresso to-charcoal relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-champagne blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
        </div>

        <div className="w-full max-w-sm relative animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-ivory tracking-tight">
              Passport <span className="text-champagne">LATAM</span>
            </h1>
          </div>

          <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-espresso">Perfil de empresa</h2>
              <p className="text-xs text-espresso/50 mt-1">Completá los datos para empezar a emitir pasaportes</p>
            </div>

            <form onSubmit={handleCreateCompany} className="flex flex-col gap-4">
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Nombre de la empresa *</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Tejidos Andinos SRL" required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control">
                  <span className="text-xs font-medium text-espresso/60 mb-1">País *</span>
                  <input type="text" className="input input-sm bg-white border text-espresso" value={companyForm.country} onChange={e => setCompanyForm(f => ({ ...f, country: e.target.value }))} placeholder="BO" required />
                </label>
                <label className="form-control">
                  <span className="text-xs font-medium text-espresso/60 mb-1">Sector *</span>
                  <select className="select select-sm bg-white border text-espresso" value={companyForm.sector} onChange={e => setCompanyForm(f => ({ ...f, sector: e.target.value }))} required>
                    <option value="">Seleccionar</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Descripción</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={companyForm.description} onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))} placeholder="Contanos sobre tu empresa..." />
              </label>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Dirección Stellar (opcional)</span>
                <input type="text" className="input input-sm bg-white border text-espresso font-mono text-xs" value={companyForm.stellar_address} onChange={e => setCompanyForm(f => ({ ...f, stellar_address: e.target.value }))} placeholder="G..." />
              </label>
              <button type="submit" disabled={!canSubmit || submittingCompany} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none mt-1">
                {submittingCompany ? <><span className="loading loading-spinner loading-xs" /> Guardando...</> : 'Crear perfil'}
              </button>
            </form>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
          </div>
        </div>
      </div>
    )
  }

  // --- Result ---
  if (step === 'result' && passportId) return (
    <div className="flex-1 p-4 max-w-md mx-auto w-full flex items-center justify-center">
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border w-full text-center">
        <svg className="w-12 h-12 text-espresso/70 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h2 className="text-lg font-bold text-espresso">¡Pasaporte emitido!</h2>
        <p className="text-xs text-espresso/50 mt-1 mb-5">Escaneá el QR para verificar o descargalo para imprimirlo</p>
        <PassportQR passportId={passportId} />
        <p className="text-xs text-espresso/40 mt-3 font-mono break-all">{passportId}</p>
        <div className="flex gap-3 justify-center mt-6">
          <a href={`/passport/${passportId}`} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">Ver detalle</a>
          <a href={`/verify/${passportId}`} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">Verificar</a>
        </div>
      </div>
    </div>
  )

  // --- Main form ---
  return (
    <div className="flex-1 flex items-start justify-center p-4 md:p-8 pt-12">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-bold text-espresso">Emitir pasaporte</h1>
          <p className="text-xs text-espresso/50 mt-0.5">
            Empresa: <span className="font-semibold text-espresso/70">{company?.name}</span>
          </p>
        </div>

        <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-5 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-espresso/40" />
              <div>
                <h3 className="font-medium text-sm text-espresso">Wallet Stellar</h3>
                <p className="text-xs text-espresso/50">Necesaria para firmar la emisión</p>
              </div>
            </div>
            <WalletButton />
          </div>
          {wallet.isConnected && wallet.address && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-espresso/60 font-mono bg-white/50 p-2 rounded border">{wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}</p>
              {isIssuer === true && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Certificada como issuer
                </p>
              )}
              {isIssuer === false && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  No está certificada como issuer
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border">
          <h3 className="font-semibold text-sm text-espresso mb-5">Datos del producto</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Nombre del producto *</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Café de Altura" required />
              </label>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Categoría *</span>
                <select className="select select-sm bg-white border text-espresso" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Descripción</span>
              <input type="text" className="input input-sm bg-white border text-espresso" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describí el producto..." />
            </label>

            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Materiales (separados por coma)</span>
              <input type="text" className="input input-sm bg-white border text-espresso" value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder="lana, algodón, tintes naturales" />
            </label>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Ciudad de origen *</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={form.originCity} onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} placeholder="La Paz" required />
              </label>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">País de origen *</span>
                <input type="text" className="input input-sm bg-white border text-espresso" value={form.originCountry} onChange={e => setForm(f => ({ ...f, originCountry: e.target.value }))} placeholder="BO" required />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Año de producción</span>
                <input type="number" className="input input-sm bg-white border text-espresso" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))} />
              </label>
              <label className="form-control">
                <span className="text-xs font-medium text-espresso/60 mb-1">Fotos</span>
                {existingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {existingImages.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                        <button
                          type="button"
                          onClick={() => setExistingImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" multiple accept="image/*" className="file-input file-input-sm bg-white border text-espresso text-xs" onChange={handleImageChange} />
                <span className="text-[10px] text-espresso/40 mt-1">Máximo 5 MB por imagen</span>
                {fileError && <span className="text-[10px] text-red-600 mt-1">{fileError}</span>}
              </label>
            </div>

            <label className="form-control">
              <span className="text-xs font-medium text-espresso/60 mb-1">Certificaciones</span>
              <input type="text" className="input input-sm bg-white border text-espresso font-mono text-xs" value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} placeholder='[{"name":"Comercio Justo","issuer":"WFTO"}]' />
            </label>

            <button
              type="submit"
              disabled={!wallet.isConnected || contract.isLoading || txStatus === 'success'}
              className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none mt-1"
            >
              {contract.isLoading ? (
                <><span className="loading loading-spinner loading-xs" /> Procesando...</>
              ) : 'Emitir pasaporte'}
            </button>
          </form>
        </div>

        {(txStatus !== 'idle' || error) && (
          <div>
            <TxStatus status={txStatus} txHash={contract.txHash} error={error || contract.error} message={txMessage} />
          </div>
        )}
      </div>
    </div>
  )
}