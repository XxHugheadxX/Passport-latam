'use client'

import { useState, useEffect, useCallback } from 'react'

let freighter: any = null

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    import('@stellar/freighter-api').then(mod => {
      freighter = mod.default || mod
      setReady(true)
      check()
    }).catch(() => {
      setError('Freighter no disponible')
      setReady(true)
    })
  }, [])

  const check = async () => {
    if (!freighter) return
    try {
      const { isConnected } = await freighter.isConnected()
      if (!isConnected) return
      const { address: addr } = await freighter.getAddress()
      if (addr) {
        setAddress(addr)
        setConnected(true)
      }
    } catch {}
  }

  const connect = useCallback(async () => {
    if (!freighter) {
      setError('Freighter no instalado. Descargalo en https://freighter.app')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const { isConnected } = await freighter.isConnected()
      if (!isConnected) {
        setError('Freighter no instalado. Descargalo en https://freighter.app')
        return
      }
      const { address: addr } = await freighter.requestAccess()
      setAddress(addr)
      setConnected(true)
      return addr
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar wallet')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setConnected(false)
  }, [])

  const sign = useCallback(async (xdr: string, networkPassphrase: string) => {
    if (!freighter) throw new Error('Freighter no disponible')
    if (!connected || !address) throw new Error('Wallet no conectada')
    const { signedTxXdr } = await freighter.signTransaction(xdr, { networkPassphrase })
    return signedTxXdr
  }, [connected, address])

  return { address, isConnected: connected, isConnecting: connecting, connect, disconnect, sign, error, ready }
}