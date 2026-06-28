'use client'

import { useState, useCallback } from 'react'
import { verifyPassport, buildEmitPassportTx, buildTransferOwnershipTx, submitAndWait, getNetworkPassphrase } from '@/app/lib/soroban'

const networkPassphrase = getNetworkPassphrase()

export interface PassportView {
  passport_id: string
  product_id: string
  metadata_hash: string
  owner: string
  issuer: string
  category: string
  origin_country: string
  created_at: number
  status: string
}

export interface EmitPassportParams {
  issuer: string
  productId: string
  metadataHash: string
  owner: string
  category: string
  originCountry: string
}

export interface TransferOwnershipParams {
  owner: string
  passportId: string
  newOwner: string
}

export function usePassportContract() {
  const [isLoading, setIsLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async (passportId: string): Promise<PassportView | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await verifyPassport(passportId)
      return result as PassportView
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const emit = useCallback(async (params: EmitPassportParams, signFn: (xdr: string) => Promise<string>) => {
    setIsLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const xdr = await buildEmitPassportTx(
        params.issuer,
        params.productId,
        params.metadataHash,
        params.owner,
        params.category,
        params.originCountry
      )
      const signedXdr = await signFn(xdr)
      const result = await submitAndWait(signedXdr)
      setTxHash(result.hash)
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Emission failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const transfer = useCallback(async (params: TransferOwnershipParams, signFn: (xdr: string) => Promise<string>) => {
    setIsLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const xdr = await buildTransferOwnershipTx(params.owner, params.passportId, params.newOwner)
      const signedXdr = await signFn(xdr)
      const result = await submitAndWait(signedXdr)
      setTxHash(result.hash)
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { verify, emit, transfer, isLoading, txHash, error, networkPassphrase }
}