'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase'
import { useWallet } from '@/app/hooks/useWallet'
import { usePassportContract } from '@/app/hooks/usePassportContract'
import { WalletButton } from '@/app/components/WalletButton'
import { TxStatus } from '@/app/components/TxStatus'

export default function TransferPage() {
  const params = useParams()
  const passportId = params.id as string
  const supabase = createClient()
  const wallet = useWallet()
  const contract = usePassportContract()

  const [newOwner, setNewOwner] = useState('')
  const [passport, setPassport] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('passports')
        .select('*, products(name)')
        .eq('passport_id', passportId)
        .single()

      if (error || !data) {
        setError('Pasaporte no encontrado')
        setLoadingData(false)
        return
      }
      setPassport(data)
      setLoadingData(false)
    }
    load()
  }, [passportId, supabase])

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.isConnected || !wallet.address) {
      setError('Conectá tu wallet primero')
      return
    }

    if (!newOwner.startsWith('G') || newOwner.length !== 56) {
      setError('Dirección Stellar inválida (debe empezar con G y tener 56 caracteres)')
      return
    }

    if (wallet.address !== passport.owner_address) {
      setError('Solo el dueño actual puede transferir este pasaporte')
      return
    }

    setTxStatus('building')
    setError(null)

    try {
      setTxStatus('signing')
      await contract.transfer({
        owner: wallet.address,
        passportId,
        newOwner,
      }, async (xdr: string) => {
        setTxStatus('signing')
        return wallet.sign(xdr, contract.networkPassphrase)
      })

      setTxStatus('submitting')

      // Update passport owner
      await supabase
        .from('passports')
        .update({ owner_address: newOwner, is_active: false })
        .eq('passport_id', passportId)

      // Record event
      await supabase
        .from('traceability_events')
        .insert({
          passport_id: passportId,
          event_type: 'transferred',
          from_address: wallet.address,
          to_address: newOwner,
          tx_hash: contract.txHash,
        })

      setTxStatus('success')
    } catch (e) {
      setTxStatus('error')
      setError(e instanceof Error ? e.message : 'Error al transferir')
    }
  }

  if (loadingData) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>

  if (error && !passport) return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="alert alert-error max-w-md">{error}</div>
    </div>
  )

  const isOwner = wallet.isConnected && wallet.address === passport?.owner_address

  return (
    <div className="flex-1 p-4 md:p-8 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2">Transferir propiedad</h1>
      <p className="text-base-content/60 text-sm mb-6">
        Transferí el pasaporte de <strong>{passport?.products?.name}</strong> a un nuevo propietario
      </p>

      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <p className="text-xs text-base-content/60 mb-1">Dueño actual</p>
          <p className="text-sm font-mono">{passport?.owner_address}</p>
          <p className="text-xs text-base-content/40 mt-1">Passport ID: {passport?.passport_id}</p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Tu wallet</h3>
              <p className="text-xs text-base-content/60">Necesitás ser el dueño actual para transferir</p>
            </div>
            <WalletButton />
          </div>
          {wallet.isConnected && (
            <p className="text-xs mt-2 font-mono">{wallet.address}</p>
          )}
          {wallet.isConnected && !isOwner && (
            <div className="alert alert-warning mt-2 text-sm p-2">
              Esta wallet no es la dueña del pasaporte
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleTransfer} className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <label className="form-control">
            <span className="label-text">Dirección del nuevo propietario *</span>
            <input
              type="text"
              className="input input-bordered font-mono text-sm"
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              placeholder="G..."
              required
              pattern="G[a-zA-Z0-9]{55}"
            />
            <span className="label-text-alt text-base-content/40 text-xs mt-1">
              Dirección Stellar que comienza con G (56 caracteres)
            </span>
          </label>

          <button
            type="submit"
            disabled={!wallet.isConnected || !isOwner || contract.isLoading || txStatus === 'success'}
            className="btn btn-primary w-full"
          >
            {contract.isLoading ? (
              <><span className="loading loading-spinner loading-xs" /> Procesando...</>
            ) : 'Transferir propiedad'}
          </button>
        </div>
      </form>

      {(txStatus !== 'idle' || error) && (
        <div className="mt-6">
          <TxStatus status={txStatus} txHash={contract.txHash} error={error || contract.error} />
        </div>
      )}

      {txStatus === 'success' && (
        <div className="card bg-base-100 shadow-sm mt-6">
          <div className="card-body text-center">
            <svg className="w-12 h-12 mx-auto text-success mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="font-semibold">¡Propiedad transferida!</h3>
            <p className="text-sm text-base-content/60">El pasaporte ahora pertenece a la wallet ingresada.</p>
            <div className="mt-4 flex gap-2 justify-center">
              <a href={`/passport/${passportId}`} className="btn btn-sm btn-outline">Ver pasaporte</a>
              <a href={`/verify/${passportId}`} className="btn btn-sm btn-primary">Verificar</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}