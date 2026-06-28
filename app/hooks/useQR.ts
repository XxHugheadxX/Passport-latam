'use client'

import { useState, useCallback } from 'react'
import { generatePassportQR, generatePassportQRSvg, getVerifyUrl } from '@/app/lib/qr'

export function useQR() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (passportId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [dataUrl, svg] = await Promise.all([
        generatePassportQR(passportId),
        generatePassportQRSvg(passportId),
      ])
      setQrDataUrl(dataUrl)
      setQrSvg(svg)
      return { dataUrl, svg, url: getVerifyUrl(passportId) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'QR generation failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setQrDataUrl(null)
    setQrSvg(null)
  }, [])

  return { qrDataUrl, qrSvg, generate, clear, isLoading, error }
}